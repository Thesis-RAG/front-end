import { useState } from "react";
import { X, Eye, Plus, FileText, FileCode2, File } from "lucide-react";
import { Citation } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { openDocumentFile } from "@/services/documents.api";
import { fetchDocumentFileAsText } from "@/services/documents.api";
import { toast } from "@/hooks/use-toast";

interface SourcesPanelProps {
  citations: Citation[];
  onClose: () => void;
  token: string;
  query?: string;
  /** Called when user clicks "+" to add a source to context (future feature) */
  onAddToContext?: (citation: Citation) => void;
  onAttachFile?: (text: string, fileName: string) => void;
}

function getFileIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return FileCode2;
  if (lower.endsWith(".pdf")) return FileText;
  return File;
}

function getFileTypeLabel(title: string) {
  const lower = title.toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc"))
    return "Microsoft Word (docx)";
  if (lower.endsWith(".pdf")) return "PDF document";
  return "Document";
}

/** Vietnamese stop-words + common English stop-words to ignore */
const STOP_WORDS = new Set([]);

/** Extract meaningful keywords from a query — simple unigrams only */
function extractKeywords(query: string): string[] {
  if (!query) return [];
  const tokens = query
    .toLowerCase()
    .split(/[\s,.\-?!;:()"']+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return [...new Set(tokens)];
}

/** Check if text contains at least one keyword */
function textContainsKeyword(text: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/** Find the best excerpt window (up to ~200 chars) that contains a keyword */
function getBestExcerptWindow(excerpt: string, keywords: string[]): string {
  if (!keywords.length || !excerpt) return excerpt;
  const lower = excerpt.toLowerCase();
  let bestIdx = -1;
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }
  if (bestIdx === -1) return excerpt;
  const windowSize = 200;
  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(excerpt.length, start + windowSize);
  const slice = excerpt.slice(start, end);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < excerpt.length ? "..." : "";
  return prefix + slice + suffix;
}

/** Highlight keywords in text, returning an array of React-renderable parts */
function highlightKeywords(
  text: string,
  keywords: string[],
): Array<{ text: string; highlight: boolean }> {
  if (!keywords.length || !text) {
    return [{ text, highlight: false }];
  }

  const lowerText = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];

  // 1. Tìm tất cả match
  keywords.forEach((kw) => {
    const lowerKw = kw.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = lowerText.indexOf(lowerKw, startIndex);
      if (index === -1) break;

      ranges.push({
        start: index,
        end: index + lowerKw.length,
      });

      startIndex = index + 1;
    }
  });

  if (!ranges.length) {
    return [{ text, highlight: false }];
  }

  // 2. Sort
  ranges.sort((a, b) => a.start - b.start);

  // 3. Merge nếu gần nhau (<= 2 ký tự)
  const merged: typeof ranges = [];
  const GAP = 2; // 👈 chỉnh độ “dính”

  for (const r of ranges) {
    if (!merged.length) {
      merged.push(r);
      continue;
    }

    const last = merged[merged.length - 1];

    if (r.start <= last.end + GAP) {
      // gần nhau → merge
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push(r);
    }
  }

  // 4. Build result
  const result: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  for (const r of merged) {
    if (r.start > lastIndex) {
      result.push({
        text: text.slice(lastIndex, r.start),
        highlight: false,
      });
    }

    result.push({
      text: text.slice(r.start, r.end),
      highlight: true,
    });

    lastIndex = r.end;
  }

  if (lastIndex < text.length) {
    result.push({
      text: text.slice(lastIndex),
      highlight: false,
    });
  }

  return result;
}

/** Rendered excerpt with keyword highlights */
function HighlightedExcerpt({
  text,
  keywords,
}: {
  text: string;
  keywords: string[];
}) {
  const parts = highlightKeywords(text, keywords);
  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-800/60 text-foreground rounded-[2px] px-0.5"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function SourcesPanel({
  citations,
  onClose,
  token,
  query = "",
  onAddToContext,
  onAttachFile,
}: SourcesPanelProps) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const keywords = extractKeywords(query);

  // Filter: only show citations whose excerpt (or title) contains a keyword
  // If no keywords extracted (very short / stop-word-only query), show all
  const filteredCitations =
    keywords.length > 0
      ? citations.filter(
          (c) =>
            textContainsKeyword(c.excerpt ?? "", keywords) ||
            textContainsKeyword(c.documentTitle ?? "", keywords) ||
            textContainsKeyword(c.sectionPath ?? "", keywords),
        )
      : citations;

  const handleOpenFile = async (citation: Citation) => {
    if (!citation.versionId) {
      toast({ variant: "destructive", title: "No file version available" });
      return;
    }
    setOpeningId(citation.id);
    try {
      await openDocumentFile(citation.documentId, citation.versionId, token);
    } catch {
      toast({ variant: "destructive", title: "Cannot open document" });
    } finally {
      setOpeningId(null);
    }
  };

  const handleAddToContext = async (citation: Citation) => {
    if (!onAttachFile) {
      toast({ title: "Coming soon" });
      return;
    }
    if (!citation.versionId) {
      toast({ variant: "destructive", title: "No file version available" });
      return;
    }
    setAttachingId(citation.id);
    try {
      const { text, fileName } = await fetchDocumentFileAsText(
        citation.documentId,
        citation.versionId,
        token,
      );
      const name = citation.documentTitle || fileName;
      onAttachFile(text, name);
      toast({ title: `Attached: ${name}` });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Cannot attach file" });
    } finally {
      setAttachingId(null);
    }
  };

  return (
    <div className="flex h-full w-[380px] flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Sources</span>
          {filteredCitations.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {filteredCitations.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <p className="px-1 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            From company data
          </p>

          {filteredCitations.length === 0 && (
            <p className="px-1 py-4 text-xs text-muted-foreground text-center">
              No sources matched the query keywords.
            </p>
          )}

          {filteredCitations.map((citation) => {
            const Icon = getFileIcon(citation.documentTitle);
            const typeLabel = getFileTypeLabel(citation.documentTitle);
            const pct = citation.relevance
              ? Math.round(citation.relevance * 100)
              : null;
            const isExpanded = expandedId === citation.id;

            // Get the best window of excerpt that contains a keyword
            const displayExcerpt = getBestExcerptWindow(
              citation.excerpt ?? "",
              keywords,
            );

            return (
              <div
                key={citation.id}
                className={cn(
                  "group rounded-lg border border-border bg-background transition-colors",
                  isExpanded && "border-primary/30",
                )}
              >
                {/* Card header row */}
                <div
                  className="flex flex-col p-3 cursor-pointer relative"
                  onClick={() => setExpandedId(isExpanded ? null : citation.id)}
                >
                  {/* ROW 1: Type label + relevance + action buttons */}
                  <div className="flex items-center mb-2 w-full">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 dark:bg-blue-950/30">
                      <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-[11px] text-muted-foreground">
                        {typeLabel}
                      </span>

                      {pct !== null && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-[11px] text-muted-foreground">
                            {pct}%
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div
                      className="flex items-center gap-1 shrink-0 ml-auto justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={openingId === citation.id}
                        onClick={() => handleOpenFile(citation)}
                        title="Open document"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleAddToContext(citation)}
                        disabled={attachingId !== null}
                        title="Add to context"
                      >
                        {attachingId === citation.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ROW 2: Title */}
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <p className="text-sm font-semibold leading-snug truncate flex-1">
                      <HighlightedExcerpt
                        text={citation.documentTitle}
                        keywords={keywords}
                      />
                    </p>
                  </div>

                  {/* ROW 3: Excerpt snippet with keyword highlight */}
                  {displayExcerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      <HighlightedExcerpt
                        text={displayExcerpt}
                        keywords={keywords}
                      />
                    </p>
                  )}
                </div>

                {/* Expanded: full excerpt */}
                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-2 space-y-2 animate-fade-in">
                    {citation.sectionPath && (
                      <p className="text-xs text-muted-foreground italic">
                        {citation.sectionPath}
                      </p>
                    )}
                    {citation.excerpt && (
                      <div className="rounded-md bg-muted/60 p-2.5 text-xs leading-relaxed text-foreground">
                        <HighlightedExcerpt
                          text={citation.excerpt}
                          keywords={keywords}
                        />
                      </div>
                    )}
                    {pct !== null && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          Relevance:
                        </span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {citations.some((c) => c.documentId) && (
            <>
              <p className="px-1 pt-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {/* Other sources */}
              </p>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
