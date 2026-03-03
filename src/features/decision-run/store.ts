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
  CaseAggregateResponse,
  DecisionRunSummary
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

function mapDecisionRunItemToGroup(it: DecisionRunItem): CaseGroup {
  const price: any = it?.price || {}
  const qty: any = it?.quantity || {}
  const ctx = String(price?.context || '')

  const poUnit = safeNum(price?.po_unit)
  const invUnit = safeNum(price?.inv_unit)
  const baselineUnit = price?.baseline_unit != null ? safeNum(price?.baseline_unit) : null

  const total =
    invUnit && qty?.inv != null ? invUnit * safeNum(qty?.inv) : poUnit * safeNum(qty?.po)

  const cur = String(price?.currency || 'THB')

  const decision = String(it?.status?.decision || it?.next_action || 'REVIEW')
  const risk = String(it?.status?.risk || 'LOW')
  const confidence = it?.status?.confidence

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
      ctx === 'BASELINE' && baselineUnit != null ? { value: baselineUnit, currency: cur } : undefined,

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

  const groups = ref<CaseGroup[]>([])
  const activeGroupId = ref<string>('')

  const activeTab = ref<RightPanelTab>('WHY')

  const loadingGroups = ref(false)
  const loadingRules = ref(false)
  const loadingEvidence = ref(false)

  const rulesCache = ref<Record<string, GroupRulesResponse>>({})
  const evidenceCache = ref<Record<string, GroupEvidenceResponse>>({})
  const caseMaster = ref<DecisionRunSummary | null>(null)

  /* ===============================
     PDF Viewer (เดิม)
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
     Header Aggregate (NEW, isolated)
  =============================== */

  const caseAggregate = ref<CaseAggregateResponse | null>(null)
  const loadingCaseAggregate = ref(false)
  const rerunningCase = ref(false)
  

  async function rerunCase(caseId: string) {
    if (!caseId) return
    rerunningCase.value = true
    try {
      await decisionRunApi.rerunCase(caseId)
      // refresh header + body
      // await loadCaseAggregate(caseId)
      await loadCase(caseId)
    } finally {
      rerunningCase.value = false
    }
  }

  /* ===============================
     Derived (เดิม)
  =============================== */

  const activeGroup = computed(() => groups.value.find(g => g.group_id === activeGroupId.value) || null)

  const activeRules = computed<GroupRule[]>(() => {
    const gid = activeGroupId.value
    return gid && rulesCache.value[gid]?.rules ? rulesCache.value[gid].rules : []
  })

  const activeEvidenceDocs = computed<EvidenceDocument[]>(() => {
    const gid = activeGroupId.value
    return gid && evidenceCache.value[gid]?.documents ? evidenceCache.value[gid].documents : []
  })

  const activeEvidenceItems = computed<EvidenceItem[]>(() => {
    const gid = activeGroupId.value
    return gid && evidenceCache.value[gid]?.evidences ? evidenceCache.value[gid].evidences : []
  })

  /* ===============================
     Internal (เดิม)
  =============================== */

  function resetForNewCase(caseId: string) {
    currentCaseId.value = caseId
    groups.value = []
    activeGroupId.value = ''
    activeTab.value = 'WHY'
    rulesCache.value = {}
    evidenceCache.value = {}
    pdfViewerUrl.value = null
    // IMPORTANT: do NOT reset caseAggregate (header โหลดแยก)
  }

  async function preloadAllEvidence() {
    if (!groups.value.length) return

    const nextEvidence: Record<string, GroupEvidenceResponse> = {}

    for (const g of groups.value) {
      const gid = g.group_id
      try {
        const res = await decisionRunApi.getGroupEvidence(gid)
        nextEvidence[gid] = res
      } catch {
        nextEvidence[gid] = {
          group_id: gid,
          documents: [],
          evidences: [],
        }
      }
    }

    evidenceCache.value = nextEvidence
  }

  async function loadCase(caseId: string) {
    if (!caseId) return

    resetForNewCase(caseId)
    loadingGroups.value = true

    try {
      const view: DecisionRunViewContext = await decisionRunApi.getDecisionRunView(caseId)
      caseMaster.value = view.summary
      
      const items = Array.isArray(view.items) ? view.items : []
      const mapped = items.map(mapDecisionRunItemToGroup)

      groups.value = [...mapped].sort(
        (a, b) => riskScore(String(b.risk_level || '')) - riskScore(String(a.risk_level || ''))
      )

      const nextRules: Record<string, GroupRulesResponse> = {}

      for (const g of groups.value) {
        const gid = g.group_id
        const raw = g.raw_trace || {}

        nextRules[gid] = {
          group_id: gid,
          decision: g.decision,
          risk_level: g.risk_level,
          confidence: g.confidence,
          rules: (raw.rules || []).map((r: any) => ({
            rule_id: r.rule_id,
            severity: r.severity,
            result: r.result,
            explanation: r.exec_message || r.audit_message || '',
            exec_message: r.exec_message,
            audit_message: r.audit_message,
            calculation: r.calculation,
          })),
        }
      }

      rulesCache.value = nextRules

      await preloadAllEvidence()

      if (groups.value.length) {
        activeGroupId.value = groups.value[0].group_id
      }
    } finally {
      loadingGroups.value = false
    }
  }

  async function selectGroup(groupId: string, opts?: { openEvidence?: boolean }) {
    if (!groupId) return
    activeGroupId.value = groupId
    activeTab.value = opts?.openEvidence ? 'EVIDENCE' : 'WHY'
  }

  return {
    // existing exports
    currentCaseId,
    groups,
    activeGroupId,
    activeTab,
    loadingGroups,
    loadingRules,
    loadingEvidence,

    activeGroup,
    activeRules,
    activeEvidenceDocs,
    activeEvidenceItems,

    pdfViewerUrl,
    openPdf,
    closePdf,

    loadCase,
    selectGroup,

    // header exports (NEW)
    caseMaster,
    caseAggregate,
    loadingCaseAggregate,
    rerunningCase,
 
    rerunCase,
  }
})