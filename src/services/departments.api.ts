const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface Department {
  id: string;
  name: string;
  project_count: number;
  user_count: number; 
}

export async function fetchDepartments(
  token: string | null,
): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

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
