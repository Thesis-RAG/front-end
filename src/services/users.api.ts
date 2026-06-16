const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type { OuiPositionInfo } from "@/types";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  status: "active" | "inactive";
  oui_positions: OuiPositionInfo[];
  max_clearance: number;
  is_corp_member: boolean;
}

export async function fetchUsers(token: string | null): Promise<UserRecord[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

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
