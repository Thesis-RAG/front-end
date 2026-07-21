/** UserDetailDialog: read-only view of a user's profile and OUI/position assignments. */
import { ChevronRight, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserRecord } from "@/services/users.api";
import { CLEARANCE_LABELS, CLEARANCE_CLASS } from "./constants";

export function UserDetailDialog({
  user,
  onClose,
}: {
  user: UserRecord | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Chi tiết người dùng</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[12.5px]">Tên</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[12.5px]">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[12.5px]">Trạng thái</span>
              <div className="flex gap-1.5 items-center">
                <div
                  className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`}
                />
                <span>
                  {user.status === "active" ? "Đang hoạt động" : "Không hoạt động"}
                </span>
              </div>
            </div>
            {user.oui_positions.length > 0 && (
              <div>
                <p className="text-muted-foreground text-[12.5px] mb-2">
                  Đơn vị & Vị trí
                </p>
                <div className="space-y-1.5">
                  {user.oui_positions.map((p) => (
                    <div
                      key={p.oui_id}
                      className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5 text-xs"
                    >
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{p.ou_name} /</span>
                      <span className="font-medium">{p.oui_name}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-primary">{p.position_name}</span>
                      <Badge
                        variant="secondary"
                        className={`ml-auto text-[10px] px-1 py-0 ${CLEARANCE_CLASS[p.clearance]}`}
                      >
                        {CLEARANCE_LABELS[p.clearance]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
