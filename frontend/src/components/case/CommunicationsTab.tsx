import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationsApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import clsx from 'clsx'
import {
  MessageSquare,
  Plus,
  Edit,
  CheckCircle,
  Send,
  Lock,
} from 'lucide-react'

interface CommunicationsTabProps {
  caseId: string
  caseData: any
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  sent: 'bg-blue-100 text-blue-800',
}

const typeLabels: Record<string, string> = {
  standard_acceptance: 'Standard Acceptance',
  modified_acceptance: 'Modified Acceptance',
  requirements_letter: 'Requirements Letter',
  decline_notice: 'Decline Notice',
  postponement_notice: 'Postponement Notice',
}

export default function CommunicationsTab({ caseId }: CommunicationsTabProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedComm, setSelectedComm] = useState<any>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  const { data: communications, isLoading } = useQuery({
    queryKey: ['communications', caseId],
    queryFn: () => communicationsApi.getCommunications(caseId),
  })

  const generateMutation = useMutation({
    mutationFn: (type: string) =>
      communicationsApi.generateCommunication(caseId, type, user!.id, user!.name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communications', caseId] })
      setSelectedComm(data)
      setShowGenerateModal(false)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (commId: string) =>
      communicationsApi.approveCommunication(caseId, commId, user!.id, user!.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', caseId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading communications...</div>
      </div>
    )
  }

  const commList = communications || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Communications</h3>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Draft Communication
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communication List */}
        <div className="card p-4">
          <h4 className="font-medium text-gray-900 mb-3">All Communications</h4>
          {commList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No communications yet
            </p>
          ) : (
            <div className="space-y-2">
              {commList.map((comm: any) => (
                <div
                  key={comm.id}
                  onClick={() => setSelectedComm(comm)}
                  className={clsx(
                    'p-3 border rounded-lg cursor-pointer transition-colors',
                    selectedComm?.id === comm.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {typeLabels[comm.communicationType] || comm.communicationType}
                    </span>
                    <span className={clsx('badge text-xs', statusColors[comm.status])}>
                      {comm.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(comm.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Communication Preview */}
        <div className="lg:col-span-2 card p-6">
          {selectedComm ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedComm.subject}</h4>
                  <p className="text-sm text-gray-500">To: {selectedComm.recipientName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedComm.status === 'draft' && (
                    <button
                      onClick={() => approveMutation.mutate(selectedComm.id)}
                      disabled={approveMutation.isPending}
                      className="btn-primary text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                  )}
                  {selectedComm.status === 'approved' && (
                    <button className="btn-primary text-sm">
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </button>
                  )}
                </div>
              </div>

              {/* Content Sections */}
              <div className="border rounded-lg divide-y">
                {selectedComm.contentSections?.map((section: any) => (
                  <div
                    key={section.id}
                    className={clsx(
                      'p-4',
                      section.isLocked ? 'bg-gray-50' : 'bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {section.type}
                      </span>
                      {section.isLocked ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <button className="text-primary-600 hover:text-primary-700">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div
                      className={clsx(
                        'text-sm whitespace-pre-wrap',
                        section.isLocked ? 'text-gray-600' : 'text-gray-900'
                      )}
                    >
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Compliance Status */}
              <div className="mt-4 flex items-center gap-2 text-sm">
                {selectedComm.complianceValidated ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Compliance validated</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600">Pending compliance validation</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <MessageSquare className="w-12 h-12" />
              <p className="mt-2">Select a communication to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Draft Communication Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Draft Communication</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a communication type. Draft will be assembled from underwriting reasons using approved phrase blocks.
            </p>
            <div className="space-y-2">
              {Object.entries(typeLabels).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => generateMutation.mutate(type)}
                  disabled={generateMutation.isPending}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGenerateModal(false)}
              className="mt-4 btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Import needed for AlertTriangle
import { AlertTriangle } from 'lucide-react'
