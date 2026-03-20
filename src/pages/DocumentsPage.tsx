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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Department options: lấy từ list hiện có (mock) cho nhanh
  const departmentOptions = useMemo(() => {
    const depts = Array.from(
      new Set(documents.map((d) => d.ownerDepartment)),
    ).filter(Boolean);
    return depts.length ? depts : ["HR", "IT", "Finance", "Operations"];
  }, [documents]);

  // Cấp review options: tuỳ business, tạm để 1..3
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
                              <DropdownMenuItem>
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
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          console.log("Token: ", token);

          const document = await createDocument(
            {
              title: "Salary Policy 2026",
              description: "Chính sách lương nội bộ",
              department_id: "finance",
              project_id: "ERP_upgrade",
              document_type: "policy",
              sensitivity_level: "confidential",
              data_type: "salary",
              allowed_roles: [
                "department_manager",
                "knowledge_manager",
                "admin",
              ],
            },
            token,
          );

          await uploadDocumentVersion(document.id, file!, token);

          // đóng dialog sau khi chọn file
          setUploadDialogOpen(false);

          // reset input để có thể chọn lại cùng 1 file lần sau
          e.currentTarget.value = "";
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
                </SelectContent>
              </Select>
            </div>

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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={!canContinueUpload}
              onClick={() => {
                // mở file picker sau khi đã chọn đủ metadata
                fileInputRef.current?.click();
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
