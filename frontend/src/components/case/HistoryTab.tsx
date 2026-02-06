import { useQuery } from '@tanstack/react-query'
import { casesApi } from '../../services/api'
import { format } from 'date-fns'
import clsx from 'clsx'
import {
  History,
  User,
  Settings,
  FileText,
  TestTube,
  Scale,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

interface HistoryTabProps {
  caseId: string
}

const actionIcons: Record<string, any> = {
  case_created: FileText,
  case_assigned: User,
  case_status_changed: Settings,
  risk_assessed: AlertTriangle,
  tests_recommended: TestTube,
  tests_ordered: TestTube,
  decision_made: Scale,
  communication_generated: MessageSquare,
  communication_approved: CheckCircle,
  note_added: FileText,
}

const categoryColors: Record<string, string> = {
  case_management: 'bg-blue-100 text-blue-800',
  risk_assessment: 'bg-orange-100 text-orange-800',
  test_management: 'bg-purple-100 text-purple-800',
  decision_making: 'bg-green-100 text-green-800',
  communication: 'bg-yellow-100 text-yellow-800',
  system: 'bg-gray-100 text-gray-800',
}

export default function HistoryTab({ caseId }: HistoryTabProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['case', caseId, 'history'],
    queryFn: () => casesApi.getHistory(caseId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading history...</div>
      </div>
    )
  }

  const logs = history || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Audit History</h3>
        <span className="text-sm text-gray-500">{logs.length} events</span>
      </div>

      {logs.length === 0 ? (
        <div className="card p-8 text-center">
          <History className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-2 text-gray-500">No history available</p>
        </div>
      ) : (
        <div className="card">
          <div className="flow-root">
            <ul className="-mb-8">
              {logs.map((log: any, index: number) => {
                const Icon = actionIcons[log.action] || History
                const isLast = index === logs.length - 1

                return (
                  <li key={log.id}>
                    <div className="relative pb-8">
                      {!isLast && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={clsx(
                            'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white',
                            log.isSystemAction ? 'bg-gray-200' : 'bg-primary-100'
                          )}>
                            <Icon className={clsx(
                              'h-4 w-4',
                              log.isSystemAction ? 'text-gray-500' : 'text-primary-600'
                            )} />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-900">
                              {log.description}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={clsx(
                                'badge text-xs',
                                categoryColors[log.category] || 'bg-gray-100 text-gray-800'
                              )}>
                                {log.category.replace(/_/g, ' ')}
                              </span>
                              {log.userName && (
                                <span className="text-xs text-gray-500">
                                  by {log.userName}
                                </span>
                              )}
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {Object.entries(log.metadata).map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={log.timestamp}>
                              {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
