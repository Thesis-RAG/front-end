/** OuTreeHeader: controlled dialog for creating a new OU type. Trigger is rendered by the parent. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { OrgUnit, createOrgUnit } from "@/services/org_units.api";

export function OuTreeHeader({
  orgUnits,
  token,
  onRefresh,
  open,
  onOpenChange,
}: {
  orgUnits: OrgUnit[];
  token: string | null;
  onRefresh: () => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [addName, setAddName] = useState("");
  const [addParentId, setAddParentId] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form fields when the dialog closes.
  useEffect(() => {
    if (!open) {
      setAddName("");
      setAddParentId("");
    }
  }, [open]);

  // Submit the new OU type.
  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await createOrgUnit(
        { name: addName.trim(), parent_id: addParentId || undefined },
        token,
      );
      toast({ variant: "success", title: `Đã tạo loại đơn vị "${addName}"` });
      onOpenChange(false);
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Thêm loại đơn vị</DialogTitle>
        </DialogHeader>
        <div className="grid gap-8 py-2">
          <div className="grid gap-3">
            <Label className="text-xs text-muted-foreground">Tên</Label>
            <Input
              className="placeholder:text-[12px]"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="VD: Phòng ban, Chi nhánh, Nhóm..."
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="grid gap-3">
            <Label className="text-xs text-muted-foreground">
              Thuộc loại đơn vị
            </Label>
            <Select value={addParentId} onValueChange={setAddParentId}>
              <SelectTrigger className="text-[12px]">
                <SelectValue placeholder="Công ty (mặc định)" />
              </SelectTrigger>
              <SelectContent>
                {orgUnits.map((o) => (
                  <SelectItem className="text-[12px]" key={o.id} value={o.id}>
                    {o.name}
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
          <Button disabled={!addName.trim() || saving} onClick={handleAdd}>
            {saving ? "Đang tạo..." : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
