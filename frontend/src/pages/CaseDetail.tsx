import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { casesApi } from '../services/api'
import { useState } from 'react'
// date-fns format is available if needed
// import { format } from 'date-fns'
import clsx from 'clsx'
import {
  ArrowLeft,
  User,
  FileText,
  Shield,
  TestTube,
  Scale,
  MessageSquare,
  History,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'

// Tab Components (simplified for Phase 1)
import OverviewTab from '../components/case/OverviewTab'
import RiskTab from '../components/case/RiskTab'
import TestsTab from '../components/case/TestsTab'
import DecisionTab from '../components/case/DecisionTab'
import CommunicationsTab from '../components/case/CommunicationsTab'
import DocumentsTab from '../components/case/DocumentsTab'
import HistoryTab from '../components/case/HistoryTab'

const tabs = [
  { id: 'overview', name: 'Overview', icon: User },
  { id: 'risk', name: 'Risk Assessment', icon: Shield },
  { id: 'tests', name: 'Tests', icon: TestTube },
  { id: 'decision', name: 'Decision', icon: Scale },
  { id: 'communications', name: 'Communications', icon: MessageSquare },
  { id: 'documents', name: 'Documents', icon: FileText },
  { id: 'history', name: 'History', icon: History },
]

const complexityColors: Record<string, string> = {
  Routine: 'bg-green-100 text-green-800',
  Moderate: 'bg-yellow-100 text-yellow-800',
  Complex: 'bg-red-100 text-red-800',
}

const statusIcons: Record<string, any> = {
  pending_review: Clock,
  in_progress: TrendingUp,
  awaiting_information: AlertTriangle,
  awaiting_decision: AlertTriangle,
  decision_made: CheckCircle,
  completed: CheckCircle,
}

export default function CaseDetail() {
  const { id, tab: urlTab } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(urlTab || 'overview')

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.getById(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading case...</div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="mt-2 text-gray-500">Failed to load case</p>
        <Link to="/cases" className="mt-4 btn-primary">
          Back to Queue
        </Link>
      </div>
    )
  }

  const StatusIcon = statusIcons[caseData.status] || Clock

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    navigate(`/cases/${id}/${tabId}`, { replace: true })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/cases"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Queue
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {caseData.caseReference}
              </h1>
              {caseData.complexityTier && (() => {
                // Normalize tier casing: 'ROUTINE' -> 'Routine'
                const normalizedTier = caseData.complexityTier.charAt(0).toUpperCase() +
                  caseData.complexityTier.slice(1).toLowerCase();
                return (
                  <span
                    className={clsx(
                      'badge',
                      complexityColors[normalizedTier]
                    )}
                  >
                    {normalizedTier}
                    {caseData.complexityConfidence && (
                      <span className="ml-1 opacity-75">
                        ({(caseData.complexityConfidence * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                );
              })()}
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center">
                <StatusIcon className="w-4 h-4 mr-1" />
                {caseData.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </span>
              <span>|</span>
              <span>{caseData.productName}</span>
              <span>|</span>
              <span>₹{Number(caseData.sumAssured).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Applicant Summary */}
          <div className="text-right">
            <p className="font-medium text-gray-900">
              {caseData.applicant?.firstName} {caseData.applicant?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {caseData.applicant?.gender === 'male' ? 'M' : 'F'},{' '}
              {caseData.applicant?.dateOfBirth &&
                Math.floor((Date.now() - new Date(caseData.applicant.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              } years
            </p>
            <p className="text-sm text-gray-500">{caseData.applicant?.occupation}</p>
          </div>
        </div>

        {/* Complexity Factors */}
        {caseData.complexityFactors && caseData.complexityFactors.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Complexity Factors:
            </p>
            <div className="flex flex-wrap gap-2">
              {caseData.complexityFactors.slice(0, 3).map((factor: any, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                >
                  {factor.factor}
                  <span className={clsx(
                    'ml-1',
                    factor.direction === 'increases_complexity' ? 'text-red-600' : 'text-green-600'
                  )}>
                    ({factor.direction === 'increases_complexity' ? '+' : '-'}{(factor.weight * 100).toFixed(0)}%)
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab caseId={id!} caseData={caseData} />}
        {activeTab === 'risk' && <RiskTab caseId={id!} caseData={caseData} />}
        {activeTab === 'tests' && <TestsTab caseId={id!} caseData={caseData} />}
        {activeTab === 'decision' && <DecisionTab caseId={id!} caseData={caseData} />}
        {activeTab === 'communications' && <CommunicationsTab caseId={id!} caseData={caseData} />}
        {activeTab === 'documents' && <DocumentsTab caseId={id!} caseData={caseData} />}
        {activeTab === 'history' && <HistoryTab caseId={id!} />}
      </div>
    </div>
  )
}
