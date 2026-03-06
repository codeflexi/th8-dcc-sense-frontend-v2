import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { decisionRunApi } from './api'

import type {
  CaseMasterResponse,
  CaseHeaderVM,
  CaseLineItem
} from './case_master_type'

export const useCaseStore = defineStore('caseMaster', () => {

  /* ================= STATE ================= */

  const aggregate = ref<CaseMasterResponse | null>(null)
  const loadingAggregate = ref(false)

  /* ================= ACTION ================= */

  async function loadCaseAggregate(caseId: string) {
    if (!caseId) return

    loadingAggregate.value = true
    try {
      const res = await decisionRunApi.getCaseAggregate(caseId)
      aggregate.value = res
    } catch (e) {
      console.error('aggregate load error', e)
    } finally {
      loadingAggregate.value = false
    }
  }

  /* ================= UI STATE ================= */

  const isLineItemsExpanded = ref(false)

  function toggleLineItems() {
    isLineItemsExpanded.value = !isLineItemsExpanded.value
  }

  /* ================= COMPUTED ================= */

  const headerVM = computed<CaseHeaderVM | null>(() => {
    const agg = aggregate.value
    if (!agg) return null

    const track = agg.decision_tracks?.[0]

    return {
      case_id: agg.case.case_id,
      reference_id: agg.case.reference_id,
      reference_type: agg.case.reference_type,
      domain: agg.case.domain,
      status: agg.case.status,

      vendor_name: agg.case.entity?.entity_name || '—',
      updated_at: agg.case.updated_at,

      decision: track?.latest_decision,
      risk: track?.risk_level,
      confidence: track?.confidence ?? null,

      item_count: agg.line_items?.length || 0,
      total_amount:
        agg.line_items?.reduce((s, i) => s + i.total_price, 0) || 0
    }
  })

  // แบบ ไม่อ้าง Type
// const lineItems = computed(() => aggregate.value?.line_items || [])

  const lineItems = computed<CaseLineItem[]>(() => {
    return aggregate.value?.line_items || []
  })

  return {
    aggregate,
    headerVM,
    lineItems,
    isLineItemsExpanded,
    toggleLineItems,
    loadCaseAggregate,
    loadingAggregate
  }
})