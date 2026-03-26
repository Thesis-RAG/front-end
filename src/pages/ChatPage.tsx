import { useState, useRef, useEffect } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { CitationsPanel } from "@/components/chat/CitationsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { mockMessages } from "@/data/mockData";
import {
  Conversation,
  ChatMessage as ChatMessageType,
  Citation,
} from "@/types";
import { MessageSquare } from "lucide-react";
import {
  createConversation,
  postMessage,
  getListConversation,
  getListConversationMessage,
  updateConversation,
  deleteConversation,
} from "@/services/chat.api";
import { useAuth } from "@/contexts/AuthContext";

export default function ChatPage() {
  const { token, user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const handleGetConversation = async (userId: string) => {
    const result = await getListConversation(userId, token);

    return result.map((item: any) => ({
      id: item.id,
      title: item.title,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      messageCount: 0,
    }));
  };

  const handleGetConversationMessage = async (conversationId?: string) => {
    if (!conversationId) return;
    // fetch messages for a conversation
    const result = await getListConversationMessage(conversationId, token);

    // Map API response to ChatMessageType[]
    const mapped: ChatMessageType[] = result
      .flatMap((item: any) => {
        const userMsg: ChatMessageType = {
          id: item.messageId,
          role: "user",
          content: item.content,
          timestamp: item.createdAt,
        };

        const assistant = item.assistantMessage;
        const assistantMsg: ChatMessageType = {
          id: assistant?.id ?? `${item.messageId}-assistant`,
          role: "assistant",
          content: assistant?.content ?? "",
          timestamp: assistant?.createdAt ?? item.createdAt,
          citations: (item.sources || []).map((s: any, idx: number) => ({
            id: s.documentId + (s.versionId || "") + idx,
            documentId: s.documentId,
            documentTitle: s.documentTitle || s.documentId,
            versionId: s.versionId || "",
            sectionPath: s.sectionPath ?? "",
            excerpt: s.excerpt ?? "",
            surroundingContext: s.surroundingContext ?? "",
            relevance: s.relevance,
          })),
          traceId: item.traceId,
          status: assistant?.status ?? "success",
        };

        return [userMsg, assistantMsg];
      })
      // sort chronologically (oldest first)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    setMessages(mapped);
    return mapped;
  };

  useEffect(() => {
    const load = async () => {
      const list = await handleGetConversation(user.id);
      setConversations(list);
      // set first conversation as active and load its messages
      if (list.length) {
        setActiveConversationId(list[0].id);
        await handleGetConversationMessage(list[0].id);
      }
    };

    load();
    // only run on mount / when user or token changes
  }, [user.id, token]);

  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  // messages are loaded when activeConversationId is set (see useEffect above)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewConversation = async () => {
    const result = await createConversation(
      {
        title: "New conversation",
      },
      token,
    );

    const newConv: Conversation = {
      id: result.id,
      title: result.title,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      messageCount: 0,
    };

    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // load messages for selected conversation
    handleGetConversationMessage(id);
    setSelectedCitation(null);
  };

  const handleRenameConversation = async (id: string, title: string) => {
    const result = await updateConversation(
      activeConversationId,
      {
        title: title,
      },
      token,
    );
    setConversations(
      conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id, token);

    const remainingConversations = conversations.filter((c) => c.id !== id);
    setConversations(remainingConversations);

    const isDeletingActive = activeConversationId === id;

    if (isDeletingActive) {
      const nextActiveId = remainingConversations[0]?.id;
      setActiveConversationId(nextActiveId);
      setSelectedCitation(null);

      if (nextActiveId) {
        await handleGetConversationMessage(nextActiveId);
      } else {
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    let conversationId = activeConversationId;

    // N?u ch?a c? conversation n?o th? t?o m?i tr??c
    if (!conversationId) {
      const result = await createConversation(
        {
          title: "New conversation",
        },
        token,
      );

      const newConv: Conversation = {
        id: result.id,
        title: result.title,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        messageCount: 0,
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      conversationId = newConv.id;
    }

    const tempUserId = `user-${Date.now()}`;
    const tempAssistantId = `assistant-${Date.now()}`;

    const userMessage: ChatMessageType = {
      id: tempUserId,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const loadingMessage: ChatMessageType = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
      status: "loading",
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsStreaming(true);

    try {
      const result = await postMessage(conversationId, content, token);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId
            ? {
                ...m,
                content: result.assistantMessage.content,
                isStreaming: false,
                citations: result.sources,
                traceId: result.traceId.toString(36),
                status: result.assistantMessage.status ?? "success",
                timestamp: result.assistantMessage.createdAt,
              }
            : m,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId
            ? {
                ...m,
                content: "Error response from API.",
                isStreaming: false,
                status: "error",
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    console.log("Feedback:", { messageId, helpful });
    //TODO: In real app, send to backend
  };

  return (
    <div className="flex h-full">
      {/* Conversations sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Chat Assistant</h2>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Ask questions about processes, policies, and enterprise knowledge.
              I will answer based on approved documents and provide source
              citations.
            </p>
          </div>
        ) : (
          /* Messages */
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-3xl">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={handleCitationClick}
                  onFeedback={handleFeedback}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
        />
      </div>

      {/* Citations panel */}
      {selectedCitation && (
        <CitationsPanel
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
