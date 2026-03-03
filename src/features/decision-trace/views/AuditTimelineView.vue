<!-- src/features/audit/views/AuditTimelineView.vue -->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditTimelineStore } from '@/features/decision-trace/store'

const route = useRoute()
const store = useAuditTimelineStore()

const caseId = computed(() => String(route.params.caseId || ''))

onMounted(() => {
  if (caseId.value) store.load(caseId.value)
})
watch(caseId, (id) => {
  if (id) store.load(id)
})

function severityDotClass(sev: string) {
  const s = String(sev || '').toUpperCase()
  if (s === 'CRITICAL' || s === 'ERROR') return 'bg-rose-500'
  if (s === 'WARNING' || s === 'WARN') return 'bg-amber-500'
  if (s === 'SUCCESS') return 'bg-emerald-500'
  return 'bg-slate-400'
}

function severityPillClass(sev: string) {
  const s = String(sev || '').toUpperCase()
  if (s === 'CRITICAL' || s === 'ERROR') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  if (s === 'WARNING' || s === 'WARN') return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
  if (s === 'SUCCESS') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
}

function topBarBadgeClass(decision: string | null, risk: string | null) {
  const d = String(decision || '').toUpperCase()
  const r = String(risk || '').toUpperCase()

  // prioritize risk feel
  if (r.includes('CRIT') || d === 'REJECT') return 'bg-rose-500/10 text-rose-200 border border-rose-400/20'
  if (r.includes('HIGH') || r.includes('MED') || d === 'REVIEW' || d === 'ESCALATE')
    return 'bg-amber-500/10 text-amber-200 border border-amber-400/20'
  if (d === 'APPROVE' || r.includes('LOW')) return 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/20'
  return 'bg-white/5 text-slate-200 border border-white/10'
}

function iconFor(uiIcon: string, fallback: string) {
  const v = String(uiIcon || '').trim()
  return v || fallback
}

function shortId(id: string) {
  if (!id) return '-'
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function copy(text: string) {
  if (!text) return
  navigator.clipboard?.writeText(text).catch(() => {})
}
</script>

<template>
  <div class="w-full">
    <!-- Kibana-style top bar -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="px-6 py-5 bg-slate-950 text-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-icons-outlined text-emerald-400">shield</span>
          <div>
            <div class="text-[11px] tracking-wider uppercase text-slate-400">Audit Timeline</div>
            <div class="text-sm font-semibold text-white flex items-center gap-2">
              <span>Case {{ caseId }}</span>
              <button
                class="text-[11px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                @click="copy(caseId)"
                title="Copy case id"
              >
                Copy
              </button>
            </div>
            <div class="text-[11px] text-slate-400">
              
              <span class="text-slate-300">{{ store.raw?.generated_at || '-' }}</span>
              · TZ: <span class="text-slate-300">{{ store.raw?.timezone || 'UTC' }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span
            class="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs"
          >
            <span class="text-slate-400">Events</span>
            <span class="font-semibold text-white">{{ store.summary?.event_count ?? store.kpi.total }}</span>
          </span>

          <span
            class="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs"
          >
            <span class="text-slate-400">Runs</span>
            <span class="font-semibold text-white">{{ store.summary?.run_count ?? store.runs.length }}</span>
          </span>

          <span
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            :class="topBarBadgeClass(store.summary?.latest_run_decision || null, store.summary?.latest_run_risk_level || null)"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Latest:
            <span class="text-white/90">{{ store.summary?.latest_run_decision || '-' }}</span>
            <span class="text-white/60">·</span>
            <span class="text-white/90">{{ store.summary?.latest_run_risk_level || '-' }}</span>
          </span>
        </div>
      </div>

      <!-- Filters row (Kibana-like) -->
      <div class="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div class="lg:col-span-3">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Group by</label>
            <select
              v-model="store.groupBy"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
             <option value="DAY">Day</option>
              <option value="RUN">Run</option>
              <option value="GROUP">Group</option>
              <option value="DOMAIN">Domain</option>
              
            </select>
          </div>

          <div class="lg:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Domain</label>
            <select
              v-model="store.domain"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="d in store.domainOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Run</label>
            <select
              v-model="store.runId"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="r in store.runOptions" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>

          <div class="lg:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Severity</label>
            <select
              v-model="store.severity"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="s in store.severityOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="lg:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Type</label>
            <select
              v-model="store.type"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="t in store.typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div class="lg:col-span-6">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Search</label>
            <div class="relative">
              <span class="material-icons-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                v-model="store.q"
                class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="type, title, actor, run_id, group_id, refs, payload…"
              />
            </div>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Group</label>
            <select
              v-model="store.groupId"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="g in store.groupOptions" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <div class="lg:col-span-3 flex items-center justify-end gap-2">
            <div class="hidden md:flex items-center gap-2">
              <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
                <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                <span class="text-slate-600">Info</span>
                <span class="font-semibold text-slate-900">{{ store.kpi.info }}</span>
              </span>
              <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-slate-600">Success</span>
                <span class="font-semibold text-slate-900">{{ store.kpi.success }}</span>
              </span>
              <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                <span class="text-slate-600">Warning</span>
                <span class="font-semibold text-slate-900">{{ store.kpi.warn }}</span>
              </span>
              <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                <span class="text-slate-600">Error/Critical</span>
                <span class="font-semibold text-slate-900">{{ store.kpi.error + store.kpi.critical }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-6">
        <!-- loading / error -->
        <div v-if="store.loading" class="py-10 text-center text-slate-500">
          <span class="material-icons-outlined animate-spin align-[-2px] mr-2">autorenew</span>
          Loading audit timeline…
        </div>

        <div v-else-if="store.error" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div class="font-semibold flex items-center gap-2">
            <span class="material-icons-outlined">error</span>
            Failed to load audit timeline
          </div>
          <div class="text-sm mt-1">{{ store.error }}</div>
        </div>

        <div v-else>
          <!-- Runs summary (investigator-friendly, control-center) -->
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div class="text-[11px] tracking-wider uppercase text-slate-500">Case level</div>
                <div class="text-sm font-semibold text-slate-900">Run Summary</div>
              </div>
              <div class="text-xs text-slate-500">
                Latest run: <span class="font-semibold text-slate-800">{{ store.summary?.latest_run_id || '-' }}</span>
              </div>
            </div>

            <div class="p-4">
              <div v-if="!store.runs.length" class="text-sm text-slate-500">No runs recorded.</div>

              <div v-else class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="text-[11px] uppercase tracking-wide text-slate-500">
                    <tr class="border-b border-slate-200">
                      <th class="py-2 pr-4 text-left font-semibold">Run</th>
                      <th class="py-2 pr-4 text-left font-semibold">Category</th>
                      <th class="py-2 pr-4 text-left font-semibold">Domain</th>
                      <th class="py-2 pr-4 text-left font-semibold">Policy</th>
                      <th class="py-2 pr-4 text-left font-semibold">Technique</th>
                      <th class="py-2 pr-4 text-left font-semibold">Status</th>
                      <th class="py-2 pr-4 text-left font-semibold">Decision</th>
                      <th class="py-2 pr-4 text-left font-semibold">Risk</th>
                      <th class="py-2 pr-4 text-left font-semibold">Confidence</th>
                      <th class="py-2 pr-4 text-left font-semibold">Started</th>
                      <th class="py-2 text-left font-semibold">Completed</th>
                    </tr>
                  </thead>
                  <tbody class="text-slate-800">
                    <tr v-for="r in store.runs" :key="r.run_id" class="border-b border-slate-100">
                      <td class="py-2 pr-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                            {{ shortId(r.run_id) }}
                          </span>
                          <button
                            class="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
                            @click="copy(r.run_id)"
                            title="Copy run id"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td class="py-2 pr-4 whitespace-nowrap">{{ r.run_category }}</td>
                      <td class="py-2 pr-4 whitespace-nowrap">{{ r.domain }}</td>
                      <td class="py-2 pr-4 whitespace-nowrap text-slate-600">
                        <span v-if="r.policy?.policy_id && r.policy?.policy_version" class="font-medium text-slate-800">
                          {{ r.policy.policy_id }} {{ r.policy.policy_version }}
                        </span>
                        <span v-else>-</span>
                      </td>
                      <td class="py-2 pr-4 whitespace-nowrap">{{ r.technique || '-' }}</td>
                      <td class="py-2 pr-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                          {{ r.status }}
                        </span>
                      </td>
                      <td class="py-2 pr-4 whitespace-nowrap">{{ r.decision || '-' }}</td>
                      <td class="py-2 pr-4 whitespace-nowrap">{{ r.risk_level || '-' }}</td>
                      <td class="py-2 pr-4 whitespace-nowrap">
                        <span v-if="typeof r.confidence === 'number'">{{ Math.round(r.confidence * 100) }}%</span>
                        <span v-else>-</span>
                      </td>
                      <td class="py-2 pr-4 whitespace-nowrap text-slate-600">{{ r.started_at ? store.formatTs(r.started_at) : '-' }}</td>
                      <td class="py-2 whitespace-nowrap text-slate-600">{{ r.completed_at ? store.formatTs(r.completed_at) : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-3 text-[11px] text-slate-500">
                Note: This is the system audit stream (immutable evidence log). Use filters above to isolate domain/run/group and export raw payload as evidence.
              </div>
            </div>
          </div>

          <!-- Event blocks -->
          <div class="mt-6 space-y-4">
            <div
              v-for="b in store.blocks"
              :key="b.key"
              class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-slate-900 truncate">{{ b.title }}</div>
                  <div v-if="b.subtitle" class="text-xs text-slate-500 mt-0.5 truncate">{{ b.subtitle }}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                    {{ b.badge }}
                  </span>
                </div>
              </div>

              <div class="p-4">
                <ol class="relative border-l border-slate-200">
                  <li v-for="e in b.events" :key="e.id" class="ml-6 pb-5 last:pb-0">
                    <span
                      class="absolute -left-[7px] mt-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-white"
                      :class="severityDotClass(String(e.severity))"
                    ></span>

                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                       
                          <span class="text-xs text-slate-500">{{ e.ts ? store.formatTs(e.ts) : '-' }} </span>

                          <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold"
                                :class="severityPillClass(String(e.severity))">
                            {{ String(e.severity).toUpperCase() }}
                          </span>

                          <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                            {{ e.domain }}
                          </span>

                          <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                            {{ e.type }}
                          </span>

                          <span v-if="e.run_id" class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                            run {{ shortId(e.run_id) }}
                          </span>

                          <span v-if="e.group_id" class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                            group {{ shortId(e.group_id) }}
                          </span>

                          <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700">
                            {{ e.actor_display || 'SYSTEM' }}
                          </span>
                        </div>

                        <div class="mt-1 text-sm font-semibold text-slate-900">
                          {{ e.title }}
                        </div>

                        <div v-if="e.message" class="mt-1 text-sm text-slate-700">
                          {{ e.message }}
                        </div>

                        <!-- refs quick evidence -->
                        <div class="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] text-slate-600">
                          <div v-if="e.refs.entity_id" class="flex items-center gap-1">
                            <span class="text-slate-400">entity</span>
                            <span class="font-medium text-slate-800">{{ e.refs.entity_id }}</span>
                          </div>
                          <div v-if="e.refs.po_number" class="flex items-center gap-1">
                            <span class="text-slate-400">po</span>
                            <span class="font-medium text-slate-800">{{ e.refs.po_number }}</span>
                          </div>
                          <div v-if="e.refs.invoice_number" class="flex items-center gap-1">
                            <span class="text-slate-400">invoice</span>
                            <span class="font-medium text-slate-800">{{ e.refs.invoice_number }}</span>
                          </div>
                          <div v-if="e.refs.transaction_id" class="flex items-center gap-1">
                            <span class="text-slate-400">tx</span>
                            <span class="font-medium text-slate-800">{{ shortId(e.refs.transaction_id) }}</span>
                          </div>
                        </div>

                        <!-- tags -->
                        <div v-if="e.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
                          <span
                            v-for="t in e.tags"
                            :key="t"
                            class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200 text-[11px]"
                          >
                            {{ t }}
                          </span>
                        </div>
                      </div>

                      <!-- actions -->
                      <div class="flex items-center gap-2 shrink-0">
                        <button
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-700"
                          @click="store.toggleExpanded(e.id)"
                        >
                          <span class="material-icons-outlined text-[18px]">unfold_more</span>
                          Details
                        </button>

                        <button
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-700"
                          @click="store.toggleRaw(e.id)"
                        >
                          <span class="material-icons-outlined text-[18px]">code</span>
                          Raw
                        </button>
                      </div>
                    </div>

                    <!-- expanded details -->
                    <div v-if="store.isExpanded(e.id)" class="mt-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="material-icons-outlined text-slate-500 text-[18px]">
                            {{ iconFor(e.ui_icon, 'receipt_long') }}
                          </span>
                          <div class="text-xs font-semibold text-slate-700">Event context</div>
                        </div>
                        <div class="text-[11px] text-slate-500">
                          ID: <span class="font-mono text-slate-700">{{ e.id }}</span>
                          <span v-if="e.sequence !== null"> · Seq {{ e.sequence }}</span>
                        </div>
                      </div>

                      <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div class="rounded-xl border border-slate-200 p-3">
                          <div class="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Core</div>
                          <div class="mt-2 space-y-1 text-slate-700">
                            <div><span class="text-slate-500">Timestamp:</span> <span class="font-mono">{{ e.ts }}</span></div>
                            <div><span class="text-slate-500">Category:</span> {{ e.category }}</div>
                            <div><span class="text-slate-500">Actor:</span> {{ e.actor_display }} <span class="text-slate-400">({{ e.actor_type || 'SYSTEM' }})</span></div>
                            <div v-if="e.run_id"><span class="text-slate-500">Run ID:</span> <span class="font-mono">{{ e.run_id }}</span></div>
                            <div v-if="e.group_id"><span class="text-slate-500">Group ID:</span> <span class="font-mono">{{ e.group_id }}</span></div>
                          </div>
                        </div>

                        <div class="rounded-xl border border-slate-200 p-3">
                          <div class="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Refs</div>
                          <div class="mt-2 space-y-1 text-slate-700">
                            <div><span class="text-slate-500">Entity:</span> {{ e.refs.entity_id || '-' }}</div>
                            <div><span class="text-slate-500">PO:</span> {{ e.refs.po_number || '-' }}</div>
                            <div><span class="text-slate-500">Invoice:</span> {{ e.refs.invoice_number || '-' }}</div>
                            <div><span class="text-slate-500">Transaction:</span> <span class="font-mono">{{ e.refs.transaction_id || '-' }}</span></div>
                          </div>
                        </div>
                      </div>

                      <div class="px-4 pb-4">
                        <div class="rounded-xl border border-slate-200 p-3">
                          <div class="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Payload (structured evidence)</div>
                          <div class="mt-2 text-xs text-slate-500">
                            Show key-value context for investigators/auditors. Use Raw for full JSON export.
                          </div>
                          <pre class="mt-3 text-[12px] leading-5 bg-slate-950 text-slate-100 rounded-xl p-3 overflow-auto max-h-[320px]">{{ e.payload ? JSON.stringify(e.payload, null, 2) : '{}' }}</pre>
                        </div>
                      </div>
                    </div>

                    <!-- raw json -->
                    <div v-if="store.isRawShown(e.id)" class="mt-3 rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 overflow-hidden">
                      <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                        <div class="text-xs font-semibold">Raw event JSON</div>
                        <button
                          class="text-[11px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                          @click="copy(JSON.stringify(e, null, 2))"
                        >
                          Copy
                        </button>
                      </div>
                      <pre class="p-4 text-[12px] leading-5 overflow-auto max-h-[420px]">{{ JSON.stringify(e, null, 2) }}</pre>
                    </div>
                  </li>
                </ol>

                <div v-if="!b.events.length" class="text-sm text-slate-500">No events in this block.</div>
              </div>
            </div>

            <div v-if="!store.blocks.length" class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              No events match current filters.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>