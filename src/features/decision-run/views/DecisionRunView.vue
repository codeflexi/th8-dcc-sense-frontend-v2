<script setup lang="ts">
import { computed, watch , onMounted } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import DecisionWhyPanel from './components/DecisionWhyPanel.vue'
import DecisionEvidencePanel from './components/EvidenceCard.vue'
import { useRoute } from 'vue-router'
import { useCaseStore } from '@/features/decision-run/case_master_store'
import { formatTsBKK } from '@/utils/datetime'
import { storeToRefs } from 'pinia'


const route = useRoute()
const store = useDecisionRunStore()
const caseStore = useCaseStore()
const { headerVM, lineItems, isLineItemsExpanded, loadingAggregate } = storeToRefs(caseStore)


const caseId = computed(() => String(route.params.caseId || ''))


// โหลด aggregate ตอนเข้า page
onMounted(() => {
  if (!caseId) return
  caseStore.loadCaseAggregate(caseId.value)
})
/* =========================================================
   LOAD BOTH: header (aggregate) + body (decision run view)
========================================================= */
watch(
  caseId,
  async (id) => {
    if (!id) return
    await caseStore.loadCaseAggregate(caseId.value)  // HEADER SOURCE (meta + view merged)
    await store.loadCase(id)            // BODY SOURCE (เดิม)
  },
  { immediate: true }
)

/* =========================================================
   HEADER SOURCE (from store.caseAggregate)
========================================================= */
const agg = computed(() => store.caseAggregate)
const caseMeta = computed(() => caseStore.headerVM)

const summary = computed(() => store.caseMaster)


const displayRef = computed(() => caseMeta.value?.reference_id || caseId.value)
const vendorName = computed(() => caseMeta.value?.vendor_name || '—')
const caseStatus = computed(() => caseMeta.value?.status || '—')
const caseDomain = computed(() => caseMeta.value?.domain || '—')

// const lastUpdatedBkk = computed(() => {
//   const ts = caseMeta.value?.updated_at
//   if (!ts) return '—'
//   return new Date(ts).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false }) + ' ICT'
// })

const lastUpdatedBkk = computed(() => {
   caseMeta.value?.updated_at
})



// ✅ ใช้ summary เป็นแหล่ง truth ของ badge
const headerDecision = computed(() => caseMeta.value?.decision || '—')
const headerRisk = computed(() => caseMeta.value?.risk || '—')
const headerConfidence = computed(() => {
  const c = caseMeta.value?.confidence
  return c != null ? Math.round(c * 100) : 0
})

const itemCount = computed(() => caseMeta.value?.item_count || 0)
const exposure = computed(() => summary.value?.exposure?.unit_variance_sum || 0)
const exposureCurrency = computed(() => summary.value?.exposure?.currency || 'THB')
const topReasonCodes = computed(() => summary.value?.top_reason_codes || [])

function  rerun() {
  if (!caseId.value) return
  store.rerunCase(caseId.value)
  caseStore.loadCaseAggregate(caseId.value)
}

/* ===============================
 * BODY HELPERS (คืนทั้งหมด)
 * =============================== */

const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n || 0)

const fmtPct2 = (n: any) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `${v.toFixed(2)}%`
}

function groupPriceContext(g: any): string {
  return String(g?.raw_trace?.price?.context || (g?.baseline ? 'BASELINE' : ''))
}

const is3WayMode = computed(() => {
  return (store.groups || []).some((g: any) => groupPriceContext(g) === '3WAY_MATCH')
})

function is3WayGroup(g: any) {
  return groupPriceContext(g) === '3WAY_MATCH'
}

function getQtyText(g: any) {
  if (!is3WayGroup(g)) return `Qty ${g?.sku?.quantity ?? '—'}`
  const q = g?.raw_trace?.quantity || {}
  const po = q?.po ?? '—'
  const gr = q?.gr ?? '—'
  const inv = q?.inv ?? '—'
  return `PO ${po} • GR ${gr} • INV ${inv}`
}

function getPoUnit(g: any) {
  return Number(g?.raw_trace?.price?.po_unit ?? 0)
}

function getInvUnit(g: any) {
  return Number(g?.raw_trace?.price?.inv_unit ?? 0)
}

function get3WayVariancePct(g: any) {
  return g?.raw_trace?.price?.variance_pct
}

function get3WayVarianceAbs(g: any) {
  return g?.raw_trace?.price?.variance_abs 
}

function isWithinTolerance(g: any): boolean | null {
  const v = g?.raw_trace?.price?.within_tolerance
  return typeof v === 'boolean' ? v : null
}

function riskBadge(level?: string) {
  const x = String(level || '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (x === 'MEDIUM' || x === 'MED') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function decisionBadge(decision?: string) {
  const x = String(decision || '').toUpperCase()
  if (x === 'REJECT' || x === 'FAIL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'REVIEW') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function severityBadge(sev?: string) {
  const x = String(sev || '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (x === 'MEDIUM' || x === 'MED') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function variancePct(orderUnit?: number, baselineUnit?: number) {
  const o = Number(orderUnit)
  const b = Number(baselineUnit)
  if (!Number.isFinite(o) || !Number.isFinite(b) || b === 0) return null
  return ((o - b) / b) * 100
}
</script>
<template>
  <div class="min-h-screen bg-slate-50">


<!-- ================= ENTERPRISE HEADER ================= -->
<div class="border-b border-slate-200 bg-white">
  <div class="max-w-7xl mx-auto px-6 py-6">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

      <!-- LEFT -->
      <div class="min-w-0">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          TH8 Sense · Decision Control Center
        </div>

        <div class="mt-2 text-2xl font-black text-slate-900 truncate">
          {{ displayRef }} 
        </div>

        <div class="mt-1 text-sm text-slate-600">
          {{ vendorName }}
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span class="px-2 py-1 rounded bg-slate-100 font-semibold">
            {{ caseDomain }}
          </span>

          <span class="px-2 py-1 rounded bg-slate-100 font-semibold">
            Status: {{ caseStatus }}
          </span>

          <span class="text-slate-400">•</span>
          <span>{{ itemCount }} items</span>

          <span class="text-slate-400">•</span>
          <span>Exposure {{ fmt(exposure) }} {{ exposureCurrency }}</span>

          <span class="text-slate-400">•</span>
      
          <span> Updated  {{ formatTsBKK(caseStore.headerVM?.updated_at)}} </span>
        </div>

        

        <div v-if="topReasonCodes.length" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="r in topReasonCodes"
            :key="r.code"
            class="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold"
          >
            {{ r.code }} · {{ r.count }}
          </span>
        </div>
      </div>

      <!-- RIGHT CONTROL PANEL -->
      <div class="flex flex-col items-end gap-3">
        <div class="flex items-center gap-2 text-sm">
          <span
            class="px-3 py-1 rounded-full border text-xs font-extrabold"
            :class="decisionBadge(headerDecision)"
          >
            {{ headerDecision }}
          </span>

          <span
            class="px-3 py-1 rounded-full border text-xs font-extrabold"
            :class="riskBadge(headerRisk)"
          >
            {{ headerRisk }} RISK
          </span>

          <span class="text-slate-500">
            Confidence {{ headerConfidence }}%
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50"
            @click="rerun"
            :disabled="store.rerunningCase"
          >
            <span v-if="!store.rerunningCase">Re-run</span>
            <span v-else>Running...</span>
          </button>

          <button class="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">
            Approve
          </button>

          <button class="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50">
            Reject
          </button>
        </div>
      </div>

    </div>
  </div>
</div>



    <!-- ================= BODY ================= -->
    <div class="max-w-7xl mx-auto px-6 py-6">
      <div class="grid grid-cols-12 gap-6">

        <!-- ==========================================================
            LEFT: LINE ITEMS
        ========================================================== -->
        <div class="col-span-12 lg:col-span-7 space-y-4">

          <!-- ================= LIST ================= -->
          <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white">

            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div class="text-sm font-extrabold text-slate-900">Line Items</div>
                <div class="text-xs text-slate-500 mt-1">
                  Click an item to see WHY + Evidence
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">Groups</span>
                <span class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                  {{ store.groups.length }}
                </span>
              </div>
            </div>

            <div v-if="store.loadingGroups" class="p-6 text-center text-sm text-slate-500">
              Loading groups...
            </div>

            <div v-else>
              <!-- header row -->
              <div class="grid grid-cols-12 px-6 py-3 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <div class="col-span-5">Item</div>
                <div class="col-span-2 text-right">{{ is3WayMode ? 'PO Unit' : 'Order Unit' }}</div>
                <div class="col-span-2 text-right">{{ is3WayMode ? 'Inv Unit' : 'Baseline' }}</div>
                <div class="col-span-2 text-right">Variance</div>
                <div class="col-span-1 text-right">WHY</div>
              </div>

              <div class="divide-y divide-slate-100">
                <div
                  v-for="g in store.groups || []"
                  :key="g.group_id"
                  @click="store.selectGroup(g.group_id)"
                  class="grid grid-cols-12 px-6 py-4 cursor-pointer transition"
                  :class="[
                    store.activeGroupId === g.group_id ? 'bg-slate-100' : 'hover:bg-slate-50'
                  ]"
                >
                  <!-- ITEM -->
                  <div class="col-span-5 flex items-start gap-3 min-w-0">
                    <!-- compact status -->
                    <div class="mt-1">
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
                        :class="String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'
                          ? 'bg-emerald-600'
                          : String(g.decision).toUpperCase() === 'REVIEW'
                            ? 'bg-amber-500'
                            : 'bg-rose-600'"
                      >
                        <span v-if="String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'">✓</span>
                        <span v-else>!</span>
                      </div>
                    </div>

                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <div class="font-extrabold text-slate-900 truncate">
                          {{ g?.sku?.item_name || 'Unknown item' }}
                        </div>
                        <span
                          class="text-[11px] px-2 py-[2px] rounded border"
                          :class="severityBadge(g.risk_level)"
                        >
                          {{ String(g.risk_level).toUpperCase() }}
                        </span>
                      </div>

                      <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span class="font-mono">SKU {{ g?.sku?.sku || '—' }}</span>
                        <span class="text-slate-300">•</span>
                        <span>{{ getQtyText(g) }}</span>

                        <span v-if="g?.sku?.source_line_ref">
                          <span class="text-slate-300">•</span>
                          line {{ g.sku.source_line_ref }}
                        </span>
                      </div>

                      <!-- micro compare bar (procurement only) -->
                      <div v-if="g?.sku && g?.baseline" class="mt-2 h-1.5 w-44 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          class="h-1.5"
                          :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                            ? 'bg-rose-400'
                            : 'bg-slate-300'"
                          :style="{
                            width: Math.min(
                              Math.abs(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0),
                              100
                            ) + '%'
                          }"
                        />
                      </div>

                      <div
                        v-if="g?.sku && g?.baseline && String(g?.decision || '').toUpperCase() === 'REVIEW'"
                        class="mt-2 text-[11px]"
                        :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                          ? 'text-rose-700'
                          : 'text-amber-700'"
                      >
                        Exception: variance exceeds policy threshold. Review evidence on the right.
                      </div>
                    </div>
                  </div>

                  <!-- ORDER UNIT (Procurement) / PO UNIT (3WAY) -->
                  <div class="col-span-2 text-right">
                    <template v-if="is3WayGroup(g)">
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(getPoUnit(g) || 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ exposureCurrency }}
                      </div>
                    </template>

                    <template v-else>
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(g?.sku ? (g?.sku?.unit_price?.value || 0) : 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ (g?.sku?.unit_price?.currency || exposureCurrency) }}
                      </div>
                    </template>
                  </div>

                  <!-- BASELINE (Procurement) / INV UNIT (3WAY) -->
                  <div class="col-span-2 text-right">
                    <template v-if="is3WayGroup(g)">
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(getInvUnit(g) || 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ exposureCurrency }}
                      </div>
                    </template>

                    <template v-else>
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(g?.baseline?.value || 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ g?.baseline?.currency || exposureCurrency }}
                      </div>
                    </template>
                  </div>

                  <!-- VARIANCE (primary signal) -->
                  <div class="col-span-2 text-right">
                    <template v-if="is3WayGroup(g)">
                      <div
                        class="font-mono font-semibold"
                        :class="isWithinTolerance(g) === false ? 'text-rose-700' : 'text-slate-900'"
                      >
                        {{ fmtPct2(get3WayVariancePct(g)) }}
                      </div>
                      <div
                        v-if="get3WayVarianceAbs(g) != null"
                        class="text-[10px] mt-0.5"
                        :class="isWithinTolerance(g) === false ? 'text-rose-600' : 'text-slate-400'"
                      >
                        {{ fmt(Number(get3WayVarianceAbs(g) || 0)) }} {{ currency }}
                      </div>
                      <div
                        class="text-[10px] mt-0.5"
                        :class="isWithinTolerance(g) === false ? 'text-rose-600' : 'text-emerald-700'"
                      >
                        {{ isWithinTolerance(g) === false ? 'Out of policy' : 'Within policy' }}
                      </div>
                    </template>

                    <template v-else>
                      <template v-if="g?.sku && g?.baseline && variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) !== null">
                        <div
                          class="font-mono font-semibold"
                          :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                            ? 'text-rose-700'
                            : 'text-slate-900'"
                        >
                          {{ (variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0).toFixed(2) }}%
                        </div>
                        <div
                          class="text-[10px] mt-0.5"
                          :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                            ? 'text-rose-600'
                            : 'text-slate-400'"
                        >
                          {{ (variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3 ? 'Out of policy' : 'Within policy' }}
                        </div>
                      </template>

                      <template v-else>
                        <div class="font-mono font-semibold text-slate-400">—</div>
                        <div class="text-[10px] text-slate-400">n/a</div>
                      </template>
                    </template>
                  </div>

                  <!-- WHY -->
                  <div class="col-span-1 text-right">
                    <button
                      class="px-3 py-1.5 rounded-xl text-xs font-extrabold border"
                      :class="store.activeGroupId === g.group_id
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'"
                      @click.stop="store.selectGroup(g.group_id, { openEvidence: false })"
                    >
                      WHY
                    </button>

                    <div
                      class="mt-2 text-[11px] font-extrabold inline-flex px-2 py-1 rounded-lg border"
                      :class="String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'"
                    >

                    <span
  class="mt-2 text-[11px] font-extrabold inline-flex px-2 py-1 rounded-lg border"
  :class="decisionBadge(g.decision)"
>
  {{ String(g.decision).toUpperCase() }}
</span>
                    </div>
                  </div>

                </div>
              </div>

              <div class="px-6 py-4 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
                <div>CFO view: focus on exception first</div>
                <button class="text-slate-700 font-semibold hover:underline">Export summary</button>
              </div>
            </div>

          </div>
        </div>

        <!-- ==========================================================
            RIGHT: WHY / EVIDENCE
        ========================================================== -->
        <div class="col-span-12 lg:col-span-5 space-y-4">
          <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div class="flex items-center gap-1 border-b border-slate-100 bg-slate-50">
              <button
                class="px-4 py-3 text-sm font-extrabold"
                :class="store.activeTab === 'WHY' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                @click="store.activeTab = 'WHY'"
              >
                WHY
              </button>
              <button
                class="px-4 py-3 text-sm font-extrabold"
                :class="store.activeTab === 'EVIDENCE' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                @click="store.activeGroupId && store.selectGroup(store.activeGroupId, { openEvidence: true })"
              >
                Evidence
                <span class="ml-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
                  {{ store.activeEvidenceItems.length }}
                </span>
              </button>
            </div>

            <div class="p-5">
              <DecisionWhyPanel v-if="store.activeTab === 'WHY'" />

              <template v-else>
                <div v-if="store.loadingEvidence" class="text-sm text-slate-500">
                  Loading evidence...
                </div>

                <div v-else-if="store.activeEvidenceItems.length === 0" class="text-sm text-slate-500">
                  No evidence available.
                </div>

                <div v-else class="space-y-3">
                  <DecisionEvidencePanel
                    v-for="ev in store.activeEvidenceItems"
                    :key="ev.evidence_id"
                    :evidence="ev"
                    :document="store.activeEvidenceDocs.find(d => d.document_id === ev.document_id)"
                   
                  />
                </div>




              </template>
            </div>
          </div>
        </div>



        
      </div>
    </div>

  </div>

<div class="p-6 space-y-6">

    <!-- Loading -->
    <div v-if="caseStore.loadingAggregate">
      Loading...
    </div>

    <!-- Header -->
    <div
      v-if="caseStore.headerVM"
      class="bg-white p-6 rounded border"
    >
      <div class="flex justify-between items-start">

        <div>
          <div class="text-xl font-semibold">
            {{ caseStore.headerVM.reference_id }}
          </div>

          <div class="text-sm text-slate-500">
            {{ caseStore.headerVM.vendor_name }}
          </div>

          <div class="text-xs text-slate-400 mt-1">
            Updated {{ formatTsBKK(caseStore.headerVM.updated_at) }}
          </div>
        </div>

        <div class="text-right">
          <div class="flex gap-2 justify-end">
            <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
              {{ caseStore.headerVM.decision }}
            </span>

            <span class="px-2 py-1 bg-slate-100 rounded text-xs">
              {{ caseStore.headerVM.risk }}
            </span>

            <span class="px-2 py-1 bg-slate-100 rounded text-xs">
              {{ caseStore.headerVM.confidence }}
            </span>
          </div>

          <div class="text-sm text-slate-500 mt-2">
            {{ caseStore.headerVM.item_count }} items •
            {{ caseStore.headerVM.total_amount }}
          </div>
        </div>
      </div>

      <!-- Collapse toggle -->
      <div class="mt-4">
        <button
          class="text-sm text-blue-600"
          @click="caseStore.toggleLineItems()"
        >
          {{ caseStore.isLineItemsExpanded ? 'Hide items' : 'Show items' }}
        </button>
      </div>
    </div>

    <!-- Line Items -->
    <div
      v-if="caseStore.isLineItemsExpanded"
      class="bg-white rounded border"
    >
      <table class="w-full text-sm">
        <thead class="bg-slate-100">
          <tr>
            <th class="px-4 py-2 text-left">SKU</th>
            <th class="px-4 py-2 text-left">Item</th>
            <th class="px-4 py-2 text-right">Qty</th>
            <th class="px-4 py-2 text-right">Unit</th>
            <th class="px-4 py-2 text-right">Total</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in caseStore.lineItems"
            :key="item.item_id"
            class="border-t"
          >
            <td class="px-4 py-2">{{ item.sku }}</td>
            <td class="px-4 py-2">{{ item.item_name }}</td>
            <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
            <td class="px-4 py-2 text-right">{{ item.unit_price }}</td>
            <td class="px-4 py-2 text-right font-medium">
              {{ item.total_price }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>



<!-- ================= PDF PREVIEW MODAL ================= -->
<div
  v-if="store.pdfViewerUrl"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  @click.self="store.closePdf()"
>
  <div class="bg-white w-[90vw] h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <div class="text-sm font-extrabold text-slate-800">
        Document Preview
      </div>
      <button
        class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50"
        @click="store.closePdf()"
      >
        Close
      </button>
    </div>

    <div class="flex-1 bg-slate-100">
      <iframe
        :src="store.pdfViewerUrl"
        class="w-full h-full"
      />
    </div>
  </div>
</div>
</template>