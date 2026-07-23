/** Documents API — upload, manage, and approve documents; handle chunk-level access requests. */
import { ENV } from "@/config/env";

// Payload for creating a new document record.
type CreateDocumentPayload = {
  title: string;
  description?: string;
  oui_ids: string[]; // org-unit instances that own this document
  sensitivity: number; // 1–5 sensitivity level
  document_type?: string;
  data_type?: string;
  tags?: string[];
};

export type EntityAction = "block" | "full" | "mask";

export type EntityActionConfig = {
  entity_type: string;
  label?: string;
  action: EntityAction;
  source?: "gliner" | "regex" | "manual";
  enabled?: boolean;
  scope_oui_ids?: string[];
  scope_position_ids?: string[];
};

export type EntityPreviewEntity = {
  text: string;
  label: string;
  start: number;
  end: number;
  score: number;
  source: string;
  flags: string[];
};

export type EntityPreview = {
  file_name: string;
  text_preview: string;
  text_truncated: boolean;
  entities: EntityPreviewEntity[];
  entity_types: string[];
  confirmed_labels: string[];
  policy_profile: string;
  policy_version: string;
  applied_rules: Array<{
    entity_key: string;
    display_name: string;
    action: EntityAction;
    detection_count: number;
  }>;
  action_summary: Record<EntityAction, number>;
};

export async function previewDocumentEntities(
  file: File,
  token: string,
): Promise<EntityPreview> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${ENV.API_BASE_URL}/documents/entity-preview`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Create a new document record with metadata (no file — upload via uploadDocumentVersion).
export async function createDocument(
  payload: CreateDocumentPayload,
  token: string,
) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      oui_ids: payload.oui_ids,
      sensitivity: payload.sensitivity,
      document_type: payload.document_type ?? "general",
      data_type: payload.data_type ?? "file",
      tags: payload.tags ?? [],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Partial update fields for an existing document.
type UpdateDocumentPayload = {
  title?: string;
  description?: string;
  oui_ids?: string[];
  sensitivity?: number;
  document_type?: string;
  tags?: string[];
};

// Partially update a document's metadata (PATCH semantics).
export async function updateDocument(
  documentId: string,
  payload: UpdateDocumentPayload,
  token: string,
) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/${documentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Upload a file as a new version of an existing document (multipart/form-data).
export async function uploadDocumentVersion(
  documentId: string,
  file: File,
  token: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/versions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Build a direct download URL for a document version file (token passed in query string).
export function getDocumentFileUrl(
  documentId: string,
  versionId: string,
  token: string,
): string {
  return `${ENV.API_BASE_URL}/documents/${documentId}/versions/${versionId}/file?token=${token}`;
}

// Fetch the file, create an object URL, and open it in a new browser tab.
// The object URL is revoked automatically after 60 seconds to free memory.
export async function openDocumentFile(
  documentId: string,
  versionId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/versions/${versionId}/file`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Approve a document that is pending review, moving it to the approved state.
export async function approveDocument(documentId: string, token: string) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/approve`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Reject a document from the review queue with a mandatory reason string.
export async function rejectDocument(
  documentId: string,
  reason: string,
  token: string,
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch all documents currently awaiting approval (status = "review" | "uploaded").
export async function fetchPendingApprovals(token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/pending-approvals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const docs = await res.json();
  return docs.filter((d: any) => d.status === "review" || d.status === "uploaded");
}

// Return the count of documents pending review (used for the notification badge).
export async function getPendingReviewCount(token: string): Promise<number> {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/pending-review-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

// Submit a draft document to the review queue for admin approval.
export async function submitForReview(documentId: string, token: string) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/submit-review`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Permanently delete a document and all its uploaded versions.
export async function deleteDocument(documentId: string, token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Access Request APIs ────────────────────────────────────────────────────────

// Current user's access status for a single document.
export type DocumentAccessStatus = {
  has_restricted_chunks: boolean;
  access_request_status: "pending" | "approved" | "rejected" | null;
  approved_until: string | null;
};

// Full access request record returned by the API.
export type AccessRequestRead = {
  id: string;
  document_id: string;
  document_title: string | null;
  document_sensitivity: number | null;
  user_id: string;
  requester_name: string | null;
  requester_email: string | null;
  status: "pending" | "approved" | "rejected";
  expires_at: string | null;
  admin_id: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type EntityAccessRequestRead = {
  id: string;
  request_kind: "entity";
  document_id: string;
  document_version_id: string;
  document_title: string | null;
  user_id: string;
  requester_name: string | null;
  requester_email: string | null;
  entity_types: string[];
  status: "pending" | "approved" | "rejected" | "revoked";
  expires_at: string | null;
  admin_id: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

// Get the current user's access status for a document (restricted chunks + request state).
export async function getDocumentAccessStatus(
  documentId: string,
  token: string,
): Promise<DocumentAccessStatus> {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/access-status`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  // Return a safe default instead of throwing on non-ok responses.
  if (!res.ok) return { has_restricted_chunks: false, access_request_status: null, approved_until: null };
  return res.json();
}

// Submit a new access request for a document that contains restricted chunks.
export async function createAccessRequest(
  documentId: string,
  token: string,
): Promise<AccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createEntityAccessRequest(
  payload: { document_id: string; document_version_id: string; entity_types: string[] },
  token: string,
): Promise<EntityAccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/entity-access-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAllEntityAccessRequests(token: string): Promise<EntityAccessRequestRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/entity-access-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    let detail: any = null;
    try { detail = JSON.parse(body); } catch { /* keep the HTTP fallback */ }
    const error = new Error((detail?.detail?.message ?? detail?.message ?? body) || `HTTP ${res.status}`) as Error & Record<string, any>;
    Object.assign(error, detail?.detail ?? detail ?? {});
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function fetchMyEntityAccessRequests(token: string): Promise<EntityAccessRequestRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/entity-access-requests/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function approveEntityAccessRequest(
  requestId: string,
  token: string,
  opts?: { admin_note?: string; expires_at?: string },
): Promise<EntityAccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/entity-access-requests/${requestId}/approve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(opts ?? {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function rejectEntityAccessRequest(
  requestId: string,
  token: string,
  adminNote?: string,
): Promise<EntityAccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/entity-access-requests/${requestId}/reject`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ admin_note: adminNote }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch all access requests across all users (admin view).
export async function fetchAllAccessRequests(token: string): Promise<AccessRequestRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch only the current user's own access requests.
export async function fetchMyAccessRequests(token: string): Promise<AccessRequestRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Approve an access request, optionally setting an admin note and expiry date.
export async function approveAccessRequest(
  requestId: string,
  token: string,
  opts?: { admin_note?: string; expires_at?: string },
): Promise<AccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests/${requestId}/approve`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(opts ?? {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Revoke a previously approved access grant before its expiry.
export async function revokeAccessRequest(
  requestId: string,
  token: string,
): Promise<AccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests/${requestId}/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Reject a pending access request with an optional admin note.
export async function rejectAccessRequest(
  requestId: string,
  token: string,
  adminNote?: string,
): Promise<AccessRequestRead> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests/${requestId}/reject`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ admin_note: adminNote }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Download a document version file and extract its plain-text content.
// PDF files are parsed via pdfjs-dist; other types are read as plain text.
export async function fetchDocumentFileAsText(
  documentId: string,
  versionId: string,
  token: string,
): Promise<{ text: string; fileName: string }> {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/versions/${versionId}/file`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Extract the original file name from the Content-Disposition header.
  const contentDisposition = res.headers.get("Content-Disposition") ?? "";
  const match = contentDisposition.match(/filename\*=UTF-8''(.+)/i);
  const fileName = match ? decodeURIComponent(match[1]) : `${documentId}.pdf`;

  const blob = await res.blob();
  if (blob.type === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((item: any) => ("str" in item ? item.str : ""))
            .join(" ") + "\n";
      }
      return { text, fileName };
    } catch (err) {
      console.error("PDF parse error:", err);
      throw err;
    }
  }
  const text = await blob.text();
  return { text, fileName: documentId };
}
