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
