/** Audit API — fetch conversation traces and background processing job records. */
import { ENV } from "@/config/env";

// Represents one RAG conversation trace recorded by the audit system.
export interface TraceRecord {
  id: string;
  trace_id: string;
  user_id: string;
  user_input: string;
  assistant_output_summary: string;
  retrieved_sources: any[];
  timings: any;
  token_usage: any;
  status: string; // "completed" | "no-permission" | "no-answer"
  created_at: string;
  updated_at: string;
}

// Represents one background processing job (e.g., document ingestion).
export interface JobRecord {
  id: string;
  job_type: string;
  status: string; // "queued" | "running" | "succeeded" | "failed"
  progress: number;
  document_id: string;
  document_version_id: string;
  retry_count: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  document?: { id: string; title: string };
  version?: { id: string; version_no: number };
  doc_title?: string;
  version_no?: number;
}

// Fetch all conversation trace records for the audit log.
export async function fetchTraces(token: string): Promise<TraceRecord[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/audit/traces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch all background processing job records.
export async function fetchJobs(token: string): Promise<JobRecord[]> {
  const res = await fetch(`${ENV.API_BASE_URL}/audit/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Retry a failed or stuck processing job by ID.
export async function retryJob(jobId: string, token: string): Promise<void> {
  const res = await fetch(`${ENV.API_BASE_URL}/audit/jobs/${jobId}/retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Cancel a queued or running processing job by ID.
export async function cancelJob(jobId: string, token: string): Promise<void> {
  const res = await fetch(`${ENV.API_BASE_URL}/audit/jobs/${jobId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
