import { useState } from "react";
import {
  PenSquare,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Conversation } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { user } = useAuth();

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    const diffDays = Math.floor(
      (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";

    return date.toLocaleDateString();
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce(
    (groups, conv) => {
      const dateLabel = formatDate(conv.updatedAt);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(conv);
      return groups;
    },
    {} as Record<string, Conversation[]>,
  );

  // Sort conversations inside each group (newest first)
  Object.values(groupedConversations).forEach((convs) =>
    convs.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  );

  // Create an ordered list of groups: Today, Yesterday, then the rest by newest first
  const sortOrder = (label: string) => {
    if (label === "Today") return 0;
    if (label === "Yesterday") return 1;
    return 2;
  };

  const sortedGroupEntries = Object.entries(groupedConversations).sort(
    (a, b) => {
      const [labelA, convsA] = a;
      const [labelB, convsB] = b;
      const orderA = sortOrder(labelA);
      const orderB = sortOrder(labelB);
      if (orderA !== orderB) return orderA - orderB;
      // If both labels are neither Today nor Yesterday, sort by newest conversation in the group
      const timeA = convsA.length ? new Date(convsA[0].updatedAt).getTime() : 0;
      const timeB = convsB.length ? new Date(convsB[0].updatedAt).getTime() : 0;
      return timeB - timeA;
    },
  );

  const displayName: string =
    (user as any)?.full_name ??
    (user as any)?.name ??
    (user as any)?.email ??
    "Người dùng";
  const initials = displayName.trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-background">
      {/* Branding header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground tracking-tight">Gần đây</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          onClick={onNewConversation}
          title="Cuộc trò chuyện mới"
        >
          <PenSquare className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 pb-4 scrollbar-thin">
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Chưa có cuộc trò chuyện nào.
            <br />
            Nhấn <span className="font-medium text-primary">+</span> để bắt đầu.
          </p>
        )}
        {sortedGroupEntries.map(([dateLabel, convs]) => (
          <div key={dateLabel} className="mb-4">
            <h3 className="mb-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {dateLabel}
            </h3>
            <ul className="space-y-0.5">
              {convs.map((conv) => (
                <li key={conv.id}>
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveEdit(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(conv.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm ring-1 ring-primary/20 outline-none"
                      autoFocus
                    />
                  ) : (
                    <div
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 cursor-pointer",
                        activeConversationId === conv.id
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                      )}
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <MessageSquare className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        activeConversationId === conv.id ? "text-primary" : "text-muted-foreground",
                      )} />
                      <span className="flex-1 truncate text-[13px]">{conv.title}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-md text-muted-foreground">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleStartEdit(conv)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Đổi tên
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteConversation(conv.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </div>
  );
}
