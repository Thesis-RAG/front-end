import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
  Globe,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ListChecks,
  Lock,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SENSITIVITY_LABEL } from "@/types/policy";
import type {
  CreateRulePayload,
  DomainRule,
  EntityTypeItem,
  PolicyDomain,
  PolicyDomainSummary,
  RuleConditions,
  RuleContract,
} from "@/types/policy";
import {
  fetchDomains,
  fetchDomain,
  createDomain,
  updateDomain,
  deleteDomain,
  suggestEntityTypes,
  addEntityType,
  deleteEntityType,
  fetchDomainRules,
  createDomainRule,
  fetchGlobalRules,
  createGlobalRule,
  updateRule,
  deleteRule,
} from "@/services/policy.api";

// ── Translation helpers ───────────────────────────────────────────────────────

function toSnakeCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

async function translateViToEn(text: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|en`,
  );
  const data = await res.json();
  return (data.responseData?.translatedText as string) ?? text;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_INTENT_OPTIONS = [
  "lookup",
  "aggregate",
  "export",
  "compare",
  "summarize",
];
const INTENT_LABEL: Record<string, string> = {
  lookup: "Tra cứu",
  aggregate: "Tổng hợp",
  export: "Xuất dữ liệu",
  compare: "So sánh",
  summarize: "Tóm tắt",
};
const SENSITIVITY_OPTIONS = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
  "TopSecret",
];
const SENSITIVITY_VI: Record<string, string> = {
  Public: "Công khai",
  Internal: "Nội bộ",
  Confidential: "Bảo mật",
  Restricted: "Hạn chế",
  TopSecret: "Tuyệt mật",
};
// Cấp độ clearance của user — tương ứng 1:1 với sensitivity
const USER_LEVEL_OPTIONS = [
  { value: 1, label: "Cấp 1 - Công khai" },
  { value: 2, label: "Cấp 2 - Nội bộ" },
  { value: 3, label: "Cấp 3 - Bảo mật" },
  { value: 4, label: "Cấp 4 - Hạn chế" },
  { value: 5, label: "Cấp 5 - Tuyệt mật" },
];

// 4 hành động chính thức: block | conditional | watermark | allow
const VIOLATION_ACTION_GROUPS = [
  {
    label: "Từ chối",
    options: [{ value: "block", label: "Chặn hoàn toàn" }],
  },
  {
    label: "Biến đổi / Lọc nội dung",
    options: [{ value: "conditional", label: "Áp dụng điều kiện" }],
  },
  {
    label: "Cho phép có kiểm soát",
    options: [{ value: "watermark", label: "Cho phép với watermark" }],
  },
  {
    label: "Cho phép",
    options: [{ value: "allow", label: "Cho phép tất cả" }],
  },
];
const VIOLATION_ACTION_OPTIONS = VIOLATION_ACTION_GROUPS.flatMap(
  (g) => g.options,
);
const VIOLATION_ACTION_COLOR: Record<string, string> = {
  block: "bg-red-100 text-red-700",
  conditional: "bg-purple-100 text-purple-700",
  watermark: "bg-blue-100 text-blue-700",
  allow: "bg-green-100 text-green-700",
  // backward compat display
  mask: "bg-yellow-100 text-yellow-700",
  generalize: "bg-orange-100 text-orange-700",
};
// Chế độ biến đổi nội dung — chỉ dùng khi violation_action = "conditional"
const MAX_DETAIL_OPTIONS = [
  { value: "redact",     label: "Che thông tin nhạy cảm " },
  { value: "anonymize",  label: "Ẩn danh hóa " },
  { value: "generalize", label: "Khái quát hóa " },
  { value: "summarize",  label: "Tóm tắt " },
];
const NUMERIC_OPTIONS = [
  { value: "hidden",     label: "Ẩn số liệu" },
  { value: "aggregated", label: "Số liệu tổng hợp" },
  { value: "range_only", label: "Số liệu dạng khoảng" },
  { value: "exact",      label: "Chi tiết đầy đủ" },
];

const DEFAULT_CONDITIONS: RuleConditions = {
  min_sensitivity: null,
  applicable_roles: [],
  blocked_roles: [],
  cross_dept_only: false,
  applicable_intents: [],
  min_user_level: null,
};

const DEFAULT_CONTRACT: RuleContract = {
  violation_action: "conditional",
  max_detail: "generalize",
  numeric_granularity: "aggregated",
  allowed_entities: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function csvToArray(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
function arrayToCsv(arr: string[]): string {
  return arr.join(", ");
}

// ── Shared form state type ───────────────────────────────────────────────────

type RuleFormState = {
  rule_code: string;
  name: string;
  priority: number;
  mandatory: boolean;
  audit_log: boolean;
  conditions: RuleConditions;
  contract: RuleContract;
};

const VALID_MAX_DETAIL = ["redact", "anonymize", "generalize", "summarize"];

function normalizeContract(raw: Partial<RuleContract>): RuleContract {
  const merged = { ...DEFAULT_CONTRACT, ...raw };
  if (merged.violation_action === "conditional" && !VALID_MAX_DETAIL.includes(merged.max_detail)) {
    merged.max_detail = "generalize";
  }
  return merged;
}

function initialFormFromRule(initial?: DomainRule | null): RuleFormState {
  if (!initial) {
    return {
      rule_code: "",
      name: "",
      priority: 50,
      mandatory: false,
      audit_log: true,
      conditions: { ...DEFAULT_CONDITIONS },
      contract: { ...DEFAULT_CONTRACT },
    };
  }
  return {
    rule_code: initial.rule_code,
    name: initial.name,
    priority: initial.priority,
    mandatory: initial.mandatory,
    audit_log: initial.audit_log,
    conditions: { ...DEFAULT_CONDITIONS, ...initial.conditions_json },
    contract: normalizeContract(initial.contract_json),
  };
}

// ── Shared form fields (used by create dialog + inline edit row) ────────────

interface RuleFormFieldsProps {
  form: RuleFormState;
  setForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
  lockCode?: boolean;
  domainEntityTypes?: EntityTypeItem[];
}

function RuleFormFields({
  form,
  setForm,
  lockCode,
  domainEntityTypes = [],
}: RuleFormFieldsProps) {
  const [customIntentInput, setCustomIntentInput] = useState("");
  // combobox mode: true = tự nhập thủ công, false = chọn từ danh sách
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

  // Tất cả intents hiện có (mặc định + tuỳ chỉnh đã được thêm)
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
      {/* ── Thông tin cơ bản ─────────────────────────────────────────────── */}
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

      {/* ── Điều kiện kích hoạt ──────────────────────────────────────────── */}
      <div className="rounded-md border p-4 grid gap-4 bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Điều kiện kích hoạt
        </p>

        {/* Độ nhạy + Level user */}
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
            <Label className="text-xs text-muted-foreground">Cấp độ tối thiểu của người dùng</Label>
            <Select
              value={form.conditions.min_user_level?.toString() ?? "none"}
              onValueChange={(v) =>
                setCondition("min_user_level", v === "none" ? null : Number(v))
              }
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue placeholder="Không giới hạn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-[12px]">Không giới hạn</SelectItem>
                {USER_LEVEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value.toString()} className="text-[12px]">
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
              Vị trí được phép
            </Label>
            <Input
              placeholder="VD: Admin, Director"
              value={arrayToCsv(form.conditions.applicable_roles)}
              onChange={(e) =>
                setCondition("applicable_roles", csvToArray(e.target.value))
              }
              className="placeholder:text-[11px] text-[12px]"
            />
            <p className="text-[10px] text-muted-foreground/70">
              Vị trí này dù bị dính quy tắc vẫn xem được đầy đủ, không bị hạn
              chế.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Vị trí bị chặn (bắt buộc áp dụng quy tắc)
            </Label>
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
          {/* Thêm intent tuỳ chỉnh */}
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
                Kích hoạt khi tài liệu thuộc đơn vị lớn hơn của vị trí người dùng 
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Policy Contract (đầu ra) ─────────────────────────────────────── */}
      <div className="rounded-md border p-4 grid gap-4 bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Hợp đồng chính sách (đầu ra)
        </p>

        {/* Hành động vi phạm — field chính */}
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
                if (v === "conditional" && !VALID_MAX_DETAIL.includes(form.contract.max_detail)) {
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

        {/* Sub-options: chỉ hiển thị khi violation_action = "conditional" */}
        {form.contract.violation_action === "conditional" && (() => {
          const md = form.contract.max_detail;
          // numeric_granularity chỉ có hiệu lực với anonymize / generalize
          const numericActive = !customMaxDetail && (md === "anonymize" || md === "generalize");
          const exactRisk = numericActive && form.contract.numeric_granularity === "exact";

          return (
            <div className="pl-3 border-l-2 border-primary/20 ml-1 grid gap-3">
              <div className={numericActive ? "grid grid-cols-2 gap-4 items-start" : "grid gap-1.5"}>
                {/* Cách biến đổi nội dung (max_detail) */}
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
                      onChange={(e) => setContractField("max_detail", e.target.value)}
                      className="text-[12px] placeholder:text-[11px]"
                    />
                  ) : (
                    <Select
                      value={form.contract.max_detail}
                      onValueChange={(v) => {
                        setContractField("max_detail", v);
                        // Khi chuyển sang redact/summarize, reset numeric về aggregated (safe default)
                        if (v === "redact" || v === "summarize") {
                          setContractField("numeric_granularity", "aggregated");
                          setCustomNumeric(false);
                        }
                      }}
                    >
                      <SelectTrigger className="text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAX_DETAIL_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-[12px]">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Độ chính xác số liệu — chỉ hiện với anonymize/generalize */}
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
                            setContractField("numeric_granularity", "aggregated");
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
                          setContractField("numeric_granularity", e.target.value)
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
                        <SelectTrigger className={`text-[12px] ${exactRisk ? "border-amber-400" : ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NUMERIC_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-[12px]">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {exactRisk && (
                      <p className="text-[10px] text-amber-600 leading-tight">
                        Số chính xác có thể giúp tái nhận dạng danh tính nếu giá trị là duy nhất trong tập dữ liệu.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Note khi numeric bị ẩn */}
              {!numericActive && !customMaxDetail && (
                <p className="text-[10px] text-muted-foreground/55 italic">
                  {md === "redact"
                    ? "Che thông tin thay toàn bộ chunk bằng thông báo cố định — độ chính xác số liệu không có hiệu lực."
                    : "Khái quát hóa ẩn mọi giá trị theo prompt — độ chính xác số liệu không có hiệu lực."}
                </p>
              )}
            </div>
          );
        })()}

        {/* Loại thực thể được phép hiển thị */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Loại dữ liệu được phép hiển thị
            </Label>
            {form.contract.allowed_entities.length > 0 && (
              <button
                type="button"
                onClick={() => setContractField("allowed_entities", [])}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
          {entityLabels.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {entityLabels.map((lbl) => {
                  const checked = form.contract.allowed_entities.includes(lbl);
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => {
                        const arr = checked
                          ? form.contract.allowed_entities.filter((e) => e !== lbl)
                          : [...form.contract.allowed_entities, lbl];
                        setContractField("allowed_entities", arr);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                        checked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary"
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                {form.contract.allowed_entities.length === 0
                  ? "Chưa chọn loại nào - câu trả lời sẽ không hiển thị thông tin thực thể cụ thể."
                  : `Đã chọn ${form.contract.allowed_entities.length} / ${entityLabels.length} loại.`}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 italic">
              Domain này chưa có loại thực thể nào. Thêm tại tab Miền trước.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE DIALOG (create / edit)
// ═══════════════════════════════════════════════════════════════════════════════

interface RuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateRulePayload) => Promise<void>;
  initial?: DomainRule | null;
  domainEntityTypes?: EntityTypeItem[];
}

function RuleDialog({
  open,
  onClose,
  onSave,
  initial,
  domainEntityTypes = [],
}: RuleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RuleFormState>(() =>
    initialFormFromRule(initial),
  );

  useEffect(() => {
    setForm(initialFormFromRule(initial));
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
    try {
      await onSave({ ...form });
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

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE EDIT ROW (expands directly below the clicked rule row)
// ═══════════════════════════════════════════════════════════════════════════════

interface RuleInlineEditRowProps {
  rule: DomainRule;
  colSpan: number;
  onSave: (payload: CreateRulePayload) => Promise<void>;
  onCancel: () => void;
  domainEntityTypes?: EntityTypeItem[];
}

function RuleInlineEditRow({
  rule,
  colSpan,
  onSave,
  onCancel,
  domainEntityTypes = [],
}: RuleInlineEditRowProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RuleFormState>(() =>
    initialFormFromRule(rule),
  );

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
    try {
      await onSave({ ...form });
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

// ═══════════════════════════════════════════════════════════════════════════════
// RULES TABLE SECTION (shared between domain-rules and global-rules tabs)
// ═══════════════════════════════════════════════════════════════════════════════

interface RulesSectionProps {
  rules: DomainRule[];
  loading: boolean;
  onCreateRule: (payload: CreateRulePayload) => Promise<void>;
  onUpdateRule: (ruleId: string, payload: CreateRulePayload) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onToggleRule?: (ruleId: string, active: boolean) => Promise<void>;
  domainEntityTypes?: EntityTypeItem[];
}

function RulesSection({
  rules,
  loading,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  domainEntityTypes = [],
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
                  <React.Fragment key={rule.id}>
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
                            VIOLATION_ACTION_OPTIONS.find((o) => o.value === va)
                              ?.label ?? va;
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
                              return <span className="text-[11px] text-muted-foreground/50">—</span>;
                            }
                            const detail = MAX_DETAIL_OPTIONS.find(
                              (o) => o.value === rule.contract_json?.max_detail,
                            )?.label ?? rule.contract_json?.max_detail ?? "—";
                            const numeric = NUMERIC_OPTIONS.find(
                              (o) => o.value === rule.contract_json?.numeric_granularity,
                            )?.label ?? rule.contract_json?.numeric_granularity ?? "—";
                            return (
                              <>
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground/70">Biến đổi</span>
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono text-[10px]">
                                    {detail}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground/70">Số liệu</span>
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
                              onCheckedChange={(v) => onToggleRule(rule.id, v)}
                              className="scale-90"
                              title={rule.is_active ? "Đang bật — nhấn để tắt" : "Đang tắt — nhấn để bật"}
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
                      />
                    )}
                  </React.Fragment>
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
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function PolicyPage() {
  const { token } = useAuth();

  // ── Domain list ───────────────────────────────────────────────────────────
  const [domains, setDomains] = useState<PolicyDomainSummary[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<PolicyDomain | null>(
    null,
  );
  const [domainDetailLoading, setDomainDetailLoading] = useState(false);

  // ── Domain dialogs ────────────────────────────────────────────────────────
  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [createDomainForm, setCreateDomainForm] = useState({
    code: "",
    name: "",
    description: "",
    base_sensitivity: 2,
  });
  const [createDomainLoading, setCreateDomainLoading] = useState(false);

  // ── Add entity type dialog ────────────────────────────────────────────────
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [entityForm, setEntityForm] = useState({
    entity_type: "",
    label_vi: "",
  });
  const [entitySaving, setEntitySaving] = useState(false);
  const [entityTranslating, setEntityTranslating] = useState(false);
  const [entityEngEdited, setEntityEngEdited] = useState(false);

  // Auto-translate label_vi → entity_type (debounced 600ms)
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
        setEntityForm((f) => ({ ...f, entity_type: toSnakeCase(f.label_vi) }));
      } finally {
        setEntityTranslating(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [entityForm.label_vi, entityEngEdited]);

  // ── Rules ─────────────────────────────────────────────────────────────────
  const [domainRules, setDomainRules] = useState<DomainRule[]>([]);
  const [globalRules, setGlobalRules] = useState<DomainRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [globalRulesLoading, setGlobalRulesLoading] = useState(false);

  // ── Rules tab domain selector ─────────────────────────────────────────────
  const [rulesDomainId, setRulesDomainId] = useState<string>("");
  const [rulesDomainSearch, setRulesDomainSearch] = useState("");

  const filteredRulesDomains = domains.filter((d) => {
    const q = rulesDomainSearch.trim().toLowerCase();
    if (!q) return true;
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });

  // ── Load domains ──────────────────────────────────────────────────────────
  const loadDomains = useCallback(async () => {
    if (!token) return;
    setDomainsLoading(true);
    try {
      const data = await fetchDomains(token);
      setDomains(data);
    } catch (err) {
      toast({
        title: "Lỗi tải domains",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setDomainsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  // ── Load domain detail ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !selectedDomainId) {
      setSelectedDomain(null);
      return;
    }
    setDomainDetailLoading(true);
    fetchDomain(token, selectedDomainId)
      .then(setSelectedDomain)
      .catch((err) =>
        toast({
          title: "Lỗi",
          description: String(err),
          variant: "destructive",
        }),
      )
      .finally(() => setDomainDetailLoading(false));
  }, [token, selectedDomainId]);

  // ── Load global rules ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setGlobalRulesLoading(true);
    fetchGlobalRules(token)
      .then(setGlobalRules)
      .catch(() => {})
      .finally(() => setGlobalRulesLoading(false));
  }, [token]);

  // ── Load domain rules (rules tab) ─────────────────────────────────────────
  useEffect(() => {
    if (!token || !rulesDomainId) {
      setDomainRules([]);
      return;
    }
    setRulesLoading(true);
    fetchDomainRules(token, rulesDomainId)
      .then(setDomainRules)
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  }, [token, rulesDomainId]);

  // ── Create domain ──────────────────────────────────────────────────────────
  async function handleCreateDomain() {
    if (!token) return;
    const { code, name } = createDomainForm;
    if (!code.trim() || !name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Mã domain và tên là bắt buộc.",
        variant: "destructive",
      });
      return;
    }
    setCreateDomainLoading(true);
    try {
      const domain = await createDomain(token, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: createDomainForm.description.trim() || undefined,
        base_sensitivity: createDomainForm.base_sensitivity,
      });
      toast({
        title: "Đã tạo domain",
        description: `"${domain.name}" — LLM đã gợi ý ${domain.entity_types.length} entity type(s).`,
      });
      setCreateDomainOpen(false);
      setCreateDomainForm({
        code: "",
        name: "",
        description: "",
        base_sensitivity: 2,
      });
      await loadDomains();
      setSelectedDomainId(domain.id);
    } catch (err) {
      toast({
        title: "Lỗi tạo domain",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setCreateDomainLoading(false);
    }
  }

  // ── Toggle domain active ───────────────────────────────────────────────────
  async function handleToggleDomain(domain: PolicyDomainSummary) {
    if (!token) return;
    try {
      await updateDomain(token, domain.id, { is_active: !domain.is_active });
      await loadDomains();
      if (selectedDomainId === domain.id) {
        const updated = await fetchDomain(token, domain.id);
        setSelectedDomain(updated);
      }
    } catch (err) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    }
  }

  // ── Delete domain ──────────────────────────────────────────────────────────
  async function handleDeleteDomain(domain: PolicyDomainSummary) {
    if (!token) return;
    if (
      !confirm(
        `Xóa domain "${domain.name}"? Tất cả rules và entity types sẽ bị xóa theo.`,
      )
    )
      return;
    try {
      await deleteDomain(token, domain.id);
      toast({ title: "Đã xóa domain", description: domain.name });
      if (selectedDomainId === domain.id) setSelectedDomainId(null);
      await loadDomains();
    } catch (err) {
      toast({
        title: "Lỗi xóa",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  // ── Add entity type ────────────────────────────────────────────────────────
  async function handleAddEntityType() {
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
      setEntityForm({ entity_type: "", label_vi: "" });
      setEntityEngEdited(false);
      setAddEntityOpen(false);
      const updated = await fetchDomain(token, selectedDomainId);
      setSelectedDomain(updated);
    } catch (err) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    } finally {
      setEntitySaving(false);
    }
  }

  // ── Delete entity type ────────────────────────────────────────────────────
  async function handleDeleteEntityType(et: EntityTypeItem) {
    if (!token || !selectedDomainId) return;
    try {
      await deleteEntityType(token, selectedDomainId, et.id);
      const updated = await fetchDomain(token, selectedDomainId);
      setSelectedDomain(updated);
    } catch (err) {
      toast({
        title: "Lỗi xóa entity type",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  // ── Suggest entity types (standalone call) ─────────────────────────────────
  async function handleSuggestForExisting() {
    if (!token || !selectedDomain) return;
    try {
      const res = await suggestEntityTypes(
        token,
        selectedDomain.name,
        selectedDomain.description ?? undefined,
      );
      const newItems = res.entity_types.filter(
        (s) =>
          !selectedDomain.entity_types.some(
            (e) => e.entity_type === s.entity_type,
          ),
      );
      if (newItems.length === 0) {
        toast({
          title: "Không có gợi ý mới",
          description: "Tất cả entity types đã có trong domain.",
        });
        return;
      }
      await addEntityType(token, selectedDomain.id, {
        entity_type: newItems[0].entity_type,
      });
      // bulk add remaining
      if (newItems.length > 1) {
        const { addEntityTypesBulk } = await import("@/services/policy.api");
        await addEntityTypesBulk(token, selectedDomain.id, newItems.slice(1));
      }
      toast({
        title: "Đã thêm gợi ý LLM",
        description: `${newItems.length} entity type(s) mới.`,
      });
      const updated = await fetchDomain(token, selectedDomain.id);
      setSelectedDomain(updated);
    } catch (err) {
      toast({
        title: "Lỗi gợi ý",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  // ── Rule actions (domain rules tab) ──────────────────────────────────────
  async function handleCreateDomainRule(payload: CreateRulePayload) {
    if (!token || !rulesDomainId) return;
    const rule = await createDomainRule(token, rulesDomainId, payload);
    setDomainRules((prev) => [...prev, rule]);
    toast({ title: "Đã tạo rule", description: rule.name });
  }
  async function handleUpdateDomainRule(
    ruleId: string,
    payload: CreateRulePayload,
  ) {
    if (!token) return;
    const rule = await updateRule(token, ruleId, payload);
    setDomainRules((prev) => prev.map((r) => (r.id === ruleId ? rule : r)));
    toast({ title: "Đã cập nhật rule", description: rule.name });
  }
  async function handleDeleteDomainRule(ruleId: string) {
    if (!token) return;
    await deleteRule(token, ruleId);
    setDomainRules((prev) => prev.filter((r) => r.id !== ruleId));
    toast({ title: "Đã xóa luật" });
  }

  // ── Rule actions (global rules tab) ──────────────────────────────────────
  async function handleCreateGlobalRule(payload: CreateRulePayload) {
    if (!token) return;
    const rule = await createGlobalRule(token, payload);
    setGlobalRules((prev) => [...prev, rule]);
    toast({ title: "Đã tạo global rule", description: rule.name });
  }
  async function handleUpdateGlobalRule(
    ruleId: string,
    payload: CreateRulePayload,
  ) {
    if (!token) return;
    const rule = await updateRule(token, ruleId, payload);
    setGlobalRules((prev) => prev.map((r) => (r.id === ruleId ? rule : r)));
    toast({ title: "Đã cập nhật", description: rule.name });
  }
  async function handleDeleteGlobalRule(ruleId: string) {
    if (!token) return;
    await deleteRule(token, ruleId);
    setGlobalRules((prev) => prev.filter((r) => r.id !== ruleId));
    toast({ title: "Đã xóa global rule" });
  }

  async function handleToggleDomainRule(ruleId: string, active: boolean) {
    if (!token) return;
    const rule = await updateRule(token, ruleId, { is_active: active });
    setDomainRules((prev) => prev.map((r) => (r.id === ruleId ? rule : r)));
    toast({ title: active ? "Rule đã bật" : "Rule đã tắt", description: rule.name });
  }
  async function handleToggleGlobalRule(ruleId: string, active: boolean) {
    if (!token) return;
    const rule = await updateRule(token, ruleId, { is_active: active });
    setGlobalRules((prev) => prev.map((r) => (r.id === ruleId ? rule : r)));
    toast({ title: active ? "Rule đã bật" : "Rule đã tắt", description: rule.name });
  }

  // ─────────────────────────────────────────────────────────────────────────
  function SensitivityBadge({ level }: { level: number }) {
    const color =
      level <= 2
        ? "bg-blue-50 text-blue-800"
        : level === 3
          ? "bg-amber-50 text-amber-800"
          : level === 4
            ? "bg-orange-50 text-orange-800"
            : "bg-red-50 text-red-800";
    return (
      <span
        className={`inline-flex items-center text-[9.5px] font-medium px-2 py-[3px] rounded-md ${color}`}
      >
        {SENSITIVITY_LABEL[level]}
      </span>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Cấu hình phân quyền"
        description="Quản lý miền, loại thực thể và luật cho Policy-Contract Agent."
      />

      <div className="flex-1 overflow-auto flex flex-col">
        <Tabs defaultValue="domains" className="flex-1 flex flex-col">
          {/* Tab nav bar */}
          <div className="border-b border-border px-6 shrink-0">
            <TabsList className="mt-2">
              <TabsTrigger value="domains" className="gap-2 text-[12.5px]">
                <ShieldCheck className="h-4 w-4" /> Miền
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2 text-[12.5px]">
                <ListChecks className="h-4 w-4" /> Luật theo miền
              </TabsTrigger>
              <TabsTrigger value="global-rules" className="gap-2 text-[12.5px]">
                <Globe className="h-4 w-4" /> Luật toàn cục
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab 1: Domains ───────────────────────────────────────────── */}
          <TabsContent value="domains" className="flex-1 mt-0 overflow-hidden">
            <div className="flex h-full">
              {/* Left: domain list */}
              <div className="w-72 shrink-0 flex flex-col border-r border-border bg-background">
                <div className="p-3 border-b border-border/60">
                  <Button
                    className="w-full gap-1.5 font-medium text-[12.5px] h-9"
                    variant="outline"
                    onClick={() => setCreateDomainOpen(true)}
                  >
                    <Plus className="h-2 w-2" /> Tạo miền mới
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  {domainsLoading ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  ) : domains.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <p className="text-sm">Chưa có miền nào</p>
                    </div>
                  ) : (
                    domains.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDomainId(d.id)}
                        className={`rounded-xl border p-3.5 cursor-pointer transition-colors group relative ${
                          selectedDomainId === d.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                        }`}
                      >
                        {!d.is_active && (
                          <Lock
                            className="absolute -top-1.5 -right-0.5 h-4 w-4 text-red-500"
                            strokeWidth={2.5}
                          />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold truncate leading-tight">
                              {d.name}
                            </p>
                            <p className="text-[10.5px] font-mono text-muted-foreground mt-0.5">
                              {d.code}
                            </p>
                          </div>
                          <SensitivityBadge level={d.base_sensitivity} />
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10.5px] text-muted-foreground">
                          <span>{d.entity_type_count} thực thể</span>
                          <span className="text-border">·</span>
                          <span>{d.rule_count} luật</span>
                          <ChevronRight
                            className={`h-3 w-3 ml-auto transition-opacity ${selectedDomainId === d.id ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"}`}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: domain detail */}
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedDomainId ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 select-none">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium">
                      Chọn một domain để xem chi tiết
                    </p>
                  </div>
                ) : domainDetailLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Đang tải...</span>
                  </div>
                ) : selectedDomain ? (
                  <div className="max-w-7xl">
                    {/* Domain info */}
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-[15px] font-bold">
                              {selectedDomain.name}
                            </h2>
                            <span className="font-mono text-[9.5px] bg-muted text-muted-foreground px-2 py-1 rounded-md border border-border">
                              {selectedDomain.code}
                            </span>
                            <SensitivityBadge
                              level={selectedDomain.base_sensitivity}
                            />
                            {selectedDomain.is_active ? (
                              <span className="text-[11px] bg-green-50 text-green-800 px-2 py-[3px] rounded-md font-medium flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                                Đang bật
                              </span>
                            ) : (
                              <span className="text-[11px] bg-red-200 text-foreground/70 px-2 py-[3px] rounded-md font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <Lock className="h-3 w-3" />
                                  <div className="text-gray">Đang tắt</div>
                                </div>
                              </span>
                            )}
                          </div>
                          {selectedDomain.description && (
                            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                              {selectedDomain.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() =>
                              handleToggleDomain(
                                domains.find((d) => d.id === selectedDomainId)!,
                              )
                            }
                          >
                            {selectedDomain.is_active ? "Tắt" : "Bật"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                            onClick={() =>
                              handleDeleteDomain(
                                domains.find((d) => d.id === selectedDomainId)!,
                              )
                            }
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Entity Types */}
                    <div className="mt-5 pt-5 border-t border-border">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">
                            Loại thực thể
                          </h3>
                          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {selectedDomain.entity_types.length}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSuggestForExisting}
                            className="h-8 text-[11px] gap-1.5 bg-blue-600 text-white hover:text-foreground"
                          >
                            <Sparkles className="h-3 w-3" /> Gợi ý AI
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddEntityOpen(true)}
                            className="h-8 text-xs gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm thủ công
                          </Button>
                        </div>
                      </div>

                      {selectedDomain.entity_types.length === 0 ? (
                        <p className="text-[12px] text-muted-foreground py-4 text-center">
                          Chưa có loại thực thể nào. Thêm thủ công hoặc dùng gợi
                          ý LLM.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedDomain.entity_types.map((et) => (
                            <div
                              key={et.id}
                              className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md text-[12px] font-mono bg-muted text-foreground border border-border/60"
                            >
                              <span>{et.entity_type}</span>
                              {et.label_vi && (
                                <span className="opacity-50 font-sans text-[11px]">
                                  ({et.label_vi})
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteEntityType(et)}
                                className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-[11px] text-muted-foreground/70">
                        GLiNER dùng để phát hiện loại thực thể khi xử lý tài
                        liệu tải lên.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: Rules theo domain ───────────────────────────────────── */}
          <TabsContent value="rules" className="flex-1 mt-0 overflow-hidden">
            <div className="flex h-full">
              {/* Left: domain search + list */}
              <div className="w-72 shrink-0 flex flex-col border-r border-border bg-background">
                <div className="p-3 border-b border-border/60">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={rulesDomainSearch}
                      onChange={(e) => setRulesDomainSearch(e.target.value)}
                      placeholder="Tìm miền (Tên hoặc ID)..."
                      className="h-9 pl-8 text-[11px] placeholder:text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  {filteredRulesDomains.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <p className="text-sm">Không tìm thấy domain</p>
                    </div>
                  ) : (
                    filteredRulesDomains.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setRulesDomainId(d.id)}
                        className={`rounded-xl border p-3.5 cursor-pointer transition-colors group relative ${
                          rulesDomainId === d.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                        }`}
                      >
                        {!d.is_active && (
                          <Lock
                            className="absolute -top-1.5 -right-0.5 h-4 w-4 text-red-500"
                            strokeWidth={2.5}
                          />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold truncate leading-tight">
                              {d.name}
                            </p>
                            <p className="text-[10.5px] font-mono text-muted-foreground mt-0.5">
                              {d.code}
                            </p>
                          </div>
                          <SensitivityBadge level={d.base_sensitivity} />
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10.5px] text-muted-foreground">
                          <span>{d.entity_type_count} thực thể</span>
                          <span className="text-border">·</span>
                          <span>{d.rule_count} luật</span>
                          <ChevronRight
                            className={`h-3 w-3 ml-auto transition-opacity ${rulesDomainId === d.id ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"}`}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: rules table */}
              <div className="flex-1 overflow-y-auto p-6">
                {!rulesDomainId ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 select-none">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium">
                      Chọn một domain để xem chi tiết
                    </p>
                  </div>
                ) : (
                  <RulesSection
                    rules={domainRules}
                    loading={rulesLoading}
                    onCreateRule={handleCreateDomainRule}
                    onUpdateRule={handleUpdateDomainRule}
                    onDeleteRule={handleDeleteDomainRule}
                    onToggleRule={handleToggleDomainRule}
                    domainEntityTypes={
                      selectedDomain?.id === rulesDomainId
                        ? selectedDomain.entity_types
                        : []
                    }
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Global Rules ────────────────────────────────────────── */}
          <TabsContent
            value="global-rules"
            className="flex-1 mt-0 p-6 space-y-4 overflow-auto"
          >
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-blue-700">
              Luật toàn cục áp dụng cho <strong>tất cả</strong> miền và
              chunks, bất kể phân loại miền.
            </div>
            <RulesSection
              rules={globalRules}
              loading={globalRulesLoading}
              onCreateRule={handleCreateGlobalRule}
              onUpdateRule={handleUpdateGlobalRule}
              onDeleteRule={handleDeleteGlobalRule}
              onToggleRule={handleToggleGlobalRule}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Create Domain Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={createDomainOpen}
        onOpenChange={(o) => !o && setCreateDomainOpen(false)}
      >
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
                <Label className="text-xs text-muted-foreground">
                  Mã miền *
                </Label>
                <Input
                  placeholder="VD: HR-01"
                  value={createDomainForm.code}
                  onChange={(e) =>
                    setCreateDomainForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="placeholder:text-[12px]"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Chữ hoa, số, gạch ngang. VD: HR-01, FIN-02
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Độ nhạy cơ bản
                </Label>
                <Select
                  value={String(createDomainForm.base_sensitivity)}
                  onValueChange={(v) =>
                    setCreateDomainForm((f) => ({
                      ...f,
                      base_sensitivity: Number(v),
                    }))
                  }
                >
                  <SelectTrigger className="text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem
                        key={n}
                        value={String(n)}
                        className="text-[12px]"
                      >
                        {n} - {SENSITIVITY_LABEL[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Tên miền *
              </Label>
              <Input
                placeholder="VD: Dữ liệu nhân sự"
                value={createDomainForm.name}
                onChange={(e) =>
                  setCreateDomainForm((f) => ({ ...f, name: e.target.value }))
                }
                className="placeholder:text-[12px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mô tả</Label>
              <Textarea
                rows={3}
                placeholder="Mô tả miền giúp AI gợi ý loại thực thể chính xác hơn..."
                value={createDomainForm.description}
                onChange={(e) =>
                  setCreateDomainForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                className="placeholder:text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDomainOpen(false)}
              disabled={createDomainLoading}
            >
              Hủy
            </Button>
            <Button onClick={handleCreateDomain} disabled={createDomainLoading}>
              {createDomainLoading ? "Đang tạo và gợi ý entities..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Entity Type Dialog ────────────────────────────────────────── */}
      <Dialog
        open={addEntityOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAddEntityOpen(false);
            setEntityForm({ entity_type: "", label_vi: "" });
            setEntityEngEdited(false);
          }
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
            {/* Vietnamese — primary */}
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

            {/* English — auto-translated, editable */}
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
                  className={`font-mono text-sm placeholder:text-[12px] pr-8 ${!entityEngEdited && !entityTranslating && entityForm.entity_type ? "bg-blue-50/60 border-blue-200 text-blue-800" : ""}`}
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
              onClick={() => {
                setAddEntityOpen(false);
                setEntityForm({ entity_type: "", label_vi: "" });
                setEntityEngEdited(false);
              }}
              disabled={entitySaving}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAddEntityType}
              disabled={
                entitySaving || entityTranslating || !entityForm.label_vi.trim()
              }
            >
              {entitySaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
