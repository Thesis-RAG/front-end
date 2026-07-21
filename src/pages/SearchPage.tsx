/** SearchPage: full-text and semantic document search with OUI and sensitivity filters. */
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Search, FileText, SlidersHorizontal, X,
  Lightbulb, Clock, ArrowLeftRight, Filter, MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchMode, SensitivityRank } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { searchDocuments } from "@/services/chat.api";
import {
  createAccessRequest,
  fetchMyAccessRequests,
  AccessRequestRead,
} from "@/services/documents.api";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  OrgUnit,
  OrgUnitInstance,
} from "@/services/org_units.api";
import { SearchChunk } from "@/types/search";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchFilterDialog } from "@/components/search/SearchFilterDialog";

const HISTORY_KEY = "search_history_v1";
const MAX_HISTORY = 10;

interface HistoryEntry { query: string; time: string; }

function formatHistoryTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  const hhmm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Hôm nay, ${hhmm}`;
  if (diff === 1) return `Hôm qua, ${hhmm}`;
  return `${d.toLocaleDateString("vi-VN")}, ${hhmm}`;
}

export default function SearchPage() {
  // Search state
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [results, setResults] = useState<SearchChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Search history (localStorage)
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
    catch { return []; }
  });

  const addHistory = useCallback((q: string) => {
    setSearchHistory((prev) => {
      const filtered = prev.filter((e) => e.query !== q);
      const next = [{ query: q, time: new Date().toISOString() }, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setSearchHistory([]);
  };

  // Access request state
  const [accessRequestMap, setAccessRequestMap] = useState<Map<string, AccessRequestRead>>(new Map());
  const [requestingDocId, setRequestingDocId] = useState<string | null>(null);

  const { token, user, isCorpMember } = useAuth();

  // Org unit data
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>([]);

  // Filter state
  const [sensitivityLevelFilter, setSensitivityLevelFilter] = useState<SensitivityRank | "all">("all");
  const [ouiFilter, setOuiFilter] = useState<string[]>([]);

  // BFS over the OUI tree to collect all OUI IDs accessible to this user.
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

  // OUI instances the current user is allowed to see.
  const allowedOrgUnitInstances = useMemo(
    () => orgUnitInstances.filter((o) => allowedOuiIds.has(o.id)),
    [orgUnitInstances, allowedOuiIds],
  );

  // Apply sensitivity filter on top of search results.
  const filteredResults = results.filter((r) =>
    sensitivityLevelFilter === "all" ||
    Number(r.metadata.sensitivity) === sensitivityLevelFilter,
  );

  // Count of active filters for the badge on the filter button.
  const activeFiltersCount = [
    sensitivityLevelFilter !== "all" ? 1 : 0,
    ouiFilter.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Load org units on mount.
  useEffect(() => {
    fetchOrgUnits(token).then(setOrgUnits).catch(() => {});
    fetchOrgUnitInstances(token).then(setOrgUnitInstances).catch(() => {});
  }, []);

  // Sync the latest access requests whenever the token changes.
  useEffect(() => {
    fetchMyAccessRequests(token)
      .then((reqs) => {
        const map = new Map<string, AccessRequestRead>();
        for (const r of reqs) {
          const existing = map.get(r.document_id);
          if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
            map.set(r.document_id, r);
          }
        }
        setAccessRequestMap(map);
      })
      .catch(() => {});
  }, [token]);

  // Submit an access request for a restricted document.
  const handleRequestAccess = async (documentId: string) => {
    setRequestingDocId(documentId);
    try {
      const req = await createAccessRequest(documentId, token);
      setAccessRequestMap((prev) => new Map(prev).set(documentId, req));
      toast({ variant: "success", title: "Đã gửi yêu cầu xem tài liệu" });
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("409") || msg.toLowerCase().includes("pending")) {
        toast({ variant: "destructive", title: "Đã có yêu cầu đang chờ xử lý" });
      } else {
        toast({ variant: "destructive", title: "Không thể gửi yêu cầu", description: msg });
      }
    } finally {
      setRequestingDocId(null);
    }
  };

  // Run the search API with current query, mode, and OUI filter.
  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    if (overrideQuery) setQuery(overrideQuery);
    setIsSearching(true);
    setHasSearched(true);
    addHistory(q);
    try {
      const data = await searchDocuments(
        q,
        searchMode,
        token,
        15,
        ouiFilter.length > 0 ? ouiFilter : undefined,
      );
      setResults(data);
    } catch {
      toast({ variant: "destructive", title: "Tìm kiếm thất bại" });
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger search on Enter key.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Reset all active filters.
  const clearFilters = () => {
    setSensitivityLevelFilter("all");
    setOuiFilter([]);
  };

  const SEARCH_TIPS = [
    { icon: Search, title: "Sử dụng từ khóa ngắn gọn", desc: "Nhập các từ khóa quan trọng để tìm kết quả chính xác hơn." },
    { icon: ArrowLeftRight, title: "Kết hợp từ khóa", desc: "Thử kết hợp các từ đồng nghĩa hoặc liên quan." },
    { icon: Filter, title: "Dùng bộ lọc", desc: "Lọc theo loại dữ liệu, nguồn, thời gian để thu hẹp kết quả." },
    { icon: MessageSquare, title: "Tìm kiếm ngữ nghĩa", desc: "Hệ thống sẽ tìm các nội dung liên quan về ý nghĩa." },
  ];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tìm kiếm"
        description="Tìm kiếm kiến thức dựa trên từ khóa hoặc ngữ nghĩa"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main content (80%) ── */}
        <div className="w-4/5 overflow-auto p-6">
        <div className="w-full">
          {/* Search input row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập từ khóa..."
                className="pl-10 pr-4 placeholder:text-[13px] focus-visible:ring-gray-400"
              />
            </div>

            <Select
              value={searchMode}
              onValueChange={(v) => setSearchMode(v as SearchMode)}
            >
              <SelectTrigger className="w-36 text-[12px] hover:border-gray-400 focus:ring-gray-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="hover:bg-gray-200" value="hybrid">Kết hợp</SelectItem>
                <SelectItem className="hover:bg-gray-200" value="keyword">Từ khóa</SelectItem>
                <SelectItem className="hover:bg-gray-200" value="semantic">Ngữ nghĩa</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="group gap-2 text-[12px] hover:bg-gray-200 hover:text-gray-900 focus:ring-gray-400"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Bộ lọc
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 p-0 text-xs text-white transition-colors group-hover:bg-white group-hover:text-gray-900 border group-hover:border-gray-900">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => handleSearch()}
              disabled={!query.trim() || isSearching}
              className="text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-9"
            >
              {isSearching ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </Button>
          </div>

          {/* Active filter chips */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <span className="text-[12px]">Chế độ:</span>
            <Badge variant="outline" className="font-normal bg-gray-200 border border-gray-300">
              {searchMode === "hybrid"
                ? "Kết hợp"
                : searchMode === "keyword"
                  ? "Chỉ từ khóa"
                  : "Chỉ ngữ nghĩa"}
            </Badge>
            {sensitivityLevelFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal text-[11px]">
                {sensitivityLevelFilter}
                <button onClick={() => setSensitivityLevelFilter("all")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {ouiFilter.length > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal text-[11px]">
                {ouiFilter.length} đơn vị
                <button onClick={() => setOuiFilter([])}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* Results area */}
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
                      accessRequest={accessRequestMap.get(result.metadata.document_id)}
                      isRequesting={requestingDocId === result.metadata.document_id}
                      onRequestAccess={handleRequestAccess}
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
        </div>{/* end main overflow-auto */}

        {/* ── Right sidebar: tips + history ── */}
        {/* ── Right sidebar (20%) ── */}
        <div className="w-1/5 shrink-0 border-l border-border overflow-y-auto p-4 space-y-4">
          {/* Search tips card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              
              <span className="text-[15px] font-semibold text-gray-900">Gợi ý tìm kiếm</span>
            </div>
            <div className="space-y-3">
              {SEARCH_TIPS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search history card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                
                <span className="text-[15px] font-semibold text-gray-900">Lịch sử tìm kiếm</span>
              </div>
              {searchHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-primary font-semibold hover:text-foreground transition-colors"
                >
                  Xóa tất cả
                </button>
              )}
            </div>
            {searchHistory.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Chưa có lịch sử tìm kiếm.</p>
            ) : (
              <div className="space-y-0.5">
                {searchHistory.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(entry.query)}
                    className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60 transition-colors group"
                  >
                    <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate group-hover:text-gray-900">{entry.query}</p>
                      <p className="text-[10px] text-muted-foreground">{formatHistoryTime(entry.time)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>{/* end flex row */}

      <SearchFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        orgUnits={orgUnits}
        allowedOrgUnitInstances={allowedOrgUnitInstances}
        ouiFilter={ouiFilter}
        setOuiFilter={setOuiFilter}
        sensitivityLevelFilter={sensitivityLevelFilter}
        setSensitivityLevelFilter={setSensitivityLevelFilter}
        activeFiltersCount={activeFiltersCount}
        clearFilters={clearFilters}
        onSearch={handleSearch}
      />
    </div>
  );
}
