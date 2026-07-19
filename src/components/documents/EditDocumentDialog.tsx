/** EditDocumentDialog: corp-member-only dialog for changing a document's OUI assignment and sensitivity. */
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

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgUnits: OrgUnit[];
  orgUnitInstances: OrgUnitInstance[];
  editOuiIds: string[];
  setEditOuiIds: (ids: string[]) => void;
  editSensitivity: number;
  setEditSensitivity: (v: number) => void;
  saving: boolean;
  onSave: () => void;
}

export function EditDocumentDialog({
  open,
  onOpenChange,
  orgUnits,
  orgUnitInstances,
  editOuiIds,
  setEditOuiIds,
  editSensitivity,
  setEditSensitivity,
  saving,
  onSave,
}: EditDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label className="text-xs text-muted-foreground">Độ nhạy cảm</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
