import { ENV } from "@/config/env";

type CreateDocumentPayload = {
  title: string;
  description?: string;
  department_id?: string;
  project_id?: string;
  document_type?: string;
  sensitivity_level?: string;
  data_type?: string;
  allowed_roles?: string[];
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
      department_id: payload.department_id,
      project_id: payload.project_id,
      document_type: payload.document_type ?? "general",
      sensitivity_level: payload.sensitivity_level ?? "internal",
      data_type: payload.data_type ?? "text",
      allowed_roles: payload.allowed_roles ?? [
        "department_manager",
        "knowledge_manager",
        "admin",
      ],
    }),
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

type UpdateDocumentPayload = {
  department_id?: string;
  project_id?: string;
  sensitivity_level?: string;
  title?: string;
  description?: string;
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


export function getDocumentFileUrl(
  documentId: string,
  versionId: string,
  token: string,
): string {
  // Trả về URL trực tiếp, token đính kèm qua query param
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

  // Dọn dẹp sau 60s
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}


export async function approveDocument(documentId: string, token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/${documentId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


export async function rejectDocument(documentId: string, reason: string, token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents/${documentId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


export async function fetchPendingApprovals(token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const docs = await res.json();
  // Lọc những doc cần duyệt
  return docs.filter((d: any) => d.status === "review" || d.status === "uploaded");
}


export async function submitForReview(
  documentId: string,
  reviewerRole: string,
  token: string,
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/documents/${documentId}/submit-review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reviewer_role: reviewerRole }),
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