/** Highlight utilities: term extraction, text highlighting, ReactNode traversal. */
import type { ReactNode } from "react";

// Split a query string into individual search terms (min 2 chars).
export function buildTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

// Wrap matching terms inside <mark> elements.
export function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const atom = escaped.join("|");
  // Merge consecutive terms (with spaces between) into one highlight block.
  const pattern = new RegExp(`((?:${atom})(?:\\s+(?:${atom}))*)`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// Apply HighlightedText to every string leaf inside a ReactNode tree.
export function applyHL(children: ReactNode, terms: string[]): ReactNode {
  if (!terms.length) return children;
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((child, i) =>
    typeof child === "string" ? (
      <HighlightedText key={i} text={child} terms={terms} />
    ) : (
      child
    ),
  );
}
