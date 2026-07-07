import { ENV } from "@/config/env";

type CreateDocumentPayload = {
  title: string;
  description?: string;
  oui_ids: string[]; // multi OUI thay cho department_id/project_id
  sensitivity: number; // 1-5 thay cho sensitivity_level string
  document_type?: string;
  data_type?: string;
  tags?: string[];
};

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

type UpdateDocumentPayload = {
  title?: string;
  description?: string;
  oui_ids?: string[];
  sensitivity?: number;
  document_type?: string;
  tags?: string[];
};

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

export function getDocumentFileUrl(
  documentId: string,
  versionId: string,
  token: string,
): string {
  return `${ENV.API_BASE_URL}/documents/${documentId}/versions/${versionId}/file?token=${token}`;
}

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

export async function fetchPendingApprovals(token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const docs = await res.json();
  return docs.filter(
    (d: any) => d.status === "review" || d.status === "uploaded",
  );
}

export async function getPendingReviewCount(token: string): Promise<number> {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/pending-review-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

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

// ── Access Request APIs ────────────────────────────────────────────────────

export type DocumentAccessStatus = {
  has_restricted_chunks: boolean;
  access_request_status: "pending" | "approved" | "rejected" | null;
  approved_until: string | null;
};

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

export async function getDocumentAccessStatus(
  documentId: string,
  token: string,
): Promise<DocumentAccessStatus> {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/access-status`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { has_restricted_chunks: false, access_request_status: null, approved_until: null };
  return res.json();
}

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

export async function fetchAllAccessRequests(token: string): Promise<AccessRequestRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchMyAccessRequests(token: string): Promise<AccessRequestRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/access-requests/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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
