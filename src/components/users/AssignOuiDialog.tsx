/** AssignOuiDialog: selects an OUI and a compatible position to assign a user to. */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { UserRecord } from "@/services/users.api";
import {
  OrgUnit,
  OrgUnitInstance,
  Position,
  assignUserToOui,
} from "@/services/org_units.api";
import { CLEARANCE_LABELS, CLEARANCE_CLASS } from "./constants";

export function AssignOuiDialog({
  user,
  ouis,
  positions,
  orgUnits,
  token,
  onClose,
  onSuccess,
}: {
  user: UserRecord;
  ouis: OrgUnitInstance[];
  positions: Position[];
  orgUnits: OrgUnit[];
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ouiId, setOuiId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedOui = ouis.find((o) => o.id === ouiId);
  // Only show positions that belong to the same OU type as the selected OUI.
  const compatiblePositions = selectedOui
    ? positions.filter((p) => p.ou_id === selectedOui.ou_id)
    : [];
  const getOuName = (ou_id: string) =>
    orgUnits.find((o) => o.id === ou_id)?.name ?? "";

  // Submit the assignment.
  const handle = async () => {
    if (!ouiId || !positionId) return;
    setSaving(true);
    try {
      await assignUserToOui(
        { user_id: user.id, oui_id: ouiId, position_id: positionId },
        token,
      );
      toast({ variant: "success", title: "Đã gán thành công" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Gán vào đơn vị</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Gán <strong>{user.name}</strong> vào một đơn vị với vị trí cụ thể.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Đơn vị</Label>
            <Select
              value={ouiId}
              onValueChange={(v) => {
                setOuiId(v);
                setPositionId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn đơn vị" />
              </SelectTrigger>
              <SelectContent>
                {ouis.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="text-muted-foreground text-xs mr-1">
                      {getOuName(o.ou_id)} /
                    </span>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Vị trí</Label>
            <Select
              value={positionId}
              onValueChange={setPositionId}
              disabled={!ouiId || compatiblePositions.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !ouiId
                      ? "Chọn đơn vị trước"
                      : compatiblePositions.length === 0
                        ? "Không có vị trí nào"
                        : "Chọn vị trí"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {compatiblePositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    <Badge
                      variant="secondary"
                      className={`ml-2 text-[10px] px-1 py-0 ${CLEARANCE_CLASS[p.clearance]}`}
                    >
                      {CLEARANCE_LABELS[p.clearance]}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={!ouiId || !positionId || saving} onClick={handle}>
            {saving ? "Đang gán..." : "Gán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
