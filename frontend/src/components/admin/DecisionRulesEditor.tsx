import { useState, useEffect } from 'react'
import { rulesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import ConditionBuilder from './ConditionBuilder'

interface DecisionRule {
  id: string
  name: string
  description?: string
  enabled: boolean
  priority: number
  decisionType: string
  conditions: any
  alwaysInclude?: boolean
  output: {
    name: string
    description: string
    guidelineReference: string
    authorityRequired: string
    supportingFactors: { factor: string; description: string }[]
    weighingFactors?: { factor: string; description: string }[]
    recommended?: boolean
  }
}

const DECISION_TYPES = [
  'STANDARD_ACCEPTANCE',
  'MODIFIED_ACCEPTANCE',
  'DEFERRAL',
  'REFERRAL',
  'DECLINE',
]

const AUTHORITY_LEVELS = [
  'Junior Underwriter',
  'Senior Underwriter',
  'Chief Underwriter',
  'Medical Director',
]

export default function DecisionRulesEditor() {
  const { user } = useAuthStore()
  const [rules, setRules] = useState<DecisionRule[]>([])
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<DecisionRule | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<any[]>([])

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const data = await rulesApi.getDecisionRules()
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
      decisionType: 'STANDARD_ACCEPTANCE',
      conditions: {
        operator: 'AND',
        conditions: [{ field: 'riskFactors[severity=critical].count', operator: '==', value: 0 }],
      },
      output: {
        name: '',
        description: '',
        guidelineReference: '',
        authorityRequired: 'Junior Underwriter',
        supportingFactors: [],
        weighingFactors: [],
        recommended: false,
      },
    })
    setIsNew(true)
    setValidationErrors([])
  }

  const handleEdit = (rule: DecisionRule) => {
    setEditingRule({
      ...rule,
      output: {
        ...rule.output,
        supportingFactors: [...(rule.output.supportingFactors || [])],
        weighingFactors: [...(rule.output.weighingFactors || [])],
      },
    })
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
      const validation = await rulesApi.validateRule('decision', editingRule)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        return
      }

      if (isNew) {
        await rulesApi.createDecisionRule(editingRule, user?.name)
      } else {
        await rulesApi.updateDecisionRule(editingRule.id, editingRule, user?.name)
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
    if (!confirm('Are you sure you want to delete this decision rule?')) return

    try {
      await rulesApi.deleteDecisionRule(id, user?.name)
      await loadRules()
    } catch (err: any) {
      setError(err.message || 'Failed to delete rule')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await rulesApi.toggleDecisionRule(id, user?.name)
      await loadRules()
    } catch (err: any) {
      setError(err.message || 'Failed to toggle rule')
    }
  }

  const updateRule = (updates: Partial<DecisionRule>) => {
    if (!editingRule) return
    setEditingRule({ ...editingRule, ...updates })
  }

  const updateOutput = (updates: Partial<DecisionRule['output']>) => {
    if (!editingRule) return
    setEditingRule({
      ...editingRule,
      output: { ...editingRule.output, ...updates },
    })
  }

  const addSupportingFactor = () => {
    if (!editingRule) return
    updateOutput({
      supportingFactors: [...editingRule.output.supportingFactors, { factor: '', description: '' }],
    })
  }

  const updateSupportingFactor = (index: number, updates: { factor?: string; description?: string }) => {
    if (!editingRule) return
    const factors = [...editingRule.output.supportingFactors]
    factors[index] = { ...factors[index], ...updates }
    updateOutput({ supportingFactors: factors })
  }

  const removeSupportingFactor = (index: number) => {
    if (!editingRule) return
    updateOutput({
      supportingFactors: editingRule.output.supportingFactors.filter((_, i) => i !== index),
    })
  }

  const addWeighingFactor = () => {
    if (!editingRule) return
    updateOutput({
      weighingFactors: [...(editingRule.output.weighingFactors || []), { factor: '', description: '' }],
    })
  }

  const updateWeighingFactor = (index: number, updates: { factor?: string; description?: string }) => {
    if (!editingRule) return
    const factors = [...(editingRule.output.weighingFactors || [])]
    factors[index] = { ...factors[index], ...updates }
    updateOutput({ weighingFactors: factors })
  }

  const removeWeighingFactor = (index: number) => {
    if (!editingRule) return
    updateOutput({
      weighingFactors: (editingRule.output.weighingFactors || []).filter((_, i) => i !== index),
    })
  }

  const getDecisionTypeColor = (type: string) => {
    switch (type) {
      case 'STANDARD_ACCEPTANCE': return 'bg-green-100 text-green-700'
      case 'MODIFIED_ACCEPTANCE': return 'bg-yellow-100 text-yellow-700'
      case 'DEFERRAL': return 'bg-blue-100 text-blue-700'
      case 'REFERRAL': return 'bg-purple-100 text-purple-700'
      case 'DECLINE': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return <div className="p-4 text-center">Loading rules...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-sm underline">Dismiss</button>
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
          + New Decision Rule
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
                    <span className={`px-2 py-0.5 text-xs rounded ${getDecisionTypeColor(rule.decisionType)}`}>
                      {rule.decisionType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">Priority: {rule.priority}</span>
                    {rule.alwaysInclude && (
                      <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                        Always Show
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold">{rule.name}</h3>
                  <p className="text-sm text-gray-500">{rule.output.description}</p>
                  <div className="mt-2 text-xs text-gray-400">
                    Authority: {rule.output.authorityRequired} | Ref: {rule.output.guidelineReference}
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
            {isNew ? 'New Decision Rule' : `Edit: ${editingRule.name}`}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule ID</label>
                <input
                  type="text"
                  value={editingRule.id}
                  onChange={(e) => updateRule({ id: e.target.value.toUpperCase() })}
                  placeholder="e.g., DEC_001"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => updateRule({ name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision Type</label>
                <select
                  value={editingRule.decisionType}
                  onChange={(e) => updateRule({ decisionType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DECISION_TYPES.map((type) => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={editingRule.priority}
                  onChange={(e) => updateRule({ priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRule.enabled}
                    onChange={(e) => updateRule({ enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRule.alwaysInclude ?? false}
                    onChange={(e) => updateRule({ alwaysInclude: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Always Show</span>
                </label>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Conditions</label>
              <ConditionBuilder
                condition={editingRule.conditions}
                onChange={(conditions) => updateRule({ conditions })}
              />
            </div>

            {/* Output */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Decision Output</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editingRule.output.name}
                      onChange={(e) => updateOutput({ name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authority Required</label>
                    <select
                      value={editingRule.output.authorityRequired}
                      onChange={(e) => updateOutput({ authorityRequired: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {AUTHORITY_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingRule.output.description}
                    onChange={(e) => updateOutput({ description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guideline Reference</label>
                    <input
                      type="text"
                      value={editingRule.output.guidelineReference}
                      onChange={(e) => updateOutput({ guidelineReference: e.target.value })}
                      placeholder="e.g., UW-GUIDE-001"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingRule.output.recommended ?? false}
                        onChange={(e) => updateOutput({ recommended: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Recommended Option</span>
                    </label>
                  </div>
                </div>

                {/* Supporting Factors */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Supporting Factors</label>
                    <button
                      onClick={addSupportingFactor}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add Factor
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingRule.output.supportingFactors.map((factor, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={factor.factor}
                          onChange={(e) => updateSupportingFactor(index, { factor: e.target.value })}
                          placeholder="Factor name"
                          className="w-1/3 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={factor.description}
                          onChange={(e) => updateSupportingFactor(index, { description: e.target.value })}
                          placeholder="Description"
                          className="flex-1 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeSupportingFactor(index)}
                          className="px-2 text-red-600 hover:text-red-700"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weighing Factors */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Weighing Factors</label>
                    <button
                      onClick={addWeighingFactor}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add Factor
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editingRule.output.weighingFactors || []).map((factor, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={factor.factor}
                          onChange={(e) => updateWeighingFactor(index, { factor: e.target.value })}
                          placeholder="Factor name"
                          className="w-1/3 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={factor.description}
                          onChange={(e) => updateWeighingFactor(index, { description: e.target.value })}
                          placeholder="Description"
                          className="flex-1 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeWeighingFactor(index)}
                          className="px-2 text-red-600 hover:text-red-700"
                        >
                          x
                        </button>
                      </div>
                    ))}
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
