// ── Org structure ─────────────────────────────────────────────────────────────

export interface OuiPositionInfo {
  oui_id: string;
  oui_name: string;
  ou_id: string;
  ou_name: string;
  position_id: string;
  position_name: string;
  clearance: number;
  parent_oui_ids: string[];
}

export interface OrgUnit {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface OrgUnitInstance {
  id: string;
  name: string;
  ou_id: string;
  parent_oui_ids: string[];
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at?: string;
  oui_positions: OuiPositionInfo[];
  max_clearance: number;
  is_corp_member: boolean;
}

// ── Document ──────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "draft"
  | "uploaded"
  | "processing"
  | "review"
  | "approved"
  | "archived"
  | "ready";

// Sensitivity is an integer in 1-5.
export const SENSITIVITY_LEVEL: Record<number, string> = {
  1: "Công khai",
  2: "Nội bộ",
  3: "Hạn chế",
  4: "Mật",
  5: "Tuyệt mật",
};

export type SensitivityRank = 1 | 2 | 3 | 4 | 5;

export const SENSITIVITY_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
};

// Retain the SensitivityLevel string for old components that haven't migrated yet.
export type SensitivityLevel =
  | "public"
  | "internal"
  | "confidential"
  | "restricted"
  | "top_secret";

export const SENSITIVITY_RANK: Record<SensitivityLevel, number> = {
  public: 1,
  internal: 2,
  confidential: 3,
  restricted: 4,
  top_secret: 5,
};

export interface DocumentOuiInfo {
  oui_id: string;
  oui_name: string;
  ou_name: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  oui_ids: string[];           // Multi OUI.
  owner_user_id: string;
  document_type: string;
  sensitivity: number;         // 1-5.
  data_type: string;
  tags: string[];
  status: DocumentStatus;
  current_version_id?: string;
  version_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  status: DocumentStatus;
  createdAt: string;
  createdBy: string;
  changelog?: string;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface PolicyRule {
  rule_code: string;
  name: string;
  action: string;  // block | conditional | watermark
  domain: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  traceId?: string;
  status?: "success" | "no_answer" | "no_permission" | "error" | "loading";
  isStreaming?: boolean;
  attachedFileName?: string;
  appliedRules?: PolicyRule[];
  mode?: "rag" | "chatbot";
}

export interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  versionId: string;
  sectionPath: string;
  excerpt: string;
  surroundingContext: string;
  relevance?: number;
  docRestricted?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  snippet: string;
  sectionPath: string;
  sensitivity: number;
  status: DocumentStatus;
  updatedAt: string;
  score: number;
  tags: string[];
}

export type SearchMode = "keyword" | "semantic" | "hybrid";

// ── Audit ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  traceId: string;
  userId: string;
  userName: string;
  query: string;
  status: "success" | "no-answer" | "no-permission";
  documentsRetrieved: number;
  citations: number;
  latencyMs: number;
  timestamp: string;
}

// ── Job ───────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  type: "ingestion" | "indexing" | "embedding" | "cleanup";
  documentId?: string;
  versionId?: string;
  status: "queued" | "running" | "succeeded" | "failed";
  retryCount: number;
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

export interface Feedback {
  id: string;
  messageId: string;
  helpful: boolean;
  reason?: string;
  expectedAnswer?: string;
  createdAt: string;
}