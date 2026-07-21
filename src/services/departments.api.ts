/** Departments API — CRUD for organizational department records. */
import { ENV } from "@/config/env";

const API_BASE = ENV.API_BASE_URL;

// Represents a department along with its aggregate counts.
export interface Department {
  id: string;
  name: string;
  project_count: number;
  user_count: number;
}

// Fetch all departments.
export async function fetchDepartments(
  token: string | null,
): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

// Create a new department with the given name.
export async function createDepartment(
  name: string,
  token: string | null,
): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create department");
  }
  return res.json();
}
