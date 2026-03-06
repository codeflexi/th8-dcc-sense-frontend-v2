// src/features/decision-run/store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { decisionRunApi } from './api'
import type {
  CaseGroup,
  GroupEvidenceResponse,
  GroupRulesResponse,
  GroupRule,
  EvidenceDocument,
  EvidenceItem,
  DecisionRunViewContext,
  DecisionRunItem,
  DecisionRunSummary,
} from './types'

type RightPanelTab = 'WHY' | 'EVIDENCE'

/* =========================================================
   Helpers
========================================================= */

function riskScore(x: string) {
  const v = String(x || '').toUpperCase()
  return v === 'CRITICAL'
    ? 4
    : v === 'HIGH'
      ? 3
      : v === 'MEDIUM' || v === 'MED'
        ? 2
        : v === 'LOW'
          ? 1
          : 0
}

function safeNum(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizeDecision(v: any): string {
  const x = String(v || '').trim()
  return x || '—'
}

function normalizeRisk(v: any): string {
  const x = String(v || '').trim()
  return x || '—'
}

function normalizeConfidence(v: any): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function mapDecisionRunItemToGroup(it: DecisionRunItem): CaseGroup {
  const price: any = it?.price || {}
  const qty: any = it?.quantity || {}
  const ctx = String(price?.context || '')

  const poUnit = safeNum(price?.po_unit)
  const invUnit = safeNum(price?.inv_unit)
  const baselineUnit =
    price?.baseline_unit != null ? safeNum(price?.baseline_unit) : null

  const total =
    invUnit && qty?.inv != null
      ? invUnit * safeNum(qty?.inv)
      : poUnit * safeNum(qty?.po)

  const cur = String(price?.currency || 'THB')

  // IMPORTANT:
  // Frontend must use backend decision/risk only.
  // Do NOT fallback to next_action for row status.
  const decision = normalizeDecision(it?.status?.decision)
  const risk = normalizeRisk(it?.status?.risk)
  const confidence = normalizeConfidence(it?.status?.confidence)

  return {
    group_id: String(it?.group_id || ''),
    decision,
    risk_level: risk,
    confidence,

    sku: {
      item_id: String(it?.group_id || ''),
      sku: String(it?.item?.sku || ''),
      item_name: String(it?.item?.name || ''),
      uom: String(it?.item?.uom || ''),
      quantity: safeNum(qty?.po),
      unit_price: {
        value: ctx === 'BASELINE' ? poUnit : invUnit || poUnit,
        currency: cur,
      },
      total_price: {
        value: total,
        currency: cur,
      },
    },

    baseline:
      baselineUnit != null
        ? { value: baselineUnit, currency: cur }
        : undefined,

    reasons: Array.isArray(it?.drivers)
      ? it.drivers.map((d: any) => ({
          rule_id: String(d?.rule_id || ''),
          severity: String(d?.severity || ''),
          exec: String(d?.label || ''),
        }))
      : [],

    __domain: ctx === '3WAY_MATCH' ? 'finance_ap' : 'procurement',
    raw_trace: it,
  }
}

/* =========================================================
   Store
========================================================= */

export const useDecisionRunStore = defineStore('decisionRun', () => {
  const currentCaseId = ref<string>('')

  // Single source of truth for current run view
  const decisionView = ref<DecisionRunViewContext | null>(null)
  const caseMaster = ref<DecisionRunSummary | null>(null)

  const groups = ref<CaseGroup[]>([])
  const activeGroupId = ref<string>('')

  const activeTab = ref<RightPanelTab>('WHY')

  const loadingGroups = ref(false)
  const loadingRules = ref(false)
  const loadingEvidence = ref(false)
  const rerunningCase = ref(false)

  const rulesCache = ref<Record<string, GroupRulesResponse>>({})
  const evidenceCache = ref<Record<string, GroupEvidenceResponse>>({})

  /* ===============================
     PDF Viewer
  =============================== */

  const pdfViewerUrl = ref<string | null>(null)

  async function openPdf(documentId: string, page?: number) {
    const url = await decisionRunApi.getDocumentPagePdfUrl(documentId, page || 1)
    pdfViewerUrl.value = url
  }

  function closePdf() {
    pdfViewerUrl.value = null
  }

  /* ===============================
     Derived
  =============================== */

  const activeGroup = computed<CaseGroup | null>(() => {
    return groups.value.find(g => g.group_id === activeGroupId.value) || null
  })

  const activeRules = computed<GroupRule[]>(() => {
    const gid = activeGroupId.value
    return gid && rulesCache.value[gid]?.rules
      ? rulesCache.value[gid].rules
      : []
  })

  const activeEvidenceDocs = computed<EvidenceDocument[]>(() => {
    const gid = activeGroupId.value
    return gid && evidenceCache.value[gid]?.documents
      ? evidenceCache.value[gid].documents
      : []
  })

  const activeEvidenceItems = computed<EvidenceItem[]>(() => {
    const gid = activeGroupId.value
    return gid && evidenceCache.value[gid]?.evidences
      ? evidenceCache.value[gid].evidences
      : []
  })

  /* ===============================
     Internal
  =============================== */

  function resetForNewCase(caseId: string) {
    currentCaseId.value = caseId
    decisionView.value = null
    caseMaster.value = null

    groups.value = []
    activeGroupId.value = ''
    activeTab.value = 'WHY'

    rulesCache.value = {}
    evidenceCache.value = {}

    pdfViewerUrl.value = null
  }

  function buildRulesCache(items: DecisionRunItem[]): Record<string, GroupRulesResponse> {
    const nextRules: Record<string, GroupRulesResponse> = {}

    for (const it of items) {
      const gid = String(it?.group_id || '')
      if (!gid) continue

      nextRules[gid] = {
        group_id: gid,
        decision: normalizeDecision(it?.status?.decision),
        risk_level: normalizeRisk(it?.status?.risk),
        confidence: normalizeConfidence(it?.status?.confidence),
        rules: Array.isArray(it?.rules)
          ? it.rules.map((r: any) => ({
              rule_id: String(r?.rule_id || ''),
              severity: String(r?.severity || ''),
              result: String(r?.result || ''),
              explanation: String(
                r?.exec_message || r?.audit_message || r?.rule_id || ''
              ),
              exec_message: r?.exec_message,
              audit_message: r?.audit_message,
              calculation: r?.calculation || undefined,
            }))
          : [],
      }
    }

    return nextRules
  }

  async function preloadAllEvidence() {
    if (!groups.value.length) {
      evidenceCache.value = {}
      return
    }

    loadingEvidence.value = true

    try {
      const entries = await Promise.all(
        groups.value.map(async (g) => {
          const gid = g.group_id

          try {
            const res = await decisionRunApi.getGroupEvidence(gid)
            return [gid, res] as const
          } catch {
            return [
              gid,
              {
                group_id: gid,
                documents: [],
                evidences: [],
              },
            ] as const
          }
        })
      )

      evidenceCache.value = Object.fromEntries(entries)
    } finally {
      loadingEvidence.value = false
    }
  }

  async function loadCase(caseId: string) {
    if (!caseId) return

    resetForNewCase(caseId)
    loadingGroups.value = true
    loadingRules.value = true

    try {
      const view = await decisionRunApi.getDecisionRunView(caseId)

      decisionView.value = view
      caseMaster.value = view.summary || null

      const items = Array.isArray(view.items) ? view.items : []
      const mapped = items.map(mapDecisionRunItemToGroup)

      groups.value = [...mapped].sort(
        (a, b) =>
          riskScore(String(b.risk_level || '')) -
          riskScore(String(a.risk_level || ''))
      )

      rulesCache.value = buildRulesCache(items)

      if (groups.value.length) {
        activeGroupId.value = groups.value[0].group_id
      }

      await preloadAllEvidence()
    } finally {
      loadingGroups.value = false
      loadingRules.value = false
    }
  }

  async function rerunCase(caseId: string) {
    if (!caseId) return

    rerunningCase.value = true
    try {
      await decisionRunApi.rerunCase(caseId)
      await loadCase(caseId)
    } finally {
      rerunningCase.value = false
    }
  }

  async function selectGroup(
    groupId: string,
    opts?: { openEvidence?: boolean }
  ) {
    if (!groupId) return

    activeGroupId.value = groupId
    activeTab.value = opts?.openEvidence ? 'EVIDENCE' : 'WHY'

    if (!evidenceCache.value[groupId]) {
      loadingEvidence.value = true
      try {
        evidenceCache.value[groupId] = await decisionRunApi.getGroupEvidence(groupId)
      } catch {
        evidenceCache.value[groupId] = {
          group_id: groupId,
          documents: [],
          evidences: [],
        }
      } finally {
        loadingEvidence.value = false
      }
    }
  }

  return {
    currentCaseId,

    decisionView,
    caseMaster,

    groups,
    activeGroupId,
    activeTab,

    loadingGroups,
    loadingRules,
    loadingEvidence,
    rerunningCase,

    activeGroup,
    activeRules,
    activeEvidenceDocs,
    activeEvidenceItems,

    pdfViewerUrl,
    openPdf,
    closePdf,

    loadCase,
    rerunCase,
    selectGroup,
  }
})