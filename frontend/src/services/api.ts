import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Cases API
export const casesApi = {
  getAll: async (params?: Record<string, any>) => {
    const response = await api.get('/cases', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/cases/${id}`)
    return response.data
  },

  getDashboard: async (userId?: string) => {
    const response = await api.get('/cases/dashboard', { params: { userId } })
    return response.data
  },

  assign: async (id: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${id}/assign`, { userId, userName })
    return response.data
  },

  updateStatus: async (id: string, status: string, userId: string, reason?: string) => {
    const response = await api.patch(`/cases/${id}/status`, { status, userId, reason })
    return response.data
  },

  addNote: async (id: string, content: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${id}/notes`, { content, userId, userName })
    return response.data
  },

  getHistory: async (id: string) => {
    const response = await api.get(`/cases/${id}/history`)
    return response.data
  },
}

// Risk API
export const riskApi = {
  getRiskAssessment: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/risk`)
    return response.data
  },

  assessRisk: async (caseId: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/risk/assess`, { userId, userName })
    return response.data
  },

  overrideComplexity: async (caseId: string, newTier: string, reason: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/risk/complexity/override`, {
      newTier,
      reason,
      userId,
      userName,
    })
    return response.data
  },

  getCoverageGaps: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/risk/coverage-gaps`)
    return response.data
  },
}

// Tests API
export const testsApi = {
  getTests: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/tests`)
    return response.data
  },

  generateRecommendations: async (caseId: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/tests/recommend`, { userId, userName })
    return response.data
  },

  orderTests: async (caseId: string, testIds: string[], userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/tests/order`, { testIds, userId, userName })
    return response.data
  },

  addTest: async (caseId: string, testCode: string, testName: string, reason: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/tests/add`, {
      testCode,
      testName,
      reason,
      userId,
      userName,
    })
    return response.data
  },

  removeTest: async (
    caseId: string,
    testId: string,
    data: {
      reason: string;
      reasoningTags?: string[];
      userId: string;
      userName: string;
      userRole?: string;
      impactAdvisoryDisplayed?: boolean;
      impactLevel?: string;
      affectedRiskAreaCount?: number;
      soleEvidenceCount?: number;
    },
  ) => {
    const response = await api.delete(`/cases/${caseId}/tests/${testId}`, {
      data,
    })
    return response.data
  },

  getRemovalImpact: async (caseId: string, testId: string, userId?: string, userName?: string) => {
    const response = await api.get(`/cases/${caseId}/tests/${testId}/removal-impact`, {
      params: { userId, userName },
    })
    return response.data
  },
}

// Decisions API
export const decisionsApi = {
  getOptions: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/decisions/options`)
    return response.data
  },

  getDecisions: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/decisions`)
    return response.data
  },

  makeDecision: async (caseId: string, data: any) => {
    const response = await api.post(`/cases/${caseId}/decisions`, data)
    return response.data
  },

  reviewDecision: async (caseId: string, decisionId: string, approved: boolean, notes: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/decisions/${decisionId}/review`, {
      approved,
      notes,
      userId,
      userName,
    })
    return response.data
  },

  getProductGuidance: async (caseId: string, userId?: string, userName?: string) => {
    const response = await api.get(`/cases/${caseId}/decisions/guidance`, {
      params: { userId, userName },
    })
    return response.data
  },
}

// Communications API
export const communicationsApi = {
  getCommunications: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/communications`)
    return response.data
  },

  generateCommunication: async (caseId: string, communicationType: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/communications/generate`, {
      communicationType,
      userId,
      userName,
    })
    return response.data
  },

  editCommunication: async (caseId: string, commId: string, sectionId: string, newContent: string, userId: string, userName: string) => {
    const response = await api.patch(`/cases/${caseId}/communications/${commId}`, {
      sectionId,
      newContent,
      userId,
      userName,
    })
    return response.data
  },

  approveCommunication: async (caseId: string, commId: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/communications/${commId}/approve`, {
      userId,
      userName,
    })
    return response.data
  },
}

// Overrides API
export const overridesApi = {
  getOverridesForCase: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/overrides`)
    return response.data
  },

  createOverride: async (caseId: string, data: {
    overrideType: string;
    direction: string;
    systemRecommendation: string;
    systemRecommendationDetails?: Record<string, unknown>;
    systemConfidence?: number;
    underwriterChoice: string;
    underwriterChoiceDetails?: Record<string, unknown>;
    reasoning: string;
    reasoningTags?: string[];
    underwriterId: string;
    underwriterName: string;
    underwriterRole: string;
    underwriterExperienceYears: number;
  }) => {
    const response = await api.post(`/cases/${caseId}/overrides`, data)
    return response.data
  },

  getSimilarCases: async (caseId: string, limit?: number) => {
    const response = await api.get(`/cases/${caseId}/similar`, { params: { limit } })
    return response.data
  },

  getLearningInsights: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/learning-insights`)
    return response.data
  },

  getOverrideStats: async (days?: number) => {
    const response = await api.get('/overrides/stats', { params: { days } })
    return response.data
  },

  getOverridePatterns: async (type?: string) => {
    const response = await api.get('/overrides/patterns', { params: { type } })
    return response.data
  },

  getPendingValidation: async () => {
    const response = await api.get('/overrides/pending-validation')
    return response.data
  },

  validateOverride: async (overrideId: string, validated: boolean, validatedBy: string, notes?: string) => {
    const response = await api.post(`/overrides/${overrideId}/validate`, {
      validated,
      validatedBy,
      notes,
    })
    return response.data
  },

  flagForReview: async (overrideId: string, reason: string) => {
    const response = await api.post(`/overrides/${overrideId}/flag`, { reason })
    return response.data
  },
}

// Documents API
export const documentsApi = {
  getDocuments: async (caseId: string) => {
    const response = await api.get(`/cases/${caseId}/documents`)
    return response.data
  },

  getDocument: async (caseId: string, docId: string) => {
    const response = await api.get(`/cases/${caseId}/documents/${docId}`)
    return response.data
  },

  uploadDocument: async (caseId: string, file: File, documentType: string, userId: string, userName: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    formData.append('userId', userId)
    formData.append('userName', userName)

    const response = await api.post(`/cases/${caseId}/documents/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  processDocument: async (caseId: string, docId: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/documents/${docId}/process`, {
      userId,
      userName,
    })
    return response.data
  },

  extractDocument: async (caseId: string, docId: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/documents/${docId}/extract`, {
      userId,
      userName,
    })
    return response.data
  },

  verifyExtraction: async (
    caseId: string,
    docId: string,
    field: string,
    index: number,
    verified: boolean,
    correctedValue: any,
    userId: string,
    userName: string
  ) => {
    const response = await api.post(`/cases/${caseId}/documents/${docId}/verify`, {
      field,
      index,
      verified,
      correctedValue,
      userId,
      userName,
    })
    return response.data
  },

  syncToDisclosures: async (caseId: string, docId: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/documents/${docId}/sync-to-disclosures`, {
      userId,
      userName,
    })
    return response.data
  },

  setManualText: async (caseId: string, docId: string, text: string, userId: string, userName: string) => {
    const response = await api.post(`/cases/${caseId}/documents/${docId}/manual-text`, {
      text,
      userId,
      userName,
    })
    return response.data
  },
}

// Rules Admin API
export const rulesApi = {
  // Risk Rules
  getRiskRules: async () => {
    const response = await api.get('/rules/risk')
    return response.data
  },

  getRiskRule: async (id: string) => {
    const response = await api.get(`/rules/risk/${id}`)
    return response.data
  },

  createRiskRule: async (rule: any, modifiedBy?: string) => {
    const response = await api.post('/rules/risk', rule, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  updateRiskRule: async (id: string, updates: any, modifiedBy?: string) => {
    const response = await api.put(`/rules/risk/${id}`, updates, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  deleteRiskRule: async (id: string, modifiedBy?: string) => {
    const response = await api.delete(`/rules/risk/${id}`, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  toggleRiskRule: async (id: string, modifiedBy?: string) => {
    const response = await api.post(`/rules/risk/${id}/toggle`, {}, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  // Test Protocols
  getTestProtocols: async () => {
    const response = await api.get('/rules/test-protocols')
    return response.data
  },

  getTestProtocol: async (id: string) => {
    const response = await api.get(`/rules/test-protocols/${id}`)
    return response.data
  },

  createTestProtocol: async (protocol: any, modifiedBy?: string) => {
    const response = await api.post('/rules/test-protocols', protocol, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  updateTestProtocol: async (id: string, updates: any, modifiedBy?: string) => {
    const response = await api.put(`/rules/test-protocols/${id}`, updates, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  deleteTestProtocol: async (id: string, modifiedBy?: string) => {
    const response = await api.delete(`/rules/test-protocols/${id}`, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  toggleTestProtocol: async (id: string, modifiedBy?: string) => {
    const response = await api.post(`/rules/test-protocols/${id}/toggle`, {}, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  // Decision Rules
  getDecisionRules: async () => {
    const response = await api.get('/rules/decision')
    return response.data
  },

  getDecisionRule: async (id: string) => {
    const response = await api.get(`/rules/decision/${id}`)
    return response.data
  },

  createDecisionRule: async (rule: any, modifiedBy?: string) => {
    const response = await api.post('/rules/decision', rule, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  updateDecisionRule: async (id: string, updates: any, modifiedBy?: string) => {
    const response = await api.put(`/rules/decision/${id}`, updates, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  deleteDecisionRule: async (id: string, modifiedBy?: string) => {
    const response = await api.delete(`/rules/decision/${id}`, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  toggleDecisionRule: async (id: string, modifiedBy?: string) => {
    const response = await api.post(`/rules/decision/${id}/toggle`, {}, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  // Validation
  validateRule: async (type: string, rule: any) => {
    const response = await api.post('/rules/validate', { type, rule })
    return response.data
  },

  // Version History
  getVersionHistory: async (type: string) => {
    const response = await api.get(`/rules/${type}/history`)
    return response.data
  },

  rollbackToVersion: async (type: string, version: string, modifiedBy?: string) => {
    const response = await api.post(`/rules/${type}/rollback/${version}`, {}, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  // Reorder
  reorderRules: async (type: string, orderedIds: string[], modifiedBy?: string) => {
    const response = await api.post(`/rules/${type}/reorder`, { orderedIds }, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  // Export/Import
  exportRules: async (type: string) => {
    const response = await api.get(`/rules/${type}/export`)
    return response.data
  },

  importRules: async (type: string, jsonContent: string, modifiedBy?: string) => {
    const response = await api.post(`/rules/${type}/import`, { jsonContent }, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  // Product Modification Guidelines
  getProductGuidelines: async () => {
    const response = await api.get('/rules/product-guidelines')
    return response.data
  },

  updateProductGuidelines: async (guidelines: any, modifiedBy?: string) => {
    const response = await api.put('/rules/product-guidelines', guidelines, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  addProduct: async (productCode: string, productName: string, conditions?: any, modifiedBy?: string) => {
    const response = await api.post('/rules/product-guidelines/product', {
      productCode,
      productName,
      conditions,
    }, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  updateProduct: async (productCode: string, data: { productName?: string; conditions?: any }, modifiedBy?: string) => {
    const response = await api.put(`/rules/product-guidelines/product/${productCode}`, data, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  deleteProduct: async (productCode: string, modifiedBy?: string) => {
    const response = await api.delete(`/rules/product-guidelines/product/${productCode}`, {
      headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {},
    })
    return response.data
  },

  updateProductCondition: async (
    productCode: string,
    conditionKey: string,
    severityGuidance: any,
    modifiedBy?: string,
  ) => {
    const response = await api.put(
      `/rules/product-guidelines/product/${productCode}/condition/${conditionKey}`,
      severityGuidance,
      { headers: modifiedBy ? { 'x-modified-by': modifiedBy } : {} },
    )
    return response.data
  },
}

export default api
