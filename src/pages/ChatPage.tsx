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
import { MessageSquare, Filter, X, BookOpen, Bot } from "lucide-react";
import {
  createConversation,
  postMessageStream,
  getListConversation,
  getListConversationMessage,
  updateConversation,
  deleteConversation,
} from "@/services/chat.api";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects, Project } from "@/services/projects.api";
import { fetchDepartments, Department } from "@/services/departments.api";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [availableDepts, setAvailableDepts] = useState<Department[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [deptFilterOn, setDeptFilterOn] = useState(false);
  const [chatMode, setChatMode] = useState<"rag" | "chatbot">("rag");

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

  useEffect(() => {
    if (!user) return;
    fetchProjects(token)
      .then(setAvailableProjects)
      .catch(() => {});
    if (["admin_auditor", "director"].includes(user.role)) {
      fetchDepartments(token)
        .then(setAvailableDepts)
        .catch(() => {});
    }
  }, [user, token]);

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

    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      },
      {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
        status: "loading",
      },
    ]);
    setIsStreaming(true);

    try {
      await postMessageStream(
        conversationId!,
        content,
        token,
        // onToken — cập nhật từng token
        (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, content: m.content + text }
                : m,
            ),
          );
        },
        // onDone — finalize
        (data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? {
                    ...m,
                    content: data.content,
                    isStreaming: false,
                    status: "success",
                    citations: data.sources,
                  }
                : m,
            ),
          );
          setIsStreaming(false);
        },
        {
          project_ids:
            selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
          department_ids: getEffectiveDeptIds(),
        },
        chatMode,
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId
            ? { ...m, content: "Error.", isStreaming: false, status: "error" }
            : m,
        ),
      );
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

  const getEffectiveDeptIds = () => {
    if (!deptFilterOn) return undefined;
    if (["admin_auditor", "director"].includes(user?.role ?? "")) {
      return selectedDeptIds.length > 0 ? selectedDeptIds : undefined;
    }
    // employee/dept_manager → dùng dept của mình
    return user?.department ? [user.department] : undefined;
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
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                chatMode === "rag" ? "bg-primary/10" : "bg-teal-500/10",
              )}
            >
              {chatMode === "rag" ? (
                <BookOpen className="h-8 w-8 text-primary" />
              ) : (
                <Bot className="h-8 w-8 text-teal-600" />
              )}
            </div>
            <h2 className="mt-4 text-xl font-semibold">
              {chatMode === "rag" ? "RAG SMEs Assistant" : "Chatbot Assistant"}
            </h2>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              {chatMode === "rag"
                ? "Ask questions about processes, policies, and enterprise knowledge. Answers are based on approved documents with source citations."
                : "General-purpose AI assistant. Ask me anything — not limited to company documents."}
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
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          availableProjects={availableProjects}
          availableDepts={availableDepts}
          selectedProjectIds={selectedProjectIds}
          selectedDeptIds={selectedDeptIds}
          deptFilterOn={deptFilterOn}
          userRole={user?.role ?? ""}
          activeFilterCount={selectedProjectIds.length + (deptFilterOn ? 1 : 0)}
          chatMode={chatMode}
          onToggleProject={(id) =>
            setSelectedProjectIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
            )
          }
          onToggleDept={(id) =>
            setSelectedDeptIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
            )
          }
          onToggleDeptFilter={() => {
            setDeptFilterOn((v) => !v);
            if (deptFilterOn) setSelectedDeptIds([]);
          }}
          onToggleMode={() =>
            setChatMode((m) => (m === "rag" ? "chatbot" : "rag"))
          }
        />
      </div>

      {/* Citations panel */}
      {selectedCitation && (
        <CitationsPanel
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
          token={token}
        />
      )}
    </div>
  );
}
