/** DocTabContent: tab panel with search/filter toolbar and a DocumentTable. */
import { useState, useMemo, useEffect } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SENSITIVITY_LEVEL } from "@/types";
import { DocumentRead } from "@/types/documents";
import { DocumentTable, DocumentTableBaseProps } from "./DocumentTable";

interface DocTabContentProps extends DocumentTableBaseProps {
  docs: DocumentRead[];
  showOwner?: boolean;
  maxClearance: number;
}

export function DocTabContent({
  docs,
  showOwner = false,
  maxClearance,
  ...tableProps
}: DocTabContentProps) {
  const { orgUnitInstances } = tableProps as any;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sensitivityFilter, setSensitivityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"alphabet" | "sensitivity" | "oui">("alphabet");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // BFS order of OUI IDs based on org tree (parent_oui_ids defines the tree).
  const ouiBfsOrder = useMemo<Map<string, number>>(() => {
    if (!orgUnitInstances?.length) return new Map();
    const instances: { id: string; parent_oui_ids: string[] }[] = orgUnitInstances;

    // Build children map: parentId → child ids
    const children = new Map<string | null, string[]>();
    const allIds = new Set(instances.map((o) => o.id));
    for (const node of instances) {
      // Root: none of its parents exist in the set
      const parentId = node.parent_oui_ids.find((p) => allIds.has(p) && p !== node.id) ?? null;
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId)!.push(node.id);
    }

    // BFS from roots (null parent), level by level
    const order = new Map<string, number>();
    let rank = 0;
    const queue: string[] = [...(children.get(null) ?? [])];
    while (queue.length) {
      const id = queue.shift()!;
      order.set(id, rank++);
      queue.push(...(children.get(id) ?? []));
    }
    return order;
  }, [orgUnitInstances]);

  // Reset to page 1 whenever filters or sort change.
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, sensitivityFilter, sortBy, pageSize]);

  const filtered = useMemo(() => {
    const base = docs.filter((d) => {
      const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      const matchSens = sensitivityFilter === "all" || String(d.sensitivity) === sensitivityFilter;
      return matchSearch && matchStatus && matchSens;
    });

    return [...base].sort((a, b) => {
      const senCmp = Number(a.sensitivity) - Number(b.sensitivity);
      const alphaCmp = a.title.localeCompare(b.title, "vi");

      if (sortBy === "alphabet") {
        return alphaCmp !== 0 ? alphaCmp : senCmp;
      }
      if (sortBy === "sensitivity") {
        return senCmp !== 0 ? senCmp : alphaCmp;
      }
      // oui: min DFS rank among doc's oui_ids, tiebreaker sensitivity then alphabet
      const rankA = Math.min(...(a.oui_ids.length ? a.oui_ids.map((id) => ouiBfsOrder.get(id) ?? 9999) : [9999]));
      const rankB = Math.min(...(b.oui_ids.length ? b.oui_ids.map((id) => ouiBfsOrder.get(id) ?? 9999) : [9999]));
      const ouiCmp = rankA - rankB;
      return ouiCmp !== 0 ? ouiCmp : senCmp !== 0 ? senCmp : alphaCmp;
    });
  }, [docs, search, statusFilter, sensitivityFilter, sortBy, ouiBfsOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDocs = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function getPageNumbers(cur: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4)        return [1, 2, 3, 4, 5, "…", total];
    if (cur >= total - 3) return [1, "…", total-4, total-3, total-2, total-1, total];
    return [1, "…", cur - 1, cur, cur + 1, "…", total];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            className="pl-9 h-9 placeholder:text-[12.5px] rounded-lg"
          />
        </div>
        <div className="h-6 w-px bg-border" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[170px] px-3 text-[12.5px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="review">Đang xem xét</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="uploaded">Đã tải lên</SelectItem>
            <SelectItem value="archived">Lưu trữ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sensitivityFilter} onValueChange={setSensitivityFilter}>
          <SelectTrigger className="h-9 w-[170px] px-3 text-[12.5px]">
            <SelectValue placeholder="Độ nhạy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            {Object.entries(SENSITIVITY_LEVEL)
              .filter(([k]) => Number(k) <= maxClearance)
              .map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "alphabet" | "sensitivity" | "oui")}>
            <SelectTrigger className="h-9 w-[170px] px-3 text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabet">Tên (A → Z)</SelectItem>
              <SelectItem value="sensitivity">Độ nhạy tăng dần</SelectItem>
              <SelectItem value="oui">Đơn vị (BFS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DocumentTable docs={paginatedDocs} showOwner={showOwner} {...tableProps} />

      {/* Pagination footer */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="ml-2 text-[12.5px] text-muted-foreground shrink-0">
          Hiển thị {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} đến {Math.min(safePage * pageSize, filtered.length)} trong tổng số {filtered.length.toLocaleString("vi-VN")} tài liệu
        </p>

        <div className="flex items-center gap-1">
          {/* Prev */}
          <button
            disabled={safePage === 1}
            onClick={() => setCurrentPage(safePage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ‹
          </button>

          {getPageNumbers(safePage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p as number)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                  p === safePage
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage(safePage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ›
          </button>

          {/* Page size */}
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="ml-2 h-8 w-[110px] px-3 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
