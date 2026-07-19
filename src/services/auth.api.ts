/** Authentication API — login and current-user profile endpoints. */
import { ENV } from "@/config/env";

// Authenticate with email and password; returns a JWT token payload on success.
export async function auth(payload: { email: string; password: string }) {
  const res = await fetch(`${ENV.API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

// Change the authenticated user's password.
export async function changePassword(
  token: string,
  oldPassword: string,
  newPassword: string,
) {
  const res = await fetch(`${ENV.API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Fetch the currently authenticated user's profile using a Bearer token.
export async function getMe(token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}
