export interface EntityTypeItem {
  id: string;
  domain_id: string;
  entity_type: string;
  label_vi: string | null;
  is_system_suggested: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RuleConditions {
  min_sensitivity: string | null;
  applicable_roles: string[];   // Exemption: This rule does not apply to this role.
  blocked_roles: string[];      // Coercion: For this role, the rule is applied automatically.
  cross_dept_only: boolean;     // Activated when the document is at a higher organizational level than the user.
  applicable_intents: string[]; // Leave blank = all.
  min_user_level: number | null;
  target_entity_types: string[]; // Empty = whole chunk; otherwise field/entity scope.
  target_flags: string[];        // Empty = no boolean-flag filter.
  applicable_oui_ids: string[];  // Empty = every department.
}

export interface RuleContract {
  max_detail: string;            // company|department|project|individual or custom value
  numeric_granularity: string;   // hidden|aggregated|exact or custom value
  violation_action: string;      // allow|mask|watermark|block or custom value
}

export interface DomainRule {
  id: string;
  domain_id: string;
  rule_code: string;
  name: string;
  action: string;   // Derived from violation_action, for backend internal use only.
  priority: number;
  mandatory: boolean;
  is_active: boolean;
  audit_log: boolean;
  conditions_json: RuleConditions;
  contract_json: RuleContract;
  created_at: string;
  updated_at: string;
}

export interface PolicyDomain {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_sensitivity: number;
  is_active: boolean;
  entity_types: EntityTypeItem[];
  rules: DomainRule[];
  created_at: string;
  updated_at: string;
}

export interface PolicyDomainSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_sensitivity: number;
  is_active: boolean;
  entity_type_count: number;
  rule_count: number;
  created_at: string;
}

// ── Form payloads ─────────────────────────────────────────────────────────────

export interface CreateDomainPayload {
  code: string;
  name: string;
  description?: string;
  base_sensitivity: number;
}

export interface UpdateDomainPayload {
  name?: string;
  description?: string;
  base_sensitivity?: number;
  is_active?: boolean;
}

export interface CreateEntityTypePayload {
  entity_type: string;
  label_vi?: string;
}

export interface CreateRulePayload {
  rule_code: string;
  name: string;
  priority: number;
  mandatory: boolean;
  audit_log: boolean;
  conditions: RuleConditions;
  contract: RuleContract;
}

export interface UpdateRulePayload extends Partial<CreateRulePayload> {
  is_active?: boolean;
}

export interface RuleTemplate {
  template_code: string;
  name: string;
  description: string;
  category: string;
  department: string;
  document_types: string[];
  recommended: boolean;
  rule: CreateRulePayload;
}

export interface SuggestEntitiesResponse {
  entity_types: { entity_type: string; label_vi?: string }[];
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const VIOLATION_ACTION_COLOR: Record<string, string> = {
  block:      "bg-red-100 text-red-700",
  mask:       "bg-yellow-100 text-yellow-700",
  generalize: "bg-orange-100 text-orange-700",
  watermark:  "bg-blue-100 text-blue-700",
  allow:      "bg-green-100 text-green-700",
};

export const VIOLATION_ACTION_LABEL: Record<string, string> = {
  block:      "Từ chối",
  mask:       "Che dữ liệu",
  generalize: "Khái quát hóa",
  watermark:  "Watermark",
  allow:      "Cho phép",
};

// Kept for backward compat (used in some places with legacy data)
export const ACTION_COLOR: Record<string, string> = {
  ALLOW:                "bg-green-100 text-green-700",
  DENY:                 "bg-red-100 text-red-700",
  REDACT:               "bg-yellow-100 text-yellow-700",
  ALLOW_WITH_WATERMARK: "bg-blue-100 text-blue-700",
};

export const ACTION_LABEL: Record<string, string> = {
  ALLOW:                "Cho phép",
  DENY:                 "Từ chối",
  REDACT:               "Che thông tin",
  ALLOW_WITH_WATERMARK: "Cho phép (Watermark)",
};

export const RISK_COLOR: Record<string, string> = {
  low:       "bg-slate-100 text-slate-600",
  medium:    "bg-yellow-100 text-yellow-700",
  high:      "bg-orange-100 text-orange-700",
  very_high: "bg-red-100 text-red-700",
};

export const SENSITIVITY_LABEL: Record<number, string> = {
  1: "Công khai",
  2: "Nội bộ",
  3: "Bảo mật",
  4: "Hạn chế",
  5: "Tuyệt mật",
};
