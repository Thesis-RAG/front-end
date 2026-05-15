import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  FileText,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  StatusBadge,
  SensitivityLevelBadge,
} from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchMode, DocumentStatus, SensitivityLevel } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { searchDocuments } from "@/services/chat.api";
import { fetchDepartments, Department } from "@/services/departments.api";

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
    sensitivity_level: string;
    department_id: string;
    page_start: number;
    page_end: number;
    chunk_index: number;
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [results, setResults] = useState<SearchChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { token, hasPermission } = useAuth();
  const canEdit = hasPermission("documents.edit");
  const hasLevelConfidential = hasPermission("documents.confidential");
  const hasLevelRestricted = hasPermission("documents.restricted");
  const hasLevelTopSecret = hasPermission("documents.top_secret");

  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">(
    "all",
  );
  const [sensitivityLevelFilter, setSensitivityLevelFilter] = useState<
    SensitivityLevel | "all"
  >("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const containsKeyword = (text: string, query: string) => {
    if (!query) return true;

    const words = query.toLowerCase().split(/\s+/);
    const lowerText = text.toLowerCase();

    // tất cả từ phải xuất hiện (AND logic)
    return words.every((w) => lowerText.includes(w));
  };
  const filteredResults = results.filter((r) => {
    const matchSensitivity =
      sensitivityLevelFilter === "all" ||
      r.metadata.sensitivity_level === sensitivityLevelFilter;

    const matchDept =
      departmentFilter === "all" ||
      r.metadata.department_id === departmentFilter;

    const matchKeyword =
      searchMode !== "keyword" || containsKeyword(r.document_text, query);

    return matchSensitivity && matchDept && matchKeyword;
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchDocuments(query, searchMode, token);
      setResults(data);
    } catch {
      toast({ variant: "destructive", title: "Tìm kiếm thất bại" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSensitivityLevelFilter("all");
    setDepartmentFilter("all");
  };

  const activeFiltersCount = [
    statusFilter,
    sensitivityLevelFilter,
    departmentFilter,
  ].filter((f) => f !== "all").length;

  useEffect(() => {
    fetchDepartments(token)
      .then(setDepartments)
      .catch(() => {});
  }, []);

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

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="group gap-2 text-[12px]">
                  <SlidersHorizontal className="h-4 w-4" />
                  Bộ lọc
                  {activeFiltersCount > 0 && (
                    <Badge
                      className="
        ml-1 flex h-5 w-5 items-center justify-center rounded-full
        bg-primary p-0 text-xs text-primary-foreground
        transition-colors
        group-hover:bg-white
        group-hover:text-primary
      "
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="text-[16px]">
                    Bộ lọc tìm kiếm
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {canEdit && (
                    <div>
                      <label className="text-sm font-medium">Phòng ban</label>

                      <Select
                        value={departmentFilter}
                        onValueChange={(v) => setDepartmentFilter(v)}
                      >
                        <SelectTrigger className="mt-2 text-[12.5px]">
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">
                      Mức độ nhạy cảm
                    </label>
                    <Select
                      value={sensitivityLevelFilter}
                      onValueChange={(v) =>
                        setSensitivityLevelFilter(v as SensitivityLevel | "all")
                      }
                    >
                      <SelectTrigger className="mt-2 text-[12.5px]">
                        <SelectValue placeholder="All Sensitivity Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="public">Công khai</SelectItem>
                        <SelectItem value="internal">Nội bộ</SelectItem>
                        {hasLevelConfidential && (
                          <SelectItem value="confidential">Hạn chế</SelectItem>
                        )}
                        {hasLevelRestricted && (
                          <SelectItem value="restricted">Mật</SelectItem>
                        )}
                        {hasLevelTopSecret && (
                          <SelectItem value="top_secret">Tuyệt mật</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Trạng thái</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setStatusFilter(v as DocumentStatus | "all")
                      }
                    >
                      <SelectTrigger className="mt-2 text-[12.5px]">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="draft">Bản nháp</SelectItem>
                        <SelectItem value="uploaded">Đã tải lên</SelectItem>
                        <SelectItem value="review">Đang xem xét</SelectItem>
                        <SelectItem value="approved">Đã phê duyệt</SelectItem>
                        <SelectItem value="rejected">Bị từ chối</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      className="w-full bg-destructive/30 text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors mt-4 text-[12px]"
                      onClick={clearFilters}
                    >
                      Xóa tất cả bộ lọc
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="text-[12px]"
            >
              {isSearching ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </Button>
          </div>

          {/* Search mode indicator */}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-[12px]">Chế độ lọc:</span>
            <Badge variant="outline" className="font-normal">
              {searchMode === "hybrid"
                ? "Kết hợp"
                : searchMode === "keyword"
                  ? "Chỉ từ khóa"
                  : "Chỉ ngữ nghĩa"}
            </Badge>
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
                    Hãy thay đổi từ khóa hoặc thay đổi bộ lọc để có kết quả khác
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
    </div>
  );
}

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

    // tìm tất cả vị trí match của từng word
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

    // 🔥 merge các range chồng hoặc liền kề
    ranges.sort((a, b) => a[0] - b[0]);

    const merged: [number, number][] = [];
    let current = ranges[0];

    for (let i = 1; i < ranges.length; i++) {
      const next = ranges[i];

      if (next[0] <= current[1] + 1) {
        // overlap hoặc liền kề
        current[1] = Math.max(current[1], next[1]);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    // build JSX
    const result = [];
    let lastIndex = 0;

    merged.forEach(([start, end], i) => {
      if (start > lastIndex) {
        result.push(text.slice(lastIndex, start));
      }

      result.push(
        <mark key={i} className="bg-yellow-100 text-foreground rounded px-0.5">
          {text.slice(start, end)}
        </mark>,
      );

      lastIndex = end;
    });

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

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
              level={result.metadata.sensitivity_level as SensitivityLevel}
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
