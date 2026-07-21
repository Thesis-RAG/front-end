/** Shared DocumentRead interface used across Documents-related components and pages. */

export interface DocumentRead {
  id: string;
  title: string;
  description?: string;
  oui_ids: string[];
  owner_user_id: string;
  owner_name?: string;
  document_type: string;
  sensitivity: number;
  data_type: string;
  tags: string[];
  status: string;
  current_version_id?: string;
  version_count: number;
  created_at: string;
  updated_at: string;
}
