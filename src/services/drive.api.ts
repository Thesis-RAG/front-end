/**
 * Google Drive API — list files in a public shared folder and download their text content.
 * Requires the folder to be shared as "Anyone with the link can view".
 */

// Base URL for the Google Drive REST API v3.
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// API key read from the environment variable VITE_GOOGLE_DRIVE_API_KEY.
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY ?? "";

// Metadata for a file returned by the Drive Files list API.
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
}

/**
 * Extract a folder ID from a Google Drive share link or raw ID string.
 * Supports:
 *   https://drive.google.com/drive/folders/FOLDER_ID
 *   https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 *   FOLDER_ID (raw)
 */
export function extractFolderId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If no slashes, treat the whole string as a raw folder ID.
  if (!trimmed.includes("/") && trimmed.length > 10) return trimmed;

  // Extract ID from URL path segment /folders/ID.
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  return null;
}

/**
 * List files in the first level of a Drive folder (non-recursive).
 * Throws if the API key is missing or the folder is not publicly accessible.
 */
export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  if (!API_KEY) {
    throw new Error(
      "Google Drive API key is not configured. Add VITE_GOOGLE_DRIVE_API_KEY to .env"
    );
  }

  const params = new URLSearchParams({
    key: API_KEY,
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink)",
    pageSize: "100",
    orderBy: "name",
  });

  const res = await fetch(`${DRIVE_API_BASE}/files?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 403) {
      throw new Error(
        "Access denied. Make sure the folder is shared as 'Anyone with the link'."
      );
    }
    throw new Error(`Drive API error: ${msg}`);
  }

  const data = await res.json();
  return (data.files ?? []) as DriveFile[];
}

// MIME types supported for text extraction and LLM ingestion.
const SUPPORTED_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
]);

// Return true if the file's MIME type can be processed and sent to the LLM.
export function isFileSupported(file: DriveFile): boolean {
  return SUPPORTED_MIME_TYPES.has(file.mimeType);
}

// Return a short human-readable label for a MIME type (e.g., "PDF", "DOCX").
export function getMimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "text/plain": "TXT",
    "text/csv": "CSV",
    "text/markdown": "MD",
    "application/json": "JSON",
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.folder": "Folder",
    "image/png": "PNG",
    "image/jpeg": "JPG",
  };
  return map[mimeType] ?? mimeType.split("/")[1]?.toUpperCase() ?? "FILE";
}

/**
 * Download a Drive file and return its plain-text content.
 * Google Docs are exported as plain text; Google Sheets as CSV.
 * PDF and DOCX files are parsed via helper functions.
 */
export async function downloadDriveFileText(file: DriveFile): Promise<string> {
  if (!API_KEY) throw new Error("API key is not configured");

  let url: string;

  if (file.mimeType === "application/vnd.google-apps.document") {
    // Export Google Doc as plain text.
    url = `${DRIVE_API_BASE}/files/${file.id}/export?mimeType=text%2Fplain&key=${API_KEY}`;
  } else if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
    // Export Google Sheet as CSV.
    url = `${DRIVE_API_BASE}/files/${file.id}/export?mimeType=text%2Fcsv&key=${API_KEY}`;
  } else {
    // Download binary files directly (alt=media).
    url = `${DRIVE_API_BASE}/files/${file.id}?alt=media&key=${API_KEY}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download file: HTTP ${res.status}`);
  }

  if (
    file.mimeType === "application/pdf" ||
    file.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // Parse binary formats (PDF / DOCX) and return extracted text.
    const buffer = await res.arrayBuffer();
    return _arrayBufferToText(buffer, file);
  }

  return res.text();
}

// Parse an ArrayBuffer to plain text using pdfjs-dist (PDF) or mammoth (DOCX).
async function _arrayBufferToText(
  buffer: ArrayBuffer,
  file: DriveFile
): Promise<string> {
  if (file.mimeType === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  }

  if (
    file.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  return new TextDecoder().decode(buffer);
}
