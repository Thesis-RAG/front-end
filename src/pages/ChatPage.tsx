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
  const handleCitationClick = (citations: Citation[], citationId: string) => {
    setOpenSources(citations);
    setHoveredCitationId(citationId);
    setFocusCitationId(citationId); // triggers auto-expand in panel
  };

  const handleToggleOui = (id: string) => {
    setSelectedOuiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleGetConversationMessage = async (conversationId?: string) => {
    if (!conversationId) return;
    const result = await getListConversationMessage(conversationId, token);

    const mapped: ChatMessageType[] = [];

    for (const item of result) {
      // Luôn push user message
      mapped.push({
        id: item.messageId,
        role: "user",
        content: item.content,
        timestamp: item.createdAt,
      });

      // Chỉ push assistant nếu có nội dung thật
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
          })),
          traceId: item.traceId,
          status: assistant.status ?? "success",
        });
      }
      // Nếu assistant null/rỗng → không push gì, user message đứng một mình
    }

    // Không sort — backend đã trả đúng thứ tự theo created_at của user message
    setMessages(mapped);
    return mapped;
  };

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

      // Tính allowed OUI ids giống DocumentsPage
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    handleGetConversationMessage(id);
    setOpenSources(null);
  };

  const handleRenameConversation = async (id: string, title: string) => {
    await updateConversation(activeConversationId, { title }, token);
    setConversations(
      conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  };

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
              ? "bg-primary/10 text-primary"
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
                  ? "bg-gradient-to-br from-primary/20 to-blue-500/10"
                  : "bg-gradient-to-br from-teal-500/20 to-emerald-500/10",
              )}>
                {chatMode === "rag" ? (
                  <BookOpen className="h-9 w-9 text-primary" />
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
              {chatMode === "rag" ? (
                <>
                  {["Chính sách bảo mật thông tin?", "Quy trình phê duyệt hợp đồng?", "Điều khoản hợp đồng mẫu?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendMessage(q)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-card hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {["Tóm tắt tài liệu", "Phân tích dữ liệu", "Soạn thảo văn bản"].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendMessage(q)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-card hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </>
              )}
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
                    userQuery={userQuery}
                    onSourcesClick={(citations) => {
                      setOpenSources((prev) =>
                        prev === citations ? null : citations,
                      );
                      setOpenSourcesQuery(userQuery);
                      setFocusCitationId(null); // Nguồn button: no auto-expand
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
