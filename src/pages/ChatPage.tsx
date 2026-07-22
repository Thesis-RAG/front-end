/** ChatPage: main chat interface with conversation management, RAG/chatbot toggle, streaming responses, and sources panel. */
import { useState, useRef, useEffect } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { SourcesPanel } from "@/components/chat/SourcesPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Conversation,
  ChatMessage as ChatMessageType,
  Citation,
  PolicyRule,
} from "@/types";
import { BookOpen, Bot } from "lucide-react";
import {
  createConversation,
  postMessageStream,
  getListConversation,
  getListConversationMessage,
  updateConversation,
  deleteConversation,
  generateConversationTitle,
} from "@/services/chat.api";
import { fetchOrgUnitInstances, fetchOrgUnits } from "@/services/org_units.api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Quick-start suggestion prompts shown on the RAG empty-state screen.
const RAG_SUGGESTIONS = [
  "Chính sách bảo mật thông tin?",
  "Quy trình phê duyệt hợp đồng?",
  "Điều khoản hợp đồng mẫu?",
];

// Quick-start suggestion prompts shown on the chatbot empty-state screen.
const CHATBOT_SUGGESTIONS = [
  "Tóm tắt tài liệu",
  "Phân tích dữ liệu",
  "Soạn thảo văn bản",
];

// Full-page chat view: conversation list sidebar, message thread, streaming input, and collapsible sources panel.
export default function ChatPage() {
  const { token, user, isCorpMember } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedOuiIds, setSelectedOuiIds] = useState<string[]>([]);
  const [chatSource, setChatSource] = useState<"rag" | "gmail" | "all">("rag");
  const [availableOuis, setAvailableOuis] = useState<
    { id: string; name: string; ou_name: string }[]
  >([]);
  const [chatMode, setChatMode] = useState<"rag" | "chatbot">("rag");
  const [pendingAttach, setPendingAttach] = useState<{
    text: string;
    name: string;
  } | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [openSources, setOpenSources] = useState<Citation[] | null>(null);
  const [openSourcesQuery, setOpenSourcesQuery] = useState<string>("");
  const [hoveredCitationId, setHoveredCitationId] = useState<string | null>(null);
  const [focusCitationId, setFocusCitationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Open the sources panel and auto-expand the clicked citation.
  const handleCitationClick = (citations: Citation[], citationId: string) => {
    setOpenSources(citations);
    setHoveredCitationId(citationId);
    setFocusCitationId(citationId);
  };

  // Toggle a single OUI filter on or off.
  const handleToggleOui = (id: string) => {
    setSelectedOuiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Fetch messages for a conversation and map them to the ChatMessageType shape.
  const handleGetConversationMessage = async (conversationId?: string) => {
    if (!conversationId) return;
    const result = await getListConversationMessage(conversationId, token);

    const mapped: ChatMessageType[] = [];

    for (const item of result) {
      // Always push the user turn.
      mapped.push({
        id: item.messageId,
        role: "user",
        content: item.content,
        timestamp: item.createdAt,
        attachedFileName: item.attachedFileName ?? undefined,
      });

      // Only push the assistant turn if it has real content.
      const assistant = item.assistantMessage;
      if (assistant?.content && assistant.content.trim().length > 0) {
        mapped.push({
          id: assistant.id,
          role: "assistant",
          content: assistant.content,
          timestamp: assistant.createdAt ?? item.createdAt,
          citations: (item.sources || []).map((s: any, idx: number) => ({
            id: s.documentId + (s.versionId || "") + idx,
            documentId: s.documentId,
            documentTitle: s.documentTitle || s.documentId,
            versionId: s.versionId || "",
            sectionPath: s.sectionPath ?? "",
            excerpt: s.excerpt ?? "",
            surroundingContext: s.surroundingContext ?? "",
            relevance: s.relevance,
            docRestricted: s.docRestricted ?? false,
          })),
          appliedRules: (item.appliedRules ?? assistant.appliedRules ?? []) as PolicyRule[],
          traceId: item.traceId,
          status: assistant.status ?? "success",
        });
      }
    }

    // No sort needed — backend returns messages in created_at order.
    setMessages(mapped);
    return mapped;
  };

  // Load the conversation list and available OUI filters on mount.
  useEffect(() => {
    const load = async () => {
      const result = await getListConversation(user.id, token);
      const list = result.map((item: any) => ({
        id: item.id,
        title: item.title,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        messageCount: 0,
      }));
      setConversations(list);
      if (list.length) {
        setActiveConversationId(list[0].id);
        await handleGetConversationMessage(list[0].id);
      }
      const [ouiList, ouList] = await Promise.all([
        fetchOrgUnitInstances(token),
        fetchOrgUnits(token),
      ]);

      // Build the set of OUI IDs accessible to this user, mirroring DocumentsPage logic.
      let allowedIds: Set<string>;

      if (isCorpMember) {
        allowedIds = new Set(ouiList.map((o: any) => o.id));
      } else {
        const userOuiIds = new Set(
          user.oui_positions.map((p: any) => p.oui_id),
        );
        allowedIds = new Set(userOuiIds);
        const queue = [...userOuiIds];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          ouiList
            .filter((o: any) => o.parent_oui_ids.includes(currentId))
            .forEach((child: any) => {
              if (!allowedIds.has(child.id)) {
                allowedIds.add(child.id);
                queue.push(child.id);
              }
            });
        }
      }

      setAvailableOuis(
        ouiList
          .filter((o: any) => allowedIds.has(o.id))
          .map((o: any) => ({
            id: o.id,
            name: o.name,
            ou_name: ouList.find((ou: any) => ou.id === o.ou_id)?.name ?? "",
          })),
      );
    };
    load();
  }, [user.id, token]);

  // Scroll to the latest message whenever the message list changes.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a new empty conversation and select it.
  const handleNewConversation = async () => {
    const result = await createConversation(
      { title: "Cuộc trò chuyện" },
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

  // Switch the active conversation and load its messages.
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    handleGetConversationMessage(id);
    setOpenSources(null);
  };

  // Persist a title change for a conversation.
  const handleRenameConversation = async (id: string, title: string) => {
    await updateConversation(activeConversationId, { title }, token);
    setConversations(
      conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  };

  // Delete a conversation and select the next available one.
  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id, token);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      const nextId = remaining[0]?.id;
      setActiveConversationId(nextId);
      setOpenSources(null);
      if (nextId) await handleGetConversationMessage(nextId);
      else setMessages([]);
    }
  };

  // Send a message: creates a conversation if needed, optimistically appends both turns, then streams the response.
  const handleSendMessage = async (
    content: string,
    fileContent?: string,
    fileName?: string,
  ) => {
    let conversationId = activeConversationId;
    const isFirstMessage =
      messages.filter((m) => m.role === "user").length === 0;

    if (!conversationId) {
      const result = await createConversation(
        { title: "Cuộc trò chuyện" },
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
        attachedFileName: fileName,
      },
      {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
        status: "loading",
        mode: chatMode,
      },
    ]);
    setIsStreaming(true);

    try {
      await postMessageStream(
        conversationId!,
        content,
        token,
        (text) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, content: m.content + text }
                : m,
            ),
          ),
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
                    appliedRules: (data.applied_rules ?? (m.appliedRules ?? [])) as PolicyRule[],
                  }
                : m,
            ),
          );
          setIsStreaming(false);
          if (isFirstMessage) {
            generateConversationTitle(conversationId!, content, token)
              .then((title) => {
                setConversations((convs) =>
                  convs.map((c) =>
                    c.id === conversationId ? { ...c, title } : c,
                  ),
                );
              })
              .catch((err) => {
                console.error("generateConversationTitle failed", err);
              });
          }
        },
        { oui_ids: selectedOuiIds.length > 0 ? selectedOuiIds : undefined },
        chatMode,
        fileContent,
        fileName,
        chatSource,
        (rules) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, appliedRules: rules as PolicyRule[] }
                : m,
            ),
          );
        },
      );
    } catch {
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

  // Mark streaming as stopped and finalize any in-progress assistant message.
  const handleStopStreaming = () => {
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/60 bg-background/95 backdrop-blur-sm shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {conversations.find((c) => c.id === activeConversationId)?.title ??
                (chatMode === "rag" ? "Trợ lý RAG SMEs" : "Trợ lý AI")}
            </h1>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0",
            chatMode === "rag"
              ? "bg-blue-500/10 text-blue-600"
              : "bg-teal-500/10 text-teal-600",
          )}>
            {chatMode === "rag" ? <BookOpen className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
            {chatMode === "rag" ? "RAG SMEs" : "Chatbot"}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 select-none">
            <div className="relative mb-6">
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl shadow-card-md",
                chatMode === "rag"
                  ? "bg-gradient-to-br from-blue-500/20 to-blue-400/10"
                  : "bg-gradient-to-br from-teal-500/20 to-emerald-500/10",
              )}>
                {chatMode === "rag" ? (
                  <BookOpen className="h-9 w-9 text-blue-600" />
                ) : (
                  <Bot className="h-9 w-9 text-teal-600" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {chatMode === "rag" ? "Trợ lý RAG SMEs" : "Trợ lý AI"}
            </h2>
            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground leading-relaxed">
              {chatMode === "rag"
                ? "Đặt câu hỏi về quy trình, chính sách và kiến thức doanh nghiệp."
                : "Trợ lý AI đa năng. Hỏi tôi bất cứ điều gì."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
              {(chatMode === "rag" ? RAG_SUGGESTIONS : CHATBOT_SUGGESTIONS).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-card hover:border-blue-400/50 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-3xl pt-2">
              {messages.map((message, idx) => {
                const userQuery =
                  message.role === "assistant" &&
                  idx > 0 &&
                  messages[idx - 1].role === "user"
                    ? messages[idx - 1].content
                    : "";
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    chatMode={chatMode}
                    userQuery={userQuery}
                    onSourcesClick={(citations) => {
                      setOpenSources((prev) =>
                        prev === citations ? null : citations,
                      );
                      setOpenSourcesQuery(userQuery);
                      setFocusCitationId(null);
                    }}
                    onFeedback={(messageId, helpful) =>
                      console.log("Feedback:", { messageId, helpful })
                    }
                    onCitationHover={setHoveredCitationId}
                    onCitationClick={(citations, citationId) => {
                      handleCitationClick(citations, citationId);
                      setOpenSourcesQuery(userQuery);
                    }}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          chatMode={chatMode}
          externalAttach={pendingAttach}
          onToggleMode={() =>
            setChatMode((m) => (m === "rag" ? "chatbot" : "rag"))
          }
          onExternalAttachConsumed={() => setPendingAttach(null)}
          selectedOuiIds={selectedOuiIds}
          availableOuis={availableOuis}
          onToggleOui={handleToggleOui}
          chatSource={chatSource}
          onChangeChatSource={setChatSource}
        />
      </div>
      {openSources && (
        <SourcesPanel
          citations={openSources}
          onClose={() => {
            setOpenSources(null);
            setOpenSourcesQuery("");
          }}
          token={token}
          query={openSourcesQuery}
          onAttachFile={(text, name) => setPendingAttach({ text, name })}
          hoveredCitationId={hoveredCitationId}
          focusCitationId={focusCitationId}
        />
      )}
    </div>
  );
}
