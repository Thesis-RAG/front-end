import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Trash2,
  Upload,
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
import { useRef, useMemo } from "react";
import { toast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import { mockDocuments } from "@/data/mockData";
import { Document, DocumentStatus, SensitivityLevel } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

import {
  createDocument,
  uploadDocumentVersion,
} from "@/services/documents.api";

export default function DocumentsPage() {
  const { token, hasPermission } = useAuth();
  const [documents] = useState<Document[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">(
    "all",
  );
  const [sensitivityLevelFilter, setSensitivityLevelFilter] = useState<
    SensitivityLevel | "all"
  >("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [uploadDepartment, setUploadDepartment] = useState<string>("");
  const [uploadSensitivityLevel, setUploadSensitivityLevel] = useState<
    SensitivityLevel | ""
  >("");
  const [uploadReviewLevel, setUploadReviewLevel] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileVersionInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadVersionDialogOpen, setUploadVersionDialogOpen] = useState(false);
  const [uploadTargetDocument, setUploadTargetDocument] =
    useState<Document | null>(null);
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(
    null,
  );
  const [selectedVersionFileName, setSelectedVersionFileName] =
    useState<string>("");
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Department options: mock data
  const departmentOptions = useMemo(() => {
    const depts = Array.from(
      new Set(documents.map((d) => d.ownerDepartment)),
    ).filter(Boolean);
    return depts.length ? depts : ["HR", "IT", "Finance", "Operations"];
  }, [documents]);

  // Reviewer options: mock data
  const reviewLevelOptions = [
    "Director",
    "Administrator Auditor",
    "Department Manager",
  ];

  const canContinueUpload =
    !!uploadDepartment && !!uploadSensitivityLevel && !!uploadReviewLevel;

  const canEdit = hasPermission("documents.edit");

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.ownerDepartment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesSensitivityLevel =
      sensitivityLevelFilter === "all" ||
      doc.sensitivity_level === sensitivityLevelFilter;

    return matchesSearch && matchesStatus && matchesSensitivityLevel;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Documents"
        description="Enterprise knowledge document management"
        breadcrumbs={[{ label: "Documents" }]}
        actions={
          canEdit && (
            <Button
              className="gap-2"
              onClick={() => {
                setUploadDepartment("");
                setUploadSensitivityLevel("");
                setUploadReviewLevel("");
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sensitivityLevelFilter}
            onValueChange={(v) =>
              setSensitivityLevelFilter(v as SensitivityLevel | "all")
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sensitivity Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="top_secret">Top Secret</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Sensitivity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2" />
                      <p>No documents found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {doc.title}
                      </Link>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{doc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.ownerDepartment}
                    </TableCell>
                    <TableCell>
                      <SensitivityLevelBadge level={doc.sensitivity_level} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {doc.currentVersion}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(doc.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/documents/${doc.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Metadata
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setUploadTargetDocument(doc);
                                  setSelectedVersionFile(null);
                                  setSelectedVersionFileName("");
                                  setUploadVersionDialogOpen(true);
                                }}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New Version
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
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

        {/* Pagination info */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {filteredDocuments.length} of {documents.length} documents
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        // accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (!file) return;

          setSelectedFile(file);
          setSelectedFileName(file.name);
          // don't upload here; wait for Continue
          // keep input value so user can re-open and change if needed
        }}
      />
      <input
        ref={fileVersionInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (!file) return;

          setSelectedVersionFile(file);
          setSelectedVersionFileName(file.name);
        }}
      />
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>
              Choose the file and provide necessary metadata before uploading.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select
                value={uploadDepartment}
                onValueChange={setUploadDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Sensitivity Level</Label>
              <Select
                value={uploadSensitivityLevel}
                onValueChange={(v) =>
                  setUploadSensitivityLevel(v as SensitivityLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Sensitivity Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restriected</SelectItem>
                  <SelectItem value="top_secret">Top secret</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TODO: reviewer is needed? */}
            <div className="grid gap-2">
              <Label>Reviewer</Label>
              <Select
                value={uploadReviewLevel}
                onValueChange={setUploadReviewLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {reviewLevelOptions.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-2">
            <Label>File</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <div className="text-sm text-muted-foreground">
                {selectedFileName || "No file chosen"}
              </div>
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
              disabled={!canContinueUpload || !selectedFile || uploading}
              onClick={async () => {
                if (!selectedFile) return;
                setUploading(true);
                try {
                  const title = selectedFileName
                    ? selectedFileName.replace(/\.[^.]+$/, "")
                    : "Untitled document";

                  const document = await createDocument(
                    {
                      title,
                      description: "",
                      department_id: "3f1bdff2-a1c5-4aa9-8468-1ce831e7259d",
                      // TODO: call department in db UploadDepartment.id
                      project_id: undefined,
                      document_type: "general",
                      sensitivity_level: uploadSensitivityLevel || undefined,
                      data_type: "file",
                    },
                    token,
                  );

                  await uploadDocumentVersion(document.id, selectedFile, token);

                  toast({
                    variant: "success",
                    title: "Upload successful",
                    description: `${selectedFileName} uploaded successfully`,
                  });

                  // reset
                  setSelectedFile(null);
                  setSelectedFileName("");
                  setUploadDepartment("");
                  setUploadSensitivityLevel("");
                  setUploadReviewLevel("");
                  setUploadDialogOpen(false);
                } catch (err: any) {
                  toast({
                    variant: "destructive",
                    title: "Upload failed",
                    description: err?.message || "Unable to upload file",
                  });
                } finally {
                  setUploading(false);
                  // reset hidden input value so re-selection of same file works
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            >
              {uploading ? "Uploading..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload New Version Dialog */}
      <Dialog
        open={uploadVersionDialogOpen}
        onOpenChange={setUploadVersionDialogOpen}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
            <DialogDescription>
              Upload a new version for the selected document.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {uploadTargetDocument && (
              <div className="grid gap-2">
                <Label>Document</Label>
                <div className="rounded-md border p-3 bg-background">
                  <div className="font-medium">
                    {uploadTargetDocument.title}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Current version: {uploadTargetDocument.currentVersion} ﾂｷ{" "}
                    {uploadTargetDocument.ownerDepartment}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2">
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileVersionInputRef.current?.click()}
                >
                  Choose file
                </Button>
                <div className="text-sm text-muted-foreground">
                  {selectedVersionFileName || "No file chosen"}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadVersionDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={!selectedVersionFile || uploadingVersion}
              onClick={async () => {
                if (!uploadTargetDocument || !selectedVersionFile) return;
                setUploadingVersion(true);
                try {
                  await uploadDocumentVersion(
                    "5afd7ae8-a0eb-4859-bbfe-c9cdbebac7f0",
                    // TODO: change to uploadTargetDocument.id
                    selectedVersionFile,
                    token,
                  );

                  toast({
                    variant: "success",
                    title: "Upload successful",
                    description: `${selectedVersionFileName} uploaded`,
                  });

                  // reset
                  setSelectedVersionFile(null);
                  setSelectedVersionFileName("");
                  setUploadTargetDocument(null);
                  setUploadVersionDialogOpen(false);
                } catch (err: any) {
                  toast({
                    variant: "destructive",
                    title: "Upload failed",
                    description: err?.message || "Unable to upload file",
                  });
                } finally {
                  setUploadingVersion(false);
                  if (fileVersionInputRef.current)
                    fileVersionInputRef.current.value = "";
                }
              }}
            >
              {uploadingVersion ? "Uploading..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
