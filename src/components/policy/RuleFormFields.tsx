/** Shared rule form used by both the create/edit dialog and the inline edit row. */
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntityTypeItem, RuleConditions, RuleContract } from "@/types/policy";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrgUnitInstances, fetchPositions, type OrgUnitInstance, type Position } from "@/services/org_units.api";
import {
  DEFAULT_INTENT_OPTIONS,
  INTENT_LABEL,
  SENSITIVITY_OPTIONS,
  SENSITIVITY_VI,
  USER_LEVEL_OPTIONS,
  VIOLATION_ACTION_GROUPS,
  VIOLATION_ACTION_OPTIONS,
  VIOLATION_ACTION_COLOR,
  MAX_DETAIL_OPTIONS,
  NUMERIC_OPTIONS,
  VALID_MAX_DETAIL,
  csvToArray,
  arrayToCsv,
  type RuleFormState,
} from "./constants";

interface RuleFormFieldsProps {
  form: RuleFormState;
  setForm: Dispatch<SetStateAction<RuleFormState>>;
  lockCode?: boolean;
  domainEntityTypes?: EntityTypeItem[];
  lockedRoles?: string[];
}

export function RuleFormFields({
  form,
  setForm,
  lockCode,
  domainEntityTypes = [],
  lockedRoles = [],
}: RuleFormFieldsProps) {
  const { token } = useAuth();
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [customIntentInput, setCustomIntentInput] = useState("");
  // combobox mode: true = manual input, false = pick from list
  const [customViolation, setCustomViolation] = useState(
    !VIOLATION_ACTION_OPTIONS.some(
      (o) => o.value === form.contract.violation_action,
    ),
  );
  const [customMaxDetail, setCustomMaxDetail] = useState(
    !MAX_DETAIL_OPTIONS.some((o) => o.value === form.contract.max_detail),
  );
  const [customNumeric, setCustomNumeric] = useState(
    !NUMERIC_OPTIONS.some((o) => o.value === form.contract.numeric_granularity),
  );

  useEffect(() => {
    if (!token) return;
    Promise.all([fetchOrgUnitInstances(token), fetchPositions(token)])
      .then(([loadedOuis, loadedPositions]) => {
        setOrgUnitInstances(loadedOuis);
        setPositions(loadedPositions);
      })
      .catch(() => {
        setOrgUnitInstances([]);
        setPositions([]);
      });
  }, [token]);

  const setCondition = <K extends keyof RuleConditions>(
    key: K,
    value: RuleConditions[K],
  ) =>
    setForm((f) => ({ ...f, conditions: { ...f.conditions, [key]: value } }));

  const setContractField = <K extends keyof RuleContract>(
    key: K,
    value: RuleContract[K],
  ) => setForm((f) => ({ ...f, contract: { ...f.contract, [key]: value } }));

  const entityLabels = domainEntityTypes.map((e) => e.entity_type);
  const roleOptions = Array.from(new Set([
    ...positions.map((position) => position.name),
    ...form.conditions.applicable_roles,
    ...form.conditions.blocked_roles,
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b));

  function toggleRole(role: string, mode: "exempt" | "force") {
    setForm((current) => {
      const conditions = current.conditions;
      if (mode === "exempt") {
        const selected = conditions.applicable_roles.includes(role);
        return {
          ...current,
          conditions: {
            ...conditions,
            applicable_roles: selected
              ? conditions.applicable_roles.filter((item) => item !== role)
              : [...conditions.applicable_roles, role],
            blocked_roles: conditions.blocked_roles.filter((item) => item !== role),
          },
        };
      }
      const selected = conditions.blocked_roles.includes(role);
      return {
        ...current,
        conditions: {
          ...conditions,
          blocked_roles: selected
            ? conditions.blocked_roles.filter((item) => item !== role)
            : [...conditions.blocked_roles, role],
          applicable_roles: conditions.applicable_roles.filter((item) => item !== role),
        },
      };
    });
  }

  // All available intents (defaults + any custom ones already added).
  const allIntents = Array.from(
    new Set([...DEFAULT_INTENT_OPTIONS, ...form.conditions.applicable_intents]),
  );

  function addCustomIntent() {
    const val = customIntentInput.trim();
    if (!val || form.conditions.applicable_intents.includes(val)) return;
    setCondition("applicable_intents", [
      ...form.conditions.applicable_intents,
      val,
    ]);
    setCustomIntentInput("");
  }

  return (
    <div className="grid gap-4 py-2">
      {/* ── Basic info ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Mã quy tắc *</Label>
          <Input
            placeholder="VD: HR-01-R001"
            value={form.rule_code}
            onChange={(e) =>
              setForm((f) => ({ ...f, rule_code: e.target.value }))
            }
            disabled={!!lockCode}
            className="placeholder:text-[10px] !text-[11px]"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Tên quy tắc *</Label>
          <Input
            placeholder="Mô tả ngắn gọn quy tắc này"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="placeholder:text-[12px] !text-[12px]"
          />
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="grid gap-2 w-32">
          <Label className="text-xs text-muted-foreground">
            Độ ưu tiên (0–100)
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.priority}
            onChange={(e) =>
              setForm((f) => ({ ...f, priority: Number(e.target.value) }))
            }
            className="!text-[12px]"
          />
        </div>
        <div className="flex gap-4 items-center pb-1">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.mandatory}
              onCheckedChange={(v) => setForm((f) => ({ ...f, mandatory: v }))}
            />
            <Label className="text-xs text-muted-foreground">Bắt buộc</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.audit_log}
              onCheckedChange={(v) => setForm((f) => ({ ...f, audit_log: v }))}
            />
            <Label className="text-xs text-muted-foreground">Ghi log</Label>
          </div>
        </div>
      </div>

      {/* ── Trigger conditions ────────────────────────────────────────────── */}
      <div className="rounded-md border p-4 grid gap-4 bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Điều kiện kích hoạt
        </p>

        {/* Sensitivity + user level */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Độ nhạy tài liệu tối thiểu
            </Label>
            <Select
              value={form.conditions.min_sensitivity ?? "none"}
              onValueChange={(v) =>
                setCondition("min_sensitivity", v === "none" ? null : v)
              }
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue placeholder="Không giới hạn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-[12px]">
                  Không giới hạn
                </SelectItem>
                {SENSITIVITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-[12px]">
                    {SENSITIVITY_VI[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Cấp độ tối thiểu của người dùng
            </Label>
            <Select
              value={form.conditions.min_user_level?.toString() ?? "none"}
              onValueChange={(v) =>
                setCondition(
                  "min_user_level",
                  v === "none" ? null : Number(v),
                )
              }
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue placeholder="Không giới hạn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-[12px]">
                  Không giới hạn
                </SelectItem>
                {USER_LEVEL_OPTIONS.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value.toString()}
                    className="text-[12px]"
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Roles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Vai trò được miễn áp dụng
            </Label>

            {/* Locked roles — always included, cannot be removed */}
            {lockedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-dashed border-border bg-muted/30">
                {lockedRoles.map((role) => (
                  <span
                    key={role}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border font-medium text-muted-foreground select-none"
                  >
                    <Lock className="h-2.5 w-2.5 shrink-0" />
                    {role}
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chọn từ danh sách vai trò</p>
              {roleOptions.filter((role) => !lockedRoles.includes(role)).length > 0 ? (
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {roleOptions.filter((role) => !lockedRoles.includes(role)).map((role) => {
                    const selected = form.conditions.applicable_roles.includes(role);
                    return (
                      <button key={`exempt-${role}`} type="button" aria-pressed={selected} onClick={() => toggleRole(role, "exempt")} className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/60"}`}>
                        {selected ? "✓ " : ""}{role}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-[10px] text-muted-foreground">Chưa tải được danh sách vai trò; bạn vẫn có thể nhập thủ công bên dưới.</p>}
            </div>

            {/* Editable additional roles (non-locked only) */}
            <Input
              placeholder="Thêm vị trí khác (VD: Director, Manager...)"
              value={arrayToCsv(
                form.conditions.applicable_roles.filter(
                  (r) => !lockedRoles.includes(r),
                ),
              )}
              onChange={(e) => {
                const extra = csvToArray(e.target.value).filter(
                  (r) => !lockedRoles.includes(r),
                );
                setCondition("applicable_roles", [...lockedRoles, ...extra]);
              }}
              className="placeholder:text-[11px] text-[12px]"
            />
            <p className="text-[10px] text-muted-foreground/70">
              Vị trí này dù bị dính quy tắc vẫn xem được đầy đủ, không bị hạn
              chế. Các vị trí có khóa 🔒 luôn được bao gồm và không thể xóa.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Bắt buộc áp dụng cho vai trò
            </Label>
            <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chọn từ danh sách vai trò</p>
              {roleOptions.filter((role) => !lockedRoles.includes(role)).length > 0 ? (
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {roleOptions.filter((role) => !lockedRoles.includes(role)).map((role) => {
                    const selected = form.conditions.blocked_roles.includes(role);
                    return (
                      <button key={`force-${role}`} type="button" aria-pressed={selected} onClick={() => toggleRole(role, "force")} className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${selected ? "border-amber-600 bg-amber-600 text-white" : "border-border bg-background text-muted-foreground hover:border-amber-500/60"}`}>
                        {selected ? "✓ " : ""}{role}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-[10px] text-muted-foreground">Chưa có vai trò từ cơ cấu tổ chức.</p>}
            </div>
            <Input
              placeholder="VD: Guest, Contractor"
              value={arrayToCsv(form.conditions.blocked_roles)}
              onChange={(e) =>
                setCondition("blocked_roles", csvToArray(e.target.value))
              }
              className="placeholder:text-[11px] text-[12px]"
            />
            <p className="text-[10px] text-muted-foreground/70">
              Vị trí này gặp quy tắc là tự động áp dụng ngay, không xét điều
              kiện khác.
            </p>
          </div>
        </div>

        {/* Intents */}
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Loại truy vấn áp dụng{" "}
            <span className="text-muted-foreground/60">
              (Mặc định = Tất cả)
            </span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {allIntents.map((intent) => {
              const checked =
                form.conditions.applicable_intents.includes(intent);
              const isCustom = !DEFAULT_INTENT_OPTIONS.includes(intent);
              return (
                <button
                  key={intent}
                  type="button"
                  onClick={() => {
                    const arr = checked
                      ? form.conditions.applicable_intents.filter(
                          (i) => i !== intent,
                        )
                      : [...form.conditions.applicable_intents, intent];
                    setCondition("applicable_intents", arr);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    checked
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {INTENT_LABEL[intent] ?? intent}
                  {isCustom && <span className="ml-1 opacity-50">*</span>}
                </button>
              );
            })}
          </div>
          {/* Add custom intent */}
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Thêm loại truy vấn tùy chỉnh..."
              value={customIntentInput}
              onChange={(e) => setCustomIntentInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCustomIntent())
              }
              className="text-[12px] placeholder:text-[11px] h-8 flex-1"
            />
            <button
              type="button"
              onClick={addCustomIntent}
              className="px-3 h-8 rounded-md border border-dashed border-primary/40 text-[11px] text-primary hover:bg-primary/5 transition-colors"
            >
              + Thêm
            </button>
          </div>
        </div>

        {/* Field scope and department scope */}
        <div className="rounded-md border border-dashed p-3 grid gap-3 bg-background/60">
          <div>
            <Label className="text-xs text-muted-foreground">Phạm vi trường thông tin</Label>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Để trống nếu rule áp dụng cho toàn bộ chunk. Chọn ví dụ <b>money</b> cho lương và <b>email/phone/person</b> cho thông tin cá nhân.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(entityLabels.length ? entityLabels : ["money", "email", "phone", "person_name", "address"]).map((label) => {
              const checked = form.conditions.target_entity_types.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCondition("target_entity_types", checked
                    ? form.conditions.target_entity_types.filter((item) => item !== label)
                    : [...form.conditions.target_entity_types, label])}
                  className={`px-2.5 py-1 rounded-full text-[10px] border ${checked ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}
                >{label}</button>
              );
            })}
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Hoặc chọn nhóm dữ liệu</Label>
            <div className="flex flex-wrap gap-2">
              {["has_financial", "has_pii", "has_hr", "has_credential", "has_legal", "has_strategic"].map((flag) => {
                const checked = form.conditions.target_flags.includes(flag);
                return (
                  <button key={flag} type="button" onClick={() => setCondition("target_flags", checked
                    ? form.conditions.target_flags.filter((item) => item !== flag)
                    : [...form.conditions.target_flags, flag])}
                    className={`px-2.5 py-1 rounded-full text-[10px] border ${checked ? "bg-amber-500 text-white border-amber-500" : "bg-background text-muted-foreground border-border"}`}>
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Phòng ban áp dụng</Label>
            <select
              multiple
              value={form.conditions.applicable_oui_ids}
              onChange={(event) => setCondition("applicable_oui_ids", Array.from(event.target.selectedOptions, (option) => option.value))}
              className="min-h-20 rounded-md border border-input bg-background px-2 py-1 text-[11px]"
            >
              {orgUnitInstances.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground/70">Giữ Ctrl để chọn nhiều phòng ban; để trống = toàn công ty.</p>
          </div>
        </div>

        {/* Switches */}
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-start gap-2">
            <Switch
              checked={form.conditions.cross_dept_only}
              onCheckedChange={(v) => setCondition("cross_dept_only", v)}
              className="mt-0.5"
            />
            <div>
              <Label className="text-xs text-muted-foreground leading-tight">
                Tài liệu ở cấp tổ chức cao hơn
              </Label>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Kích hoạt khi tài liệu thuộc đơn vị lớn hơn của vị trí người dùng{" "}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Policy contract (output) ──────────────────────────────────────── */}
      <div className="rounded-md border p-4 grid gap-4 bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Hợp đồng chính sách (đầu ra)
        </p>

        {/* Violation action — primary field */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Hành động khi vi phạm *
            </Label>
            <button
              type="button"
              onClick={() => {
                if (!customViolation) {
                  setContractField("violation_action", "");
                  setCustomViolation(true);
                } else {
                  setContractField("violation_action", "conditional");
                  setCustomViolation(false);
                }
              }}
              className="text-[10px] text-primary hover:underline"
            >
              {customViolation ? "← Chọn từ danh sách" : "Tự nhập..."}
            </button>
          </div>
          {customViolation ? (
            <Input
              autoFocus
              placeholder="Nhập hành động tuỳ chỉnh..."
              value={form.contract.violation_action}
              onChange={(e) =>
                setContractField("violation_action", e.target.value)
              }
              className="text-[12px] placeholder:text-[11px]"
            />
          ) : (
            <Select
              value={form.contract.violation_action}
              onValueChange={(v) => {
                setContractField("violation_action", v);
                if (
                  v === "conditional" &&
                  !VALID_MAX_DETAIL.includes(form.contract.max_detail)
                ) {
                  setContractField("max_detail", "generalize");
                  setCustomMaxDetail(false);
                }
              }}
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIOLATION_ACTION_GROUPS.map((g) => (
                  <SelectGroup key={g.label}>
                    <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground/60 px-2 py-1">
                      {g.label}
                    </SelectLabel>
                    {g.options.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-[12px]"
                      >
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-2 shrink-0 ${VIOLATION_ACTION_COLOR[o.value]?.split(" ")[0] ?? ""}`}
                        />
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Sub-options: only shown when violation_action = "conditional" */}
        {form.contract.violation_action === "conditional" &&
          (() => {
            const md = form.contract.max_detail;
            // numeric_granularity applies to every mode except redact (full masking)
            const numericActive = customMaxDetail || md !== "redact";
            const exactRisk =
              numericActive &&
              form.contract.numeric_granularity === "exact";

            return (
              <div className="pl-3 border-l-2 border-primary/20 ml-1 grid gap-3">
                <div
                  className={
                    numericActive
                      ? "grid grid-cols-2 gap-4 items-start"
                      : "grid gap-1.5"
                  }
                >
                  {/* Content transformation mode (max_detail) */}
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Mức trả lời chi tiết
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!customMaxDetail) {
                            setContractField("max_detail", "");
                            setCustomMaxDetail(true);
                          } else {
                            setContractField("max_detail", "generalize");
                            setCustomMaxDetail(false);
                          }
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {customMaxDetail ? "← Danh sách" : "Tự nhập..."}
                      </button>
                    </div>
                    {customMaxDetail ? (
                      <Input
                        autoFocus
                        placeholder="Nhập chế độ tuỳ chỉnh..."
                        value={form.contract.max_detail}
                        onChange={(e) =>
                          setContractField("max_detail", e.target.value)
                        }
                        className="text-[12px] placeholder:text-[11px]"
                      />
                    ) : (
                      <Select
                        value={form.contract.max_detail}
                        onValueChange={(v) => {
                          setContractField("max_detail", v);
                          // When switching to redact, reset numeric to aggregated (safe default).
                          if (v === "redact") {
                            setContractField(
                              "numeric_granularity",
                              "aggregated",
                            );
                            setCustomNumeric(false);
                          }
                        }}
                      >
                        <SelectTrigger className="text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MAX_DETAIL_OPTIONS.map((o) => (
                            <SelectItem
                              key={o.value}
                              value={o.value}
                              className="text-[12px]"
                            >
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Numeric granularity — only shown for anonymize/generalize */}
                  {numericActive && (
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          Độ chính xác số liệu
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!customNumeric) {
                              setContractField("numeric_granularity", "");
                              setCustomNumeric(true);
                            } else {
                              setContractField(
                                "numeric_granularity",
                                "aggregated",
                              );
                              setCustomNumeric(false);
                            }
                          }}
                          className="text-[10px] text-primary hover:underline"
                        >
                          {customNumeric ? "← Danh sách" : "Tự nhập..."}
                        </button>
                      </div>
                      {customNumeric ? (
                        <Input
                          autoFocus
                          placeholder="Nhập độ chính xác tuỳ chỉnh..."
                          value={form.contract.numeric_granularity}
                          onChange={(e) =>
                            setContractField(
                              "numeric_granularity",
                              e.target.value,
                            )
                          }
                          className="text-[12px] placeholder:text-[11px]"
                        />
                      ) : (
                        <Select
                          value={form.contract.numeric_granularity}
                          onValueChange={(v) =>
                            setContractField("numeric_granularity", v)
                          }
                        >
                          <SelectTrigger
                            className={`text-[12px] ${exactRisk ? "border-amber-400" : ""}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NUMERIC_OPTIONS.map((o) => (
                              <SelectItem
                                key={o.value}
                                value={o.value}
                                className="text-[12px]"
                              >
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {exactRisk && (
                        <p className="text-[10px] text-amber-600 leading-tight">
                          Số chính xác có thể giúp tái nhận dạng danh tính nếu
                          giá trị là duy nhất trong tập dữ liệu.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Note when numeric is hidden */}
                {!numericActive && (
                  <p className="text-[10px] text-muted-foreground/55 italic">
                    Che thông tin thay toàn bộ chunk bằng thông báo cố định — độ chính xác số liệu không có hiệu lực.
                  </p>
                )}
              </div>
            );
          })()}

      </div>
    </div>
  );
}
