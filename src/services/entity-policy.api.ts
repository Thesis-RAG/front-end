import { ENV } from "@/config/env";
import type { EntityActionConfig, EntityAction } from "@/services/documents.api";

export type EntityConfiguration = {
  document_id: string;
  document_title: string;
  document_version_id: string;
  version_no: number;
  file_name: string;
  entity_detection_json: { entity_types?: string[]; entities?: any[] };
  actions: Array<EntityActionConfig & {
    id: string;
    document_version_id: string;
    detection_count: number;
    metadata_json: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
};

export async function fetchEntityConfigurations(token: string): Promise<EntityConfiguration[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/policy/entity-configurations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateEntityConfiguration(
  versionId: string,
  actions: EntityActionConfig[],
  token: string,
): Promise<EntityConfiguration> {
  const res = await fetch(`${ENV.API_BASE_URL}/policy/entity-configurations/${versionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ actions }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const ENTITY_ACTION_LABEL: Record<EntityAction, string> = {
  block: "Chặn và yêu cầu quyền",
  full: "Hiển thị đầy đủ",
  mask: "Che thực thể",
};
