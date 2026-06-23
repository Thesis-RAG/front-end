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
  applicable_roles: string[];
  blocked_roles: string[];
  cross_dept_only: boolean;
  require_pii_detected: boolean;
  applicable_intents: string[];
  min_user_level: number | null;
  require_intent_risk: string | null;
}

export interface RuleContract {
  max_detail: "company" | "department" | "project" | "individual";
  numeric_granularity: "hidden" | "aggregated" | "exact";
  allowed_entities: string[];
  violation_action: "mask" | "generalize" | "deny" | "regenerate";
}

export interface DomainRule {
  id: string;
  domain_id: string | null;
  rule_code: string;
  name: string;
  action: "ALLOW" | "DENY" | "REDACT" | "ALLOW_WITH_WATERMARK";
  priority: number;
  mandatory: boolean;
  risk_level: "low" | "medium" | "high" | "very_high";
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
  action: "ALLOW" | "DENY" | "REDACT" | "ALLOW_WITH_WATERMARK";
  priority: number;
  mandatory: boolean;
  risk_level: "low" | "medium" | "high" | "very_high";
  audit_log: boolean;
  conditions: RuleConditions;
  contract: RuleContract;
}

export interface UpdateRulePayload extends Partial<CreateRulePayload> {
  is_active?: boolean;
}

export interface SuggestEntitiesResponse {
  entity_types: { entity_type: string; label_vi?: string }[];
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const ACTION_COLOR: Record<DomainRule["action"], string> = {
  ALLOW:                "bg-green-100 text-green-700",
  DENY:                 "bg-red-100 text-red-700",
  REDACT:               "bg-yellow-100 text-yellow-700",
  ALLOW_WITH_WATERMARK: "bg-blue-100 text-blue-700",
};

export const ACTION_LABEL: Record<DomainRule["action"], string> = {
  ALLOW:                "Cho phép",
  DENY:                 "Từ chối",
  REDACT:               "Che thông tin",
  ALLOW_WITH_WATERMARK: "Cho phép (Watermark)",
};

export const RISK_COLOR: Record<DomainRule["risk_level"], string> = {
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
