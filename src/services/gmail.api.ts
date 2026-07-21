/** Gmail API — link, sync, and manage the user's Gmail account via OAuth. */
import { ENV } from "@/config/env";

// Base URL shorthand for this module.
const BASE = ENV.API_BASE_URL;

// Fetch the Google OAuth authorization URL to begin the Gmail linking flow.
export async function getGmailAuthUrl(token: string): Promise<string> {
  const res = await fetch(`${BASE}/gmail/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.url;
}

// Exchange an OAuth authorization code for Gmail access; stored server-side.
export async function gmailCallback(code: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/gmail/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Return true if the current user has an active Gmail connection.
export async function getGmailStatus(token: string): Promise<boolean> {
  const res = await fetch(`${BASE}/gmail/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.connected;
}

// Fetch the list of Gmail emails that have been synced to the backend.
export async function fetchGmailEmails(token: string): Promise<any[]> {
  const res = await fetch(`${BASE}/gmail/emails`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Trigger a Gmail inbox sync; returns counts of newly synced and skipped emails.
export async function syncGmailEmails(token: string): Promise<{ synced: number; skipped: number }> {
  const res = await fetch(`${BASE}/gmail/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Sync a single email by message_id into the RAG pipeline.
export async function syncSingleEmail(
  token: string,
  messageId: string,
): Promise<{ synced: number; skipped: number; already_synced: boolean }> {
  const res = await fetch(`${BASE}/gmail/sync/${encodeURIComponent(messageId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Unlink the current user's Gmail account and remove stored credentials.
export async function disconnectGmail(token: string): Promise<void> {
  const res = await fetch(`${BASE}/gmail/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
