/** DocumentsPage: document browser with table/tree views, upload/version management, access-request gating, and sensitivity filtering. */
import { useState, useEffect, useRef, useMemo } from "react";
import { Upload, BookOpen, User, Network } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  createDocument,
  uploadDocumentVersion,
  updateDocument,
  openDocumentFile,
  deleteDocument,
  submitForReview,
  fetchMyAccessRequests,
  createAccessRequest,
  createEntityAccessRequest,
  previewDocumentEntities,
  getDocumentAccessStatus,
  AccessRequestRead,
  EntityActionConfig,
  EntityPreview,
} from "@/services/documents.api";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  fetchPositions,
  OrgUnit,
  OrgUnitInstance,
  Position,
} from "@/services/org_units.api";
import { ENV } from "@/config/env";
import { extFromFileName } from "@/lib/file-type-icon";
import { DocumentRead } from "@/types/documents";
import { TreeView } from "@/components/documents/OuiTreeView";
import { DocTabContent } from "@/components/documents/DocTabContent";
import { DocumentTableBaseProps } from "@/components/documents/DocumentTable";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { UploadVersionDialog } from "@/components/documents/UploadVersionDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import type { EntityScopeOption } from "@/components/documents/EntityScopePicker";

async function fetchDocuments(token: string): Promise<DocumentRead[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function DocumentsPage() {
  const { token, user, isCorpMember, maxClearance } = useAuth();

  // Data state
  const [documents, setDocuments] = useState<DocumentRead[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsRefresh, setDocsRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  // Edit dialog state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editSensitivity, setEditSensitivity] = useState<number>(2);
  const [editOuiIds, setEditOuiIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadOuiIds, setUploadOuiIds] = useState<string[]>([]);
  const [uploadSensitivity, setUploadSensitivity] = useState<number>(2);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadEntityPreview, setUploadEntityPreview] = useState<EntityPreview | null>(null);
  const [uploadEntityActions, setUploadEntityActions] = useState<EntityActionConfig[]>([]);
  const [detectingUploadEntities, setDetectingUploadEntities] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload version dialog state
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<DocumentRead | null>(null);
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(null);
  const [versionEntityPreview, setVersionEntityPreview] = useState<EntityPreview | null>(null);
  const [versionEntityActions, setVersionEntityActions] = useState<EntityActionConfig[]>([]);
  const [detectingVersionEntities, setDetectingVersionEntities] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const fileVersionInputRef = useRef<HTMLInputElement | null>(null);

  // Access request state — map docId → latest request
  const [accessRequestMap, setAccessRequestMap] = useState<Map<string, AccessRequestRead>>(new Map());
  const [requestingDocId, setRequestingDocId] = useState<string | null>(null);
  // Restricted chunks map — docId → true if doc has chunks above user clearance
  const [restrictedDocIds, setRestrictedDocIds] = useState<Set<string>>(new Set());

  const canEdit = (user?.oui_positions.length ?? 0) > 0;
  const canDelete = isCorpMember;

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

  const allowedOrgUnitInstances = useMemo(
    () => orgUnitInstances.filter((o) => allowedOuiIds.has(o.id)),
    [orgUnitInstances, allowedOuiIds],
  );

  const entityUnitOptions = useMemo<EntityScopeOption[]>(
    () => allowedOrgUnitInstances.map((instance) => {
      const unit = orgUnits.find((item) => item.id === instance.ou_id);
      return {
        id: instance.id,
        label: instance.name,
        description: unit?.name,
      };
    }),
    [allowedOrgUnitInstances, orgUnits],
  );

  const entityRoleOptions = useMemo<EntityScopeOption[]>(
    () => positions
      .filter((position) => allowedOrgUnitInstances.some((instance) => instance.ou_id === position.ou_id))
      .map((position) => ({
        id: position.id,
        label: position.name,
        description: orgUnits.find((unit) => unit.id === position.ou_id)?.name,
      })),
    [positions, allowedOrgUnitInstances, orgUnits],
  );

  const myDocuments = useMemo(
    () => documents.filter((d) => d.owner_user_id === user?.id),
    [documents, user?.id],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

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

  const resetUploadForm = () => {
    setUploadOuiIds([]);
    setUploadSensitivity(2);
    setSelectedFile(null);
    setUploadEntityPreview(null);
    setUploadEntityActions([]);
  };

  const detectUploadFile = async (file: File | null, version = false) => {
    if (version) {
      setSelectedVersionFile(file);
      setVersionEntityPreview(null);
      setVersionEntityActions([]);
      if (!file) return;
      setDetectingVersionEntities(true);
    } else {
      setSelectedFile(file);
      setUploadEntityPreview(null);
      setUploadEntityActions([]);
      if (!file) return;
      setDetectingUploadEntities(true);
    }
    try {
      const preview = await previewDocumentEntities(file, token);
      if (version) {
        setVersionEntityPreview(preview);
        setVersionEntityActions([]);
      } else {
        setUploadEntityPreview(preview);
        setUploadEntityActions([]);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Không thể detect thực thể", description: err?.message });
      if (version) setSelectedVersionFile(null);
      else setSelectedFile(null);
    } finally {
      if (version) setDetectingVersionEntities(false);
      else setDetectingUploadEntities(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const title = selectedFile.name.replace(/\.[^.]+$/, "");
      const document_type = extFromFileName(selectedFile.name);
      const doc = await createDocument(
        { title, oui_ids: uploadOuiIds, sensitivity: uploadSensitivity, data_type: "file", document_type },
        token,
      );
      await uploadDocumentVersion(doc.id, selectedFile, token);
      if (!isCorpMember) await submitForReview(doc.id, token);
      toast({ variant: "success", title: "Tải lên thành công" });
      setUploadDialogOpen(false);
      resetUploadForm();
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Tải lên thất bại", description: err?.message });
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
    } catch (error: any) {
      if (error?.code === "entity_access_required" && Array.isArray(error.entity_types)) {
        const shouldRequest = window.confirm(
          "File chứa thực thể bị chặn (" + error.entity_types.join(", ") + "). Gửi yêu cầu quyền xem?",
        );
        if (shouldRequest) {
          try {
            await createEntityAccessRequest({
              document_id: error.document_id ?? doc.id,
              document_version_id: error.document_version_id ?? doc.current_version_id,
              entity_types: error.entity_types,
            }, token);
            toast({ variant: "success", title: "Đã gửi yêu cầu quyền thực thể" });
            return;
          } catch (requestError: any) {
            toast({ variant: "destructive", title: "Không thể gửi yêu cầu", description: requestError?.message });
            return;
          }
        }
      }
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
      toast({ variant: "destructive", title: "Xóa thất bại", description: err.message });
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
      setVersionEntityPreview(null);
      setVersionEntityActions([]);
      setDocsRefresh((n) => n + 1);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Thất bại", description: err?.message });
    } finally {
      setUploadingVersion(false);
      if (fileVersionInputRef.current) fileVersionInputRef.current.value = "";
    }
  };

  const handleRequestAccess = async (doc: DocumentRead) => {
    setRequestingDocId(doc.id);
    try {
      const req = await createAccessRequest(doc.id, token);
      setAccessRequestMap((prev) => new Map(prev).set(doc.id, req));
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

  // ── Effects ────────────────────────────────────────────────────────────────

  // Load documents and detect chunk-restricted docs for non-corp users.
  useEffect(() => {
    setLoadingDocs(true);
    fetchDocuments(token)
      .then((docs) => {
        setDocuments(docs);
        // Load access status in background — don't block document list render.
        if (isCorpMember) return;
        Promise.allSettled(
          docs.map((d) => getDocumentAccessStatus(d.id, token)),
        ).then((results) => {
          const restricted = new Set<string>();
          results.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value.has_restricted_chunks)
              restricted.add(docs[i].id);
          });
          setRestrictedDocIds(restricted);
        });
      })
      .catch(() => toast({ variant: "destructive", title: "Không thể tải tài liệu" }))
      .finally(() => setLoadingDocs(false));
  }, [docsRefresh, isCorpMember]);

  // Load org units and instances once on mount.
  useEffect(() => {
    Promise.all([
      fetchOrgUnits(token),
      fetchOrgUnitInstances(token),
      fetchPositions(token),
    ])
      .then(([units, instances, availablePositions]) => {
        setOrgUnits(units);
        setOrgUnitInstances(instances);
        setPositions(availablePositions);
      })
      .catch(() => {});
  }, []);

  // Sync access request map with the latest requests after any data refresh.
  useEffect(() => {
    fetchMyAccessRequests(token)
      .then((reqs) => {
        const map = new Map<string, AccessRequestRead>();
        for (const r of reqs) {
          const existing = map.get(r.document_id);
          if (
            !existing ||
            new Date(r.created_at) > new Date(existing.created_at)
          )
            map.set(r.document_id, r);
        }
        setAccessRequestMap(map);
      })
      .catch(() => {});
  }, [docsRefresh]);

  // ── Shared table props ─────────────────────────────────────────────────────

  // Props forwarded to every DocumentTable instance via DocTabContent.
  const tableProps: DocumentTableBaseProps = {
    loading: loadingDocs,
    orgUnits,
    orgUnitInstances,
    restrictedDocIds,
    accessRequestMap,
    requestingDocId,
    isCorpMember,
    canEdit,
    canDelete,
    onView: handleView,
    onEdit: openEdit,
    onDelete: handleDelete,
    onUploadVersion: (doc) => {
      setVersionTarget(doc);
      setSelectedVersionFile(null);
      setVersionEntityPreview(null);
      setVersionEntityActions([]);
      setVersionDialogOpen(true);
    },
    onRequestAccess: handleRequestAccess,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="enterprise-page flex h-full min-h-0 flex-col">
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

      <div className="page-scroll flex flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <div className="border-b border-border px-4 sm:px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="all" className="gap-2 text-[12.5px]">
                <BookOpen className="h-4 w-4" /> Tất cả
              </TabsTrigger>
              <TabsTrigger value="mine" className="gap-2 text-[12.5px]">
                <User className="h-4 w-4" /> Sở hữu
              </TabsTrigger>
              <TabsTrigger value="tree" className="gap-2 text-[12.5px]">
                <Network className="h-4 w-4" /> Cơ cấu
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="flex-1 p-6 mt-0">
            <DocTabContent
              docs={documents}
              showOwner
              maxClearance={maxClearance}
              {...tableProps}
            />
          </TabsContent>
          <TabsContent value="mine" className="flex-1 p-6 mt-0">
            <DocTabContent
              docs={myDocuments}
              maxClearance={maxClearance}
              {...tableProps}
            />
          </TabsContent>
          <TabsContent value="tree" className="flex-1 p-6 mt-0">
            <TreeView
              documents={documents}
              orgUnits={orgUnits}
              orgUnitInstances={orgUnitInstances}
              onView={handleView}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden file inputs — triggers are inside the dialogs. */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => detectUploadFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={fileVersionInputRef}
        type="file"
        className="hidden"
        onChange={(e) => detectUploadFile(e.target.files?.[0] ?? null, true)}
      />

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={(o) => {
          setUploadDialogOpen(o);
          if (!o) resetUploadForm();
        }}
        orgUnits={orgUnits}
        allowedOrgUnitInstances={allowedOrgUnitInstances}
        maxClearance={maxClearance}
        uploadOuiIds={uploadOuiIds}
        setUploadOuiIds={setUploadOuiIds}
        uploadSensitivity={uploadSensitivity}
        setUploadSensitivity={setUploadSensitivity}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        uploading={uploading}
        onUpload={handleUpload}
        fileInputRef={fileInputRef}
        entityPreview={uploadEntityPreview}
        entityActions={uploadEntityActions}
        setEntityActions={setUploadEntityActions}
        detectingEntities={detectingUploadEntities}
        entityUnitOptions={entityUnitOptions}
        entityRoleOptions={entityRoleOptions}
      />

      <UploadVersionDialog
        open={versionDialogOpen}
        onOpenChange={(o) => {
          setVersionDialogOpen(o);
          if (!o) {
            setVersionTarget(null);
            setSelectedVersionFile(null);
            setVersionEntityPreview(null);
            setVersionEntityActions([]);
          }
        }}
        versionTarget={versionTarget}
        selectedVersionFile={selectedVersionFile}
        setSelectedVersionFile={setSelectedVersionFile}
        uploadingVersion={uploadingVersion}
        onUploadVersion={handleUploadVersion}
        fileVersionInputRef={fileVersionInputRef}
        entityPreview={versionEntityPreview}
        entityActions={versionEntityActions}
        setEntityActions={setVersionEntityActions}
        detectingEntities={detectingVersionEntities}
        entityUnitOptions={entityUnitOptions}
        entityRoleOptions={entityRoleOptions}
      />

      <EditDocumentDialog
        open={!!editingDocId}
        onOpenChange={(o) => {
          if (!o) setEditingDocId(null);
        }}
        orgUnits={orgUnits}
        orgUnitInstances={orgUnitInstances}
        editOuiIds={editOuiIds}
        setEditOuiIds={setEditOuiIds}
        editSensitivity={editSensitivity}
        setEditSensitivity={setEditSensitivity}
        saving={saving}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
