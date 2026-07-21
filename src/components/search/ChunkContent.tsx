/** ChunkContent: renders a search chunk's text — detects pipe-table syntax and renders it as HTML; falls back to ReactMarkdown for prose. */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { HighlightedText, applyHL } from "./highlight";

export function ChunkContent({ text, terms = [] }: { text: string; terms?: string[] }) {
  const isPipeRow = (line: string) => {
    const t = line.trim();
    return t.startsWith("|") && t.lastIndexOf("|") > 0;
  };
  const parseCells = (line: string) =>
    line.trim().split("|").map((c) => c.trim()).filter(Boolean);
  const isAlignRow = (cells: string[]) =>
    cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));

  type Seg =
    | { type: "table"; rows: string[][] }
    | { type: "text"; line: string };

  const lines = text.split("\n");
  const segments: Seg[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Format 1: single line with || row separators.
    if (trimmed.includes("||")) {
      const rawRows = trimmed
        .split("||")
        .map((r) => r.split("|").map((c) => c.trim()).filter(Boolean))
        .filter((r) => r.length > 0);
      if (rawRows.length >= 2) {
        segments.push({ type: "table", rows: rawRows });
        i++;
        continue;
      }
    }

    // Format 2: consecutive lines each starting/ending with |.
    if (isPipeRow(line)) {
      const tableRows: string[][] = [];
      while (i < lines.length && isPipeRow(lines[i])) {
        const cells = parseCells(lines[i]);
        if (!isAlignRow(cells)) tableRows.push(cells);
        i++;
      }
      if (tableRows.length >= 2) {
        segments.push({ type: "table", rows: tableRows });
        continue;
      }
      tableRows.forEach((row) =>
        segments.push({ type: "text", line: "| " + row.join(" | ") + " |" }),
      );
      continue;
    }

    segments.push({ type: "text", line });
    i++;
  }

  return (
    <div className="text-[13px] space-y-1.5">
      {segments.map((seg, idx) => {
        if (seg.type === "table") {
          const [header, ...body] = seg.rows;
          return (
            <div key={idx} className="overflow-x-auto rounded border border-border">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-muted">
                    {header.map((h, j) => (
                      <th
                        key={j}
                        className="px-3 py-2 text-left font-semibold text-foreground border-b border-border"
                      >
                        <HighlightedText text={h} terms={terms} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, j) => (
                    <tr
                      key={j}
                      className={cn(
                        "border-b border-border last:border-0",
                        j % 2 === 1 && "bg-muted/30",
                      )}
                    >
                      {row.map((cell, k) => (
                        <td
                          key={k}
                          className="px-3 py-1.5 text-muted-foreground align-top"
                        >
                          <HighlightedText text={cell} terms={terms} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const t = seg.line.trim();
        if (!t) return <div key={idx} className="h-0.5" />;

        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="my-0 leading-relaxed text-muted-foreground">{applyHL(children, terms)}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{applyHL(children, terms)}</strong>
              ),
              h1: ({ children }) => (
                <h1 className="text-sm font-semibold text-foreground">{applyHL(children, terms)}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-[13px] font-semibold text-foreground">{applyHL(children, terms)}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[13px] font-medium text-foreground">{applyHL(children, terms)}</h3>
              ),
            }}
          >
            {seg.line}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
