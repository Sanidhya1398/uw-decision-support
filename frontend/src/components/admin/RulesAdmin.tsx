import { useState } from 'react'
import RiskRulesEditor from './RiskRulesEditor'
import TestProtocolsEditor from './TestProtocolsEditor'
import DecisionRulesEditor from './DecisionRulesEditor'
import ProductGuidelinesEditor from './ProductGuidelinesEditor'
import { rulesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

type TabType = 'risk' | 'test-protocols' | 'decision' | 'product-guidelines'

interface VersionHistory {
  version: string
  timestamp: string
  modifiedBy?: string
  changeDescription?: string
}

export default function RulesAdmin() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('risk')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<VersionHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const tabs: { id: TabType; label: string; description: string }[] = [
    { id: 'risk', label: 'Risk Rules', description: 'Rules for identifying risk factors' },
    { id: 'test-protocols', label: 'Test Protocols', description: 'Test recommendation protocols' },
    { id: 'decision', label: 'Decision Rules', description: 'Decision option rules' },
    { id: 'product-guidelines', label: 'Product Guidelines', description: 'Product-specific modification guidance' },
  ]

  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const data = await rulesApi.getVersionHistory(activeTab)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleShowHistory = async () => {
    if (!showHistory) {
      await loadHistory()
    }
    setShowHistory(!showHistory)
  }

  const handleRollback = async (version: string) => {
    if (!confirm(`Are you sure you want to rollback to version ${version}? This will replace all current rules.`)) {
      return
    }

    try {
      await rulesApi.rollbackToVersion(activeTab, version, user?.name)
      setShowHistory(false)
      // Trigger a refresh by changing tab and back
      const currentTab = activeTab
      setActiveTab('risk')
      setTimeout(() => setActiveTab(currentTab), 100)
    } catch (err) {
      console.error('Rollback failed:', err)
      alert('Rollback failed. Please try again.')
    }
  }

  const handleExport = async () => {
    try {
      const data = await rulesApi.exportRules(activeTab)
      const blob = new Blob([data.content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeTab}-rules-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    }
  }

  const handleImport = async () => {
    if (!importJson.trim()) {
      setImportError('Please paste JSON content')
      return
    }

    try {
      JSON.parse(importJson) // Validate JSON
    } catch {
      setImportError('Invalid JSON format')
      return
    }

    if (!confirm('Are you sure you want to import? This will replace all current rules.')) {
      return
    }

    try {
      await rulesApi.importRules(activeTab, importJson, user?.name)
      setShowImportExport(false)
      setImportJson('')
      setImportError(null)
      // Trigger refresh
      const currentTab = activeTab
      setActiveTab('risk')
      setTimeout(() => setActiveTab(currentTab), 100)
    } catch (err: any) {
      setImportError(err.message || 'Import failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rules Administration</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage underwriting rules, test protocols, and decision criteria
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab !== 'product-guidelines' && (
                <>
                  <button
                    onClick={handleShowHistory}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      showHistory
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Version History
                  </button>
                  <button
                    onClick={() => setShowImportExport(!showImportExport)}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      showImportExport
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Import/Export
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setShowHistory(false)
                }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Import/Export Panel */}
        {showImportExport && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Import/Export {tabs.find(t => t.id === activeTab)?.label}</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Export to JSON
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={importJson}
                  onChange={(e) => {
                    setImportJson(e.target.value)
                    setImportError(null)
                  }}
                  placeholder="Paste JSON content here..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                {importError && (
                  <p className="text-sm text-red-600">{importError}</p>
                )}
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Import from JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History Panel */}
        {showHistory && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">
              Version History - {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            {loadingHistory ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500">No version history available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.slice().reverse().map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <div className="font-medium text-sm">Version {entry.version}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                        {entry.modifiedBy && ` by ${entry.modifiedBy}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRollback(entry.version)}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'risk' && <RiskRulesEditor />}
          {activeTab === 'test-protocols' && <TestProtocolsEditor />}
          {activeTab === 'decision' && <DecisionRulesEditor />}
          {activeTab === 'product-guidelines' && <ProductGuidelinesEditor />}
        </div>
      </div>
    </div>
  )
}
