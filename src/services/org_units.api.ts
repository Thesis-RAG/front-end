const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrgUnit {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface OrgUnitInstance {
  id: string;
  name: string;
  ou_id: string;
  parent_oui_ids: string[];
}

export interface Position {
  id: string;
  name: string;
  ou_id: string;
  clearance: number;
}

export interface UserOuiAssignment {
  user_id: string;
  oui_id: string;
  position_id: string;
}

// ── OU (Org Unit type) ────────────────────────────────────────────────────────

export async function fetchOrgUnits(token: string | null): Promise<OrgUnit[]> {
  const res = await fetch(`${API_BASE}/org-units`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch org units");
  return res.json();
}

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

export async function fetchOrgUnitInstances(token: string | null): Promise<OrgUnitInstance[]> {
  const res = await fetch(`${API_BASE}/org-unit-instances`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch OUI");
  return res.json();
}

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

export async function fetchPositions(token: string | null): Promise<Position[]> {
  const res = await fetch(`${API_BASE}/positions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

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