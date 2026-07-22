/** Policy API — domains, entity types, and domain rules for the Policy-Contract Agent. */
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

// Base URL for all policy API calls.
const BASE = `${ENV.API_BASE_URL}/policy`;

// Build JSON + Authorization headers for a given token.
function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Unwrap a fetch Response: throw on error, return undefined for 204 No Content, else parse JSON.
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Domains ───────────────────────────────────────────────────────────────────

// Fetch all policy domains, optionally filtering to active ones only.
export async function fetchDomains(
  token: string,
  activeOnly = false,
): Promise<PolicyDomainSummary[]> {
  const res = await fetch(`${BASE}/domains?active_only=${activeOnly}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// Fetch a single policy domain with its full entity type list.
export async function fetchDomain(
  token: string,
  domainId: string,
): Promise<PolicyDomain> {
  const res = await fetch(`${BASE}/domains/${domainId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// Create a new policy domain; the LLM auto-suggests entity types after creation.
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

// Update a domain's metadata or toggle its active state.
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

// Delete a domain and cascade-delete all its entity types and rules.
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

// Ask the LLM to suggest relevant entity types given a domain name and description.
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

// Fetch all entity types registered under a domain.
export async function fetchEntityTypes(
  token: string,
  domainId: string,
): Promise<EntityTypeItem[]> {
  const res = await fetch(`${BASE}/domains/${domainId}/entity-types`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// Add a single entity type to a domain.
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

// Bulk-add multiple entity types to a domain in a single request.
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

// Delete a specific entity type from a domain by its ID.
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

// Fetch all policy rules associated with a specific domain.
export async function fetchDomainRules(
  token: string,
  domainId: string,
): Promise<DomainRule[]> {
  const res = await fetch(`${BASE}/domains/${domainId}/rules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

// Create a new rule under a domain with conditions and a policy contract.
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

// ── Rule CRUD (by rule id) ────────────────────────────────────────────────────

// Update a rule by ID; supports partial fields including is_active toggle.
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

// Delete a rule by ID.
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
