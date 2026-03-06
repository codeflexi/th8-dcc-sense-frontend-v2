<!-- src/features/decision-run/components/DecisionWhyPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import type { GroupRule } from '@/features/decision-run/types'

const store = useDecisionRunStore()

const activeGroup: any = computed(() => store.activeGroup)
const rules = computed<GroupRule[]>(() => store.activeRules || [])

/* ===============================
 * Derived state
 * =============================== */

const failedRules = computed(() =>
  rules.value.filter(r => String(r.result).toUpperCase() === 'FAIL')
)

const passedRules = computed(() =>
  rules.value.filter(r => String(r.result).toUpperCase() === 'PASS')
)

const activeDecision = computed(() =>
  String(activeGroup.value?.decision || '—').toUpperCase()
)

const activeRisk = computed(() =>
  String(activeGroup.value?.risk_level || '—').toUpperCase()
)

const activeConfidence = computed(() => {
  const c = Number(activeGroup.value?.confidence)
  return Number.isFinite(c) ? Math.round(c * 100) : null
})

const hasBlockingIssues = computed(() => {
  return ['REVIEW', 'FAIL', 'REJECT'].includes(activeDecision.value)
})

/* ===============================
 * Enterprise helpers
 * =============================== */

function severityColor(sev?: string) {
  const s = String(sev || '').toUpperCase()
  if (s === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (s === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (s === 'MEDIUM') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function ruleCardClass(result?: string) {
  const x = String(result || '').toUpperCase()
  if (x === 'FAIL') return 'border-rose-200 bg-rose-50/40'
  if (x === 'PASS') return 'border-emerald-200 bg-emerald-50/40'
  return 'border-slate-200 bg-white'
}

function decisionBadge(decision?: string) {
  const x = String(decision || '').toUpperCase()
  if (x === 'REJECT' || x === 'FAIL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'REVIEW') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function riskBadge(level?: string) {
  const x = String(level || '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (x === 'MEDIUM' || x === 'MED') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function formatValue(v: any) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v === null || v === undefined) return '-'
  if (typeof v === 'number') return v.toLocaleString()
  return String(v)
}

/* ===============================
 * PASS wording fix (UI-layer)
 * =============================== */

const PASS_LABEL_BY_RULE_ID: Record<string, string> = {
  'A-QTY-01': 'ยอดรับของไม่เกินยอด PO',
  'A-QTY-02': 'ยอดใบแจ้งหนี้ไม่เกินยอดรับของ (GRN)',
  'A-PROCESS-01': 'มี GRN รองรับใบแจ้งหนี้',
  'A-FRAUD-01': 'ไม่พบใบแจ้งหนี้ซ้ำ',
  'P-PRICE-01': 'ราคาอยู่ในเกณฑ์นโยบาย',
  'P-DOC-01': 'เอกสารจัดซื้อครบ',
}

function shortText(s: any, max = 140) {
  const x = String(s || '').trim()
  if (!x) return ''
  return x.length > max ? x.slice(0, max - 1) + '…' : x
}

function displayRuleMessage(r: any) {
  const result = String(r?.result || '').toUpperCase()
  const ruleId = String(r?.rule_id || '').trim()

  if (result === 'FAIL') {
    return shortText(
      r?.exec_message ||
      r?.explanation ||
      r?.audit_message ||
      'Issue detected'
    )
  }

  const mapped = PASS_LABEL_BY_RULE_ID[ruleId]
  if (mapped) return mapped

  return shortText(r?.audit_message || r?.explanation || 'OK')
}

/* ==========================================================
   Item header
========================================================== */

const itemHeader = computed(() => {
  const g: any = activeGroup.value
  if (!g) return null

  const sku = g?.sku?.sku || '-'
  const name = g?.sku?.item_name || 'Unknown item'
  const uom = g?.sku?.uom || ''

  const is3Way = String(g?.raw_trace?.price?.context || '') === '3WAY_MATCH'
  const q = g?.raw_trace?.quantity || {}
  const qtyText = is3Way
    ? `PO ${q?.po ?? '-'} • GR ${q?.gr ?? '-'} • INV ${q?.inv ?? '-'}`
    : `Qty ${g?.sku?.quantity ?? 0} ${uom}`

  const total = g?.sku?.total_price?.value || 0
  const cur = g?.sku?.total_price?.currency || 'THB'

  return {
    sku,
    name,
    qtyText,
    total,
    cur,
  }
})
</script>

<template>
  <div class="w-full">
    <div v-if="!activeGroup" class="text-sm text-slate-500">
      Select an item to view reasoning.
    </div>

    <template v-else>
      <!-- ITEM HEADER -->
      <div
        v-if="itemHeader"
        class="mb-4 p-4 rounded-xl border bg-slate-50 border-slate-200"
      >
        <div class="text-xs text-slate-500 mb-1">ITEM</div>

        <div class="font-semibold text-slate-900">
          {{ itemHeader.name }}
        </div>

        <div class="text-sm text-slate-600 mt-1">
          SKU: {{ itemHeader.sku }}
          • {{ itemHeader.qtyText }}
          • Total {{ Number(itemHeader.total).toLocaleString() }} {{ itemHeader.cur }}
        </div>
      </div>

      <!-- SUMMARY -->
      <div
        class="rounded-xl border p-4 mb-4"
        :class="hasBlockingIssues ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
              :class="hasBlockingIssues ? 'bg-rose-600' : 'bg-emerald-600'"
            >
              <span v-if="hasBlockingIssues">!</span>
              <span v-else>✓</span>
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="font-extrabold text-slate-900">
                  {{ activeDecision }}
                </div>

                <span
                  class="px-2 py-1 rounded-full border text-[11px] font-extrabold"
                  :class="decisionBadge(activeDecision)"
                >
                  {{ activeDecision }}
                </span>

                <span
                  class="px-2 py-1 rounded-full border text-[11px] font-extrabold"
                  :class="riskBadge(activeRisk)"
                >
                  {{ activeRisk }}
                </span>
              </div>

              <div class="text-sm text-slate-600 mt-1">
                <template v-if="hasBlockingIssues">
                  This item requires review before approval due to financial or control exceptions.
                </template>
                <template v-else>
                  This item passed the current control checks from the selected decision run.
                </template>
              </div>

              <div v-if="activeConfidence !== null" class="text-xs text-slate-500 mt-2">
                Confidence {{ activeConfidence }}%
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-xs text-slate-500">Failed rules</div>
            <div class="font-semibold text-slate-900 text-lg">
              {{ failedRules.length }}
            </div>
          </div>
        </div>
      </div>

      <!-- BLOCKING -->
      <div v-if="failedRules.length">
        <div class="text-xs font-semibold text-rose-600 mb-2">
          Blocking issues (must resolve)
        </div>

        <div class="space-y-3">
          <div
            v-for="r in failedRules"
            :key="r.rule_id"
            class="rounded-xl border p-4"
            :class="ruleCardClass(r.result)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <div class="font-semibold text-slate-900">
                    {{ r.rule_id }}
                  </div>

                  <div
                    class="text-[11px] px-2 py-[2px] rounded border"
                    :class="severityColor(r.severity)"
                  >
                    {{ r.severity }}
                  </div>
                </div>

                <div class="text-[14px] text-slate-700 leading-relaxed">
                  {{ displayRuleMessage(r) }}
                </div>

                <div
                  v-if="String(r.result).toUpperCase() === 'FAIL' && r.calculation"
                  class="mt-3 flex flex-wrap gap-2 text-xs"
                >
                  <div class="px-2 py-1 rounded bg-white border text-slate-600">
                    Actual:
                    <span class="font-semibold">{{ formatValue(r.calculation.actual) }}</span>
                  </div>
                  <div class="px-2 py-1 rounded bg-white border text-slate-600">
                    Expected:
                    <span class="font-semibold">{{ formatValue(r.calculation.expected) }}</span>
                  </div>
                  <div class="px-2 py-1 rounded bg-white border text-slate-600">
                    Rule:
                    <span class="font-semibold">
                      {{ r.calculation.actual }} {{ r.calculation.operator }} {{ r.calculation.expected }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="text-rose-600 font-black">!</div>
            </div>
          </div>
        </div>
      </div>

      <!-- PASSED -->
      <div v-if="passedRules.length" class="mt-6">
        <div class="text-xs font-semibold text-emerald-700 mb-2">
          Passed checks
        </div>

        <div class="space-y-3">
          <div
            v-for="r in passedRules"
            :key="r.rule_id"
            class="rounded-xl border p-4"
            :class="ruleCardClass(r.result)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <div class="font-semibold text-slate-900">
                    {{ r.rule_id }}
                  </div>

                  <div
                    class="text-[11px] px-2 py-[2px] rounded border"
                    :class="severityColor(r.severity)"
                  >
                    {{ r.severity }}
                  </div>
                </div>

                <div class="text-[14px] text-slate-700 leading-relaxed">
                  {{ displayRuleMessage(r) }}
                </div>
              </div>

              <div class="text-emerald-700 font-black">OK</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!failedRules.length && !passedRules.length" class="text-sm text-slate-500">
        No rule traces available for this item.
      </div>
    </template>
  </div>
</template>