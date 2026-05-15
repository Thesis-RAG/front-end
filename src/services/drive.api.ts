// src/services/drive.api.ts
// Đọc file từ Google Drive folder public (share link)
// Yêu cầu: folder phải được share "Anyone with the link can view"

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// Lấy VITE_GOOGLE_DRIVE_API_KEY từ .env
// Thêm vào .env: VITE_GOOGLE_DRIVE_API_KEY=AIza...
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY ?? "";

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
 * Extract folder ID từ Google Drive share link
 * Hỗ trợ các dạng:
 *   https://drive.google.com/drive/folders/FOLDER_ID
 *   https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 *   FOLDER_ID (raw)
 */
export function extractFolderId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Raw ID (không có /)
  if (!trimmed.includes("/") && trimmed.length > 10) return trimmed;

  // URL dạng /folders/ID
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  return null;
}

/**
 * Lấy danh sách file trong folder (recursive = false, chỉ lấy tầng 1)
 */
export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  if (!API_KEY) {
    throw new Error(
      "Google Drive API key chưa được cấu hình. Thêm VITE_GOOGLE_DRIVE_API_KEY vào .env"
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
        "Không có quyền truy cập folder. Hãy chắc chắn folder được share 'Anyone with the link'."
      );
    }
    throw new Error(`Drive API lỗi: ${msg}`);
  }

  const data = await res.json();
  return (data.files ?? []) as DriveFile[];
}

/** MIME types được hỗ trợ để gửi vào LLM */
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

export function isFileSupported(file: DriveFile): boolean {
  return SUPPORTED_MIME_TYPES.has(file.mimeType);
}

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
 * Tải nội dung file từ Drive (chỉ text-based)
 * Google Docs/Sheets → export sang text/plain
 * PDF → trả về arrayBuffer để parse riêng
 */
export async function downloadDriveFileText(file: DriveFile): Promise<string> {
  if (!API_KEY) throw new Error("API key chưa cấu hình");

  let url: string;

  if (file.mimeType === "application/vnd.google-apps.document") {
    // Export Google Doc → plain text
    url = `${DRIVE_API_BASE}/files/${file.id}/export?mimeType=text%2Fplain&key=${API_KEY}`;
  } else if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
    // Export Google Sheet → CSV
    url = `${DRIVE_API_BASE}/files/${file.id}/export?mimeType=text%2Fcsv&key=${API_KEY}`;
  } else {
    // Download trực tiếp (alt=media)
    url = `${DRIVE_API_BASE}/files/${file.id}?alt=media&key=${API_KEY}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không tải được file: HTTP ${res.status}`);
  }

  if (
    file.mimeType === "application/pdf" ||
    file.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // Trả về base64 để caller tự parse (PDF/DOCX)
    const buffer = await res.arrayBuffer();
    return _arrayBufferToText(buffer, file);
  }

  return res.text();
}

async function _arrayBufferToText(
  buffer: ArrayBuffer,
  file: DriveFile
): Promise<string> {
  // PDF parsing qua pdfjs-dist (đã có trong project)
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

  // DOCX parsing qua mammoth (đã có trong project)
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