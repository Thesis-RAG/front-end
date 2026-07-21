/** Inline edit form that expands directly below a clicked rule row in the table. */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { CreateRulePayload, DomainRule, EntityTypeItem } from "@/types/policy";
import { initialFormFromRule, type RuleFormState } from "./constants";
import { RuleFormFields } from "./RuleFormFields";

interface RuleInlineEditRowProps {
  rule: DomainRule;
  colSpan: number;
  onSave: (payload: CreateRulePayload) => Promise<void>;
  onCancel: () => void;
  domainEntityTypes?: EntityTypeItem[];
  lockedRoles?: string[];
}

export function RuleInlineEditRow({
  rule,
  colSpan,
  onSave,
  onCancel,
  domainEntityTypes = [],
  lockedRoles = [],
}: RuleInlineEditRowProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RuleFormState>(() => {
    const base = initialFormFromRule(rule);
    if (lockedRoles.length > 0) {
      base.conditions.applicable_roles = Array.from(
        new Set([...lockedRoles, ...base.conditions.applicable_roles]),
      );
    }
    return base;
  });

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
    } catch (err: unknown) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={colSpan} className="p-0">
        <div className="px-5 py-4 border-t border-border/60">
          <RuleFormFields
            form={form}
            setForm={setForm}
            lockCode
            domainEntityTypes={domainEntityTypes}
            lockedRoles={lockedRoles}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
