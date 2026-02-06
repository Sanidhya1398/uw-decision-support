import { useState, useEffect } from 'react'
import { rulesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface SeverityGuidance {
  loading_range: string
  waiting_period: string
  exclusion_hint: string
}

interface ConditionGuidance {
  low: SeverityGuidance
  moderate: SeverityGuidance
  high: SeverityGuidance
  critical: SeverityGuidance
}

interface Product {
  productName: string
  conditions: Record<string, ConditionGuidance>
}

interface ProductGuidelines {
  version: string
  lastModified: string
  products: Record<string, Product>
  conditionMapping: {
    mappings: Array<{ keywords: string[]; conditionKey: string }>
  }
  defaultGuidance: Record<string, SeverityGuidance>
}

const SEVERITY_LEVELS = ['low', 'moderate', 'high', 'critical'] as const
const CONDITION_TYPES = [
  'diabetes',
  'hypertension',
  'cardiac_disease',
  'respiratory_disease',
  'cancer_history',
  'obesity',
  'smoking',
  'mental_health',
]

export default function ProductGuidelinesEditor() {
  const { user } = useAuthStore()
  const [guidelines, setGuidelines] = useState<ProductGuidelines | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProductCode, setNewProductCode] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [editingGuidance, setEditingGuidance] = useState<{
    severity: string
    field: string
    value: string
  } | null>(null)

  useEffect(() => {
    loadGuidelines()
  }, [])

  const loadGuidelines = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await rulesApi.getProductGuidelines()
      setGuidelines(data)
      if (data.products && Object.keys(data.products).length > 0) {
        const firstProduct = Object.keys(data.products)[0]
        setSelectedProduct(firstProduct)
        const product = data.products[firstProduct]
        if (product.conditions && Object.keys(product.conditions).length > 0) {
          setSelectedCondition(Object.keys(product.conditions)[0])
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load guidelines')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    if (!newProductCode.trim() || !newProductName.trim()) {
      setError('Product code and name are required')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await rulesApi.addProduct(newProductCode, newProductName, {}, user?.name)
      await loadGuidelines()
      setSelectedProduct(newProductCode)
      setShowAddProduct(false)
      setNewProductCode('')
      setNewProductName('')
      setSuccess('Product added successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (productCode: string) => {
    if (!confirm(`Are you sure you want to delete ${productCode}? This cannot be undone.`)) {
      return
    }

    try {
      setSaving(true)
      await rulesApi.deleteProduct(productCode, user?.name)
      await loadGuidelines()
      if (selectedProduct === productCode) {
        setSelectedProduct(null)
        setSelectedCondition(null)
      }
      setSuccess('Product deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete product')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCondition = async (conditionKey: string) => {
    if (!selectedProduct || !guidelines) return

    const defaultCondition: ConditionGuidance = {
      low: { loading_range: '+25-50%', waiting_period: 'None', exclusion_hint: 'No exclusion typically required' },
      moderate: { loading_range: '+50-100%', waiting_period: '6 months', exclusion_hint: 'Consider condition-specific exclusion' },
      high: { loading_range: '+100-150%', waiting_period: '12 months', exclusion_hint: 'Exclusion recommended' },
      critical: { loading_range: 'Refer to Senior Underwriter', waiting_period: '24 months', exclusion_hint: 'Broad exclusion recommended' },
    }

    try {
      setSaving(true)
      await rulesApi.updateProductCondition(selectedProduct, conditionKey, defaultCondition, user?.name)
      await loadGuidelines()
      setSelectedCondition(conditionKey)
      setSuccess('Condition added successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to add condition')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateGuidance = async (severity: string, field: string, value: string) => {
    if (!selectedProduct || !selectedCondition || !guidelines) return

    const currentCondition = guidelines.products[selectedProduct]?.conditions[selectedCondition]
    if (!currentCondition) return

    const updatedCondition = {
      ...currentCondition,
      [severity]: {
        ...currentCondition[severity as keyof ConditionGuidance],
        [field]: value,
      },
    }

    try {
      setSaving(true)
      await rulesApi.updateProductCondition(selectedProduct, selectedCondition, updatedCondition, user?.name)
      await loadGuidelines()
      setEditingGuidance(null)
      setSuccess('Guidance updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update guidance')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading product guidelines...</span>
      </div>
    )
  }

  const products = guidelines?.products || {}
  const productCodes = Object.keys(products)
  const currentProduct = selectedProduct ? products[selectedProduct] : null
  const currentConditions = currentProduct?.conditions || {}
  const conditionKeys = Object.keys(currentConditions)
  const availableConditions = CONDITION_TYPES.filter(c => !conditionKeys.includes(c))

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Version: {guidelines?.version} | Last Modified: {guidelines?.lastModified ? new Date(guidelines.lastModified).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Products Sidebar */}
        <div className="col-span-3 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Products</h3>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add
            </button>
          </div>

          {showAddProduct && (
            <div className="mb-4 p-3 bg-white rounded border">
              <input
                type="text"
                placeholder="Product Code (e.g., HEALTH-SUPER-01)"
                value={newProductCode}
                onChange={(e) => setNewProductCode(e.target.value.toUpperCase())}
                className="w-full px-2 py-1 text-sm border rounded mb-2"
              />
              <input
                type="text"
                placeholder="Product Name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddProduct}
                  disabled={saving}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddProduct(false)
                    setNewProductCode('')
                    setNewProductName('')
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {productCodes.map((code) => (
              <div
                key={code}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedProduct === code
                    ? 'bg-blue-100 border-blue-300 border'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedProduct(code)
                  const conditions = products[code]?.conditions
                  if (conditions && Object.keys(conditions).length > 0) {
                    setSelectedCondition(Object.keys(conditions)[0])
                  } else {
                    setSelectedCondition(null)
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{code}</div>
                    <div className="text-xs text-gray-500">{products[code].productName}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProduct(code)
                    }}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {productCodes.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No products defined</p>
            )}
          </div>
        </div>

        {/* Conditions & Guidelines */}
        <div className="col-span-9">
          {selectedProduct ? (
            <>
              {/* Conditions Tabs */}
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {conditionKeys.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCondition(key)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedCondition === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {key.replace(/_/g, ' ')}
                    </button>
                  ))}
                  <div className="relative group">
                    <button
                      className={`px-3 py-1.5 text-sm rounded-lg ${
                        availableConditions.length > 0
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={availableConditions.length === 0}
                    >
                      + Add Condition
                    </button>
                    {availableConditions.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[200px]">
                        {availableConditions.map((condition) => (
                          <button
                            key={condition}
                            onClick={() => handleAddCondition(condition)}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 capitalize"
                          >
                            {condition.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Severity Guidelines Table */}
              {selectedCondition && currentConditions[selectedCondition] ? (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="font-semibold text-gray-700 capitalize">
                      {selectedCondition.replace(/_/g, ' ')} Guidelines for {currentProduct?.productName}
                    </h4>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left w-24">Severity</th>
                        <th className="px-4 py-3 text-left">Loading Range</th>
                        <th className="px-4 py-3 text-left">Waiting Period</th>
                        <th className="px-4 py-3 text-left">Exclusion Guidance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {SEVERITY_LEVELS.map((severity) => {
                        const guidance = currentConditions[selectedCondition][severity]
                        return (
                          <tr key={severity} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                severity === 'low' ? 'bg-green-100 text-green-700' :
                                severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {severity}
                              </span>
                            </td>
                            {['loading_range', 'waiting_period', 'exclusion_hint'].map((field) => (
                              <td key={field} className="px-4 py-3">
                                {editingGuidance?.severity === severity && editingGuidance?.field === field ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingGuidance.value}
                                      onChange={(e) => setEditingGuidance({ ...editingGuidance, value: e.target.value })}
                                      className="flex-1 px-2 py-1 text-sm border rounded"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleUpdateGuidance(severity, field, editingGuidance.value)}
                                      disabled={saving}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingGuidance(null)}
                                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => setEditingGuidance({
                                      severity,
                                      field,
                                      value: guidance[field as keyof SeverityGuidance] || '',
                                    })}
                                    className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded text-sm"
                                    title="Click to edit"
                                  >
                                    {guidance[field as keyof SeverityGuidance] || '-'}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {conditionKeys.length === 0
                    ? 'No conditions defined for this product. Click "+ Add Condition" to add one.'
                    : 'Select a condition to view and edit guidelines.'}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a product from the sidebar to view its guidelines.
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-700 mb-2">About Product Modification Guidelines</h4>
        <p className="text-sm text-blue-600">
          These guidelines define product-specific recommendations for underwriters when evaluating cases with various medical conditions.
          Each product can have different loading ranges, waiting periods, and exclusion considerations based on the severity of disclosed conditions.
        </p>
        <p className="text-sm text-blue-600 mt-2">
          <strong>Note:</strong> Changes are saved immediately and will affect all future case assessments.
          All modifications are logged in the audit trail.
        </p>
      </div>
    </div>
  )
}
