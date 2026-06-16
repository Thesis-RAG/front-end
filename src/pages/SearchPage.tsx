import { useEffect, useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  FileText,
  ExternalLink,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SensitivityLevelBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchMode, SensitivityLevel, SensitivityRank } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { searchDocuments } from "@/services/chat.api";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  OrgUnit,
  OrgUnitInstance,
} from "@/services/org_units.api";

interface SearchChunk {
  chunk_id: string;
  document_text: string;
  score: number;
  semantic_score: number;
  keyword_score: number;
  sources: string[];
  metadata: {
    document_id: string;
    document_title: string;
    document_type: string;
    sensitivity: number | string;
    department_id: string;
    page_start: number;
    page_end: number;
    chunk_index: number;
  };
}

// ── OUI accordion filter (giống DocumentsPage) ────────────────────────────────
function OuiFilterAccordion({
  orgUnits,
  orgUnitInstances,
  selectedOuiIds,
  onChange,
}: {
  orgUnits: OrgUnit[];
  orgUnitInstances: OrgUnitInstance[];
  selectedOuiIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [expandedOuId, setExpandedOuId] = useState<string | null>(null);

  const toggleOui = (id: string) => {
    onChange(
      selectedOuiIds.includes(id)
        ? selectedOuiIds.filter((x) => x !== id)
        : [...selectedOuiIds, id],
    );
  };

  const visibleOus = orgUnits.filter((ou) =>
    orgUnitInstances.some((o) => o.ou_id === ou.id),
  );

  return (
    <div className="border rounded-md bg-background divide-y">
      {visibleOus.length === 0 ? (
        <p className="text-xs text-muted-foreground px-3 py-2">
          Không có đơn vị nào
        </p>
      ) : (
        visibleOus.map((ou) => {
          const ouiList = orgUnitInstances.filter((o) => o.ou_id === ou.id);
          const isExpanded = expandedOuId === ou.id;
          const selectedCount = ouiList.filter((o) =>
            selectedOuiIds.includes(o.id),
          ).length;
          return (
            <div key={ou.id}>
              <button
                type="button"
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => setExpandedOuId(isExpanded ? null : ou.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[13px]">{ou.name}</span>
                  {selectedCount > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                      {selectedCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {isExpanded && (
                <div className="bg-muted/30 border-t">
                  {ouiList.map((oui) => {
                    const selected = selectedOuiIds.includes(oui.id);
                    return (
                      <button
                        key={oui.id}
                        type="button"
                        className="flex items-center w-full px-5 py-1.5 text-sm hover:bg-muted gap-2"
                        onClick={() => toggleOui(oui.id)}
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-input"}`}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span>{oui.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [results, setResults] = useState<SearchChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { token, user, isCorpMember } = useAuth();

  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>(
    [],
  );

  // Filters
  const [sensitivityLevelFilter, setSensitivityLevelFilter] = useState<
    SensitivityRank | "all"
  >("all");
  const [ouiFilter, setOuiFilter] = useState<string[]>([]);

  // OUI mà user có thể xem (giống DocumentsPage)
  const allowedOuiIds = useMemo(() => {
    if (!user || orgUnitInstances.length === 0) return new Set<string>();
    if (isCorpMember) return new Set(orgUnitInstances.map((o) => o.id));
    const userOuiIds = new Set(user.oui_positions.map((p) => p.oui_id));
    const allowed = new Set<string>(userOuiIds);
    const queue = [...userOuiIds];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      orgUnitInstances
        .filter((o) => o.parent_oui_ids.includes(currentId))
        .forEach((child) => {
          if (!allowed.has(child.id)) {
            allowed.add(child.id);
            queue.push(child.id);
          }
        });
    }
    return allowed;
  }, [user, isCorpMember, orgUnitInstances]);

  const allowedOrgUnitInstances = useMemo(
    () => orgUnitInstances.filter((o) => allowedOuiIds.has(o.id)),
    [orgUnitInstances, allowedOuiIds],
  );

  useEffect(() => {
    fetchOrgUnits(token)
      .then(setOrgUnits)
      .catch(() => {});
    fetchOrgUnitInstances(token)
      .then(setOrgUnitInstances)
      .catch(() => {});
  }, []);

  const containsKeyword = (text: string, q: string) => {
    if (!q) return true;
    const words = q.toLowerCase().split(/\s+/);
    const lower = text.toLowerCase();
    return words.every((w) => lower.includes(w));
  };

  const filteredResults = results.filter((r) => {
    const matchSensitivity =
      sensitivityLevelFilter === "all" ||
      Number(r.metadata.sensitivity) === sensitivityLevelFilter;
    const matchKeyword =
      searchMode !== "keyword" || containsKeyword(r.document_text, query);
    return matchSensitivity && matchKeyword;
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchDocuments(
        query,
        searchMode,
        token,
        10,
        ouiFilter.length > 0 ? ouiFilter : undefined,
      );
      setResults(data);
    } catch {
      toast({ variant: "destructive", title: "Tìm kiếm thất bại" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearFilters = () => {
    setSensitivityLevelFilter("all");
    setOuiFilter([]);
  };

  const activeFiltersCount = [
    sensitivityLevelFilter !== "all" ? 1 : 0,
    ouiFilter.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tìm kiếm"
        description="Tìm kiếm kiến thức dựa trên từ khóa hoặc ngữ nghĩa"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Search input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập từ khóa..."
                className="pl-10 pr-4"
              />
            </div>

            <Select
              value={searchMode}
              onValueChange={(v) => setSearchMode(v as SearchMode)}
            >
              <SelectTrigger className="w-36 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hybrid">Kết hợp</SelectItem>
                <SelectItem value="keyword">Từ khóa</SelectItem>
                <SelectItem value="semantic">Ngữ nghĩa</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="group gap-2 text-[12px]"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Bộ lọc
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-0 text-xs text-primary-foreground transition-colors group-hover:bg-white group-hover:text-primary">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <Button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="text-[12px]"
            >
              {isSearching ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </Button>
          </div>

          {/* Search mode + active filter chips */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <span className="text-[12px]">Chế độ:</span>
            <Badge variant="outline" className="font-normal">
              {searchMode === "hybrid"
                ? "Kết hợp"
                : searchMode === "keyword"
                  ? "Chỉ từ khóa"
                  : "Chỉ ngữ nghĩa"}
            </Badge>
            {sensitivityLevelFilter !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1 font-normal text-[11px]"
              >
                {sensitivityLevelFilter}
                <button onClick={() => setSensitivityLevelFilter("all")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {ouiFilter.length > 0 && (
              <Badge
                variant="secondary"
                className="gap-1 font-normal text-[11px]"
              >
                {ouiFilter.length} đơn vị
                <button onClick={() => setOuiFilter([])}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* Results */}
          <div className="mt-8">
            {isSearching ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border border-border p-4"
                  >
                    <div className="h-5 w-3/4 rounded bg-muted" />
                    <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
                    <div className="mt-3 h-16 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : hasSearched ? (
              results.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Tìm thấy {filteredResults.length} kết quả cho "{query}"
                  </p>
                  {filteredResults.map((result, idx) => (
                    <SearchResultCard
                      key={result.chunk_id ?? idx}
                      result={result}
                      query={query}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-medium">Không tìm thấy kết quả</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Hãy thay đổi từ khóa hoặc bộ lọc
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium">Bắt đầu tìm kiếm</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nhập từ khóa và nhấn Enter hoặc click Tìm kiếm
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Dialog — giữa màn hình */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Bộ lọc tìm kiếm</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-6">
            {/* Đơn vị tổ chức */}
            <div>
              <label className="text-sm font-medium">Đơn vị tổ chức</label>
              <div className="mt-2">
                <OuiFilterAccordion
                  orgUnits={orgUnits}
                  orgUnitInstances={allowedOrgUnitInstances}
                  selectedOuiIds={ouiFilter}
                  onChange={setOuiFilter}
                />
              </div>
            </div>

            {/* Mức độ nhạy cảm */}
            <div>
              <label className="text-sm font-medium">Mức độ nhạy cảm</label>
              <Select
                value={String(sensitivityLevelFilter)}
                onValueChange={(v) =>
                  setSensitivityLevelFilter(
                    v === "all" ? "all" : (Number(v) as SensitivityRank),
                  )
                }
              >
                <SelectTrigger className="mt-2 text-[12.5px]">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="1">Công khai</SelectItem>
                  <SelectItem value="2">Nội bộ</SelectItem>
                  <SelectItem value="3">Hạn chế</SelectItem>
                  <SelectItem value="4">Mật</SelectItem>
                  <SelectItem value="5">Tuyệt mật</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                className="w-full bg-destructive/30 text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors text-[12px]"
                onClick={clearFilters}
              >
                Xóa tất cả bộ lọc
              </Button>
            )}

            <Button
              className="w-full text-[12px]"
              onClick={() => {
                setFilterOpen(false);
                handleSearch();
              }}
            >
              Áp dụng & Tìm kiếm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SearchResultCard (giữ nguyên) ─────────────────────────────────────────────
function SearchResultCard({
  result,
  query,
}: {
  result: SearchChunk;
  query: string;
}) {
  const highlightText = (text: string) => {
    if (!query) return text;
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const lowerText = text.toLowerCase();
    let ranges: [number, number][] = [];
    words.forEach((word) => {
      let startIndex = 0;
      while (true) {
        const index = lowerText.indexOf(word, startIndex);
        if (index === -1) break;
        ranges.push([index, index + word.length]);
        startIndex = index + word.length;
      }
    });
    if (ranges.length === 0) return text;
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    let current = ranges[0];
    for (let i = 1; i < ranges.length; i++) {
      const next = ranges[i];
      if (next[0] <= current[1] + 1) {
        current[1] = Math.max(current[1], next[1]);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
    const result = [];
    let lastIndex = 0;
    merged.forEach(([start, end], i) => {
      if (start > lastIndex) result.push(text.slice(lastIndex, start));
      result.push(
        <mark key={i} className="bg-yellow-100 text-foreground rounded px-0.5">
          {text.slice(start, end)}
        </mark>,
      );
      lastIndex = end;
    });
    if (lastIndex < text.length) result.push(text.slice(lastIndex));
    return result;
  };

  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-foreground">
              {result.metadata.document_title}
            </h3>
            <SensitivityLevelBadge
              level={Number(result.metadata.sensitivity)}
            />
            <Badge variant="outline" className="text-xs font-normal">
              Trang {result.metadata.page_start}–{result.metadata.page_end}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Phân đoạn #{result.metadata.chunk_index}
            </Badge>
            {result.sources.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="text-[10px] font-semibold"
              >
                {s === "semantic" ? "Ngữ nghĩa" : "Từ khóa"}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Điểm</div>
            <div className="font-medium text-sm">
              {Math.round(result.score * 100)}%
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`/documents/${result.metadata.document_id}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground line-clamp-4">
        {highlightText(result.document_text)}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Từ khóa: {Math.round(result.keyword_score * 100)}%</span>
        <span>·</span>
        <span>Ngữ nghĩa: {Math.round(result.semantic_score * 100)}%</span>
      </div>
    </div>
  );
}
