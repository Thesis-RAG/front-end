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
  const filteredResults = results.filter((r) => {
    const matchSensitivity =
      sensitivityLevelFilter === "all" ||
      r.metadata.sensitivity_level === sensitivityLevelFilter;
    const matchDept =
      departmentFilter === "all" ||
      r.metadata.department_id === departmentFilter;
    return matchSensitivity && matchDept;
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchDocuments(query, searchMode, token);
      setResults(data);
    } catch {
      toast({ variant: "destructive", title: "Search failed" });
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
        title="Search"
        description="Keyword-based or semantic knowledge search"
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
                placeholder="Enter the keyword..."
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
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
                <SelectItem value="semantic">Semantic</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 text-[12px]">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="text-[16px]">
                    Search Filters
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {canEdit && (
                    <div>
                      <label className="text-sm font-medium">Department</label>

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
                          <SelectItem value="all">All Departments</SelectItem>
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
                      Sensitivity Level
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
                        <SelectItem value="all">
                          All Sensitivity Levels
                        </SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        {hasLevelConfidential && (
                          <SelectItem value="confidential">
                            Confidential
                          </SelectItem>
                        )}
                        {hasLevelRestricted && (
                          <SelectItem value="restricted">
                            Restriected
                          </SelectItem>
                        )}
                        {hasLevelTopSecret && (
                          <SelectItem value="top_secret">Top secret</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status</label>
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
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="uploaded">Uploaded</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      Clear all filters
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
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Search mode indicator */}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mode:</span>
            <Badge variant="outline" className="font-normal">
              {searchMode === "hybrid"
                ? "Hybrid (Keyword + Semantic)"
                : searchMode === "keyword"
                  ? "Keyword only"
                  : "Semantic only"}
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
                    Found {filteredResults.length} results for "{query}"
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
                  <h3 className="mt-4 font-medium">No found the results</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Let change the keyword or change the filter
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium">Start searching</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter keyword and Enter or click Search
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
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-100 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
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
              p.{result.metadata.page_start}–{result.metadata.page_end}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-semibold">
              chunk #{result.metadata.chunk_index}
            </Badge>
            {result.sources.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="text-[10px] font-semibold capitalize"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Score</div>
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
        <span>Semantic: {Math.round(result.semantic_score * 100)}%</span>
        <span>·</span>
        <span>Keyword: {Math.round(result.keyword_score * 100)}%</span>
      </div>
    </div>
  );
}
