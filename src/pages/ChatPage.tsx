import { useState, useRef, useEffect } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { CitationsPanel } from '@/components/chat/CitationsPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockConversations, mockMessages, mockCitations } from '@/data/mockData';
import { Conversation, ChatMessage as ChatMessageType, Citation } from '@/types';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    conversations[0]?.id
  );
  const [messages, setMessages] = useState<ChatMessageType[]>(mockMessages);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // In real app, load messages for this conversation
    if (id === mockConversations[0]?.id) {
      setMessages(mockMessages);
    } else {
      setMessages([]);
    }
    setSelectedCitation(null);
  };

  const handleRenameConversation = (id: string, title: string) => {
    setConversations(
      conversations.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(conversations.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(conversations[0]?.id);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate streaming response
    setIsStreaming(true);
    const assistantMessage: ChatMessageType = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Simulate streaming text
    const responseText = `Dựa trên tài liệu trong cơ sở tri thức, đây là câu trả lời cho câu hỏi của bạn:\n\n${content.length > 20 ? 'Tôi đã tìm thấy một số thông tin liên quan đến yêu cầu của bạn. Vui lòng xem các trích dẫn bên dưới để biết thêm chi tiết.' : 'Vui lòng cung cấp thêm thông tin để tôi có thể hỗ trợ bạn tốt hơn.'}`;

    let currentText = '';
    for (let i = 0; i < responseText.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      currentText += responseText[i];
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id ? { ...m, content: currentText } : m
        )
      );
    }

    // Complete the message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessage.id
          ? {
              ...m,
              isStreaming: false,
              citations: mockCitations,
              traceId: `trace-${Date.now().toString(36)}`,
              status: 'success' as const,
            }
          : m
      )
    );
    setIsStreaming(false);
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    console.log('Feedback:', { messageId, helpful });
    // In real app, send to backend
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
              I will answer based on approved documents and provide source citations.
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
