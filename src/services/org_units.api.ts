/** Org Units API — manage OU types, OUI instances, positions, and user assignments. */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

// An OU type (template) — defines the structure, not a concrete unit.
export interface OrgUnit {
  id: string;
  name: string;
  parent_id: string | null; // null = root of the org-unit hierarchy
}

// A concrete OUI (Org Unit Instance) — an actual org unit of a given OU type.
export interface OrgUnitInstance {
  id: string;
  name: string;
  ou_id: string; // the OU type this instance belongs to
  parent_oui_ids: string[]; // parent instances in the org hierarchy
}

// A job position defined within an OU type, carrying a clearance level.
export interface Position {
  id: string;
  name: string;
  ou_id: string; // OU type that defines this position
  clearance: number; // 1–5 clearance level associated with this position
}

// Represents the relationship of a user to an OUI at a specific position.
export interface UserOuiAssignment {
  user_id: string;
  oui_id: string;
  position_id: string;
}

// ── OU (Org Unit type) ────────────────────────────────────────────────────────

// Fetch all OU types (the structural templates, not concrete instances).
export async function fetchOrgUnits(token: string | null): Promise<OrgUnit[]> {
  const res = await fetch(`${API_BASE}/org-units`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch org units");
  return res.json();
}

// Create a new OU type, optionally nested under a parent OU type.
export async function createOrgUnit(
  payload: { name: string; parent_id?: string },
  token: string | null,
): Promise<OrgUnit> {
  const res = await fetch(`${API_BASE}/org-units`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create org unit");
  }
  return res.json();
}

// Delete an OU type by ID.
export async function deleteOrgUnit(id: string, token: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/org-units/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to delete org unit");
  }
}

// ── OUI (Org Unit Instance) ───────────────────────────────────────────────────

// Fetch all concrete OUI instances across the organization.
export async function fetchOrgUnitInstances(token: string | null): Promise<OrgUnitInstance[]> {
  const res = await fetch(`${API_BASE}/org-unit-instances`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch OUI");
  return res.json();
}

// Create a new OUI instance under a specific OU type, with optional parent OUI links.
export async function createOrgUnitInstance(
  payload: { name: string; ou_id: string; parent_oui_ids: string[] },
  token: string | null,
): Promise<OrgUnitInstance> {
  const res = await fetch(`${API_BASE}/org-unit-instances`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create OUI");
  }
  return res.json();
}

// Update an OUI instance's parent_oui_ids (full replacement).
export async function updateOrgUnitInstance(
  id: string,
  payload: { parent_oui_ids: string[] },
  token: string | null,
): Promise<OrgUnitInstance> {
  const res = await fetch(`${API_BASE}/org-unit-instances/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update OUI");
  }
  return res.json();
}

// Delete an OUI instance by ID.
export async function deleteOrgUnitInstance(id: string, token: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/org-unit-instances/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to delete OUI");
  }
}

// ── Position ──────────────────────────────────────────────────────────────────

// Fetch all positions defined across all OU types.
export async function fetchPositions(token: string | null): Promise<Position[]> {
  const res = await fetch(`${API_BASE}/positions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

// Create a new position within an OU type with the given name and clearance level.
export async function createPosition(
  payload: { name: string; ou_id: string; clearance: number },
  token: string | null,
): Promise<Position> {
  const res = await fetch(`${API_BASE}/positions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create position");
  }
  return res.json();
}

// Update a position's name or clearance level (full replacement — PUT semantics).
export async function updatePosition(
  id: string,
  payload: { name: string; ou_id: string; clearance: number },
  token: string | null,
): Promise<Position> {
  const res = await fetch(`${API_BASE}/positions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update position");
  }
  return res.json();
}

// ── Assign / Unassign user ────────────────────────────────────────────────────

// Assign a user to an OUI at a specific position.
export async function assignUserToOui(
  payload: { user_id: string; oui_id: string; position_id: string },
  token: string | null,
): Promise<{ status: string; user_id: string; oui: string; position: string }> {
  const res = await fetch(`${API_BASE}/users/assign-oui`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to assign user");
  }
  return res.json();
}

// Remove a user from an OUI (clears their position assignment in that unit).
export async function unassignUserFromOui(
  payload: { user_id: string; oui_id: string },
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/unassign-oui`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to unassign user");
  }
}

// Change the position of a user who is already assigned to an OUI.
export async function changeUserPosition(
  userId: string,
  ouiId: string,
  positionId: string,
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${userId}/oui/${ouiId}/position`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId, oui_id: ouiId, position_id: positionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to change position");
  }
}
