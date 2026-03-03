/* =========================================================
   TH8 — CASE MASTER (Aggregate Endpoint)
   Source: GET /api/v1/cases/{caseId}/aggregate
========================================================= */

export interface CaseMasterResponse {
  case: CaseMaster
  artifacts: CaseArtifacts
  decision_tracks: DecisionTrack[]
  audit: CaseAudit
  line_items: CaseLineItem[]
}

/* =========================================================
   CASE CORE
========================================================= */

export interface CaseMaster {
  case_id: string
  reference_type: string
  reference_id: string
  domain: string
  status: string

  transaction_id?: string | null

  created_at: string
  updated_at: string

  entity?: CaseEntity | null
}

export interface CaseEntity {
  entity_id: string
  entity_type: string
  entity_code?: string | null
  entity_name: string
  metadata?: Record<string, any>
}

/* =========================================================
   ARTIFACTS
========================================================= */

export interface CaseArtifacts {
  total_count: number
  by_type: Record<string, number>
}

/* =========================================================
   DECISION TRACKS
========================================================= */

export interface DecisionTrack {
  domain: string
  latest_decision: string
  risk_level: string
  confidence?: number | null
  last_run_id?: string | null
}

/* =========================================================
   AUDIT
========================================================= */

export interface CaseAudit {
  has_transaction: boolean
  status: string
}

/* =========================================================
   LINE ITEMS
========================================================= */

export interface CaseLineItem {
  item_id: string
  source_line_ref?: string | null
  sku?: string | null
  item_name: string
  description?: string | null

  quantity: number
  uom?: string | null

  unit_price: number
  currency: string
  total_price: number
}

/* =========================================================
   HEADER VIEW MODEL
   ใช้ map aggregate → header UI
========================================================= */

export interface CaseHeaderVM {
  case_id: string
  reference_id: string
  reference_type: string
  domain: string
  status: string

  vendor_name: string
  updated_at: string

  decision?: string
  risk?: string
  confidence?: number | null

  item_count: number
  total_amount?: number
}