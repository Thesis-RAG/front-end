const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  clearance_level: string;
  department_id: string | null;
  department_name?: string;
  status: "active" | "inactive";
}

export interface RoleRecord { id: string; name: string; }
export interface ClearanceRecord { id: string; name: string; level: number; }

export async function fetchUsers(token: string | null): Promise<UserRecord[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchRoles(token: string | null): Promise<RoleRecord[]> {
  const res = await fetch(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

export async function fetchClearanceLevels(token: string | null): Promise<ClearanceRecord[]> {
  const res = await fetch(`${API_BASE}/clearance-levels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch clearance levels");
  return res.json();
}

export async function updateUser(
  userId: string,
  payload: { role?: string; clearance_level?: string; status?: string },
  token: string | null,
): Promise<UserRecord> {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update user");
  }
  return res.json();
}

export async function createUser(
  payload: {
    email: string; name: string; password: string;
    role: string; clearance_level: string; department_id: string;
  },
  token: string | null,
): Promise<UserRecord> {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create user");
  }
  return res.json();
}

export async function fetchUserDepartments(
  userId: string,
  token: string | null,
): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user departments");
  return res.json();
}

export async function updateUserDepartments(
  userId: string,
  departmentIds: string[],
  token: string | null,
): Promise<UserRecord[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/departments`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ department_ids: departmentIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update departments");
  }
  return res.json();
}