/** UploadDialog: dialog for uploading a new document with OUI assignment and sensitivity selection. */
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SENSITIVITY_LEVEL } from "@/types";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";
import { OuiMultiSelect } from "./OuiMultiSelect";
import { EntityDetectionPanel } from "./EntityDetectionPanel";
import type { EntityScopeOption } from "./EntityScopePicker";
import type { EntityActionConfig, EntityPreview } from "@/services/documents.api";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgUnits: OrgUnit[];
  allowedOrgUnitInstances: OrgUnitInstance[];
  maxClearance: number;
  uploadOuiIds: string[];
  setUploadOuiIds: (ids: string[]) => void;
  uploadSensitivity: number;
  setUploadSensitivity: (v: number) => void;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  uploading: boolean;
  onUpload: () => void;
  fileInputRef: RefObject<HTMLInputElement>;
  entityPreview: EntityPreview | null;
  entityActions: EntityActionConfig[];
  setEntityActions: (actions: EntityActionConfig[]) => void;
  detectingEntities: boolean;
  entityUnitOptions: EntityScopeOption[];
  entityRoleOptions: EntityScopeOption[];
}

export function UploadDialog({
  open,
  onOpenChange,
  orgUnits,
  allowedOrgUnitInstances,
  maxClearance,
  uploadOuiIds,
  setUploadOuiIds,
  uploadSensitivity,
  setUploadSensitivity,
  selectedFile,
  setSelectedFile,
  uploading,
  onUpload,
  fileInputRef,
  entityPreview,
  entityActions,
  setEntityActions,
  detectingEntities,
  entityUnitOptions,
  entityRoleOptions,
}: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tải lên tài liệu</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Chọn file và điền thông tin để tải lên tài liệu mới.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
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
          <EntityDetectionPanel
            preview={entityPreview}
            actions={entityActions}
            onChange={setEntityActions}
            loading={detectingEntities}
            unitOptions={entityUnitOptions}
            roleOptions={entityRoleOptions}
          />
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Độ nhạy cảm</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!selectedFile || uploading} onClick={onUpload}>
            {uploading ? "Đang tải lên..." : "Tải lên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
