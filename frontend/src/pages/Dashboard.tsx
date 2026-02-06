import { useQuery } from '@tanstack/react-query'
import { casesApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import clsx from 'clsx'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => casesApi.getDashboard(user?.id),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const summary = dashboardData?.summary || {}
  const complexityDist = dashboardData?.complexityDistribution || {}

  const stats = [
    {
      name: 'Pending Review',
      value: summary.pendingReview || 0,
      icon: FolderOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'In Progress',
      value: summary.inProgress || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Awaiting Decision',
      value: summary.awaitingDecision || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Completed Today',
      value: summary.completedToday || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.name}
          </p>
        </div>
        <Link
          to="/cases"
          className="btn-primary"
        >
          Open Next Case
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-5">
            <div className="flex items-center">
              <div className={clsx('p-3 rounded-lg', stat.bgColor)}>
                <stat.icon className={clsx('w-6 h-6', stat.color)} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Complexity Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cases by Complexity
          </h2>
          <div className="space-y-4">
            {[
              { tier: 'Routine', color: 'bg-green-500' },
              { tier: 'Moderate', color: 'bg-yellow-500' },
              { tier: 'Complex', color: 'bg-red-500' },
            ].map((item) => {
              const count = complexityDist[item.tier] || 0
              const total = Object.values(complexityDist).reduce((a: number, b: any) => a + b, 0) as number
              const percentage = total > 0 ? (count / total) * 100 : 0

              return (
                <div key={item.tier}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.tier}</span>
                    <span className="text-gray-500">{count} cases</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx('h-2 rounded-full', item.color)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* SLA Status */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            SLA Status
          </h2>
          <div className="flex items-center justify-center h-40">
            {summary.slaAtRisk > 0 ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">
                  {summary.slaAtRisk}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Cases at SLA risk
                </p>
                <Link
                  to="/cases?sla=at_risk"
                  className="mt-3 inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  View cases
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <p className="mt-2 text-sm text-gray-500">
                  All cases within SLA
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/cases?status=pending_review"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <FolderOpen className="w-8 h-8 text-primary-600" />
            <h3 className="mt-2 font-medium text-gray-900">Review Pending Cases</h3>
            <p className="mt-1 text-sm text-gray-500">
              {summary.pendingReview || 0} cases waiting
            </p>
          </Link>

          <Link
            to="/cases?status=awaiting_information"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Clock className="w-8 h-8 text-yellow-600" />
            <h3 className="mt-2 font-medium text-gray-900">Awaiting Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              {summary.awaitingInfo || 0} cases waiting
            </p>
          </Link>

          <Link
            to="/cases?complexity=Complex"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-red-600" />
            <h3 className="mt-2 font-medium text-gray-900">Complex Cases</h3>
            <p className="mt-1 text-sm text-gray-500">
              {complexityDist['Complex'] || 0} cases
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
