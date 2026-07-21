/** Users API — fetch, create, and update user accounts. */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type { OuiPositionInfo } from "@/types";

// Full user record including org-unit assignments and max clearance level.
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  status: "active" | "inactive";
  oui_positions: OuiPositionInfo[]; // org-unit instances and positions the user belongs to
  max_clearance: number; // highest clearance level across all assigned positions
  is_corp_member: boolean; // true if the user is a top-level corporate member
}

// Fetch all user records visible to the caller.
export async function fetchUsers(token: string | null): Promise<UserRecord[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

// Create a new user account with email, display name, and initial password.
export async function createUser(
  payload: { email: string; name: string; password: string },
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

// Partially update a user record (e.g., toggle active/inactive status).
export async function updateUser(
  userId: string,
  payload: { status?: string },
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
