// src/features/audit/types.ts

export type AuditSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL' | string

export interface AuditTimelineResponse {
  view_version: string
  case_id: string
  generated_at: string
  timezone: string
  summary: AuditTimelineSummary
  runs: AuditRun[]
  events: AuditEvent[]
}

export interface AuditTimelineSummary {
  event_count: number
  run_count: number
  latest_run_id: string | null
  latest_run_decision: string | null
  latest_run_risk_level: string | null
}

export interface AuditRun {
  run_id: string
  run_category: string
  domain: string
  policy: {
    policy_id: string | null
    policy_version: string | null
  }
  technique: string | null
  status: string
  started_at: string | null
  completed_at: string | null
  decision: string | null
  risk_level: string | null
  confidence: number | null
  counts: {
    groups_total: number | null
    groups_finalized: number | null
    fail_groups: number | null
  }
}

export interface AuditEvent {
  id: string
  timestamp: string
  sequence: number | null
  domain: string | null
  run_id: string | null
  group_id: string | null

  type: string
  category: string | null
  severity: AuditSeverity

  title: string | null
  message: string | null
  tags: string[] | null

  actor: {
    type: string | null
    id: string | null
    display_name: string | null
  } | null

  refs: {
    entity_id: string | null
    po_number: string | null
    invoice_number: string | null
    transaction_id: string | null
  } | null

  ui: {
    icon: string | null
    color: string | null
  } | null

  payload: Record<string, any> | null
}

/** ===== UI types (derived in store) ===== */

export type AuditGroupBy = 'DAY' | 'RUN' | 'GROUP' | 'DOMAIN'

export interface AuditEventUi {
  id: string
  ts: string
  ts_ms: number
  dateKey: string
  timeText: string

  sequence: number | null
  domain: string
  run_id: string | null
  group_id: string | null

  type: string
  category: string
  severity: AuditSeverity

  title: string
  message: string
  tags: string[]

  actor_display: string
  actor_type: string
  actor_id: string

  refs: {
    entity_id: string | null
    po_number: string | null
    invoice_number: string | null
    transaction_id: string | null
  }

  ui_icon: string
  ui_color: string

  payload: Record<string, any> | null

  // searchable composite
  searchText: string
}

export interface AuditBlock {
  key: string
  title: string
  subtitle?: string
  badge?: string
  events: AuditEventUi[]
}