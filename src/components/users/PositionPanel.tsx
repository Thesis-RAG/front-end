/** PositionPanel: card-based list of positions for a selected OU type, with add/edit and member drill-down. */
import { useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { UserRecord } from "@/services/users.api";
import {
  OrgUnit,
  OrgUnitInstance,
  Position,
  createPosition,
  updatePosition,
} from "@/services/org_units.api";

import { CLEARANCE_LABELS, CLEARANCE_CLASS } from "./constants";
export function PositionPanel({
  ou,
  selectedOui,
  positions,
  allUsers,
  allOrgUnits,
  token,
  onRefresh,
  selectedPositionId,
  onSelectPosition,
}: {
  ou: OrgUnit | null;
  selectedOui: OrgUnitInstance | null;
  positions: Position[];
  allUsers: UserRecord[];
  allOrgUnits: OrgUnit[];
  token: string | null;
  onRefresh: () => void;
  selectedPositionId: string | null;
  onSelectPosition: (id: string | null) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Position | null>(null);
  const [form, setForm] = useState({ name: "", clearance: "1" });
  const [saving, setSaving] = useState(false);
  const [posSearch, setPosSearch] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = (pos: Position) => {
    setForm({ name: pos.name, clearance: String(pos.clearance) });
    setEditTarget(pos);
    setAddOpen(true);
  };

  const openAdd = () => {
    setForm({ name: "", clearance: "1" });
    setEditTarget(null);
    setAddOpen(true);
  };

  // Create or update a position depending on whether editTarget is set.
  const handle = async () => {
    if (!form.name.trim() || !ou) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ou_id: ou.id,
        clearance: Number(form.clearance),
      };
      if (editTarget) {
        await updatePosition(editTarget.id, payload, token);
        toast({ variant: "success", title: "Đã cập nhật vị trí" });
      } else {
        await createPosition(payload, token);
        toast({ variant: "success", title: `Đã tạo vị trí "${form.name}"` });
      }
      setAddOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Filter positions by search query.
  const visiblePositions = posSearch.trim()
    ? positions.filter((p) => p.name.toLowerCase().includes(posSearch.toLowerCase()))
    : positions;

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 pt-3 flex-shrink-0">
        <span className="text-sm font-semibold">Vị trí</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
          {positions.length}
        </Badge>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2.5 flex-shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-9 pl-8 text-xs placeholder:text-muted-foreground placeholder:text-[12px]"
            placeholder="Tìm vị trí..."
            value={posSearch}
            onChange={(e) => setPosSearch(e.target.value)}
          />
        </div>
        <button className="h-9 w-9 flex items-center justify-center rounded-md border border-input hover:bg-muted transition-colors shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Position card list */}
      <div className="flex-1 overflow-y-auto">
        {visiblePositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-1">
            <p className="text-xs">Chưa có vị trí nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {visiblePositions.map((pos) => {
              // Count users holding this position in the selected OUI only.
              const userCount = allUsers.filter((u) =>
                u.oui_positions.some(
                  (p) => p.position_id === pos.id && p.oui_id === selectedOui?.id,
                ),
              ).length;
              const isSelected = selectedPositionId === pos.id;

              return (
                <div
                  key={pos.id}
                  onClick={() => onSelectPosition(pos.id)}
                  className={`group flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors
                    ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  {/* Bare icon, no background container */}
                  <Users className="h-5 w-5 text-muted-foreground shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : ""}`}>
                      {pos.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {userCount} nhân viên
                    </p>
                  </div>

                  {/* Badge + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 font-semibold ${CLEARANCE_CLASS[pos.clearance]}`}
                    >
                      {CLEARANCE_LABELS[pos.clearance]}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(pos);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity p-1 rounded hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer add link */}
      <div className="px-4 py-3 border-t flex-shrink-0">
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm vị trí
        </button>
      </div>

      {/* Add / edit position dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? (
                "Chỉnh sửa vị trí"
              ) : (
                <>
                  Thêm vị trí —{" "}
                  <span className="text-muted-foreground font-normal">
                    {ou?.name}
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-8 py-2">
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">Tên vị trí</Label>
              <Input
                className="placeholder:text-[12.5px]"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="VD: Trưởng phòng, Nhân viên..."
                onKeyDown={(e) => e.key === "Enter" && handle()}
              />
            </div>
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">
                Cấp độ bảo mật
              </Label>
              <Select
                value={form.clearance}
                onValueChange={(v) => set("clearance", v)}
              >
                <SelectTrigger className="text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      <div className="flex items-center gap-2 text-[12.5px]">
                        <span className="text-muted-foreground w-2">{c}</span>
                        <span>{CLEARANCE_LABELS[c]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!form.name.trim() || saving} onClick={handle}>
              {saving ? "Đang lưu..." : editTarget ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
