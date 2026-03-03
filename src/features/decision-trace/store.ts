// src/features/audit/store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { auditApi } from './api'
import type {
  AuditTimelineResponse,
  AuditEvent,
  AuditEventUi,
  AuditGroupBy,
  AuditBlock,
  AuditRun,
} from './types'

function safeStr(v: any) {
  return v === null || v === undefined ? '' : String(v)
}

function toMs(iso: string) {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

const expanded = ref<Set<string>>(new Set())
const showRaw = ref<Set<string>>(new Set())

function toggleExpanded(id: string) {
  const set = new Set(expanded.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  expanded.value = set
}

function toggleRaw(id: string) {
  const set = new Set(showRaw.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  showRaw.value = set
}

function isExpanded(id: string) {
  return expanded.value.has(id)
}

function isRawShown(id: string) {
  return showRaw.value.has(id)
}

/* =========================================================
   BANGKOK TIME FORMATTER (UTC+7)
========================================================= */

function toBangkokDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  return new Date(utc + 7 * 60 * 60000)
}

function formatTs(iso: string) {
  // display: 2026-02-22 19:30:17 (BKK)
  const d = toBangkokDate(iso)
  if (!d) return iso

  const y = d.getFullYear()
  const mo = pad2(d.getMonth() + 1)
  const da = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())

  return `${y}-${mo}-${da} ${hh}:${mm}:${ss}`
}

function dateKeyBKK(iso: string) {
  const d = toBangkokDate(iso)
  if (!d) return 'Unknown date'
  const y = d.getFullYear()
  const mo = pad2(d.getMonth() + 1)
  const da = pad2(d.getDate())
  return `${y}-${mo}-${da}`
}

function timeTextBKK(iso: string) {
  const d = toBangkokDate(iso)
  if (!d) return ''
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${hh}:${mm}:${ss}`
}

/* ========================================================= */

function normalizeEvent(e: AuditEvent): AuditEventUi {
  const domain = safeStr(e.domain || 'system') || 'system'
  const category = safeStr(e.category || 'SYSTEM') || 'SYSTEM'
  const severity = safeStr(e.severity || 'INFO') || 'INFO'

  const actorDisplay =
    e.actor?.display_name ||
    e.actor?.id ||
    (e.actor?.type ? `${e.actor.type}` : 'SYSTEM')

  const refs = {
    entity_id: e.refs?.entity_id ?? null,
    po_number: e.refs?.po_number ?? null,
    invoice_number: e.refs?.invoice_number ?? null,
    transaction_id: e.refs?.transaction_id ?? null,
  }

  const tags = Array.isArray(e.tags) ? e.tags.filter(Boolean).map(String) : []

  const title = safeStr(e.title || e.type || 'EVENT')
  const message = safeStr(e.message || '')

  const ui_icon = safeStr(e.ui?.icon || '')
  const ui_color = safeStr(e.ui?.color || '')

  const ts = safeStr(e.timestamp)
  const ts_ms = toMs(ts)

  const searchText = [
    e.id,
    ts,
    String(e.sequence ?? ''),
    domain,
    safeStr(e.run_id),
    safeStr(e.group_id),
    e.type,
    category,
    severity,
    title,
    message,
    actorDisplay,
    safeStr(e.actor?.id),
    safeStr(e.actor?.type),
    safeStr(refs.entity_id),
    safeStr(refs.po_number),
    safeStr(refs.invoice_number),
    safeStr(refs.transaction_id),
    tags.join(' '),
    ui_icon,
    ui_color,
    e.payload ? JSON.stringify(e.payload) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return {
    id: String(e.id),
    ts,
    ts_ms,
    dateKey: dateKeyBKK(ts),
    timeText: timeTextBKK(ts),

    sequence: e.sequence ?? null,
    domain,
    run_id: e.run_id ?? null,
    group_id: e.group_id ?? null,

    type: safeStr(e.type),
    category,
    severity,

    title,
    message,
    tags,

    actor_display: safeStr(actorDisplay),
    actor_type: safeStr(e.actor?.type || ''),
    actor_id: safeStr(e.actor?.id || ''),

    refs,
    ui_icon,
    ui_color,

    payload: e.payload ?? null,
    searchText,
  }
}

function uniqSorted(list: string[]) {
  return Array.from(new Set(list.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

/* =========================================================
   STORE
========================================================= */

export const useAuditTimelineStore = defineStore('auditTimeline', () => {
  const caseId = ref<string>('')
  const loading = ref<boolean>(false)
  const error = ref<string>('')

  const raw = ref<AuditTimelineResponse | null>(null)
  const runs = ref<AuditRun[]>([])
  const events = ref<AuditEventUi[]>([])

  // UI State
  const groupBy = ref<AuditGroupBy>('DAY')
  const q = ref<string>('')

  const domain = ref<string>('ALL')
  const runId = ref<string>('ALL')
  const groupId = ref<string>('ALL')
  const type = ref<string>('ALL')
  const severity = ref<string>('ALL')

  const expanded = ref<Set<string>>(new Set())
  const showRaw = ref<Set<string>>(new Set())

  const summary = computed(() => raw.value?.summary || null)

  const domainOptions = computed(() => {
    const ds = events.value.map(e => e.domain)
    return ['ALL', ...uniqSorted(ds)]
  })

  const runOptions = computed(() => {
    const rs = events.value.map(e => e.run_id || '-').filter(Boolean)
    return ['ALL', ...uniqSorted(rs)]
  })

  const groupOptions = computed(() => {
    const gs = events.value.map(e => e.group_id || '-').filter(Boolean)
    return ['ALL', ...uniqSorted(gs)]
  })

  const typeOptions = computed(() => {
    const ts = events.value.map(e => e.type)
    return ['ALL', ...uniqSorted(ts)]
  })

  const severityOptions = computed(() => {
    const ss = events.value.map(e => String(e.severity || 'INFO').toUpperCase())
    return ['ALL', ...uniqSorted(ss)]
  })

  const filtered = computed(() => {
    const query = q.value.trim().toLowerCase()
    const sev = String(severity.value || 'ALL').toUpperCase()

    return events.value.filter(e => {
      if (domain.value !== 'ALL' && e.domain !== domain.value) return false
      if (runId.value !== 'ALL' && (e.run_id || '-') !== runId.value) return false
      if (groupId.value !== 'ALL' && (e.group_id || '-') !== groupId.value) return false
      if (type.value !== 'ALL' && e.type !== type.value) return false
      if (sev !== 'ALL' && String(e.severity || '').toUpperCase() !== sev) return false
      if (query && !e.searchText.includes(query)) return false
      return true
    })
  })

  const kpi = computed(() => {
    const list = filtered.value
    const total = list.length
    const critical = list.filter(x => String(x.severity).toUpperCase() === 'CRITICAL').length
    const errorC = list.filter(x => String(x.severity).toUpperCase() === 'ERROR').length
    const warn = list.filter(x => String(x.severity).toUpperCase() === 'WARNING').length
    const success = list.filter(x => String(x.severity).toUpperCase() === 'SUCCESS').length
    const info = total - critical - errorC - warn - success
    return { total, critical, error: errorC, warn, success, info }
  })

  const runIndex = computed(() => {
    const map = new Map<string, AuditRun>()
    for (const r of runs.value || []) map.set(r.run_id, r)
    return map
  })

  const blocks = computed<AuditBlock[]>(() => {
    const list = filtered.value.slice().sort((a, b) => b.ts_ms - a.ts_ms)
    const mode = groupBy.value
    const groups = new Map<string, AuditEventUi[]>()

    for (const e of list) {
      let key = ''
      if (mode === 'DAY') key = e.dateKey
      else if (mode === 'DOMAIN') key = e.domain || 'system'
      else if (mode === 'GROUP') key = e.group_id || '-'
      else key = e.run_id || '-'

      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(e)
    }

    const keys = Array.from(groups.keys())
    if (mode === 'DAY') keys.sort((a, b) => (a < b ? 1 : -1))
    else keys.sort((a, b) => a.localeCompare(b))

    return keys.map(k => ({
      key: k,
      title: k,
      badge: `${groups.get(k)?.length || 0} events`,
      events: groups.get(k) || [],
    }))
  })

  async function load(id: string) {
    if (!id) return
    caseId.value = id
    loading.value = true
    error.value = ''

    try {
      const res = await auditApi.getAuditTimeline(id)
      raw.value = res

      runs.value = (res.runs || []).slice().sort((a, b) => {
        const at = a.started_at ? toMs(a.started_at) : 0
        const bt = b.started_at ? toMs(b.started_at) : 0
        return bt - at
      })

      events.value = (res.events || [])
        .map(normalizeEvent)
        .sort((a, b) => b.ts_ms - a.ts_ms)

      expanded.value = new Set()
      showRaw.value = new Set()
    } catch (e: any) {
      console.error(e)
      error.value = e?.message || 'Failed loading audit'
      raw.value = null
      runs.value = []
      events.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    caseId,
    loading,
    error,

    raw,
    runs,
    events,
    summary,

    groupBy,
    q,
    domain,
    runId,
    groupId,
    type,
    severity,

    domainOptions,
    runOptions,
    groupOptions,
    typeOptions,
    severityOptions,

    filtered,
    blocks,
    kpi,

    load,
    formatTs,
    expanded,
showRaw,
toggleExpanded,
toggleRaw,
isExpanded,
isRawShown,
  }
})