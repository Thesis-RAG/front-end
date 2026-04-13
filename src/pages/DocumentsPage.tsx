import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Upload,
  X,
  Check,
  Trash2,
  BookOpen,
  User,
  Copy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  StatusBadge,
  SensitivityLevelBadge,
} from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentStatus, SensitivityLevel } from "@/types";
import {
  createDocument,
  uploadDocumentVersion,
  updateDocument,
  openDocumentFile,
  submitForReview,
  deleteDocument,
} from "@/services/documents.api";
import { fetchDepartments, Department } from "@/services/departments.api";
import { fetchProjects, Project } from "@/services/projects.api";
import { ENV } from "@/config/env";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DocumentRead {
  id: string;
  title: string;
  description?: string;
  department_id?: string;
  project_id?: string;
  owner_user_id: string;
  document_type: string;
  sensitivity_level: string;
  data_type: string;
  allowed_roles?: string[];
  status: string;
  current_version_id?: string;
  version_count: number;
  created_at: string;
  updated_at: string;
}

async function fetchDocuments(token: string): Promise<DocumentRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { token, hasPermission, user } = useAuth();

  const [documents, setDocuments] = useState<DocumentRead[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsRefresh, setDocsRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  // Upload document dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDeptId, setUploadDeptId] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadProjects, setUploadProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [uploadSensitivity, setUploadSensitivity] = useState("");
  const [uploadReviewer, setUploadReviewer] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload version dialog
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<DocumentRead | null>(null);
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(
    null,
  );
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const fileVersionInputRef = useRef<HTMLInputElement | null>(null);

  const canEdit = [
    "department_manager",
    "director",
    "admin_auditor",
    "employee",
  ].includes(user?.role ?? "");
  const canMoveDoc = ["admin_auditor", "director"].includes(user?.role ?? "");
  const canDelete = ["admin_auditor", "director"].includes(user?.role ?? "");
  const canUploadVersion = ["employee", "department_manager"].includes(
    user?.role ?? "",
  );

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editProjects, setEditProjects] = useState<Project[]>([]);
  const editDropdownRef = useRef<HTMLDivElement>(null);
  const hasLevelConfidential = hasPermission("documents.confidential");
  const hasLevelRestricted = hasPermission("documents.restricted");
  const hasLevelTopSecret = hasPermission("documents.top_secret");

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingDocs(true);
    fetchDocuments(token)
      .then(setDocuments)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load documents" }),
      )
      .finally(() => setLoadingDocs(false));
  }, [docsRefresh]);

  useEffect(() => {
    fetchDepartments(token)
      .then(setDepartments)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!uploadDeptId) {
      setUploadProjects([]);
      setUploadProjectId("");
      return;
    }
    setLoadingProjects(true);
    setUploadProjectId("");
    fetchProjects(token, uploadDeptId)
      .then(setUploadProjects)
      .catch(() => setUploadProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [uploadDeptId]);

  useEffect(() => {
    fetchProjects(token)
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        editDropdownRef.current &&
        !editDropdownRef.current.contains(e.target as Node)
      ) {
        setEditingDocId(null);
        setEditField(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const myDocuments = useMemo(
    () => documents.filter((d) => d.owner_user_id === user?.id),
    [documents, user?.id],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDocUpdate = async (
    docId: string,
    field: "department_id" | "project_id" | "sensitivity_level",
    value: string,
  ) => {
    try {
      const payload: Record<string, string | null> = {
        [field]: value === "" ? null : value, // ← convert "" → null
      };
      if (field === "department_id") payload.project_id = null;
      await updateDocument(docId, payload, token);
      const refreshed = await fetchDocuments(token);
      setDocuments(refreshed);
      if (field === "department_id" && value) {
        const projs = await fetchProjects(token, value);
        setEditProjects(projs);
      }
      toast({ variant: "success", title: "Updated successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
    setEditingDocId(null);
    setEditField(null);
  };

  const handleView = async (doc: DocumentRead) => {
    if (!doc.current_version_id) {
      toast({ variant: "destructive", title: "No file version available" });
      return;
    }
    try {
      await openDocumentFile(doc.id, doc.current_version_id, token);
    } catch {
      toast({ variant: "destructive", title: "Cannot open document" });
    }
  };

  const handleDelete = async (doc: DocumentRead) => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await deleteDocument(doc.id, token);
      toast({ variant: "success", title: "Document deleted" });
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message,
      });
    }
  };

  const handleOpenEditProjects = async (doc: DocumentRead) => {
    const projs = await fetchProjects(token, doc.department_id).catch(() => []);
    setEditProjects(projs);
  };

  const getDeptName = (id?: string) =>
    departments.find((d) => d.id === id)?.name ?? id ?? "—";
  const getProjectName = (id?: string) =>
    projects.find((p) => p.id === id)?.name ?? "—";

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // ── Upload document ─────────────────────────────────────────────────────────
  const resetUploadForm = () => {
    setUploadDeptId("");
    setUploadProjectId("");
    setUploadProjects([]);
    setUploadSensitivity("");
    setUploadReviewer("");
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadSensitivity) return;
    const isPrivileged = ["admin_auditor", "director"].includes(
      user?.role ?? "",
    );
    if (!isPrivileged && !uploadReviewer) return;
    setUploading(true);
    try {
      const title = selectedFile.name.replace(/\.[^.]+$/, "");
      const doc = await createDocument(
        {
          title,
          department_id: uploadDeptId || undefined,
          project_id: uploadProjectId || undefined,
          document_type: "general",
          sensitivity_level: uploadSensitivity,
          data_type: "file",
        },
        token,
      );
      await uploadDocumentVersion(doc.id, selectedFile, token);
      if (!isPrivileged) await submitForReview(doc.id, uploadReviewer, token);
      toast({ variant: "success", title: "Uploaded successfully" });
      setUploadDialogOpen(false);
      resetUploadForm();
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Upload version ──────────────────────────────────────────────────────────
  const handleUploadVersion = async () => {
    if (!versionTarget || !selectedVersionFile) return;
    setUploadingVersion(true);
    try {
      await uploadDocumentVersion(versionTarget.id, selectedVersionFile, token);
      toast({
        variant: "success",
        title: "Version uploaded",
        description: selectedVersionFile.name,
      });
      setVersionDialogOpen(false);
      setVersionTarget(null);
      setSelectedVersionFile(null);
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.message,
      });
    } finally {
      setUploadingVersion(false);
      if (fileVersionInputRef.current) fileVersionInputRef.current.value = "";
    }
  };

  const reviewerOptions = useMemo(() => {
    const base = [
      { label: "Director", value: "director" },
      { label: "Administrator Auditor", value: "admin_auditor" },
    ];
    if (user?.role === "employee")
      base.push({ label: "Department Manager", value: "department_manager" });
    return base;
  }, [user?.role]);

  const canSubmitUpload =
    !!uploadSensitivity &&
    !!selectedFile &&
    (["admin_auditor", "director"].includes(user?.role ?? "") ||
      !!uploadReviewer);

  // ── Shared table renderer ────────────────────────────────────────────────────
  const renderTable = (docs: DocumentRead[], isOwnerTab = false) => (
    <DocumentTable
      docs={docs}
      loading={loadingDocs}
      departments={departments}
      projects={projects}
      getDeptName={getDeptName}
      getProjectName={getProjectName}
      formatDate={formatDate}
      canMoveDoc={canMoveDoc}
      canEdit={canEdit}
      canDelete={canDelete}
      canUploadVersion={canUploadVersion}
      isOwnerTab={isOwnerTab}
      editingDocId={editingDocId}
      editField={editField}
      editDropdownRef={editDropdownRef}
      editProjects={editProjects}
      hasLevelConfidential={hasLevelConfidential}
      hasLevelRestricted={hasLevelRestricted}
      hasLevelTopSecret={hasLevelTopSecret}
      onView={handleView}
      onDelete={handleDelete}
      onDocUpdate={handleDocUpdate}
      onOpenEditProjects={handleOpenEditProjects}
      setEditingDocId={setEditingDocId}
      setEditField={setEditField}
      onUploadVersion={(doc) => {
        setVersionTarget(doc);
        setSelectedVersionFile(null);
        setVersionDialogOpen(true);
      }}
      showOwner={!isOwnerTab}
    />
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Documents"
        description="Enterprise knowledge document management"
        actions={
          canEdit && (
            <Button
              className="gap-2"
              onClick={() => {
                resetUploadForm();
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-auto flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <div className="border-b border-border px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="all" className="gap-2 text-[12.5px]">
                <BookOpen className="h-4 w-4" /> All
              </TabsTrigger>
              <TabsTrigger value="mine" className="gap-2 text-[12.5px]">
                <User className="h-4 w-4" /> Owner
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="flex-1 p-6 mt-0">
            <TabContent
              documents={documents}
              renderTable={(filtered) => renderTable(filtered, false)}
              getDeptName={getDeptName}
              hasLevelConfidential={hasLevelConfidential}
              hasLevelRestricted={hasLevelRestricted}
              hasLevelTopSecret={hasLevelTopSecret}
              canEdit={canEdit}
              totalCount={documents.length}
            />
          </TabsContent>

          <TabsContent value="mine" className="flex-1 p-6 mt-0">
            <TabContent
              documents={myDocuments}
              renderTable={(filtered) => renderTable(filtered, true)}
              getDeptName={getDeptName}
              hasLevelConfidential={hasLevelConfidential}
              hasLevelRestricted={hasLevelRestricted}
              hasLevelTopSecret={hasLevelTopSecret}
              canEdit={canEdit}
              totalCount={myDocuments.length}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={fileVersionInputRef}
        type="file"
        className="hidden"
        onChange={(e) => setSelectedVersionFile(e.target.files?.[0] ?? null)}
      />

      {/* Upload Document Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(o) => {
          setUploadDialogOpen(o);
          if (!o) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Select a file and fill in metadata before uploading.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Department</Label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <Select
                value={uploadDeptId || undefined}
                onValueChange={(v) =>
                  setUploadDeptId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (Company-wide)</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploadDeptId && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Project</Label>
                  <span className="text-xs text-muted-foreground">
                    Optional
                  </span>
                </div>
                <Select
                  value={uploadProjectId}
                  onValueChange={setUploadProjectId}
                  disabled={loadingProjects || uploadProjects.length === 0}
                >
                  <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                    <SelectValue
                      placeholder={
                        loadingProjects
                          ? "Loading projects..."
                          : uploadProjects.length === 0
                            ? "No projects in this department"
                            : "Select project (optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Sensitivity Level</Label>
              <Select
                value={uploadSensitivity}
                onValueChange={setUploadSensitivity}
              >
                <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                  <SelectValue placeholder="Select sensitivity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  {hasLevelConfidential && (
                    <SelectItem value="confidential">Confidential</SelectItem>
                  )}
                  {hasLevelRestricted && (
                    <SelectItem value="restricted">Restricted</SelectItem>
                  )}
                  {hasLevelTopSecret && (
                    <SelectItem value="top_secret">Top Secret</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {!["admin_auditor", "director"].includes(user?.role ?? "") && (
              <div className="grid gap-2">
                <Label>Reviewer</Label>
                <Select
                  value={uploadReviewer}
                  onValueChange={setUploadReviewer}
                >
                  <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewerOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <Button
                  className="text-[13px]"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-[240px]">
                  {selectedFile?.name ?? "No file chosen"}
                </span>
                {selectedFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                  {selectedFile.type || "unknown type"}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSubmitUpload || uploading}
              onClick={handleUpload}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Version Dialog */}
      <Dialog
        open={versionDialogOpen}
        onOpenChange={(o) => {
          setVersionDialogOpen(o);
          if (!o) {
            setVersionTarget(null);
            setSelectedVersionFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription className="text-[12px]">
              Upload a new version for the selected document.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {versionTarget && (
              <div className="rounded-md border p-3 bg-muted/40">
                <p className="font-medium text-sm">{versionTarget.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current: v{versionTarget.version_count} ·{" "}
                  {getDeptName(versionTarget.department_id)}
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileVersionInputRef.current?.click()}
                  className="text-[12px]"
                >
                  Choose file
                </Button>
                <span className="text-[12px] text-muted-foreground truncate max-w-[220px]">
                  {selectedVersionFile?.name ?? "No file chosen"}
                </span>
                {selectedVersionFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      setSelectedVersionFile(null);
                      if (fileVersionInputRef.current)
                        fileVersionInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {selectedVersionFile && (
                <p className="text-xs text-muted-foreground">
                  {(selectedVersionFile.size / 1024).toFixed(1)} KB ·{" "}
                  {selectedVersionFile.type || "unknown type"}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVersionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedVersionFile || uploadingVersion}
              onClick={handleUploadVersion}
            >
              {uploadingVersion ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── TabContent: filter bar + table ───────────────────────────────────────────
function TabContent({
  documents,
  renderTable,
  getDeptName,
  hasLevelConfidential,
  hasLevelRestricted,
  hasLevelTopSecret,
  canEdit,
  totalCount,
}: {
  documents: DocumentRead[];
  renderTable: (filtered: DocumentRead[]) => React.ReactNode;
  getDeptName: (id?: string) => string;
  hasLevelConfidential: boolean;
  hasLevelRestricted: boolean;
  hasLevelTopSecret: boolean;
  canEdit: boolean;
  totalCount: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sensitivityFilter, setSensitivityFilter] = useState("all");

  const filtered = useMemo(
    () =>
      documents.filter((doc) => {
        const q = searchQuery.toLowerCase();
        const deptName = getDeptName(doc.department_id).toLowerCase();
        const matchSearch =
          !q || doc.title.toLowerCase().includes(q) || deptName.includes(q);
        const matchStatus =
          statusFilter === "all" || doc.status === statusFilter;
        const matchSensitivity =
          sensitivityFilter === "all" ||
          doc.sensitivity_level === sensitivityFilter;
        return matchSearch && matchStatus && matchSensitivity;
      }),
    [documents, searchQuery, statusFilter, sensitivityFilter],
  );

  const activeFilterCount = [statusFilter, sensitivityFilter].filter(
    (v) => v !== "all",
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>

        <div className="h-6 w-px bg-border" />

        {canEdit && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className={`h-9 w-auto px-3 text-[12.5px] ${statusFilter !== "all" ? "border-primary text-primary bg-primary/5" : ""}`}
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={sensitivityFilter} onValueChange={setSensitivityFilter}>
          <SelectTrigger
            className={`h-9 w-auto px-3 text-[12.5px] ${sensitivityFilter !== "all" ? "border-primary text-primary bg-primary/5" : ""}`}
          >
            <SelectValue placeholder="Sensitivity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            {hasLevelConfidential && (
              <SelectItem value="confidential">Confidential</SelectItem>
            )}
            {hasLevelRestricted && (
              <SelectItem value="restricted">Restricted</SelectItem>
            )}
            {hasLevelTopSecret && (
              <SelectItem value="top_secret">Top Secret</SelectItem>
            )}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => {
              setStatusFilter("all");
              setSensitivityFilter("all");
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear
            <Badge
              variant="secondary"
              className="h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {renderTable(filtered)}

      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {totalCount} documents
      </div>
    </div>
  );
}

// ── DocumentTable ─────────────────────────────────────────────────────────────
interface DocumentTableProps {
  docs: DocumentRead[];
  loading: boolean;
  departments: Department[];
  projects: Project[];
  getDeptName: (id?: string) => string;
  getProjectName: (id?: string) => string;
  formatDate: (s: string) => string;
  canMoveDoc: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUploadVersion: boolean;
  isOwnerTab: boolean;
  editingDocId: string | null;
  editField: string | null;
  editDropdownRef: React.RefObject<HTMLDivElement>;
  editProjects: Project[];
  hasLevelConfidential: boolean;
  hasLevelRestricted: boolean;
  hasLevelTopSecret: boolean;
  showOwner?: boolean;
  onView: (doc: DocumentRead) => void;
  onDelete: (doc: DocumentRead) => void;
  onDocUpdate: (
    docId: string,
    field: "department_id" | "project_id" | "sensitivity_level",
    value: string,
  ) => void;
  onOpenEditProjects: (doc: DocumentRead) => void;
  setEditingDocId: (id: string | null) => void;
  setEditField: (field: string | null) => void;
  onUploadVersion: (doc: DocumentRead) => void;
}

function DocumentTable({
  docs,
  loading,
  departments,
  getDeptName,
  getProjectName,
  formatDate,
  canMoveDoc,
  canEdit,
  canDelete,
  canUploadVersion,
  isOwnerTab,
  editingDocId,
  editField,
  editDropdownRef,
  editProjects,
  hasLevelConfidential,
  hasLevelRestricted,
  hasLevelTopSecret,
  onView,
  onDelete,
  onDocUpdate,
  onOpenEditProjects,
  setEditingDocId,
  setEditField,
  onUploadVersion,
  showOwner = false,
}: DocumentTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%] font-bold text-black">
              Title
            </TableHead>
            <TableHead className="font-bold text-black">Department</TableHead>
            <TableHead className="font-bold text-black">Project</TableHead>
            <TableHead className="font-bold text-black">Sensitivity</TableHead>
            <TableHead className="font-bold text-black">Status</TableHead>
            <TableHead className="font-bold text-black">Versions</TableHead>
            {showOwner && (
              <TableHead className="font-bold text-black">Owner</TableHead>
            )}
            <TableHead className="font-bold text-black">Updated</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : docs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2" />
                  <p>No documents found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <button
                    onClick={() => onView(doc)}
                    className="font-medium text-foreground hover:text-primary transition-colors text-left"
                  >
                    {doc.title}
                  </button>
                </TableCell>

                {/* Department */}
                <TableCell>
                  {canMoveDoc ? (
                    <div
                      className="relative inline-block"
                      ref={
                        editingDocId === doc.id && editField === "dept"
                          ? editDropdownRef
                          : null
                      }
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-300 font-normal"
                        onClick={() => {
                          setEditingDocId(doc.id);
                          setEditField("dept");
                        }}
                      >
                        {getDeptName(doc.department_id)}
                      </Badge>
                      {editingDocId === doc.id && editField === "dept" && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-md border bg-popover shadow-md">
                          <div className="max-h-48 overflow-y-auto py-1">
                            {/* Thêm option None */}
                            <button
                              className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-gray-200 gap-2 rounded"
                              onClick={() =>
                                onDocUpdate(doc.id, "department_id", "")
                              }
                            >
                              {!doc.department_id ? (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}
                              None (Company-wide)
                            </button>
                            {departments.map((d) => (
                              <button
                                key={d.id}
                                className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-gray-200 gap-2 rounded"
                                onClick={() =>
                                  onDocUpdate(doc.id, "department_id", d.id)
                                }
                              >
                                {d.id === doc.department_id ? (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <span className="w-4 shrink-0" />
                                )}
                                {d.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="cursor-default font-normal"
                    >
                      {getDeptName(doc.department_id)}
                    </Badge>
                  )}
                </TableCell>

                {/* Project */}
                <TableCell>
                  {canMoveDoc ? (
                    <div
                      className="relative inline-block"
                      ref={
                        editingDocId === doc.id && editField === "proj"
                          ? editDropdownRef
                          : null
                      }
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-300 font-normal"
                        onClick={async () => {
                          await onOpenEditProjects(doc);
                          setEditingDocId(doc.id);
                          setEditField("proj");
                        }}
                      >
                        {getProjectName(doc.project_id)}
                      </Badge>
                      {editingDocId === doc.id && editField === "proj" && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-md border bg-popover shadow-md">
                          <div className="max-h-48 overflow-y-auto py-1">
                            <button
                              className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-gray-200 gap-2 rounded"
                              onClick={() =>
                                onDocUpdate(doc.id, "project_id", "")
                              }
                            >
                              {!doc.project_id ? (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}
                              None
                            </button>
                            {editProjects.map((p) => (
                              <button
                                key={p.id}
                                className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-gray-200 gap-2 rounded"
                                onClick={() =>
                                  onDocUpdate(doc.id, "project_id", p.id)
                                }
                              >
                                {p.id === doc.project_id ? (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <span className="w-4 shrink-0" />
                                )}
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="cursor-default font-normal"
                    >
                      {getProjectName(doc.project_id)}
                    </Badge>
                  )}
                </TableCell>

                {/* Sensitivity */}
                <TableCell>
                  {canMoveDoc ? (
                    <Select
                      value={doc.sensitivity_level}
                      onValueChange={(v) =>
                        onDocUpdate(doc.id, "sensitivity_level", v)
                      }
                    >
                      <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <SensitivityLevelBadge
                          level={doc.sensitivity_level as SensitivityLevel}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="confidential">
                          Confidential
                        </SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="top_secret">Top Secret</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <SensitivityLevelBadge
                      level={doc.sensitivity_level as SensitivityLevel}
                    />
                  )}
                </TableCell>

                <TableCell>
                  <StatusBadge status={doc.status as DocumentStatus} />
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  v{doc.version_count}
                </TableCell>
                {showOwner && (
                  <TableCell>
                    <div className="flex items-center gap-1.5 group">
                      <span
                        className="font-mono text-[11px] text-muted-foreground"
                        title={doc.owner_user_id}
                      >
                        {doc.owner_user_id.slice(0, 8)}…
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          navigator.clipboard.writeText(doc.owner_user_id);
                          toast({ variant: "success", title: "Copied!" });
                        }}
                      >
                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground text-[12px]">
                  {formatDate(doc.updated_at)}
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onView(doc)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>

                      {canEdit && (
                        <>
                          {canMoveDoc && (
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Metadata
                            </DropdownMenuItem>
                          )}

                          {/* Upload New Version: admin/director always, employee/dept_manager only in My Documents */}
                          {(canMoveDoc || (isOwnerTab && canUploadVersion)) && (
                            <DropdownMenuItem
                              onClick={() => onUploadVersion(doc)}
                            >
                              <Upload className="mr-2 h-4 w-4" /> Upload New
                              Version
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>

                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(doc)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
