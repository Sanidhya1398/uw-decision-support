import { useState, useEffect } from 'react'
import { rulesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import ConditionBuilder from './ConditionBuilder'

interface RiskRule {
  id: string
  name: string
  description?: string
  enabled: boolean
  priority: number
  category: string
  conditions: any
  actions: any
}

const CATEGORIES = ['MEDICAL', 'LIFESTYLE', 'FAMILY_HISTORY', 'FINANCIAL', 'OCCUPATIONAL']
const SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
const IMPACT_DIRECTIONS = ['INCREASES_RISK', 'DECREASES_RISK', 'NEUTRAL']
const SOURCES = ['DISCLOSURE', 'TEST_RESULT', 'MANUAL', 'NLP', 'ML']

export default function RiskRulesEditor() {
  const { user } = useAuthStore()
  const [rules, setRules] = useState<RiskRule[]>([])
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<any[]>([])

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const data = await rulesApi.getRiskRules()
      setRules(data.rules || [])
      setVersion(data.version)
    } catch (err: any) {
      setError(err.message || 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingRule({
      id: '',
      name: '',
      description: '',
      enabled: true,
      priority: 50,
      category: 'MEDICAL',
      conditions: {
        operator: 'AND',
        conditions: [{ field: '', operator: '==', value: '' }],
      },
      actions: {
        createRiskFactor: {
          factorName: '',
          factorDescriptionTemplate: '',
          category: 'MEDICAL',
          impactDirection: 'INCREASES_RISK',
          source: 'DISCLOSURE',
          severity: 'MODERATE',
          complexityWeight: 0.2,
          supportingEvidenceTemplate: [],
        },
      },
    })
    setIsNew(true)
    setValidationErrors([])
  }

  const handleEdit = (rule: RiskRule) => {
    setEditingRule({ ...rule })
    setIsNew(false)
    setValidationErrors([])
  }

  const handleCancel = () => {
    setEditingRule(null)
    setIsNew(false)
    setValidationErrors([])
  }

  const handleSave = async () => {
    if (!editingRule) return

    try {
      // Validate first
      const validation = await rulesApi.validateRule('risk', editingRule)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        return
      }

      if (isNew) {
        await rulesApi.createRiskRule(editingRule, user?.name)
      } else {
        await rulesApi.updateRiskRule(editingRule.id, editingRule, user?.name)
      }

      await loadRules()
      setEditingRule(null)
      setIsNew(false)
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors)
      } else {
        setError(err.message || 'Failed to save rule')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      await rulesApi.deleteRiskRule(id, user?.name)
      await loadRules()
    } catch (err: any) {
      setError(err.message || 'Failed to delete rule')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await rulesApi.toggleRiskRule(id, user?.name)
      await loadRules()
    } catch (err: any) {
      setError(err.message || 'Failed to toggle rule')
    }
  }

  const updateEditingRule = (updates: Partial<RiskRule>) => {
    if (!editingRule) return
    setEditingRule({ ...editingRule, ...updates })
  }

  const updateRiskFactorAction = (updates: any) => {
    if (!editingRule) return
    setEditingRule({
      ...editingRule,
      actions: {
        ...editingRule.actions,
        createRiskFactor: {
          ...editingRule.actions.createRiskFactor,
          ...updates,
        },
      },
    })
  }

  if (loading) {
    return <div className="p-4 text-center">Loading rules...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Version: {version} | {rules.length} rules
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Risk Rule
        </button>
      </div>

      {/* Rules List */}
      {!editingRule && (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 bg-white rounded-lg border ${
                rule.enabled ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      {rule.category}
                    </span>
                    <span className="text-xs text-gray-400">Priority: {rule.priority}</span>
                  </div>
                  <h3 className="mt-1 font-semibold">{rule.name}</h3>
                  <p className="text-sm text-gray-500">{rule.description || 'No description'}</p>
                  <div className="mt-2 text-xs text-gray-400">
                    ID: {rule.id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      rule.enabled
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Form */}
      {editingRule && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {isNew ? 'New Risk Rule' : `Edit: ${editingRule.name}`}
          </h3>

          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-700 mb-2">Validation Errors:</h4>
              <ul className="list-disc list-inside text-sm text-red-600">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err.field}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule ID</label>
                <input
                  type="text"
                  value={editingRule.id}
                  onChange={(e) => updateEditingRule({ id: e.target.value.toUpperCase() })}
                  placeholder="e.g., AGE_001"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => updateEditingRule({ name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingRule.description || ''}
                onChange={(e) => updateEditingRule({ description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingRule.category}
                  onChange={(e) => updateEditingRule({ category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={editingRule.priority}
                  onChange={(e) => updateEditingRule({ priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRule.enabled}
                    onChange={(e) => updateEditingRule({ enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enabled</span>
                </label>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conditions</label>
              <ConditionBuilder
                condition={editingRule.conditions}
                onChange={(conditions) => updateEditingRule({ conditions })}
              />
            </div>

            {/* Risk Factor Action */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Risk Factor Output</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Factor Name</label>
                    <input
                      type="text"
                      value={editingRule.actions.createRiskFactor.factorName}
                      onChange={(e) => updateRiskFactorAction({ factorName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <select
                      value={editingRule.actions.createRiskFactor.severity || 'MODERATE'}
                      onChange={(e) => updateRiskFactorAction({ severity: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {SEVERITIES.map((sev) => (
                        <option key={sev} value={sev}>{sev}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description Template
                    <span className="text-xs text-gray-400 ml-2">
                      Use {'{{field.path}}'} for dynamic values
                    </span>
                  </label>
                  <textarea
                    value={editingRule.actions.createRiskFactor.factorDescriptionTemplate}
                    onChange={(e) => updateRiskFactorAction({ factorDescriptionTemplate: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impact Direction</label>
                    <select
                      value={editingRule.actions.createRiskFactor.impactDirection}
                      onChange={(e) => updateRiskFactorAction({ impactDirection: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {IMPACT_DIRECTIONS.map((dir) => (
                        <option key={dir} value={dir}>{dir}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select
                      value={editingRule.actions.createRiskFactor.source}
                      onChange={(e) => updateRiskFactorAction({ source: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {SOURCES.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complexity Weight</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={editingRule.actions.createRiskFactor.complexityWeight || 0.2}
                      onChange={(e) => updateRiskFactorAction({ complexityWeight: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {isNew ? 'Create Rule' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
