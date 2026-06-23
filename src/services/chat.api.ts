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

export async function postMessageStream(
  conversationId: string,
  content: string,
  token: string,
  onToken: (text: string) => void,
  onDone: (data: {
    content: string;
    sources: any[];
    messageId: string;
  }) => void,
  filters?: { oui_ids?: string[] },
  mode: "rag" | "chatbot" = "rag",
  fileContent?: string,
  fileName?: string,
  chatSource: "rag" | "gmail" | "all" = "rag",
) {
  const res = await fetch(
    `${ENV.API_BASE_URL}/conversations/${conversationId}/messages/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        oui_ids: filters?.oui_ids ?? null,
        mode,
        chat_source: chatSource,
        file_content: fileContent ?? null,
        file_name: fileName ?? null,
      }),
    },
  );

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "token") {
          onToken(event.text);
        } else if (event.type === "done") {
          onDone(event);
        }
      } catch {}
    }
  }
}

export async function searchDocuments(
  query: string,
  mode: string,
  token: string,
  topK: number = 10,
  ouiIds?: string[],
) {
  const res = await fetch(`${ENV.API_BASE_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, mode, top_k: topK, oui_ids: ouiIds ?? null }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


export async function generateConversationTitle(
  conversationId: string,
  firstMessage: string,
  token: string,
): Promise<string> {
  const res = await fetch(
    `${ENV.API_BASE_URL}/conversations/${conversationId}/generate-title`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ first_message: firstMessage }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.title ?? firstMessage.slice(0, 40);
}
