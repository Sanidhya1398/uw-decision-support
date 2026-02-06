import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testsApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import clsx from 'clsx'
import {
  TestTube,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  X,
} from 'lucide-react'
import OverrideImpactPreviewModal, { RemovalImpactData } from '../common/OverrideImpactPreviewModal'
import OverrideReasoningModal from '../common/OverrideReasoningModal'

interface TestsTabProps {
  caseId: string
  caseData: any
}

const requirementBadgeClasses: Record<string, string> = {
  mandatory: 'badge-mandatory',
  conditional: 'badge-conditional',
  suggested: 'badge-suggested',
  additional: 'badge-additional',
}

const yieldColors: Record<string, string> = {
  High: 'text-green-600',
  Moderate: 'text-yellow-600',
  Low: 'text-gray-500',
}

export default function TestsTab({ caseId, caseData }: TestsTabProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTest, setNewTest] = useState({ testCode: '', testName: '', reason: '' })
  const [testToRemove, setTestToRemove] = useState<any>(null)
  const [showImpactPreview, setShowImpactPreview] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [impactData, setImpactData] = useState<RemovalImpactData | null>(null)

  const { data: testsData, isLoading } = useQuery({
    queryKey: ['tests', caseId],
    queryFn: () => testsApi.getTests(caseId),
  })

  const generateMutation = useMutation({
    mutationFn: () => testsApi.generateRecommendations(caseId, user!.id, user!.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', caseId] })
    },
  })

  const addTestMutation = useMutation({
    mutationFn: () => testsApi.addTest(
      caseId,
      newTest.testCode,
      newTest.testName,
      newTest.reason,
      user!.id,
      user!.name
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', caseId] })
      setShowAddModal(false)
      setNewTest({ testCode: '', testName: '', reason: '' })
    },
  })

  const impactQuery = useQuery({
    queryKey: ['removal-impact', caseId, testToRemove?.id],
    queryFn: () => testsApi.getRemovalImpact(caseId, testToRemove!.id, user!.id, user!.name),
    enabled: !!testToRemove && showImpactPreview,
  })

  const removeMutation = useMutation({
    mutationFn: (data: {
      reason: string;
      reasoningTags: string[];
      impactAdvisoryDisplayed: boolean;
      impactLevel?: string;
      affectedRiskAreaCount?: number;
      soleEvidenceCount?: number;
    }) => testsApi.removeTest(caseId, testToRemove!.id, {
      reason: data.reason,
      reasoningTags: data.reasoningTags,
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      impactAdvisoryDisplayed: data.impactAdvisoryDisplayed,
      impactLevel: data.impactLevel,
      affectedRiskAreaCount: data.affectedRiskAreaCount,
      soleEvidenceCount: data.soleEvidenceCount,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', caseId] })
      setTestToRemove(null)
      setShowRemoveModal(false)
      setImpactData(null)
    },
  })

  const handleRemoveClick = (test: any) => {
    setTestToRemove(test)
    setShowImpactPreview(true)
  }

  const handleImpactProceed = () => {
    setImpactData(impactQuery.data || null)
    setShowImpactPreview(false)
    setShowRemoveModal(true)
  }

  const handleImpactClose = () => {
    setTestToRemove(null)
    setShowImpactPreview(false)
    setImpactData(null)
  }

  const handleRemoveSubmit = async (data: {
    underwriterChoice: string;
    reasoning: string;
    reasoningTags: string[];
  }) => {
    await removeMutation.mutateAsync({
      reason: data.reasoning,
      reasoningTags: data.reasoningTags,
      impactAdvisoryDisplayed: true,
      impactLevel: impactData?.impactLevel,
      affectedRiskAreaCount: impactData?.summary.totalAffectedAreas,
      soleEvidenceCount: impactData?.summary.soleEvidenceCount,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tests...</div>
      </div>
    )
  }

  const recommendations = testsData?.recommendations || []
  const results = testsData?.results || caseData.testResults || []
  const summary = testsData?.summary || {}

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Recommended', value: summary.totalRecommended || recommendations.length },
          { label: 'Mandatory', value: summary.mandatory || 0 },
          { label: 'Conditional', value: summary.conditional || 0 },
          { label: 'Ordered', value: summary.ordered || 0 },
          { label: 'Results', value: summary.resultsReceived || results.length },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Test Recommendations */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Test Recommendations
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-secondary text-sm"
            >
              <RefreshCw className={clsx('w-4 h-4 mr-1', generateMutation.isPending && 'animate-spin')} />
              Generate
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Test
            </button>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <TestTube className="w-12 h-12 mx-auto text-gray-300" />
            <p className="mt-2 text-gray-500">No test recommendations yet</p>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="mt-4 btn-primary"
            >
              Generate Recommendations
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((test: any) => (
              <div
                key={test.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{test.testName}</span>
                      <span className={clsx(
                          requirementBadgeClasses[test.requirementType?.toLowerCase()] || 'badge bg-gray-100 text-gray-800'
                        )}>
                        {test.requirementType}
                      </span>
                      {test.status === 'ordered' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{test.clinicalRationale}</p>

                    {/* ML Yield Prediction */}
                    {test.predictedYield !== undefined && (
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          {test.yieldCategory === 'High' ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : test.yieldCategory === 'Low' ? (
                            <TrendingDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className={yieldColors[test.yieldCategory]}>
                            {test.yieldCategory} Yield ({(test.predictedYield * 100).toFixed(0)}%)
                          </span>
                        </div>
                        {test.yieldFactors && test.yieldFactors.length > 0 && (
                          <span className="text-gray-400">
                            Factors: {test.yieldFactors.map((f: any) => f.factor).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {test.requirementType !== 'mandatory' && test.status === 'recommended' && (
                      <button
                        onClick={() => handleRemoveClick(test)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Remove test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Test Results
        </h3>

        {results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No test results available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result: any) => (
                  <tr key={result.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {result.testName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={clsx(
                        'font-medium',
                        result.abnormalFlag !== 'normal' ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {result.resultValue} {result.resultUnit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {result.referenceRangeText}
                    </td>
                    <td className="px-4 py-3">
                      {result.abnormalFlag === 'normal' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {result.testDate && new Date(result.testDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Test Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Test Recommendation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Code
                </label>
                <input
                  type="text"
                  value={newTest.testCode}
                  onChange={(e) => setNewTest({ ...newTest, testCode: e.target.value })}
                  placeholder="e.g., HBA1C, LIPID, ECG"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name
                </label>
                <input
                  type="text"
                  value={newTest.testName}
                  onChange={(e) => setNewTest({ ...newTest, testName: e.target.value })}
                  placeholder="e.g., Glycated Hemoglobin Test"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical Rationale
                </label>
                <textarea
                  value={newTest.reason}
                  onChange={(e) => setNewTest({ ...newTest, reason: e.target.value })}
                  placeholder="Reason for adding this test..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => addTestMutation.mutate()}
                disabled={!newTest.testCode || !newTest.testName || addTestMutation.isPending}
                className="btn-primary"
              >
                {addTestMutation.isPending ? 'Adding...' : 'Add Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impact Preview Modal */}
      <OverrideImpactPreviewModal
        isOpen={showImpactPreview && !!testToRemove}
        onClose={handleImpactClose}
        onProceed={handleImpactProceed}
        impactData={impactQuery.data || null}
        isLoading={impactQuery.isLoading && showImpactPreview}
        isError={impactQuery.isError}
        onRetry={() => impactQuery.refetch()}
      />

      {/* Override Reasoning Modal (shown after impact preview) */}
      {showRemoveModal && testToRemove && (
        <OverrideReasoningModal
          isOpen={showRemoveModal}
          onClose={() => {
            setShowRemoveModal(false)
            setTestToRemove(null)
            setImpactData(null)
          }}
          overrideType="test_recommendation"
          systemRecommendation={testToRemove.testName}
          systemRecommendationDetails={{
            testCode: testToRemove.testCode,
            requirementType: testToRemove.requirementType,
            predictedYield: testToRemove.predictedYield,
            clinicalRationale: testToRemove.clinicalRationale,
            impactLevel: impactData?.impactLevel || 'unknown',
            affectedAreas: impactData?.summary?.totalAffectedAreas || 0,
          }}
          systemConfidence={testToRemove.predictedYield}
          options={[{ value: 'remove', label: 'Remove Test' }]}
          currentValue=""
          onSubmit={handleRemoveSubmit}
          title="Remove Test Recommendation"
          description={`Provide your reasoning for removing ${testToRemove.testName} from the test panel.`}
        />
      )}
    </div>
  )
}
