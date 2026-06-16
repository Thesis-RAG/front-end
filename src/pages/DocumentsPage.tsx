import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Upload,
  X,
  Check,
  Trash2,
  BookOpen,
  User,
  ChevronDown,
  Plus,
  Building2,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { DocumentStatus, SENSITIVITY_LEVEL, SENSITIVITY_COLOR } from "@/types";
import {
  createDocument,
  uploadDocumentVersion,
  updateDocument,
  openDocumentFile,
  deleteDocument,
  submitForReview,
} from "@/services/documents.api";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  OrgUnit,
  OrgUnitInstance,
} from "@/services/org_units.api";
import { ENV } from "@/config/env";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DocumentRead {
  id: string;
  title: string;
  description?: string;
  oui_ids: string[];
  owner_user_id: string;
  document_type: string;
  sensitivity: number;
  data_type: string;
  tags: string[];
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

// ── Sensitivity Badge ─────────────────────────────────────────────────────────
function SensitivityBadge({ level }: { level: number }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SENSITIVITY_COLOR[level] ?? "bg-gray-100 text-gray-700"}`}
    >
      {SENSITIVITY_LEVEL[level] ?? level}
    </span>
  );
}

// ── OUI Multi-select ──────────────────────────────────────────────────────────
function OuiMultiSelect({
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setExpandedOuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOui = (id: string) => {
    onChange(
      selectedOuiIds.includes(id)
        ? selectedOuiIds.filter((x) => x !== id)
        : [...selectedOuiIds, id],
    );
  };

  const getOuiLabel = (id: string) => {
    const oui = orgUnitInstances.find((o) => o.id === id);
    const ou = orgUnits.find((u) => u.id === oui?.ou_id);
    return oui ? `${ou?.name ?? ""} / ${oui.name}` : id;
  };

  // Chỉ hiện OU có ít nhất 1 OUI trong allowed list
  const visibleOus = orgUnits.filter((ou) =>
    orgUnitInstances.some((o) => o.ou_id === ou.id),
  );

  return (
    <div className="space-y-2" ref={ref}>
      {/* Selected tags */}
      {selectedOuiIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOuiIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
            >
              <Building2 className="h-3 w-3" />
              {getOuiLabel(id)}
              <button
                onClick={() => toggleOui(id)}
                className="hover:text-destructive ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* OU list — mỗi OU là 1 row, nhấn để xổ OUI */}
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
                {/* OU header */}
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => setExpandedOuId(isExpanded ? null : ou.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13.5px]">{ou.name}</span>
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

                {/* OUI list — chỉ hiện khi expanded */}
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
                            {selected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
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
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { token, user, isCorpMember, maxClearance } = useAuth();

  const [documents, setDocuments] = useState<DocumentRead[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>(
    [],
  );
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsRefresh, setDocsRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editSensitivity, setEditSensitivity] = useState<number>(2);
  const [editOuiIds, setEditOuiIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadOuiIds, setUploadOuiIds] = useState<string[]>([]);
  const [uploadSensitivity, setUploadSensitivity] = useState<number>(2);
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

  const canEdit = (user?.oui_positions.length ?? 0) > 0;
  const canDelete = isCorpMember;

  const allowedOuiIds = useMemo(() => {
    console.log("user oui_positions:", user?.oui_positions);
    console.log("isCorpMember:", isCorpMember);
    console.log("orgUnitInstances count:", orgUnitInstances.length);

    if (!user || orgUnitInstances.length === 0) return new Set<string>();

    if (isCorpMember) {
      return new Set(orgUnitInstances.map((o) => o.id));
    }

    const userOuiIds = new Set(user.oui_positions.map((p) => p.oui_id));
    const allowed = new Set<string>(userOuiIds);
    const queue = [...userOuiIds];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      orgUnitInstances
        .filter((o) => o.parent_oui_ids.includes(currentId))
        .forEach((child) => {
          console.log(`Found child of ${currentId}:`, child.name, child.id);
          if (!allowed.has(child.id)) {
            allowed.add(child.id);
            queue.push(child.id);
          }
        });
    }

    console.log("allowed OUI ids:", [...allowed]);
    return allowed;
  }, [user, isCorpMember, orgUnitInstances]);

  const allowedOrgUnitInstances = useMemo(
    () => orgUnitInstances.filter((o) => allowedOuiIds.has(o.id)),
    [orgUnitInstances, allowedOuiIds],
  );

  const openEdit = (doc: DocumentRead) => {
    setEditingDocId(doc.id);
    setEditSensitivity(doc.sensitivity);
    setEditOuiIds(doc.oui_ids);
  };

  const handleSaveEdit = async () => {
    if (!editingDocId) return;
    setSaving(true);
    try {
      await updateDocument(
        editingDocId,
        { sensitivity: editSensitivity, oui_ids: editOuiIds },
        token,
      );
      toast({ variant: "success", title: "Đã cập nhật" });
      setEditingDocId(null);
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingDocs(true);
    fetchDocuments(token)
      .then(setDocuments)
      .catch(() =>
        toast({ variant: "destructive", title: "Không thể tải tài liệu" }),
      )
      .finally(() => setLoadingDocs(false));
  }, [docsRefresh]);

  useEffect(() => {
    fetchOrgUnits(token)
      .then(setOrgUnits)
      .catch(() => {});
    fetchOrgUnitInstances(token)
      .then(setOrgUnitInstances)
      .catch(() => {});
  }, []);

  const myDocuments = useMemo(
    () => documents.filter((d) => d.owner_user_id === user?.id),
    [documents, user?.id],
  );

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getOuiLabel = (ouiId: string) => {
    const oui = orgUnitInstances.find((o) => o.id === ouiId);
    const ou = orgUnits.find((u) => u.id === oui?.ou_id);
    return oui ? `${ou?.name ?? ""} / ${oui.name}` : ouiId.slice(0, 8);
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // ── Upload ─────────────────────────────────────────────────────────────────
  const resetUploadForm = () => {
    setUploadOuiIds([]);
    setUploadSensitivity(2);
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const title = selectedFile.name.replace(/\.[^.]+$/, "");
      const doc = await createDocument(
        {
          title,
          oui_ids: uploadOuiIds,
          sensitivity: uploadSensitivity,
          data_type: "file",
        },
        token,
      );
      await uploadDocumentVersion(doc.id, selectedFile, token);
      if (!isCorpMember) await submitForReview(doc.id, token);
      toast({ variant: "success", title: "Tải lên thành công" });
      setUploadDialogOpen(false);
      resetUploadForm();
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Tải lên thất bại",
        description: err?.message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async (doc: DocumentRead) => {
    if (!doc.current_version_id) {
      toast({ variant: "destructive", title: "Chưa có file" });
      return;
    }
    try {
      await openDocumentFile(doc.id, doc.current_version_id, token);
    } catch {
      toast({ variant: "destructive", title: "Không thể mở tài liệu" });
    }
  };

  const handleDelete = async (doc: DocumentRead) => {
    if (!confirm(`Xóa "${doc.title}"?`)) return;
    try {
      await deleteDocument(doc.id, token);
      toast({ variant: "success", title: "Đã xóa" });
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Xóa thất bại",
        description: err.message,
      });
    }
  };

  const handleUploadVersion = async () => {
    if (!versionTarget || !selectedVersionFile) return;
    setUploadingVersion(true);
    try {
      await uploadDocumentVersion(versionTarget.id, selectedVersionFile, token);
      toast({ variant: "success", title: "Đã tải lên phiên bản mới" });
      setVersionDialogOpen(false);
      setVersionTarget(null);
      setSelectedVersionFile(null);
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Thất bại",
        description: err?.message,
      });
    } finally {
      setUploadingVersion(false);
      if (fileVersionInputRef.current) fileVersionInputRef.current.value = "";
    }
  };

  // ── Table ──────────────────────────────────────────────────────────────────
  const renderTable = (docs: DocumentRead[], showOwner = false) => (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%] font-bold text-foreground">
              Tên tài liệu
            </TableHead>
            <TableHead className="font-bold text-foreground">Đơn vị</TableHead>
            <TableHead className="font-bold text-foreground">Độ nhạy</TableHead>
            <TableHead className="font-bold text-foreground">
              Trạng thái
            </TableHead>
            <TableHead className="font-bold text-foreground">
              Phiên bản
            </TableHead>
            {showOwner && (
              <TableHead className="font-bold text-foreground">
                Người sở hữu
              </TableHead>
            )}
            <TableHead className="font-bold text-foreground">
              Cập nhật
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDocs ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-32 text-center text-muted-foreground"
              >
                Đang tải...
              </TableCell>
            </TableRow>
          ) : docs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2" />
                  <p>Không tìm thấy tài liệu nào</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <button
                    onClick={() => handleView(doc)}
                    className="font-medium text-foreground hover:text-primary transition-colors text-left line-clamp-1"
                  >
                    {doc.title}
                  </button>
                </TableCell>

                {/* OUI badges */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {doc.oui_ids.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      doc.oui_ids.slice(0, 2).map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="font-normal text-xs"
                        >
                          {getOuiLabel(id)}
                        </Badge>
                      ))
                    )}
                    {doc.oui_ids.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{doc.oui_ids.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <SensitivityBadge level={doc.sensitivity} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={doc.status as DocumentStatus} />
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  v{doc.version_count}
                </TableCell>

                {showOwner && (
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {doc.owner_user_id.slice(0, 8)}…
                  </TableCell>
                )}

                <TableCell className="text-muted-foreground text-xs">
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
                      <DropdownMenuItem onClick={() => handleView(doc)}>
                        <Eye className="mr-2 h-4 w-4" /> Xem
                      </DropdownMenuItem>
                      {isCorpMember && (
                        <DropdownMenuItem onClick={() => openEdit(doc)}>
                          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                      )}
                      {canEdit && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setVersionTarget(doc);
                              setSelectedVersionFile(null);
                              setVersionDialogOpen(true);
                            }}
                          >
                            <Upload className="mr-2 h-4 w-4" /> Tải lên phiên
                            bản mới
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(doc)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
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

  // ── Tab content ────────────────────────────────────────────────────────────
  const TabContent = ({
    docs,
    showOwner,
  }: {
    docs: DocumentRead[];
    showOwner: boolean;
  }) => {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sensitivityFilter, setSensitivityFilter] = useState("all");

    const filtered = useMemo(
      () =>
        docs.filter((d) => {
          const matchSearch =
            !search || d.title.toLowerCase().includes(search.toLowerCase());
          const matchStatus =
            statusFilter === "all" || d.status === statusFilter;
          const matchSens =
            sensitivityFilter === "all" ||
            String(d.sensitivity) === sensitivityFilter;
          return matchSearch && matchStatus && matchSens;
        }),
      [docs, search, statusFilter, sensitivityFilter],
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài liệu..."
              className="pl-9 h-9 placeholder:text-[12.5px]"
            />
          </div>
          <div className="h-6 w-px bg-border" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-auto px-3 text-[12.5px]">
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
          <Select
            value={sensitivityFilter}
            onValueChange={setSensitivityFilter}
          >
            <SelectTrigger className="h-9 w-auto px-3 text-[12.5px]">
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
        </div>
        {renderTable(filtered, showOwner)}
        <p className="text-sm text-muted-foreground ml-1">
          Đang hiển thị {filtered.length} trong số {docs.length} tài liệu
        </p>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tài liệu"
        description="Quản lý tài liệu của công ty, bao gồm tải lên, phân loại và theo dõi phiên bản."
        actions={
          canEdit && (
            <Button
              className="gap-2"
              onClick={() => {
                resetUploadForm();
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="h-4 w-4" /> Tải lên tài liệu
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
                <BookOpen className="h-4 w-4" /> Tất cả
              </TabsTrigger>
              <TabsTrigger value="mine" className="gap-2 text-[12.5px]">
                <User className="h-4 w-4" /> Sở hữu
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="all" className="flex-1 p-6 mt-0">
            <TabContent docs={documents} showOwner={true} />
          </TabsContent>
          <TabsContent value="mine" className="flex-1 p-6 mt-0">
            <TabContent docs={myDocuments} showOwner={false} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden inputs */}
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

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(o) => {
          setUploadDialogOpen(o);
          if (!o) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Tải lên tài liệu</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Chọn file và điền thông tin để tải lên tài liệu mới.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* OUI multi-select */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Đơn vị tổ chức
              </Label>
              <OuiMultiSelect
                orgUnits={orgUnits}
                orgUnitInstances={allowedOrgUnitInstances}
                selectedOuiIds={uploadOuiIds}
                onChange={setUploadOuiIds}
              />
            </div>

            {/* Sensitivity */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Độ nhạy cảm
              </Label>
              <Select
                value={String(uploadSensitivity)}
                onValueChange={(v) => setUploadSensitivity(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SENSITIVITY_LEVEL)
                    .filter(([k]) => Number(k) <= maxClearance)
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* File */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">File</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="text-[13px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Chọn file
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-[240px]">
                  {selectedFile?.name ?? "Chưa chọn file"}
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
                  {selectedFile.type || "unknown"}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? "Đang tải lên..." : "Tải lên"}
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
            <DialogTitle>Tải lên phiên bản mới</DialogTitle>
            <DialogDescription className="text-[12px]">
              Lịch sử phiên bản vẫn được lưu lại.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {versionTarget && (
              <div className="rounded-md border p-3 bg-muted/40">
                <p className="font-medium text-sm">{versionTarget.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Phiên bản hiện tại: v{versionTarget.version_count}
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="text-[12px]"
                  onClick={() => fileVersionInputRef.current?.click()}
                >
                  Chọn file
                </Button>
                <span className="text-[12px] text-muted-foreground truncate max-w-[220px]">
                  {selectedVersionFile?.name ?? "Chưa chọn file"}
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVersionDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              disabled={!selectedVersionFile || uploadingVersion}
              onClick={handleUploadVersion}
            >
              {uploadingVersion ? "Đang tải lên..." : "Tải lên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog — chỉ corp member */}
      <Dialog
        open={!!editingDocId}
        onOpenChange={(o) => {
          if (!o) setEditingDocId(null);
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài liệu</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Thay đổi đơn vị tổ chức và độ nhạy cảm của tài liệu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Đơn vị tổ chức
              </Label>
              <OuiMultiSelect
                orgUnits={orgUnits}
                orgUnitInstances={orgUnitInstances}
                selectedOuiIds={editOuiIds}
                onChange={setEditOuiIds}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Độ nhạy cảm
              </Label>
              <Select
                value={String(editSensitivity)}
                onValueChange={(v) => setEditSensitivity(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SENSITIVITY_LEVEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDocId(null)}>
              Hủy
            </Button>
            <Button disabled={saving} onClick={handleSaveEdit}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
