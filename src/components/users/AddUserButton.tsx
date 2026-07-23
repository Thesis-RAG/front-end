/** AddUserButton: button + dialog for creating a new user account. */
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createUser } from "@/services/users.api";

export function AddUserButton({ onCreated }: { onCreated?: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = Object.values(form).every((v) => v.trim());

  // Submit the create-user form.
  const handle = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createUser(form, token);
      toast({ variant: "success", title: `Người dùng "${form.name}" đã tạo` });
      setOpen(false);
      setForm({ name: "", email: "", password: "" });
      onCreated?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="default" className="gap-2" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" /> Thêm người dùng
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Sau khi tạo, gán người dùng vào đơn vị và vị trí từ bảng danh sách.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Họ tên</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nguyễn Văn A"
                className="placeholder:text-[12px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="nva@company.com"
                className="placeholder:text-[12px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Mật khẩu</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!canSubmit || saving} onClick={handle}>
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
