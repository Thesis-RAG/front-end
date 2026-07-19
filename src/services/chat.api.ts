/** Chat API — conversation lifecycle, streaming RAG responses, and document search. */
import { ENV } from "@/config/env";

// Payload for creating or renaming a conversation.
type CreateConversationPayload = {
  title: string;
};

// Create a new conversation with the given title.
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

// Update a conversation's title.
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

// Permanently delete a conversation and all its messages.
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

// Post a non-streaming message to a conversation and return the assistant reply.
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

// Fetch all conversations belonging to a specific user.
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

// Fetch the full message history for a conversation.
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

/**
 * Post a message and stream the assistant reply via SSE.
 * Calls onToken for each streamed text token, and onDone when the stream ends.
 * Supports optional OUI filters, chat mode (rag/chatbot), file attachment, and source scope.
 */
export async function postMessageStream(
  conversationId: string,
  content: string,
  token: string,
  onToken: (text: string) => void,
  onDone: (data: {
    content: string;
    sources: any[];
    messageId: string;
    applied_rules?: any[];
  }) => void,
  filters?: { oui_ids?: string[] },
  mode: "rag" | "chatbot" = "rag",
  fileContent?: string,
  fileName?: string,
  chatSource: "rag" | "gmail" | "all" = "rag",
  onPolicyRules?: (rules: any[]) => void,
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

  // Read SSE chunks line by line and dispatch token/done events.
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
        } else if (event.type === "policy_rules") {
          onPolicyRules?.(event.rules ?? []);
        } else if (event.type === "done") {
          onDone(event);
        }
      } catch {}
    }
  }
}

// Run a semantic/keyword/hybrid search and return matching document chunks.
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

// Ask the LLM to auto-generate a short conversation title from the first message.
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
  // Fall back to the first 40 chars of the message if the API returns no title.
  return data.title ?? firstMessage.slice(0, 40);
}
