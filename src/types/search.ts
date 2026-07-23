/** Shared SearchChunk type returned by the semantic/keyword/hybrid search API. */
export interface SearchChunk {
  chunk_id: string;
  document_text: string;
  score: number;
  semantic_score: number;
  keyword_score: number;
  sources: string[];
  doc_restricted?: boolean;
  chunk_blurred?: boolean;
  entity_access_required?: boolean;
  entity_access_granted?: boolean;
  blocked_entity_types?: string[];
  masked_entity_types?: string[];
  detected_entity_types?: string[];
  metadata: {
    document_id: string;
    document_title: string;
    document_type: string;
    sensitivity: number | string;
    department_id: string;
    page_start: number;
    page_end: number;
    chunk_index: number;
    document_version_id?: string;
    blocked_entity_types?: string[];
    masked_entity_types?: string[];
    entity_access_required?: boolean;
  };
}
