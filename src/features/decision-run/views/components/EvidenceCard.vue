<script setup lang="ts">
import { computed } from 'vue'
import type { EvidenceItem, EvidenceDocument } from '@/features/decision-run/types'
import { useDecisionRunStore } from '@/features/decision-run/store'

const props = defineProps<{
  evidence: EvidenceItem
  document?: EvidenceDocument
}>()

const store = useDecisionRunStore()

const ev = computed(() => (props.evidence || {}) as any)
const priceItem = computed(() => ev.value?.price_item || null)

const page = computed(() => {
  const p =
    ev.value?.page_number ??
    priceItem.value?.page_number ??
    ev.value?.source_page ??
    1

  const n = Number(p)
  return Number.isFinite(n) && n > 0 ? n : 1
})

const documentId = computed(() => {
  return (
    ev.value?.document_id ||
    priceItem.value?.document_id ||
    null
  )
})

const documentName = computed(() => {
  return (
    props.document?.file_name ||
    ev.value?.document_name ||
    ev.value?.file_name ||
    documentId.value ||
    'Unknown document'
  )
})

const documentType = computed(() => {
  return (
    props.document?.document_type ||
    ev.value?.document_type ||
    'DOCUMENT'
  )
})

const snippetText = computed(() => {
  const firstPriceItem = Array.isArray(ev.value?.price_items) ? ev.value.price_items[0] : null

  const raw =
    ev.value?.snippet ||
    ev.value?.source_snippet ||
    ev.value?.quote ||
    ev.value?.excerpt ||
    ev.value?.text_snippet ||
    ev.value?.matched_text ||
    ev.value?.metadata?.snippet ||
    ev.value?.metadata?.source_snippet ||
    ev.value?.metadata?.quote ||
    priceItem.value?.snippet ||
    firstPriceItem?.snippet ||
    ''

  return String(raw || '').trim()
})

const itemLabel = computed(() => {
  const sku = String(priceItem.value?.sku || '').trim()
  const name = String(priceItem.value?.item_name || '').trim()

  if (sku && name) return `${sku} · ${name}`
  if (sku) return sku
  if (name) return name
  return ev.value?.title || 'Evidence item'
})

const unitPriceText = computed(() => {
  const unitPrice = priceItem.value?.unit_price
  const currency = priceItem.value?.currency || ''

  if (unitPrice == null) return '—'

  const n = Number(unitPrice)
  if (!Number.isFinite(n)) return '—'

  return `${n.toLocaleString()}${currency ? ` ${currency}` : ''}`
})

const effectivePeriodText = computed(() => {
  const from = priceItem.value?.effective_from
  const to = priceItem.value?.effective_to

  if (from && to) return `${from} → ${to}`
  if (from) return `From ${from}`
  if (to) return `Until ${to}`
  return ''
})

function openPdf() {
  if (!documentId.value) return
  store.openPdf(documentId.value, page.value)
}
</script>

<template>
  <div class="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
    <!-- Document -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-sm font-extrabold text-slate-900 break-words">
          {{ documentName }}
        </div>

        <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
          <span class="font-mono">page {{ page }}</span>
          <span class="text-slate-300">•</span>
          <span>{{ documentType }}</span>
          <template v-if="ev.kind">
            <span class="text-slate-300">•</span>
            <span>{{ ev.kind }}</span>
          </template>
        </div>
      </div>

      <button
        class="shrink-0 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
        :disabled="!documentId"
        @click="openPdf"
      >
        View PDF
      </button>
    </div>

    <!-- Evidence body -->
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm space-y-3">
      <div>
        <div class="font-bold text-slate-700 mb-1">
          Evidence
        </div>

        <div class="font-semibold text-slate-900">
          {{ ev.title || itemLabel }}
        </div>
      </div>

      <div
        v-if="snippetText"
        class="font-mono text-xs text-slate-700 whitespace-pre-wrap break-words rounded-lg bg-white border border-slate-200 p-3"
      >
        {{ snippetText }}
      </div>

      <div
        v-else
        class="text-xs text-amber-700 rounded-lg bg-amber-50 border border-amber-200 p-3"
      >
        No snippet returned from backend for this evidence item.
      </div>

      <div v-if="priceItem" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="px-3 py-2 rounded-lg bg-white border border-slate-200">
          <div class="text-slate-500">Item</div>
          <div class="font-semibold text-slate-900 break-words">
            {{ itemLabel }}
          </div>
        </div>

        <div class="px-3 py-2 rounded-lg bg-white border border-slate-200">
          <div class="text-slate-500">Unit price</div>
          <div class="font-semibold text-slate-900">
            {{ unitPriceText }}
          </div>
        </div>

        <div class="px-3 py-2 rounded-lg bg-white border border-slate-200">
          <div class="text-slate-500">UOM</div>
          <div class="font-semibold text-slate-900">
            {{ priceItem.uom || '—' }}
          </div>
        </div>

        <div class="px-3 py-2 rounded-lg bg-white border border-slate-200">
          <div class="text-slate-500">Effective period</div>
          <div class="font-semibold text-slate-900 break-words">
            {{ effectivePeriodText || '—' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Meta -->
    <div class="flex items-center justify-between text-xs text-slate-500 gap-3">
      <span class="truncate">evidence_id: {{ ev.evidence_id }}</span>
      <span class="font-bold">kind: {{ ev.kind || '—' }}</span>
    </div>
  </div>
</template>