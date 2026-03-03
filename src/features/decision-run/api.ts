// src/features/decision-run/api.ts

import { http } from '@/lib/http'
import type {
  CaseGroupsResponse,
  GroupRulesResponse,
  GroupEvidenceResponse,
  DecisionRunViewContext,
  CaseAggregateResponse,
} from './types'

import type { CaseMasterResponse } from '@/features/decision-run/case_master_type'

export const decisionRunApi = {
  /* ===============================
   * Existing (body)
   * =============================== */

  async getCaseGroups(caseId: string): Promise<CaseGroupsResponse> {
    return await http.get<CaseGroupsResponse>(
      `/api/v1/cases/${caseId}/groups`
    )
  },

  async getGroupRules(groupId: string): Promise<GroupRulesResponse> {
    return await http.get<GroupRulesResponse>(
      `/api/v1/groups/${groupId}/rules`
    )
  },

  async getGroupEvidence(groupId: string): Promise<GroupEvidenceResponse> {
    return await http.get<GroupEvidenceResponse>(
      `/api/v1/groups/${groupId}/evidence`
    )
  },

 

async getDocumentPagePdfUrl(documentId: string, page: number): Promise<string> {
  const res: any = await http.get(
    `/api/v1/documents/${documentId}/pages-no/${page}`
  )

  if (!res?.pdf_url) {
    throw new Error('pdf_url not found in response')
  }

  return res.pdf_url
}
,
  /* ===============================
   * Decision Run View (source of truth)
   * =============================== */

  async getDecisionRunView(
    caseId: string
  ): Promise<DecisionRunViewContext> {
    return await http.get<DecisionRunViewContext>(
      `/api/v1/cases/${caseId}/view`
    )
  },

  /* ===============================
   * Header (same endpoint, no merge)
   * =============================== */

 async getCaseAggregate(
    caseId: string
  ): Promise<CaseMasterResponse> {
    return await http.get<CaseMasterResponse>(
      `/api/v1/cases/${caseId}/aggregate`
    )
  },

  /* ===============================
   * Re-run decision
   * =============================== */

  async rerunCase(caseId: string): Promise<void> {
    await http.post(
      `/api/v1/cases/${caseId}/process`
    )
  },
}