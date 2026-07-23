import { ENV } from "@/config/env";
import type { EntityActionConfig, EntityAction } from "@/services/documents.api";

export type PolicyRule = {
  id: string;
  policy_profile: string;
  entity_key: string;
  display_name: string;
  group_name: string;
  detection_source: "gliner" | "regex" | "manual";
  action: EntityAction;
  enabled: boolean;
  scope_oui_ids: string[];
  scope_position_ids: string[];
  priority: number;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PolicyRulePayload = Omit<PolicyRule, "id" | "policy_profile" | "created_at" | "updated_at">;

async function policyRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENV.API_BASE_URL}/policy${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchPolicyRules(token: string): Promise<PolicyRule[]> {
  return policyRequest<PolicyRule[]>("/rules", token);
}

export function createPolicyRule(payload: PolicyRulePayload, token: string): Promise<PolicyRule> {
  return policyRequest<PolicyRule>("/rules", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePolicyRule(ruleId: string, payload: PolicyRulePayload, token: string): Promise<PolicyRule> {
  return policyRequest<PolicyRule>(`/rules/${ruleId}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePolicyRule(ruleId: string, token: string): Promise<void> {
  await policyRequest(`/rules/${ruleId}`, token, { method: "DELETE" });
}

export function reprocessPolicyVersion(versionId: string, token: string): Promise<{ job_id: string }> {
  return policyRequest<{ job_id: string }>(`/reprocess/${versionId}`, token, { method: "POST" });
}

export type EntityConfiguration = {
  document_id: string;
  document_title: string;
  document_version_id: string;
  version_no: number;
  file_name: string;
  entity_detection_json: { entity_types?: string[]; entities?: unknown[] };
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
