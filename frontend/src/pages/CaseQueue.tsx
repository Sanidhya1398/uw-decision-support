import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { casesApi } from '../services/api'
import { format } from 'date-fns'
import {
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'

const statusLabels: Record<string, string> = {
  received: 'Received',
  pending_review: 'Pending Review',
  in_progress: 'In Progress',
  awaiting_information: 'Awaiting Info',
  awaiting_tests: 'Awaiting Tests',
  awaiting_decision: 'Awaiting Decision',
  decision_made: 'Decision Made',
  communication_pending: 'Comm. Pending',
  completed: 'Completed',
}

const complexityColors: Record<string, string> = {
  Routine: 'badge-routine',
  Moderate: 'badge-moderate',
  Complex: 'badge-complex',
}

export default function CaseQueue() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const status = searchParams.get('status') || undefined
  const complexity = searchParams.get('complexity') || undefined

  const { data, isLoading } = useQuery({
    queryKey: ['cases', status, complexity],
    queryFn: () => casesApi.getAll({ status, complexity, limit: 100 }),
  })

  const cases = data?.data || []

  const filteredCases = cases.filter((c: any) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      c.caseReference?.toLowerCase().includes(searchLower) ||
      c.applicant?.firstName?.toLowerCase().includes(searchLower) ||
      c.applicant?.lastName?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredCases.length} cases
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={status || ''}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams)
                if (e.target.value) {
                  newParams.set('status', e.target.value)
                } else {
                  newParams.delete('status')
                }
                setSearchParams(newParams)
              }}
              className="input py-1.5"
            >
              <option value="">All Status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Complexity filter */}
          <select
            value={complexity || ''}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams)
              if (e.target.value) {
                newParams.set('complexity', e.target.value)
              } else {
                newParams.delete('complexity')
              }
              setSearchParams(newParams)
            }}
            className="input py-1.5"
          >
            <option value="">All Complexity</option>
            <option value="Routine">Routine</option>
            <option value="Moderate">Moderate</option>
            <option value="Complex">Complex</option>
          </select>

          {/* Clear filters */}
          {(status || complexity) && (
            <button
              onClick={() => setSearchParams({})}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading cases...</div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="w-12 h-12 text-gray-300" />
            <p className="mt-2 text-gray-500">No cases found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sum Assured
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Complexity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCases.map((caseItem: any) => (
                <tr
                  key={caseItem.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/cases/${caseItem.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {caseItem.caseReference}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {caseItem.applicant?.firstName} {caseItem.applicant?.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {caseItem.applicant?.occupation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{Number(caseItem.sumAssured).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {caseItem.complexityTier && (() => {
                      // Normalize tier casing: 'ROUTINE' -> 'Routine'
                      const normalizedTier = caseItem.complexityTier.charAt(0).toUpperCase() +
                        caseItem.complexityTier.slice(1).toLowerCase();
                      return (
                        <span
                          className={clsx(
                            'badge',
                            complexityColors[normalizedTier]
                          )}
                        >
                          {normalizedTier}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {statusLabels[caseItem.status] || caseItem.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.createdAt && (
                      format(new Date(caseItem.createdAt), 'dd MMM yyyy')
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/cases/${caseItem.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
