import { useState } from "react";
import {
  Search,
  Filter,
  X,
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
import { mockSearchResults } from "@/data/mockData";
import {
  SearchResult,
  SearchMode,
  DocumentStatus,
  SensitivityLevel,
} from "@/types";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">(
    "all",
  );
  const [sensitivityLevelFilter, setSensitivityLevelFilter] = useState<
    SensitivityLevel | "all"
  >("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    // Simulate search
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Filter mock results based on query
    const filtered = mockSearchResults.filter(
      (r) =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.snippet.toLowerCase().includes(query.toLowerCase()),
    );

    setResults(filtered.length > 0 ? filtered : mockSearchResults);
    setIsSearching(false);
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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Search"
        description="Keyword-based or semantic knowledge search"
        breadcrumbs={[{ label: "Search" }]}
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
              <SelectTrigger className="w-36">
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
                <Button variant="outline" className="gap-2">
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
                  <SheetTitle>Search Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setStatusFilter(v as DocumentStatus | "all")
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="All sensitivity levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All sensitivity levels
                        </SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="confidential">
                          Confidential
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <Select
                      value={departmentFilter}
                      onValueChange={setDepartmentFilter}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
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
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Search mode indicator */}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mode:</span>
            <Badge variant="outline" className="font-normal">
              {searchMode === "hybrid"
                ? "Hybrid (keyword + semantic)"
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
                    Found {results.length} results for "{query}"
                  </p>
                  {results.map((result) => (
                    <SearchResultCard
                      key={result.id}
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
  result: SearchResult;
  query: string;
}) {
  const highlightText = (text: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-citation-bg text-foreground rounded px-0.5">
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
              {highlightText(result.title)}
            </h3>
            <StatusBadge status={result.status} />
            <SensitivityLevelBadge level={result.sensitivity_level} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.sectionPath}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Relevance</div>
            <div className="font-medium text-sm">
              {Math.round(result.score * 100)}%
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`/documents/${result.documentId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
        {highlightText(result.snippet)}
      </p>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {result.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          Updated {new Date(result.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
