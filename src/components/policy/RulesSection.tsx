/** Rules table for rules scoped to the selected domain. */
import { Fragment, useState } from "react";
import { Plus, Trash2, Pencil, ShieldCheck, Loader2, ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CreateRulePayload, DomainRule, EntityTypeItem } from "@/types/policy";
import {
  VIOLATION_ACTION_OPTIONS,
  VIOLATION_ACTION_COLOR,
  MAX_DETAIL_OPTIONS,
  NUMERIC_OPTIONS,
} from "./constants";
import { RuleDialog } from "./RuleDialog";
import { RuleInlineEditRow } from "./RuleInlineEditRow";

interface RulesSectionProps {
  rules: DomainRule[];
  loading: boolean;
  onCreateRule: (payload: CreateRulePayload) => Promise<void>;
  onUpdateRule: (ruleId: string, payload: CreateRulePayload) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onToggleRule?: (ruleId: string, active: boolean) => Promise<void>;
  domainEntityTypes?: EntityTypeItem[];
  lockedRoles?: string[];
}

export function RulesSection({
  rules,
  loading,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  domainEntityTypes = [],
  lockedRoles = [],
}: RulesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<DomainRule | null>(null);
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(
    new Set(),
  );

  function openCreate() {
    setEditRule(null);
    setDialogOpen(true);
  }

  function toggleExpand(ruleId: string) {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  }

  function closeExpand(ruleId: string) {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      next.delete(ruleId);
      return next;
    });
  }

  async function handleInlineSave(ruleId: string, payload: CreateRulePayload) {
    await onUpdateRule(ruleId, payload);
    closeExpand(ruleId);
  }

  async function handleCreateSave(payload: CreateRulePayload) {
    await onCreateRule(payload);
  }

  async function handleDelete(rule: DomainRule) {
    if (!confirm(`Xóa rule "${rule.name}"?`)) return;
    await onDeleteRule(rule.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground"></p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Thêm luật
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Đang tải...</span>
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="font-medium text-sm">Chưa có luật nào</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Nhấn "Thêm luật" để tạo luật đầu tiên.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Mã
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Tên
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Hành động
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide w-28">
                  Độ ưu tiên
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Hợp đồng
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => {
                const isExpanded = expandedRuleIds.has(rule.id);
                return (
                  <Fragment key={rule.id}>
                    <TableRow
                      onClick={() => toggleExpand(rule.id)}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${!rule.is_active ? "opacity-50" : ""} ${isExpanded ? "bg-muted/30" : ""}`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {rule.rule_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[12.5px]">
                            {rule.name}
                          </span>
                          {rule.mandatory && (
                            <span className="text-[10px] font-semibold text-foreground/70 bg-green-200 px-1.5 py-[2px] rounded-md">
                              Bắt buộc
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const va =
                            rule.contract_json?.violation_action ?? "conditional";
                          const label =
                            VIOLATION_ACTION_OPTIONS.find(
                              (o) => o.value === va,
                            )?.label ?? va;
                          return (
                            <span
                              className={`inline-flex px-2 py-[3px] rounded-md text-[11px] font-semibold ${VIOLATION_ACTION_COLOR[va] ?? "bg-muted text-muted-foreground"}`}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-foreground">
                          {rule.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const va = rule.contract_json?.violation_action;
                            if (va !== "conditional") {
                              return (
                                <span className="text-[11px] text-muted-foreground/50">
                                  —
                                </span>
                              );
                            }
                            const detail =
                              MAX_DETAIL_OPTIONS.find(
                                (o) => o.value === rule.contract_json?.max_detail,
                              )?.label ??
                              rule.contract_json?.max_detail ??
                              "—";
                            const numeric =
                              NUMERIC_OPTIONS.find(
                                (o) =>
                                  o.value ===
                                  rule.contract_json?.numeric_granularity,
                              )?.label ??
                              rule.contract_json?.numeric_granularity ??
                              "—";
                            return (
                              <>
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground/70">
                                    Biến đổi
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono text-[10px]">
                                    {detail}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground/70">
                                    Số liệu
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono text-[10px]">
                                    {numeric}
                                  </span>
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onToggleRule && (
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(v) =>
                                onToggleRule(rule.id, v)
                              }
                              className="scale-90"
                              title={
                                rule.is_active
                                  ? "Đang bật — nhấn để tắt"
                                  : "Đang tắt — nhấn để bật"
                              }
                            />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => toggleExpand(rule.id)}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Sửa
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(rule)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <RuleInlineEditRow
                        rule={rule}
                        colSpan={7}
                        onSave={(payload) => handleInlineSave(rule.id, payload)}
                        onCancel={() => closeExpand(rule.id)}
                        domainEntityTypes={domainEntityTypes}
                        lockedRoles={lockedRoles}
                      />
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <RuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreateSave}
        initial={null}
        domainEntityTypes={domainEntityTypes}
        lockedRoles={lockedRoles}
      />
    </div>
  );
}
