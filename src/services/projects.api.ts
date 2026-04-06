const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface Project {
  id: string;
  name: string;
  department_id: string;
  user_count: number;
}

export interface ProjectUser {
  id: string;
  name: string;
  email: string;
}

export async function fetchProjects(
  token: string | null,
  department_id?: string,
): Promise<Project[]> {
  const url = department_id
    ? `${API_BASE}/projects?department_id=${department_id}`
    : `${API_BASE}/projects`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProjectUsers(
  projectId: string,
  token: string | null,
): Promise<ProjectUser[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch project users");
  return res.json();
}

export async function updateProjectDepartment(
  projectId: string,
  departmentId: string,
  token: string | null,
): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/department`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ department_id: departmentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update department");
  }
  return res.json();
}

export async function updateProjectUsers(
  projectId: string,
  userIds: string[],
  token: string | null,
): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/users`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_ids: userIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update users");
  }
  return res.json();
}

export async function createProject(
  name: string,
  department_id: string,
  token: string | null,
): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, department_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create project");
  }
  return res.json();
}
