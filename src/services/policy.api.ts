import { ENV } from "@/config/env";
import type {
  CreateDomainPayload,
  CreateEntityTypePayload,
  CreateRulePayload,
  DomainRule,
  EntityTypeItem,
  PolicyDomain,
  PolicyDomainSummary,
  SuggestEntitiesResponse,
  UpdateDomainPayload,
  UpdateRulePayload,
} from "@/types/policy";

const BASE = `${ENV.API_BASE_URL}/policy`;

function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Domains ───────────────────────────────────────────────────────────────────

export async function fetchDomains(
  token: string,
  activeOnly = false,
): Promise<PolicyDomainSummary[]> {
  const res = await fetch(`${BASE}/domains?active_only=${activeOnly}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function fetchDomain(
  token: string,
  domainId: string,
): Promise<PolicyDomain> {
  const res = await fetch(`${BASE}/domains/${domainId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function createDomain(
  token: string,
  payload: CreateDomainPayload,
): Promise<PolicyDomain> {
  const res = await fetch(`${BASE}/domains`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateDomain(
  token: string,
  domainId: string,
  payload: UpdateDomainPayload,
): Promise<PolicyDomain> {
  const res = await fetch(`${BASE}/domains/${domainId}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteDomain(
  token: string,
  domainId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/domains/${domainId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// ── Entity Type Suggestion ────────────────────────────────────────────────────

export async function suggestEntityTypes(
  token: string,
  name: string,
  description?: string,
): Promise<SuggestEntitiesResponse> {
  const res = await fetch(`${BASE}/domains/suggest-entities`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, description }),
  });
  return handle(res);
}

// ── Entity Types ──────────────────────────────────────────────────────────────

export async function fetchEntityTypes(
  token: string,
  domainId: string,
): Promise<EntityTypeItem[]> {
  const res = await fetch(`${BASE}/domains/${domainId}/entity-types`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function addEntityType(
  token: string,
  domainId: string,
  payload: CreateEntityTypePayload,
): Promise<EntityTypeItem> {
  const res = await fetch(`${BASE}/domains/${domainId}/entity-types`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function addEntityTypesBulk(
  token: string,
  domainId: string,
  items: CreateEntityTypePayload[],
): Promise<EntityTypeItem[]> {
  const res = await fetch(`${BASE}/domains/${domainId}/entity-types/bulk`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ entity_types: items }),
  });
  return handle(res);
}

export async function deleteEntityType(
  token: string,
  domainId: string,
  entityTypeId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/domains/${domainId}/entity-types/${entityTypeId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return handle(res);
}

// ── Domain Rules ──────────────────────────────────────────────────────────────

export async function fetchDomainRules(
  token: string,
  domainId: string,
): Promise<DomainRule[]> {
  const res = await fetch(`${BASE}/domains/${domainId}/rules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function createDomainRule(
  token: string,
  domainId: string,
  payload: CreateRulePayload,
): Promise<DomainRule> {
  const res = await fetch(`${BASE}/domains/${domainId}/rules`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// ── Global Rules ──────────────────────────────────────────────────────────────

export async function fetchGlobalRules(token: string): Promise<DomainRule[]> {
  const res = await fetch(`${BASE}/global-rules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function createGlobalRule(
  token: string,
  payload: CreateRulePayload,
): Promise<DomainRule> {
  const res = await fetch(`${BASE}/global-rules`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// ── Rule CRUD (by rule id) ────────────────────────────────────────────────────

export async function updateRule(
  token: string,
  ruleId: string,
  payload: UpdateRulePayload,
): Promise<DomainRule> {
  const res = await fetch(`${BASE}/rules/${ruleId}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteRule(
  token: string,
  ruleId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/rules/${ruleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
