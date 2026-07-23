/** UploadVersionDialog: dialog for uploading a new version of an existing document. */
import { RefObject } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DocumentRead } from "@/types/documents";
import { EntityDetectionPanel } from "./EntityDetectionPanel";
import type { EntityScopeOption } from "./EntityScopePicker";
import type { EntityActionConfig, EntityPreview } from "@/services/documents.api";

interface UploadVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionTarget: DocumentRead | null;
  selectedVersionFile: File | null;
  setSelectedVersionFile: (f: File | null) => void;
  uploadingVersion: boolean;
  onUploadVersion: () => void;
  fileVersionInputRef: RefObject<HTMLInputElement>;
  entityPreview: EntityPreview | null;
  entityActions: EntityActionConfig[];
  setEntityActions: (actions: EntityActionConfig[]) => void;
  detectingEntities: boolean;
  entityUnitOptions: EntityScopeOption[];
  entityRoleOptions: EntityScopeOption[];
}

export function UploadVersionDialog({
  open,
  onOpenChange,
  versionTarget,
  selectedVersionFile,
  setSelectedVersionFile,
  uploadingVersion,
  onUploadVersion,
  fileVersionInputRef,
  entityPreview,
  entityActions,
  setEntityActions,
  detectingEntities,
  entityUnitOptions,
  entityRoleOptions,
}: UploadVersionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
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
          <EntityDetectionPanel
            preview={entityPreview}
            actions={entityActions}
            onChange={setEntityActions}
            loading={detectingEntities}
            unitOptions={entityUnitOptions}
            roleOptions={entityRoleOptions}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={!selectedVersionFile || uploadingVersion}
            onClick={onUploadVersion}
          >
            {uploadingVersion ? "Đang tải lên..." : "Tải lên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
