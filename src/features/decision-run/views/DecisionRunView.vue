<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDecisionRunStore } from '@/features/decision-run/store'
import { useCaseStore } from '@/features/decision-run/case_master_store'
import { formatTsBKK } from '@/utils/datetime'
import DecisionWhyPanel from './components/DecisionWhyPanel.vue'
import DecisionEvidencePanel from './components/EvidenceCard.vue'

const route = useRoute()
const store = useDecisionRunStore()
const caseStore = useCaseStore()

const { headerVM, loadingAggregate } = storeToRefs(caseStore)

const caseId = computed(() => String(route.params.caseId || ''))

watch(
  caseId,
  async (id) => {
    if (!id) return

    await Promise.all([
      caseStore.loadCaseAggregate(id),
      store.loadCase(id),
    ])
  },
  { immediate: true }
)

/* =========================================================
   Header / summary data
========================================================= */

const caseMeta = computed(() => headerVM.value)
const summary = computed(() => store.caseMaster)
const decisionView = computed(() => store.decisionView)

const displayRef = computed(() => caseMeta.value?.reference_id || caseId.value)
const caseStatus = computed(() => caseMeta.value?.status || '—')
const caseDomain = computed(() => caseMeta.value?.domain || '—')
const vendorName = computed(() => caseMeta.value?.vendor_name || '—')

const lastUpdatedBkk = computed(() => {
  const ts = caseMeta.value?.updated_at
  return ts ? formatTsBKK(ts) : '—'
})

const lastEvaluatedBkk = computed(() => {
  const ts = decisionView.value?.created_at
  return ts ? formatTsBKK(ts) : '—'
})

const policyId = computed(() => decisionView.value?.policy?.policy_id || '—')
const policyVersion = computed(() => decisionView.value?.policy?.policy_version || '—')

const headerDecision = computed(() => summary.value?.overall_decision || '—')
const headerRisk = computed(() => summary.value?.risk_level || '—')
const headerConfidence = computed(() => {
  const c = summary.value?.confidence_avg
  return c != null ? Math.round(c * 100) : 0
})

const itemCount = computed(() => {
  return summary.value?.item_count ?? store.groups.length ?? 0
})

const exposure = computed(() => Number(summary.value?.exposure?.unit_variance_sum || 0))
const exposureCurrency = computed(() => summary.value?.exposure?.currency || 'THB')
const topReasonCodes = computed(() => summary.value?.top_reason_codes || [])

const reviewCount = computed(() =>
  (store.groups || []).filter((g: any) => String(g?.decision || '').toUpperCase() === 'REVIEW').length
)

const rejectCount = computed(() =>
  (store.groups || []).filter((g: any) => String(g?.decision || '').toUpperCase() === 'REJECT').length
)

const actionCount = computed(() => reviewCount.value + rejectCount.value)

const primarySummaryText = computed(() => {
  const rejected = rejectCount.value
  const reviewed = reviewCount.value
  const total = itemCount.value

  if (rejected > 0) {
    return `${rejected} item${rejected > 1 ? 's' : ''} require rejection due to critical control exceptions.`
  }

  if (reviewed > 0) {
    return `${reviewed} of ${total} item${total > 1 ? 's' : ''} require review before approval.`
  }

  return `All ${total} item${total > 1 ? 's' : ''} are currently within decision thresholds.`
})

const impactSummaryText = computed(() => {
  const reasons = topReasonCodes.value
  const exposureText = `${fmt(Math.abs(exposure.value))} ${exposureCurrency.value}`

  if (reasons.length > 0) {
    return `Potential exposure ${exposure.value < 0 ? '-' : ''}${exposureText} · Top issue ${reasons[0].code}${reasons[0].count ? ` (${reasons[0].count})` : ''}`
  }

  return `Potential exposure ${exposure.value < 0 ? '-' : ''}${exposureText}`
})

const summaryBarClass = computed(() => {
  return actionCount.value === 0
    ? 'border-emerald-200 bg-emerald-50'
    : 'border-amber-200 bg-amber-50'
})

const summaryTitleClass = computed(() => {
  return actionCount.value === 0 ? 'text-emerald-900' : 'text-amber-900'
})

const summaryBodyClass = computed(() => {
  return actionCount.value === 0 ? 'text-emerald-700' : 'text-amber-700'
})

const exposureCardClass = computed(() => {
  return exposure.value < 0
    ? 'border-rose-200 bg-rose-50'
    : 'border-slate-200 bg-slate-50'
})

const exposureValueClass = computed(() => {
  return exposure.value < 0 ? 'text-rose-700' : 'text-slate-950'
})

/* ===============================
 * Actions
 * =============================== */

async function rerun() {
  if (!caseId.value) return
  await store.rerunCase(caseId.value)
  await caseStore.loadCaseAggregate(caseId.value)
}

/* ===============================
 * Helpers
 * =============================== */

const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n || 0)

const fmtMoney = (n: any) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('th-TH').format(v)
}

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

function getCurrency(g: any) {
  return String(
    g?.raw_trace?.price?.currency ||
      g?.sku?.unit_price?.currency ||
      g?.baseline?.currency ||
      exposureCurrency.value ||
      'THB'
  )
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

const pageLoading = computed(() => loadingAggregate.value || store.loadingGroups)
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- ================= DECISION SUMMARY HEADER ================= -->
    <div class="border-b border-slate-200 bg-white">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <!-- LEFT: DECISION CONTEXT -->
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em]">
              TH8 Sense · Decision Run
            </div>

            <div class="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Decision Summary
            </div>

            <div class="mt-1 text-sm text-slate-500">
              Current run outcome for approval decision
            </div>

            <!-- Governance metadata strip -->
            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-700">
                Policy {{ policyId }}
              </span>

              <span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-700">
                Version {{ policyVersion }}
              </span>

              <span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-700">
                Last evaluated {{ lastEvaluatedBkk }}
              </span>
            </div>

            <div
              class="mt-4 rounded-2xl border px-4 py-3"
              :class="summaryBarClass"
            >
              <div class="text-sm font-extrabold" :class="summaryTitleClass">
                {{ primarySummaryText }}
              </div>
              <div class="mt-1 text-sm" :class="summaryBodyClass">
                {{ impactSummaryText }}
              </div>
            </div>

            <div v-if="topReasonCodes.length" class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="r in topReasonCodes"
                :key="r.code"
                class="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold"
              >
                {{ r.code }} · {{ r.count }}
              </span>
            </div>
          </div>

          <!-- RIGHT: KPI + ACTION -->
          <div class="w-full xl:w-[520px] space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-2xl border p-4" :class="decisionBadge(headerDecision)">
                <div class="text-[11px] font-bold uppercase tracking-wide opacity-80">
                  Decision
                </div>
                <div class="mt-2 text-2xl font-black">
                  {{ String(headerDecision).toUpperCase() }}
                </div>
              </div>

              <div class="rounded-2xl border p-4" :class="riskBadge(headerRisk)">
                <div class="text-[11px] font-bold uppercase tracking-wide opacity-80">
                  Risk
                </div>
                <div class="mt-2 text-2xl font-black">
                  {{ String(headerRisk).toUpperCase() }}
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Confidence
                </div>
                <div class="mt-2 text-2xl font-black text-slate-950">
                  {{ headerConfidence }}%
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-2xl border p-4" :class="exposureCardClass">
                <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Exposure
                </div>
                <div class="mt-2 text-2xl font-black" :class="exposureValueClass">
                  {{ exposure < 0 ? '-' : '' }}{{ fmt(Math.abs(exposure)) }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ exposureCurrency }} potential variance
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Items requiring action
                </div>
                <div class="mt-2 text-2xl font-black text-slate-950">
                  {{ actionCount }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ reviewCount }} review · {{ rejectCount }} reject
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50 disabled:opacity-60"
                @click="rerun"
                :disabled="store.rerunningCase"
              >
                <span v-if="!store.rerunningCase">Re-run</span>
                <span v-else>Running...</span>
              </button>

              <button class="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">
                Approve
              </button>

              <button class="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50">
                Reject
              </button>
            </div>

            <div class="text-xs text-slate-500">
              Approval will apply to the current case decision outcome and all reviewed items.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= BODY ================= -->
    <div class="max-w-7xl mx-auto px-6 py-6">
      <div
        v-if="pageLoading"
        class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
      >
        Loading decision run...
      </div>

      <template v-else>
        <!-- ================= CASE DETAIL + ITEMS ACCORDION ================= -->
        <div
          v-if="caseStore.headerVM"
          class="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="p-6">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Case Detail
                </div>

                <div class="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {{ displayRef }}
                </div>

                <div class="mt-1 text-sm text-slate-600">
                  {{ vendorName }}
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span class="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 font-bold">
                    {{ caseDomain }}
                  </span>

                  <span class="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 font-bold">
                    Status: {{ caseStatus }}
                  </span>

                  <span class="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 font-bold">
                    Updated {{ lastUpdatedBkk }}
                  </span>
                </div>
              </div>

              <div class="w-full lg:w-[360px] space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Items
                    </div>
                    <div class="mt-2 text-2xl font-black text-slate-950">
                      {{ caseStore.headerVM.item_count }}
                    </div>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Total Amount
                    </div>
                    <div class="mt-2 text-2xl font-black text-slate-950">
                      {{ fmtMoney(caseStore.headerVM.total_amount) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-200"></div>

          <button
            type="button"
            class="flex w-full items-center justify-between bg-slate-50 px-6 py-4 text-left transition hover:bg-slate-100"
            @click="caseStore.toggleLineItems()"
          >
            <div class="min-w-0">
              <div class="text-sm font-extrabold text-slate-900">
                Items in this case
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ caseStore.headerVM.item_count }} items
                <span class="mx-2 text-slate-300">•</span>
                Total {{ fmtMoney(caseStore.headerVM.total_amount) }}
              </div>
            </div>

            <div class="ml-4 flex items-center gap-3">
              <span class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600">
                {{ caseStore.isLineItemsExpanded ? 'Collapse' : 'Expand' }}
              </span>

              <svg
                class="h-5 w-5 text-slate-500 transition-transform duration-200"
                :class="caseStore.isLineItemsExpanded ? 'rotate-180' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          <div v-if="caseStore.isLineItemsExpanded" class="border-t border-slate-200">
            <div v-if="!caseStore.lineItems.length" class="p-6 text-sm text-slate-500">
              No line items available.
            </div>

            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-white">
                  <tr class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th class="px-6 py-3 text-left">SKU</th>
                    <th class="px-6 py-3 text-left">Item</th>
                    <th class="px-6 py-3 text-right">Qty</th>
                    <th class="px-6 py-3 text-right">Unit Price</th>
                    <th class="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="item in caseStore.lineItems"
                    :key="item.item_id"
                    class="hover:bg-slate-50"
                  >
                    <td class="px-6 py-4 font-mono text-xs text-slate-700">
                      {{ item.sku || '—' }}
                    </td>

                    <td class="px-6 py-4">
                      <div class="font-semibold text-slate-900">
                        {{ item.item_name }}
                      </div>
                      <div v-if="item.description" class="mt-1 text-xs text-slate-500">
                        {{ item.description }}
                      </div>
                    </td>

                    <td class="px-6 py-4 text-right text-slate-700">
                      {{ item.quantity }}
                    </td>

                    <td class="px-6 py-4 text-right font-medium text-slate-700">
                      {{ fmtMoney(item.unit_price) }}
                    </td>

                    <td class="px-6 py-4 text-right font-bold text-slate-900">
                      {{ fmtMoney(item.total_price) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ================= DECISION RUN CONTENT ================= -->
        <div class="grid grid-cols-12 gap-6">
          <!-- LEFT -->
          <div class="col-span-12 lg:col-span-7 space-y-4">
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

              <div v-if="store.groups.length === 0" class="p-6 text-center text-sm text-slate-500">
                No decision groups available.
              </div>

              <div v-else>
                <div class="grid grid-cols-12 px-6 py-3 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <div class="col-span-5">Item</div>
                  <div class="col-span-2 text-right">{{ is3WayMode ? 'PO Unit' : 'Order Unit' }}</div>
                  <div class="col-span-2 text-right">{{ is3WayMode ? 'Inv Unit' : 'Baseline' }}</div>
                  <div class="col-span-2 text-right">Variance</div>
                  <div class="col-span-1 text-right">WHY</div>
                </div>

                <div class="divide-y divide-slate-100">
                  <div
                    v-for="g in store.groups"
                    :key="g.group_id"
                    @click="store.selectGroup(g.group_id)"
                    class="grid grid-cols-12 px-6 py-4 cursor-pointer transition"
                    :class="[store.activeGroupId === g.group_id ? 'bg-slate-100' : 'hover:bg-slate-50']"
                  >
                    <div class="col-span-5 flex items-start gap-3 min-w-0">
                      <div class="mt-1">
                        <div
                          class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
                          :class="
                            String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'
                              ? 'bg-emerald-600'
                              : String(g.decision).toUpperCase() === 'REVIEW'
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                          "
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

                        <div
                          v-if="!is3WayGroup(g) && g?.sku && g?.baseline"
                          class="mt-2 h-1.5 w-44 bg-slate-100 rounded-full overflow-hidden"
                        >
                          <div
                            class="h-1.5"
                            :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3 ? 'bg-rose-400' : 'bg-slate-300'"
                            :style="{
                              width:
                                Math.min(
                                  Math.abs(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0),
                                  100
                                ) + '%'
                            }"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="col-span-2 text-right">
                      <template v-if="is3WayGroup(g)">
                        <div class="font-mono font-semibold text-slate-900">
                          {{ fmt(getPoUnit(g) || 0) }}
                        </div>
                        <div class="text-[10px] text-slate-400">
                          {{ getCurrency(g) }}
                        </div>
                      </template>

                      <template v-else>
                        <div class="font-mono font-semibold text-slate-900">
                          {{ fmt(g?.sku ? (g?.sku?.unit_price?.value || 0) : 0) }}
                        </div>
                        <div class="text-[10px] text-slate-400">
                          {{ g?.sku?.unit_price?.currency || exposureCurrency }}
                        </div>
                      </template>
                    </div>

                    <div class="col-span-2 text-right">
                      <template v-if="is3WayGroup(g)">
                        <div class="font-mono font-semibold text-slate-900">
                          {{ fmt(getInvUnit(g) || 0) }}
                        </div>
                        <div class="text-[10px] text-slate-400">
                          {{ getCurrency(g) }}
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
                          {{ fmt(Number(get3WayVarianceAbs(g) || 0)) }} {{ getCurrency(g) }}
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
                            :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3 ? 'text-rose-700' : 'text-slate-900'"
                          >
                            {{ (variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0).toFixed(2) }}%
                          </div>

                          <div
                            class="text-[10px] mt-0.5"
                            :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3 ? 'text-rose-600' : 'text-slate-400'"
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

                    <div class="col-span-1 text-right">
                      <button
                        class="px-3 py-1.5 rounded-xl text-xs font-extrabold border"
                        :class="
                          store.activeGroupId === g.group_id
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                        "
                        @click.stop="store.selectGroup(g.group_id, { openEvidence: false })"
                      >
                        WHY
                      </button>

                      <div class="mt-2">
                        <span
                          class="text-[11px] font-extrabold inline-flex px-2 py-1 rounded-lg border"
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

          <!-- RIGHT -->
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
      </template>
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
  </div>
</template>