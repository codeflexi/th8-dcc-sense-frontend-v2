<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getCaseDetail , getCaseDecisionSummary } from '@/features/cases/api'
import type { CaseDetailHeader } from '@/features/cases/types'
import { useCaseDetailStore } from '@/features/cases/store'
import { storeToRefs } from 'pinia'
import { useCaseStore } from '@/features/decision-run/case_master_store'



const caseStore = useCaseStore()

const { headerVM, loadingAggregate } = storeToRefs(caseStore)

const store = useCaseDetailStore()
const route = useRoute()
const router = useRouter()

const caseHD = ref<CaseDetailHeader | null>(null)
const caseSummary = ref<any>(null)
const loading = ref(false)

const caseId = computed(() => route.params.caseId as string)

let currentRequestId = 0

async function loadCase(id: string) {
  if (!id) return
  const requestId = ++currentRequestId
  loading.value = true
  try {
    const res = await getCaseDetail(id)
    if (requestId !== currentRequestId) return
    caseHD.value = res
  } catch (e) {
    console.error('load case header error', e)
  } finally {
    if (requestId === currentRequestId) loading.value = false
  }
}

async function loadCaseSummary(id: string) {
  if (!id) return
  const requestId = ++currentRequestId
  loading.value = true
  try {
    const res = await getCaseDecisionSummary(id)
    if (requestId !== currentRequestId) return
    caseSummary.value = res
  } catch (e) {
    console.error('load case summary error', e)
  } finally {
    if (requestId === currentRequestId) loading.value = false
  }
}


watch(caseId, async (id) => {
  caseStore.loadCaseAggregate(id),
  await loadCase(id)
  await loadCaseSummary(id)
}, { immediate: true })

const goBack = () => router.push('/cases')
</script>

<template>
<div class="w-full h-full">
<div class="flex flex-col h-full w-full">

<!-- ================= HEADER ================= -->
<div class="px-8 pt-6 pb-4 border-b bg-white shrink-0">

<button
@click="goBack"
class="text-sm text-slate-500 hover:text-slate-900 mb-3"
>
← Back to Case Portfolio
</button>

<div class="flex justify-between items-center">

<!-- LEFT -->
<div>
<div class="text-xs text-slate-400">Case</div>
<div class="text-lg font-bold">
{{ headerVM?.case_id || caseId }}  
{{ headerVM?.reference_id ? '· ' + headerVM?.reference_id: '' }}
</div>

<div class="text-sm text-slate-500">

{{ headerVM?.domain ? '· ' + headerVM?.reference_id : '' }} 
· {{ headerVM?.domain || '-' }}
{{ caseStore.aggregate?.case.created_at ? '· ' + new Date(caseStore.aggregate?.case.created_at ).toLocaleDateString() : '' }}
</div>
</div>

{{ }}

<!-- RIGHT -->
<div class="text-right">
<div class="text-xs text-slate-400">Total Amount</div>
<div class="text-xl font-mono font-bold">
{{ headerVM?.total_amount?.toLocaleString() || 0 }}
{{ caseHD?.currency || 'THB' }}
</div>
</div>

</div>

<!-- ================= ENTERPRISE TABS ================= -->
<div class="mt-6 flex items-center gap-2 border-b pb-2">

<!-- Decision Run -->
<RouterLink :to="`/cases/${caseId}`" v-slot="{ isExactActive }">
<div :class="[
'tab-pro',
isExactActive ? 'tab-active' : 'tab-idle'
]">
<!-- icon -->
<svg class="tab-icon" viewBox="0 0 24 24">
<path d="M4 19V5m8 14V9m8 10V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
Decision Run
</div>
</RouterLink>

<!-- ⭐ Decision Trace (NEW) -->
<RouterLink :to="`/cases/${caseId}/trace`" v-slot="{ isExactActive }">
<div :class="[
'tab-pro',
isExactActive ? 'tab-active' : 'tab-idle'
]">
<svg class="tab-icon" viewBox="0 0 24 24">
<path d="M4 12h4l2-6 4 12 2-6h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
Decision Trace
</div>
</RouterLink>

<!-- Evidence -->
<RouterLink :to="`/cases/${caseId}/evidence`" v-slot="{ isExactActive }">
<div :class="[
'tab-pro',
isExactActive ? 'tab-active' : 'tab-idle'
]">
<svg class="tab-icon" viewBox="0 0 24 24">
<path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" stroke-width="2"/>
</svg>
Copilot
</div>
</RouterLink>

<!-- Audit Trail -->
<RouterLink :to="`/cases/${caseId}/audit`" v-slot="{ isExactActive }">
<div :class="[
'tab-pro',
isExactActive ? 'tab-active' : 'tab-idle'
]">
<svg class="tab-icon" viewBox="0 0 24 24">
<path d="M12 8v4l3 3M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
Audit Trail
</div>
</RouterLink>

</div>
</div>

<!-- ================= CONTENT ================= -->
<div class="flex-1 overflow-y-auto bg-slate-50">
<div class="w-[92%] max-w-[1600px] mx-auto py-6">
<RouterView />
</div>
</div>

</div>
</div>
</template>

<style scoped>
.tab-pro{
display:flex;
align-items:center;
gap:8px;
padding:10px 18px;
border-radius:10px;
font-size:14px;
font-weight:600;
transition:.2s;
}

.tab-idle{
color:#64748b;
background:transparent;
}
.tab-idle:hover{
background:#f1f5f9;
color:#0f172a;
}

.tab-active{
background:#0f172a;
color:white;
box-shadow:0 2px 8px rgba(0,0,0,0.08);
}

.tab-icon{
width:16px;
height:16px;
}
</style>