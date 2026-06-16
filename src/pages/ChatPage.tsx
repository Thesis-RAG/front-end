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
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleToggleOui = (id: string) => {
    setSelectedOuiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleGetConversationMessage = async (conversationId?: string) => {
    if (!conversationId) return;
    const result = await getListConversationMessage(conversationId, token);
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
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
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
        {messages.length === 0 ? (
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
              {chatMode === "rag" ? "Trợ lý RAG SMEs" : "Trợ lý AI"}
            </h2>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              {chatMode === "rag"
                ? "Hãy đặt câu hỏi về các quy trình, chính sách và kiến thức doanh nghiệp."
                : "Trợ lý AI đa năng. Hỏi tôi bất cứ điều gì."}
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-3xl">
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
                    }}
                    onFeedback={(messageId, helpful) =>
                      console.log("Feedback:", { messageId, helpful })
                    }
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
        />
      )}
    </div>
  );
}
