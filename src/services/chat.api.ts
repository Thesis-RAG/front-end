import { ENV } from "@/config/env";

type CreateConversationPayload = {
  title: string;
};

export async function createConversation(
  payload: CreateConversationPayload,
  token: string,
) {
  const res = await fetch(`${ENV.API_BASE_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: payload.title,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function updateConversation(
  conversationId: string,
  payload: CreateConversationPayload,
  token: string,
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: payload.title,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function deleteConversation(
  conversationId: string,
  token: string,
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/conversations/${conversationId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function postMessage(
  conversationId: string,
  content: string,
  token: string,
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getListConversation(userId: string, token: string) {
  const res = await fetch(`${ENV.API_BASE_URL}/users/${userId}/conversations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getListConversationMessage(
  conversationId: string,
  token: string,
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/conversations/${conversationId}/messages`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}
