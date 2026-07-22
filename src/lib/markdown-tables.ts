/**
 * Repair table rows that were concatenated into one line by extraction or an
 * LLM fallback. Valid Markdown tables are returned unchanged.
 */
function parsePipeRow(fragment: string): string[] | null {
  let value = fragment.trim();
  if (!value.includes("|")) return null;
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  const cells = value.split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function normalizeCollapsedLine(line: string): string {
  if (!line.includes("|") || !line.includes("---")) return line;

  const fragments = line.split(/\|\s*\|/);
  const rows = fragments.map(parsePipeRow);
  if (rows.length < 2 || rows.some((row) => row === null)) return line;

  const parsedRows = rows as string[][];
  const isSeparator = (cell: string) => /^:?-{3,}:?$/.test(cell);
  if (!parsedRows[1].every(isSeparator)) return line;
  if (parsedRows[0].length !== parsedRows[1].length) return line;
  if (parsedRows.some((row) => row.length !== parsedRows[0].length)) return line;

  return parsedRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

export function normalizeMarkdownTables(text: string): string {
  let value = text.replace(/\r\n?/g, "\n");
  if (!value.includes("\n") && value.includes("\\n")) {
    value = value.replaceAll("\\n", "\n");
  }
  return value.split("\n").map(normalizeCollapsedLine).join("\n");
}
