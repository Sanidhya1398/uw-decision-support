import { useState, useEffect } from 'react'
import { rulesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import ConditionBuilder from './ConditionBuilder'

interface Test {
  testCode: string
  testName: string
  testCategory: string
  requirementType: string
  clinicalRationale: string
  protocolReference: string
  estimatedCost: number
  estimatedTurnaroundDays: number
  skipIfExists?: boolean
}

interface TestProtocol {
  id: string
  name: string
  description?: string
  enabled: boolean
  priority: number
  conditions: any
  tests: Test[]
}

const TEST_CATEGORIES = ['HEMATOLOGY', 'URINE', 'LIPID', 'GLYCEMIC', 'CARDIAC', 'HEPATIC', 'RENAL', 'IMAGING', 'OTHER']
const REQUIREMENT_TYPES = ['MANDATORY', 'CONDITIONAL', 'SUGGESTED', 'ADDITIONAL']

export default function TestProtocolsEditor() {
  const { user } = useAuthStore()
  const [protocols, setProtocols] = useState<TestProtocol[]>([])
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProtocol, setEditingProtocol] = useState<TestProtocol | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<any[]>([])

  useEffect(() => {
    loadProtocols()
  }, [])

  const loadProtocols = async () => {
    try {
      setLoading(true)
      const data = await rulesApi.getTestProtocols()
      setProtocols(data.rules || [])
      setVersion(data.version)
    } catch (err: any) {
      setError(err.message || 'Failed to load protocols')
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingProtocol({
      id: '',
      name: '',
      description: '',
      enabled: true,
      priority: 50,
      conditions: {
        operator: 'AND',
        conditions: [{ field: '', operator: '>=', value: 0 }],
      },
      tests: [{
        testCode: '',
        testName: '',
        testCategory: 'HEMATOLOGY',
        requirementType: 'MANDATORY',
        clinicalRationale: '',
        protocolReference: '',
        estimatedCost: 0,
        estimatedTurnaroundDays: 1,
      }],
    })
    setIsNew(true)
    setValidationErrors([])
  }

  const handleEdit = (protocol: TestProtocol) => {
    setEditingProtocol({ ...protocol, tests: [...protocol.tests] })
    setIsNew(false)
    setValidationErrors([])
  }

  const handleCancel = () => {
    setEditingProtocol(null)
    setIsNew(false)
    setValidationErrors([])
  }

  const handleSave = async () => {
    if (!editingProtocol) return

    try {
      const validation = await rulesApi.validateRule('test-protocols', editingProtocol)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        return
      }

      if (isNew) {
        await rulesApi.createTestProtocol(editingProtocol, user?.name)
      } else {
        await rulesApi.updateTestProtocol(editingProtocol.id, editingProtocol, user?.name)
      }

      await loadProtocols()
      setEditingProtocol(null)
      setIsNew(false)
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors)
      } else {
        setError(err.message || 'Failed to save protocol')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this protocol?')) return

    try {
      await rulesApi.deleteTestProtocol(id, user?.name)
      await loadProtocols()
    } catch (err: any) {
      setError(err.message || 'Failed to delete protocol')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await rulesApi.toggleTestProtocol(id, user?.name)
      await loadProtocols()
    } catch (err: any) {
      setError(err.message || 'Failed to toggle protocol')
    }
  }

  const updateProtocol = (updates: Partial<TestProtocol>) => {
    if (!editingProtocol) return
    setEditingProtocol({ ...editingProtocol, ...updates })
  }

  const addTest = () => {
    if (!editingProtocol) return
    setEditingProtocol({
      ...editingProtocol,
      tests: [...editingProtocol.tests, {
        testCode: '',
        testName: '',
        testCategory: 'HEMATOLOGY',
        requirementType: 'MANDATORY',
        clinicalRationale: '',
        protocolReference: '',
        estimatedCost: 0,
        estimatedTurnaroundDays: 1,
      }],
    })
  }

  const updateTest = (index: number, updates: Partial<Test>) => {
    if (!editingProtocol) return
    const tests = [...editingProtocol.tests]
    tests[index] = { ...tests[index], ...updates }
    setEditingProtocol({ ...editingProtocol, tests })
  }

  const removeTest = (index: number) => {
    if (!editingProtocol || editingProtocol.tests.length <= 1) return
    const tests = editingProtocol.tests.filter((_, i) => i !== index)
    setEditingProtocol({ ...editingProtocol, tests })
  }

  if (loading) {
    return <div className="p-4 text-center">Loading protocols...</div>
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
          Version: {version} | {protocols.length} protocols
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Protocol
        </button>
      </div>

      {/* Protocols List */}
      {!editingProtocol && (
        <div className="space-y-2">
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className={`p-4 bg-white rounded-lg border ${
                protocol.enabled ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      protocol.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {protocol.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="text-xs text-gray-400">Priority: {protocol.priority}</span>
                    <span className="text-xs text-purple-600">{protocol.tests.length} test(s)</span>
                  </div>
                  <h3 className="mt-1 font-semibold">{protocol.name}</h3>
                  <p className="text-sm text-gray-500">{protocol.description || 'No description'}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {protocol.tests.map((test) => (
                      <span key={test.testCode} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        {test.testCode}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(protocol.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      protocol.enabled
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {protocol.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleEdit(protocol)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(protocol.id)}
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
      {editingProtocol && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {isNew ? 'New Test Protocol' : `Edit: ${editingProtocol.name}`}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Protocol ID</label>
                <input
                  type="text"
                  value={editingProtocol.id}
                  onChange={(e) => updateProtocol({ id: e.target.value.toUpperCase() })}
                  placeholder="e.g., SA_THRESHOLD_25L"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingProtocol.name}
                  onChange={(e) => updateProtocol({ name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingProtocol.description || ''}
                onChange={(e) => updateProtocol({ description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={editingProtocol.priority}
                  onChange={(e) => updateProtocol({ priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProtocol.enabled}
                    onChange={(e) => updateProtocol({ enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enabled</span>
                </label>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Conditions</label>
              <ConditionBuilder
                condition={editingProtocol.conditions}
                onChange={(conditions) => updateProtocol({ conditions })}
              />
            </div>

            {/* Tests */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">Tests in Protocol</h4>
                <button
                  onClick={addTest}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  + Add Test
                </button>
              </div>

              <div className="space-y-4">
                {editingProtocol.tests.map((test, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm">Test #{index + 1}</span>
                      {editingProtocol.tests.length > 1 && (
                        <button
                          onClick={() => removeTest(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Test Code</label>
                        <input
                          type="text"
                          value={test.testCode}
                          onChange={(e) => updateTest(index, { testCode: e.target.value.toUpperCase() })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Test Name</label>
                        <input
                          type="text"
                          value={test.testName}
                          onChange={(e) => updateTest(index, { testName: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={test.testCategory}
                          onChange={(e) => updateTest(index, { testCategory: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {TEST_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Requirement Type</label>
                        <select
                          value={test.requirementType}
                          onChange={(e) => updateTest(index, { requirementType: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {REQUIREMENT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Est. Cost (Rs.)</label>
                        <input
                          type="number"
                          value={test.estimatedCost}
                          onChange={(e) => updateTest(index, { estimatedCost: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Turnaround (days)</label>
                        <input
                          type="number"
                          value={test.estimatedTurnaroundDays}
                          onChange={(e) => updateTest(index, { estimatedTurnaroundDays: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Clinical Rationale</label>
                      <textarea
                        value={test.clinicalRationale}
                        onChange={(e) => updateTest(index, { clinicalRationale: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Protocol Reference</label>
                        <input
                          type="text"
                          value={test.protocolReference}
                          onChange={(e) => updateTest(index, { protocolReference: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-xs mt-5">
                        <input
                          type="checkbox"
                          checked={test.skipIfExists ?? false}
                          onChange={(e) => updateTest(index, { skipIfExists: e.target.checked })}
                          className="rounded"
                        />
                        Skip if exists
                      </label>
                    </div>
                  </div>
                ))}
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
                {isNew ? 'Create Protocol' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
