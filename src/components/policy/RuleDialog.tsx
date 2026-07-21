/** Modal dialog for creating or editing a policy rule. */
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { CreateRulePayload, DomainRule, EntityTypeItem } from "@/types/policy";
import { initialFormFromRule, type RuleFormState } from "./constants";
import { RuleFormFields } from "./RuleFormFields";

interface RuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateRulePayload) => Promise<void>;
  initial?: DomainRule | null;
  domainEntityTypes?: EntityTypeItem[];
  lockedRoles?: string[];
}

export function RuleDialog({
  open,
  onClose,
  onSave,
  initial,
  domainEntityTypes = [],
  lockedRoles = [],
}: RuleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RuleFormState>(() =>
    initialFormFromRule(initial),
  );

  // Sync form and always inject locked roles.
  useEffect(() => {
    const base = initialFormFromRule(initial);
    if (lockedRoles.length > 0) {
      base.conditions.applicable_roles = Array.from(
        new Set([...lockedRoles, ...base.conditions.applicable_roles]),
      );
    }
    setForm(base);
  }, [initial, open]);

  async function handleSave() {
    if (!form.rule_code.trim() || !form.name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền mã rule và tên.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    // Always ensure locked roles are present in the payload.
    const payload: CreateRulePayload = {
      ...form,
      conditions: {
        ...form.conditions,
        applicable_roles: Array.from(
          new Set([...lockedRoles, ...form.conditions.applicable_roles]),
        ),
      },
    };
    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa luật" : "Tạo luật mới"}</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Cấu hình điều kiện kích hoạt và policy-contract đầu ra.
          </DialogDescription>
        </DialogHeader>

        <RuleFormFields
          form={form}
          setForm={setForm}
          lockCode={!!initial}
          domainEntityTypes={domainEntityTypes}
          lockedRoles={lockedRoles}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Cập nhật" : "Tạo luật"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
