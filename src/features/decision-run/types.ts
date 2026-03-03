// src/features/decision-run/types.ts

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
export type Decision = 'PASS' | 'REVIEW' | 'FAIL' | 'REJECT' | string

export interface Money {
  value: number
  currency: string
}

/* =========================================================
   Case Groups (existing - unchanged)
========================================================= */

export interface CaseGroupSku {
  item_id: string
  sku: string
  name?: string
  description?: string
  item_name?: string
  created_at?: string
  quantity?: number
  uom?: string
  unit_price?: Money
  total_price?: Money
  source_line_ref?: string
}

export interface GroupReason {
  rule_id: string
  severity: string
  exec: string
}

export interface GroupBaseline {
  value: number
  currency: string
}

export interface GroupEvidenceRefs {
  fact_ids?: string[]
  evidence_ids?: string[]
}

export interface CaseGroup {
  group_id: string
  decision: Decision
  risk_level: RiskLevel
  confidence?: number
  sku?: CaseGroupSku
  reasons?: GroupReason[]
  baseline?: GroupBaseline
  evidence_refs?: GroupEvidenceRefs

  __domain?: string
  raw_trace?: any
}

export interface CaseGroupsResponse {
  case_id: string
  run_id?: string
  groups: CaseGroup[]
}

/* =========================================================
   Rules
========================================================= */

export interface RuleCalculation {
  field: string
  actual: any
  expected: any
  operator: string
}

export interface GroupRule {
  rule_id: string
  severity: string
  result: string
  explanation: string
  calculation?: RuleCalculation
  exec_message?: string
  audit_message?: string
}

export interface GroupRulesResponse {
  group_id: string
  decision: Decision
  risk_level: RiskLevel
  confidence?: number
  rules: GroupRule[]
}

/* =========================================================
   Evidence
========================================================= */

export interface EvidenceDocument {
  document_id: string
  file_name: string
  document_type?: string | null
  created_at?: string
}

export interface PriceItem {
  price_item_id: string
  contract_id?: string
  document_id: string
  page_id?: string
  page_number?: number
  sku?: string
  item_name?: string
  unit_price?: number
  currency?: string
  uom?: string | null
  effective_from?: string | null
  effective_to?: string | null
  snippet?: string | null
  confidence_score?: number | null
  created_at?: string
}

export interface EvidenceItem {
  evidence_id: string
  kind: string
  title: string
  snippet?: string | null
  document_id?: string | null
  page_id?: string | null
  page_number?: number | null
  created_at?: string
  price_item?: PriceItem | null
}

export interface GroupEvidenceResponse {
  group_id: string
  documents: EvidenceDocument[]
  evidences: EvidenceItem[]
}

/* =========================================================
   Decision Run (THIS MATCHES YOUR RESPONSE EXACTLY)
========================================================= */

export type PriceContext = 'BASELINE' | '3WAY_MATCH' | string

export interface DecisionRunPolicyRef {
  policy_id: string
  policy_version: string
}

export interface DecisionRunSummary {
  overall_decision: string
  risk_level: RiskLevel
  confidence_avg?: number
  item_count: number
  exposure?: {
    currency: string
    unit_variance_sum?: number
  }
  top_reason_codes?: Array<{
    code: string
    count: number
  }>
}

export interface DecisionRunItemIdentity {
  sku: string
  name: string
  uom?: string
}

export interface DecisionRunQtyFlags {
  gr_exceeds_po?: boolean
  inv_exceeds_gr?: boolean
  inv_without_gr?: boolean
}

export interface DecisionRunQuantity {
  po: number
  gr: number
  inv: number
  over_gr_qty?: number
  over_inv_qty?: number
  flags?: DecisionRunQtyFlags
}

export interface DecisionRunPrice {
  context: PriceContext
  po_unit?: number
  inv_unit?: number
  baseline_unit?: number | null
  variance_pct?: number | null
  variance_abs?: number | null
  tolerance_abs?: number | null
  currency?: string
  within_tolerance?: boolean
  has_baseline?: boolean
}

export interface DecisionRunDriver {
  rule_id: string
  label: string
  severity?: string
}

export interface DecisionRunItemStatus {
  decision: string
  risk: RiskLevel
  confidence?: number
}

export interface DecisionRunRule {
  rule_id: string
  group?: string
  domain?: string
  result: string
  severity?: string
  exec_message?: string
  audit_message?: string
  calculation?: RuleCalculation | null
  fail_actions?: any[]
}

export interface DecisionRunArtifacts {
  po?: boolean
  grn?: boolean
  invoice?: boolean
}

export interface DecisionRunItem {
  group_id: string
  status?: DecisionRunItemStatus
  item: DecisionRunItemIdentity
  quantity: DecisionRunQuantity
  price: DecisionRunPrice
  drivers?: DecisionRunDriver[]
  next_action?: string | null
  rules?: DecisionRunRule[]
  artifacts?: DecisionRunArtifacts
  created_at?: string
}

/* =========================================================
   THIS IS YOUR /cases/{id}/view RESPONSE
========================================================= */

export interface DecisionRunViewContext {
  case_id: string
  run_id: string
  policy?: DecisionRunPolicyRef
  technique?: string
  created_at?: string
  summary?: DecisionRunSummary
  items: DecisionRunItem[]
}

/* =========================================================
   IMPORTANT:
   CaseAggregateResponse MUST BE SAME AS DecisionRunViewContext
   (DO NOT invent case/artifacts/tracks here)
========================================================= */

export type CaseAggregateResponse = DecisionRunViewContext

/* =========================================================
   Legacy finance_ap (unchanged)
========================================================= */

export interface FinanceDecisionResult {
  result_id?: string
  run_id?: string
  group_id: string
  decision_status?: string
  risk_level?: string
  confidence?: number
  reason_codes?: string[]
  fail_actions?: any[]
  trace?: any
  evidence_refs?: GroupEvidenceRefs
  created_at?: string
}

export interface FinanceDecisionResultsResponse {
  case_id: string
  run_id: string
  count: number
  results: FinanceDecisionResult[]
}

export type DecisionResultsResponse =
  | DecisionRunViewContext
  | FinanceDecisionResultsResponse