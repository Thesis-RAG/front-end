/** Dialog for creating a new policy domain with AI entity-type suggestions. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { SENSITIVITY_LABEL } from "@/types/policy";
import type { PolicyDomain } from "@/types/policy";
import { createDomain } from "@/services/policy.api";

interface CreateDomainDialogProps {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onCreated: (domain: PolicyDomain) => void;
}

export function CreateDomainDialog({
  open,
  onClose,
  token,
  onCreated,
}: CreateDomainDialogProps) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    base_sensitivity: 2,
  });
  const [loading, setLoading] = useState(false);

  // Reset form when dialog closes.
  const handleClose = () => {
    setForm({ code: "", name: "", description: "", base_sensitivity: 2 });
    onClose();
  };

  async function handleCreate() {
    if (!token) return;
    const { code, name } = form;
    if (!code.trim() || !name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Mã domain và tên là bắt buộc.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const domain = await createDomain(token, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: form.description.trim() || undefined,
        base_sensitivity: form.base_sensitivity,
      });
      toast({
        title: "Đã tạo domain",
        description: `"${domain.name}" — LLM đã gợi ý ${domain.entity_types.length} entity type(s).`,
      });
      handleClose();
      onCreated(domain);
    } catch (err) {
      toast({
        title: "Lỗi tạo domain",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo miền mới</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Sau khi tạo, AI sẽ tự động gợi ý 10 loại thực thể phù hợp với
            miền, bạn có thể thay đổi thủ công hoặc dùng gợi ý AI để thêm các
            loại thực thể khác.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mã miền *</Label>
              <Input
                placeholder="VD: HR-01"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                className="placeholder:text-[12px]"
              />
              <p className="text-[10.5px] text-muted-foreground">
                Chữ hoa, số, gạch ngang. VD: HR-01, FIN-02
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Độ nhạy cơ bản</Label>
              <Select
                value={String(form.base_sensitivity)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, base_sensitivity: Number(v) }))
                }
              >
                <SelectTrigger className="text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-[12px]">
                      {n} - {SENSITIVITY_LABEL[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tên miền *</Label>
            <Input
              placeholder="VD: Dữ liệu nhân sự"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="placeholder:text-[12px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mô tả</Label>
            <Textarea
              rows={3}
              placeholder="Mô tả miền giúp AI gợi ý loại thực thể chính xác hơn..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="placeholder:text-[12px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Đang tạo và gợi ý thực thể..." : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
