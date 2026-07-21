/** UserProfileDialog: shows current user's info and allows password change. */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, KeyRound, Mail, Calendar, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types";
import { changePassword } from "@/services/auth.api";
import { CLEARANCE_LABELS, CLEARANCE_CLASS } from "@/components/users/constants";

function getInitials(name: string) {
  return name.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
  token,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: User;
  token: string | null;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = (v: boolean) => {
    if (!v) { setShowPwd(false); setOldPwd(""); setNewPwd(""); setConfirmPwd(""); }
    onOpenChange(v);
  };

  const handleChangePwd = async () => {
    if (newPwd !== confirmPwd) {
      toast({ variant: "destructive", title: "Mật khẩu xác nhận không khớp" });
      return;
    }
    if (newPwd.length < 6) {
      toast({ variant: "destructive", title: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }
    setSaving(true);
    try {
      await changePassword(token!, oldPwd, newPwd);
      toast({ variant: "success", title: "Đổi mật khẩu thành công" });
      setShowPwd(false);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thông tin tài khoản</DialogTitle>
        </DialogHeader>

        {/* Avatar + name + email */}
        <div className="flex items-center gap-4 py-2">
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-white text-lg font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 ${CLEARANCE_CLASS[user.max_clearance]}`}
              >
                <Shield className="h-2.5 w-2.5 mr-1" />
                {CLEARANCE_LABELS[user.max_clearance]}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 ${user.status === "active"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"}`}
              >
                {user.status === "active" ? "Đang hoạt động" : user.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Created at */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Tham gia: {formatDate(user.created_at)}</span>
        </div>

        <Separator />

        {/* Positions */}
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Vị trí công việc
          </p>
          {user.oui_positions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Chưa có vị trí nào</p>
          ) : (
            <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
              {user.oui_positions.map((p) => (
                <div
                  key={`${p.oui_id}-${p.position_id}`}
                  className="rounded-md border px-3 py-2 bg-muted/30 space-y-1"
                >
                  <div className="flex items-center gap-1 text-[13px] text-muted-foreground flex-wrap">
                    <span>{p.ou_name}</span>
                    <span className="opacity-50">›</span>
                    <span className="font-medium text-foreground">{p.oui_name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.position_name}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 shrink-0 ${CLEARANCE_CLASS[p.clearance]}`}
                    >
                      {CLEARANCE_LABELS[p.clearance]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Change password */}
        <div className="grid gap-2">
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full text-left"
            onClick={() => setShowPwd((v) => !v)}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Đổi mật khẩu
            {showPwd ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
          </button>

          {showPwd && (
            <div className="grid gap-3 pt-1">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Mật khẩu hiện tại</Label>
                <Input
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  placeholder="••••••••"
                  className="text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="••••••••"
                  className="text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Xác nhận mật khẩu mới</Label>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="••••••••"
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleChangePwd()}
                />
              </div>
              <Button
                size="sm"
                disabled={!oldPwd || !newPwd || !confirmPwd || saving}
                onClick={handleChangePwd}
              >
                {saving ? "Đang lưu..." : "Đổi mật khẩu"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
