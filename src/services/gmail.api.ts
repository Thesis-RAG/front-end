import { ENV } from "@/config/env";

const BASE = ENV.API_BASE_URL;

export async function getGmailAuthUrl(token: string): Promise<string> {
  const res = await fetch(`${BASE}/gmail/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.url;
}

export async function gmailCallback(code: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/gmail/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function getGmailStatus(token: string): Promise<boolean> {
  const res = await fetch(`${BASE}/gmail/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.connected;
}

export async function fetchGmailEmails(token: string): Promise<any[]> {
  const res = await fetch(`${BASE}/gmail/emails`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function syncGmailEmails(token: string): Promise<{ synced: number; skipped: number }> {
  const res = await fetch(`${BASE}/gmail/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function disconnectGmail(token: string): Promise<void> {
  const res = await fetch(`${BASE}/gmail/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}