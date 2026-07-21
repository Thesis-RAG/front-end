/** SourcesPanel: slide-in panel showing RAG citation cards with keyword-highlighted excerpts, relevance scores, and file actions. */
import { useState, useEffect } from "react";
import { X, Eye, Plus, FileText, FileCode2, File, Mail } from "lucide-react";
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
  hoveredCitationId?: string | null;
  focusCitationId?: string | null;
}

// Return true if the citation originates from Gmail (documentId starts with "gmail_").
function isGmailSource(citation: Citation) {
  return citation.documentId?.startsWith("gmail_");
}

// Return the appropriate icon component based on the citation source type and file extension.
function getFileIcon(citation: Citation) {
  if (isGmailSource(citation)) return Mail;
  const lower = (citation.documentTitle ?? "").toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return FileCode2;
  if (lower.endsWith(".pdf")) return FileText;
  return File;
}

// Return a human-readable file type label for the citation source.
function getFileTypeLabel(citation: Citation) {
  if (isGmailSource(citation)) return "Gmail";
  const lower = (citation.documentTitle ?? "").toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc"))
    return "Microsoft Word";
  if (lower.endsWith(".pdf")) return "Tài liệu PDF";
  return "Tài liệu";
}

// Stop-words filtered out during keyword extraction (placeholder — currently empty).
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
  if (!excerpt) return "";

  // Hard upper bound — avoids very long strings with no spaces.
  const MAX_LEN = 150;

  if (!keywords.length) return excerpt.slice(0, MAX_LEN);

  const lower = excerpt.toLowerCase();
  let bestIdx = -1;
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
  }

  if (bestIdx === -1) return excerpt.slice(0, MAX_LEN);

  const start = Math.max(0, bestIdx - 40);
  const end = Math.min(excerpt.length, start + MAX_LEN);
  const slice = excerpt.slice(start, end);
  return (start > 0 ? "..." : "") + slice + (end < excerpt.length ? "..." : "");
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

  // 1. Collect all keyword match ranges.
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

  // 2. Sort ranges by start position.
  ranges.sort((a, b) => a.start - b.start);

  // 3. Merge overlapping or adjacent ranges (gap ≤ GAP characters).
  const merged: typeof ranges = [];
  const GAP = 2;

  for (const r of ranges) {
    if (!merged.length) {
      merged.push(r);
      continue;
    }

    const last = merged[merged.length - 1];

    if (r.start <= last.end + GAP) {
      // Overlapping or close — extend the last range.
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push(r);
    }
  }

  // 4. Build the annotated segment list.
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

interface MdSegment { text: string; bold: boolean; italic: boolean }

/** Split a single line into bold/italic segments by parsing ***…***, **…**, *…* markers */
function parseInlineMd(line: string): MdSegment[] {
  const segs: MdSegment[] = [];
  // Match ***…*** first, then **…**, then *…* — non-greedy, same line
  const re = /(\*{3})((?:(?!\*{3}).)+?)(\*{3})|(\*{2})((?:(?!\*{2}).)+?)(\*{2})|(\*)((?:(?!\*).)+?)(\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), bold: false, italic: false });
    if (m[1])      segs.push({ text: m[2], bold: true,  italic: true  }); // ***…***
    else if (m[4]) segs.push({ text: m[5], bold: true,  italic: false }); // **…**
    else if (m[7]) segs.push({ text: m[8], bold: false, italic: true  }); // *…*
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last), bold: false, italic: false });
  return segs;
}

/** Rendered excerpt with keyword highlights, newline-to-br, and inline bold/italic markdown */
function HighlightedExcerpt({
  text,
  keywords,
}: {
  text: string;
  keywords: string[];
}) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const mdSegs = parseInlineMd(line);
        const nodes = mdSegs.map((seg, si) => {
          const kwParts = highlightKeywords(seg.text, keywords);
          const inner = kwParts.map((p, pi) =>
            p.highlight ? (
              <mark key={pi} className="bg-yellow-200 dark:bg-yellow-800/60 text-foreground rounded-[2px] px-0.5">
                {p.text}
              </mark>
            ) : (
              <span key={pi}>{p.text}</span>
            )
          );
          if (seg.bold && seg.italic) return <strong key={si}><em>{inner}</em></strong>;
          if (seg.bold) return <strong key={si}>{inner}</strong>;
          if (seg.italic) return <em key={si}>{inner}</em>;
          return <span key={si}>{inner}</span>;
        });
        return (
          <span key={li}>
            {nodes}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

/** Detect Markdown table format: 2+ lines that start and end with | */
function isMarkdownTable(text: string): boolean {
  const pipeLines = text.split('\n').filter(l => {
    const t = l.trim();
    return t.startsWith('|') && t.endsWith('|');
  });
  return pipeLines.length >= 2;
}

/** Parse and render a Markdown table excerpt with keyword highlights */
function MarkdownTableExcerpt({ text, keywords }: { text: string; keywords: string[] }) {
  const parseRow = (line: string) =>
    line.trim().split('|').slice(1, -1).map(c => c.trim());

  const isSeparator = (line: string) =>
    parseRow(line).every(c => /^[-:]+$/.test(c));

  // Split lines into prose and table segments preserving order
  const lines = text.split('\n');
  type Seg = { type: 'prose' | 'table'; lines: string[] };
  const segments: Seg[] = [];
  let cur: Seg | null = null;

  for (const line of lines) {
    const t = line.trim();
    const isRow = t.startsWith('|') && t.endsWith('|');
    const type = isRow ? 'table' : 'prose';
    if (!cur || cur.type !== type) {
      if (cur) segments.push(cur);
      cur = { type, lines: [line] };
    } else {
      cur.lines.push(line);
    }
  }
  if (cur) segments.push(cur);

  return (
    <div className="space-y-2">
      {segments.map((seg, si) => {
        if (seg.type === 'prose') {
          const prose = seg.lines.join('\n').trim();
          if (!prose) return null;
          return (
            <p key={si} className="text-[11px] font-semibold text-foreground/50">
              <HighlightedExcerpt text={prose} keywords={keywords} />
            </p>
          );
        }

        // Parse table: strip separator rows, split into header + data
        const tableRows = seg.lines
          .filter(l => { const t = l.trim(); return t.startsWith('|') && t.endsWith('|'); })
          .filter(l => !isSeparator(l))
          .map(parseRow);

        if (tableRows.length === 0) return null;
        const [headerRow, ...dataRows] = tableRows;
        const ncols = Math.max(headerRow.length, ...dataRows.map(r => r.length));

        if (ncols <= 2) {
          // Key-value layout
          return (
            <div key={si} className="space-y-1.5">
              {headerRow && dataRows.length > 0 && (
                <div className="flex gap-2 text-[10px] text-muted-foreground/50 pb-0.5 border-b border-border/30 font-medium">
                  {headerRow.map((h, i) => (
                    <span key={i} className={i === 0 ? "shrink-0 w-[120px]" : "flex-1"}>
                      <HighlightedExcerpt text={h} keywords={keywords} />
                    </span>
                  ))}
                </div>
              )}
              {dataRows.map((row, ri) => (
                <div key={ri} className="flex gap-2 text-[11.5px] leading-snug">
                  <span className="font-semibold text-foreground/60 shrink-0 w-[120px] truncate">
                    <HighlightedExcerpt text={row[0] ?? ''} keywords={keywords} />
                  </span>
                  <span className="text-foreground/90 min-w-0 break-words flex-1">
                    <HighlightedExcerpt text={row[1] ?? ''} keywords={keywords} />
                  </span>
                </div>
              ))}
            </div>
          );
        }

        // Multi-column: compact HTML table
        return (
          <div key={si} className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border/40">
                  {headerRow.map((h, i) => (
                    <th key={i} className="text-left pr-3 pb-1 font-semibold text-foreground/50">
                      <HighlightedExcerpt text={h} keywords={keywords} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/20">
                    {Array.from({ length: ncols }).map((_, ci) => (
                      <td key={ci} className="pr-3 py-0.5 text-foreground/85">
                        <HighlightedExcerpt text={row[ci] ?? ''} keywords={keywords} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** Detect if text is table-like: many lines extracted from a table (alternating field/value) */
function isTableLike(text: string): boolean {
  // Don't use plain-text parser for markdown tables
  if (isMarkdownTable(text)) return false;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 4) return false;
  // Numbered/lettered list items (e.g. "8.1.", "(a)", "a)") are NOT tables
  const listPattern = /^\*{0,3}\d[\d.]*[.)]\s|^\*{0,3}\([a-z]\)\s|^\*{0,3}[a-z][.)]\s/i;
  const listLines = lines.filter(l => listPattern.test(l));
  if (listLines.length / lines.length >= 0.35) return false;
  const shortLines = lines.filter(l => l.length < 40);
  return shortLines.length / lines.length >= 0.4;
}

/** Renders table-like text as compact key-value rows */
function TableExcerpt({ text, keywords }: { text: string; keywords: string[] }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Strip leading numbered section headings like "2. Thông tin nhân viên"
  // These appear when the chunk includes a section title before the table rows
  const headings: string[] = [];
  let dataStart = 0;
  while (dataStart < lines.length && /^\d+[.)]\s*\S/.test(lines[dataStart])) {
    headings.push(lines[dataStart]);
    dataStart++;
  }
  const dataLines = lines.slice(dataStart);

  // Score alignment at offset 0 vs 1 on the remaining data lines
  const scoreAlignment = (startIdx: number) => {
    let score = 0;
    for (let i = startIdx; i + 1 < dataLines.length; i += 2) {
      if (dataLines[i].length < dataLines[i + 1].length) score += 2;
      else if (dataLines[i].length === dataLines[i + 1].length) score += 1;
    }
    return score;
  };

  // After stripping headings, check if there's still an off-by-one (e.g. "Mục\nNội dung" column headers)
  const extraHeading = dataLines.length > 2 && scoreAlignment(1) > scoreAlignment(0)
    ? dataLines[0]
    : null;
  const pairStart = extraHeading !== null ? 1 : 0;

  const pairs: [string, string][] = [];
  for (let i = pairStart; i < dataLines.length; i += 2) {
    pairs.push([dataLines[i], dataLines[i + 1] ?? '']);
  }

  return (
    <div className="space-y-1.5">
      {headings.map((h, idx) => (
        <p key={`h-${idx}`} className="text-[11px] font-semibold text-foreground/50 pb-1 mb-0.5 border-b border-border/40">
          <HighlightedExcerpt text={h} keywords={keywords} />
        </p>
      ))}
      {extraHeading && (
        <p className="text-[10px] text-muted-foreground/60 italic pb-0.5">
          <HighlightedExcerpt text={extraHeading} keywords={keywords} />
        </p>
      )}
      {pairs.map(([key, val], idx) => (
        <div key={idx} className="flex gap-2 text-[11.5px] leading-snug">
          <span className="font-semibold text-foreground/60 shrink-0 w-[120px] truncate">
            <HighlightedExcerpt text={key} keywords={keywords} />
          </span>
          {val && (
            <span className="text-foreground/90 min-w-0 break-words">
              <HighlightedExcerpt text={val} keywords={keywords} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Citation sources panel: lists filtered citations with excerpt preview, relevance bar, and file actions.
export function SourcesPanel({
  citations,
  onClose,
  token,
  query = "",
  onAddToContext,
  onAttachFile,
  hoveredCitationId,
  focusCitationId,
}: SourcesPanelProps) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  // Auto-expand the citation card when opened via a citation badge click; "Nguồn" button passes null → no expand.
  useEffect(() => {
    if (focusCitationId) setExpandedId(focusCitationId);
  }, [focusCitationId]);

  const keywords = extractKeywords(query);

  // Filter citations to those whose excerpt, title, or section path contains a query keyword; show all when no keywords.
  const filteredCitations =
    keywords.length > 0
      ? citations.filter(
          (c) =>
            textContainsKeyword(c.excerpt ?? "", keywords) ||
            textContainsKeyword(c.documentTitle ?? "", keywords) ||
            textContainsKeyword(c.sectionPath ?? "", keywords),
        )
      : citations;

  // Request a pre-signed download URL and open the source document in a new browser tab.
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

  // Download the cited document as plain text and attach it to the chat input as context.
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
    <div className="flex h-full w-[380px] min-w-0 max-w-full flex-col border-l border-border bg-card animate-slide-in-right overflow-hidden shadow-card-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-200">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-sm text-foreground">Nguồn tham chiếu</span>
          {filteredCitations.length > 0 && (
            <span className="text-[11px] font-bold bg-gray-200 px-2 py-0.5 rounded-full">
              {filteredCitations.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full hover:bg-muted"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="p-3 space-y-2 w-full" style={{ maxWidth: "380px" }}>
          <p className="px-1 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Từ kho dữ liệu công ty
          </p>

          {filteredCitations.length === 0 && (
            <div className="px-2 py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Không tìm thấy nguồn phù hợp. Hãy thử điều chỉnh câu hỏi để có kết quả tốt hơn.
              </p>
            </div>
          )}

          {filteredCitations.map((citation) => {
            const Icon = getFileIcon(citation);
            const typeLabel = getFileTypeLabel(citation);
            const pct = citation.relevance
              ? Math.round(citation.relevance * 100)
              : null;
            const isExpanded = expandedId === citation.id;

            // Expanded excerpt: skip leading sectionPath if it duplicates what's shown above (UI only)
            const excerptForDisplay = (() => {
              const exc = citation.excerpt ?? "";
              const sp = citation.sectionPath?.trim();
              if (sp && exc.trimStart().startsWith(sp)) {
                return exc.trimStart().slice(sp.length).replace(/^[\s\n]+/, "");
              }
              return exc;
            })();

            return (
              <div
                key={citation.id}
                className={cn(
                  "group rounded-xl border border-border bg-card shadow-card transition-all duration-150 overflow-hidden hover:shadow-card-md hover:border-border",
                  isExpanded && "border-primary/30 shadow-card-md",
                  hoveredCitationId === citation.id &&
                    "bg-primary/5 border-primary/40 shadow-card-md ring-1 ring-primary/20",
                )}
              >
                {/* Card header row */}
                <div
                  className="flex flex-col p-3 cursor-pointer relative min-w-0 w-full"
                  onClick={() => setExpandedId(isExpanded ? null : citation.id)}
                >
                  {/* ROW 1: Type label + relevance + action buttons */}
                  <div className="flex items-center mb-2 w-full">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        isGmailSource(citation)
                          ? "bg-red-100"
                          : "bg-blue-100",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          isGmailSource(citation)
                            ? "text-red-600"
                            : "text-blue-700",
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 min-w-0 overflow-hidden flex-1">
                      <span className="text-[11px] text-muted-foreground truncate font-medium">
                        {typeLabel}
                      </span>

                      {pct !== null && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className={cn(
                            "text-[11px] font-semibold",
                            pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-muted-foreground",
                          )}>
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
                      {!isGmailSource(citation) && !citation.docRestricted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                          disabled={openingId === citation.id}
                          onClick={() => handleOpenFile(citation)}
                          title="Mở tài liệu"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      {!isGmailSource(citation) && !citation.docRestricted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleAddToContext(citation)}
                          disabled={attachingId !== null}
                          title="Thêm vào ngữ cảnh"
                        >
                          {attachingId === citation.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ROW 2: Title — no keyword highlight */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug truncate">
                      {(citation.documentTitle ?? "").slice(0, 80)}
                    </p>
                  </div>

                  {/* ROW 3: Section header — visible when collapsed, with keyword highlight */}
                  {citation.sectionPath && !isExpanded && (
                    <p className="mt-1.5 text-xs font-medium text-foreground/70 truncate">
                      <HighlightedExcerpt
                        text={citation.sectionPath}
                        keywords={keywords}
                      />
                    </p>
                  )}
                </div>

                {/* Expanded: full excerpt */}
                {isExpanded && (
                  <div className="border-t border-border/60 bg-muted/30 px-3 pb-3 pt-2.5 space-y-2.5 animate-fade-in">
                    {citation.sectionPath && (
                      <p className="text-[11px] text-muted-foreground italic font-medium">
                        {citation.sectionPath}
                      </p>
                    )}
                    {excerptForDisplay && (
                      <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-foreground/85 break-words">
                        {isMarkdownTable(excerptForDisplay) ? (
                          <MarkdownTableExcerpt text={excerptForDisplay} keywords={keywords} />
                        ) : isTableLike(excerptForDisplay) ? (
                          <TableExcerpt text={excerptForDisplay} keywords={keywords} />
                        ) : (
                          <HighlightedExcerpt text={excerptForDisplay} keywords={keywords} />
                        )}
                      </div>
                    )}
                    {pct !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                          Độ tương đồng
                        </span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-primary",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[11px] font-bold",
                          pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-primary",
                        )}>{pct}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
