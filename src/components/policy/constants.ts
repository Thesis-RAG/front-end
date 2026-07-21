/** Shared constants, pure functions, and form-state helpers for the Policy page. */
import type { DomainRule, RuleConditions, RuleContract } from "@/types/policy";

// Convert Vietnamese text to snake_case English identifier.
export function toSnakeCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

// Translate Vietnamese text to English via the MyMemory free API.
export async function translateViToEn(text: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|en`,
  );
  const data = await res.json();
  return (data.responseData?.translatedText as string) ?? text;
}

export const DEFAULT_INTENT_OPTIONS = [
  "lookup",
  "aggregate",
  "export",
  "compare",
  "summarize",
];

export const INTENT_LABEL: Record<string, string> = {
  lookup: "Tra cứu",
  aggregate: "Tổng hợp",
  export: "Xuất dữ liệu",
  compare: "So sánh",
  summarize: "Tóm tắt",
};

export const SENSITIVITY_OPTIONS = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
  "TopSecret",
];

export const SENSITIVITY_VI: Record<string, string> = {
  Public: "Công khai",
  Internal: "Nội bộ",
  Confidential: "Bảo mật",
  Restricted: "Hạn chế",
  TopSecret: "Tuyệt mật",
};

// User clearance level — 1:1 correspondence with sensitivity levels.
export const USER_LEVEL_OPTIONS = [
  { value: 1, label: "Cấp 1 - Công khai" },
  { value: 2, label: "Cấp 2 - Nội bộ" },
  { value: 3, label: "Cấp 3 - Bảo mật" },
  { value: 4, label: "Cấp 4 - Hạn chế" },
  { value: 5, label: "Cấp 5 - Tuyệt mật" },
];

// Four official violation actions: block | conditional | watermark | allow.
export const VIOLATION_ACTION_GROUPS = [
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

export const VIOLATION_ACTION_OPTIONS = VIOLATION_ACTION_GROUPS.flatMap(
  (g) => g.options,
);

export const VIOLATION_ACTION_COLOR: Record<string, string> = {
  block: "bg-red-100 text-red-700",
  conditional: "bg-purple-100 text-purple-700",
  watermark: "bg-blue-100 text-blue-700",
  allow: "bg-green-100 text-green-700",
  // backward compat display
  mask: "bg-yellow-100 text-yellow-700",
  generalize: "bg-orange-100 text-orange-700",
};

// Content transformation modes — only used when violation_action = "conditional".
export const MAX_DETAIL_OPTIONS = [
  { value: "redact",     label: "Che thông tin nhạy cảm " },
  { value: "anonymize",  label: "Ẩn danh hóa " },
  { value: "generalize", label: "Khái quát hóa " },
  { value: "summarize",  label: "Tóm tắt " },
];

export const NUMERIC_OPTIONS = [
  { value: "hidden",     label: "Ẩn số liệu" },
  { value: "aggregated", label: "Số liệu tổng hợp" },
  { value: "range_only", label: "Số liệu dạng khoảng" },
  { value: "exact",      label: "Chi tiết đầy đủ" },
];

export const DEFAULT_CONDITIONS: RuleConditions = {
  min_sensitivity: null,
  applicable_roles: [],
  blocked_roles: [],
  cross_dept_only: false,
  applicable_intents: [],
  min_user_level: null,
  target_entity_types: [],
  target_flags: [],
  applicable_oui_ids: [],
};

export const DEFAULT_CONTRACT: RuleContract = {
  violation_action: "conditional",
  max_detail: "generalize",
  numeric_granularity: "aggregated",
};

export function csvToArray(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function arrayToCsv(arr: string[]): string {
  return arr.join(", ");
}

// Shared form state type used by create/edit dialogs and inline edit rows.
export type RuleFormState = {
  rule_code: string;
  name: string;
  priority: number;
  mandatory: boolean;
  audit_log: boolean;
  conditions: RuleConditions;
  contract: RuleContract;
};

export const VALID_MAX_DETAIL = ["redact", "anonymize", "generalize", "summarize"];

// Ensure the contract has a valid max_detail when violation_action = "conditional".
export function normalizeContract(raw: Partial<RuleContract>): RuleContract {
  const merged = { ...DEFAULT_CONTRACT, ...raw };
  if (
    merged.violation_action === "conditional" &&
    !VALID_MAX_DETAIL.includes(merged.max_detail)
  ) {
    merged.max_detail = "generalize";
  }
  return merged;
}

// Build initial RuleFormState from an existing rule or return blank defaults.
export function initialFormFromRule(initial?: DomainRule | null): RuleFormState {
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
