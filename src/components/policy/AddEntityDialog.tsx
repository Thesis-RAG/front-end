/** Dialog for manually adding a new entity type to a domain, with auto Vi→En translation. */
import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
import { addEntityType } from "@/services/policy.api";
import { fetchDomain } from "@/services/policy.api";
import type { PolicyDomain } from "@/types/policy";
import { toSnakeCase, translateViToEn } from "./constants";

interface AddEntityDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDomainId: string | null;
  token: string | null;
  onAdded: (updated: PolicyDomain) => void;
}

export function AddEntityDialog({
  open,
  onClose,
  selectedDomainId,
  token,
  onAdded,
}: AddEntityDialogProps) {
  const [entityForm, setEntityForm] = useState({ entity_type: "", label_vi: "" });
  const [entitySaving, setEntitySaving] = useState(false);
  const [entityTranslating, setEntityTranslating] = useState(false);
  const [entityEngEdited, setEntityEngEdited] = useState(false);

  // Auto-translate label_vi → entity_type (debounced 600 ms).
  useEffect(() => {
    if (entityEngEdited || !entityForm.label_vi.trim()) {
      if (!entityForm.label_vi.trim())
        setEntityForm((f) => ({ ...f, entity_type: "" }));
      return;
    }
    const timer = setTimeout(async () => {
      setEntityTranslating(true);
      try {
        const en = await translateViToEn(entityForm.label_vi.trim());
        setEntityForm((f) => ({ ...f, entity_type: toSnakeCase(en) }));
      } catch {
        setEntityForm((f) => ({
          ...f,
          entity_type: toSnakeCase(f.label_vi),
        }));
      } finally {
        setEntityTranslating(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [entityForm.label_vi, entityEngEdited]);

  // Reset internal state when dialog closes.
  const handleClose = () => {
    setEntityForm({ entity_type: "", label_vi: "" });
    setEntityEngEdited(false);
    onClose();
  };

  async function handleAdd() {
    if (!token || !selectedDomainId) return;
    const et = toSnakeCase(
      entityForm.entity_type.trim() || entityForm.label_vi.trim(),
    );
    if (!et || !entityForm.label_vi.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Nhập tên tiếng Việt.",
        variant: "destructive",
      });
      return;
    }
    setEntitySaving(true);
    try {
      await addEntityType(token, selectedDomainId, {
        entity_type: et,
        label_vi: entityForm.label_vi.trim() || undefined,
      });
      toast({ title: "Đã thêm", description: et });
      const updated = await fetchDomain(token, selectedDomainId);
      handleClose();
      onAdded(updated);
    } catch (err) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    } finally {
      setEntitySaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm loại thực thể</DialogTitle>
          <DialogDescription className="text-[12px]">
            Nhập tên tiếng Việt — tên tiếng Anh sẽ được tự động dịch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Vietnamese name — primary input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Tên loại thực thể *
            </Label>
            <Input
              placeholder="VD: Họ và tên, Số điện thoại..."
              value={entityForm.label_vi}
              onChange={(e) => {
                setEntityEngEdited(false);
                setEntityForm((f) => ({ ...f, label_vi: e.target.value }));
              }}
              autoFocus
              className="placeholder:text-[12px]"
            />
          </div>

          {/* English name — auto-translated, editable */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                className={
                  entityEngEdited
                    ? "text-foreground text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                Tên tiếng Anh (snake_case)
              </Label>
              {entityTranslating ? (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Đang dịch...
                </span>
              ) : !entityEngEdited && entityForm.entity_type ? (
                <span className="flex items-center gap-1 text-[11px] text-blue-600">
                  <Sparkles className="h-3 w-3" /> Tự động dịch
                </span>
              ) : entityEngEdited ? (
                <button
                  className="text-[11px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
                  onClick={() => setEntityEngEdited(false)}
                >
                  Đặt lại tự động
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Input
                placeholder="VD: full_name"
                value={entityForm.entity_type}
                className={`font-mono text-sm placeholder:text-[12px] pr-8 ${
                  !entityEngEdited &&
                  !entityTranslating &&
                  entityForm.entity_type
                    ? "bg-blue-50/60 border-blue-200 text-blue-800"
                    : ""
                }`}
                onChange={(e) => {
                  setEntityEngEdited(true);
                  setEntityForm((f) => ({
                    ...f,
                    entity_type: e.target.value,
                  }));
                }}
              />
              {entityTranslating && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              GLiNER chỉ nhận tiếng Anh snake_case. Bạn có thể sửa tay nếu
              cần.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={entitySaving}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAdd}
            disabled={
              entitySaving ||
              entityTranslating ||
              !entityForm.label_vi.trim()
            }
          >
            {entitySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
