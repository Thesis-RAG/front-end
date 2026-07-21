/** Projects API — CRUD for projects and their user memberships within departments. */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Represents a project linked to a department.
export interface Project {
  id: string;
  name: string;
  department_id: string;
  user_count: number;
}

// Lightweight user record used within project membership lists.
export interface ProjectUser {
  id: string;
  name: string;
  email: string;
}

// Fetch all projects, optionally filtered to a specific department.
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

// Fetch users who are members of a specific project.
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

// Move a project to a different department.
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

// Replace the user membership list of a project with the given user IDs.
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

// Create a new project under a department.
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
