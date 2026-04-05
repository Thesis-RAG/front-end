// User roles
export type UserRole =
  | "employee"
  | "department_manager"
  | "director"
  | "admin_auditor";

// Document status
export type DocumentStatus =
  | "draft"
  | "uploaded"
  | "processing"
  | "review"
  | "approved"
  | "archived"
  | "ready";

// Sensitivity levels
export type SensitivityLevel =
  | "public"
  | "internal"
  | "confidential"
  | "restricted"
  | "top_secret";

// User type
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

// Document type
export interface Document {
  id: string;
  title: string;
  ownerDepartment: string;
  sensitivity_level: SensitivityLevel;
  status: DocumentStatus;
  currentVersion: string;
  updatedAt: string;
  createdAt: string;
  tags: string[];
}

// Document version
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  status: DocumentStatus;
  createdAt: string;
  createdBy: string;
  changelog?: string;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  traceId?: string;
  status?: "success" | "no_answer" | "no_permission" | "error" | "loading";
  isStreaming?: boolean;
}

// Citation
export interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  versionId: string;
  sectionPath: string;
  excerpt: string;
  surroundingContext: string;
  relevance?: number;
}

// Chat conversation
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// Search result
export interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  snippet: string;
  sectionPath: string;
  sensitivity_level: SensitivityLevel;
  status: DocumentStatus;
  updatedAt: string;
  score: number;
  tags: string[];
}

// Search mode
export type SearchMode = "keyword" | "semantic" | "hybrid";

// Feedback
export interface Feedback {
  id: string;
  messageId: string;
  helpful: boolean;
  reason?: string;
  expectedAnswer?: string;
  createdAt: string;
}

// Audit log entry
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

// Job
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
