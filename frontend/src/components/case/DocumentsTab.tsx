import { useState, useRef } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { documentsApi } from '../../services/api'
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  Upload,
  X,
  Play,
  RefreshCw,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import clsx from 'clsx'

interface DocumentsTabProps {
  caseId: string
  caseData?: any
}

const typeLabels: Record<string, string> = {
  medical_report: 'Medical Report',
  lab_result: 'Lab Result',
  discharge_summary: 'Discharge Summary',
  prescription: 'Prescription',
  insurance_form: 'Insurance Form',
  specialist_report: 'Specialist Report',
  ecg_report: 'ECG Report',
  pathology_report: 'Pathology Report',
  diagnostic_imaging: 'Diagnostic Imaging',
  attending_physician: 'Attending Physician Statement',
  other_medical: 'Other Medical Document',
}

const statusColors: Record<string, string> = {
  extracted: 'text-green-600',
  pending: 'text-yellow-600',
  failed: 'text-red-600',
  manual: 'text-blue-600',
}

// Current user mock (would come from auth context in real app)
const currentUser = {
  id: 'user-001',
  name: 'John Smith',
}

export default function DocumentsTab({ caseId }: DocumentsTabProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadType, setUploadType] = useState('medical_report')
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => documentsApi.getDocuments(caseId),
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      documentsApi.uploadDocument(caseId, file, uploadType, currentUser.id, currentUser.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      setShowUploadModal(false)
    },
  })

  // Process mutation
  const processMutation = useMutation({
    mutationFn: (docId: string) =>
      documentsApi.processDocument(caseId, docId, currentUser.id, currentUser.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    },
  })

  // Sync to disclosures mutation
  const syncMutation = useMutation({
    mutationFn: (docId: string) =>
      documentsApi.syncToDisclosures(caseId, docId, currentUser.id, currentUser.name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      alert(`Synced ${data.created?.length || 0} items to medical disclosures`)
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const toggleExpand = (docId: string) => {
    setExpandedDoc(expandedDoc === docId ? null : docId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-500">{documents.length} documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div
          className="card p-8 text-center border-2 border-dashed border-gray-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <FileText className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-2 text-gray-500">No documents uploaded</p>
          <p className="text-sm text-gray-400">Drag and drop files here or click upload</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc: any) => (
            <div key={doc.id} className="card overflow-hidden">
              {/* Document Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(doc.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {doc.fileName || 'Document'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {typeLabels[doc.documentType] || doc.documentType}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1">
                        {doc.extractionStatus === 'extracted' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : doc.extractionStatus === 'failed' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={clsx('text-xs', statusColors[doc.extractionStatus])}>
                          {doc.extractionStatus === 'extracted'
                            ? 'Extracted'
                            : doc.extractionStatus === 'failed'
                            ? 'Failed'
                            : 'Pending'}
                        </span>
                        {doc.extractionConfidence && (
                          <span className="text-xs text-gray-400">
                            ({(doc.extractionConfidence * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      {doc.extractedConditions?.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {doc.extractedConditions.length} conditions
                        </span>
                      )}
                      {doc.extractedMedications?.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {doc.extractedMedications.length} medications
                        </span>
                      )}
                      {doc.extractedLabValues?.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {doc.extractedLabValues.length} lab values
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.extractionStatus === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          processMutation.mutate(doc.id)
                        }}
                        disabled={processMutation.isPending}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                        title="Process document"
                      >
                        {processMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {doc.extractionStatus === 'extracted' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          syncMutation.mutate(doc.id)
                        }}
                        disabled={syncMutation.isPending}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Sync to medical disclosures"
                      >
                        {syncMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDoc(doc)
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {expandedDoc === doc.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedDoc === doc.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {/* Extracted Text */}
                  {doc.extractedText && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Extracted Text</p>
                      <div className="text-xs text-gray-600 bg-white p-3 rounded border max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {doc.extractedText.substring(0, 1000)}
                        {doc.extractedText.length > 1000 && '...'}
                      </div>
                    </div>
                  )}

                  {/* Extracted Entities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conditions */}
                    {doc.extractedConditions?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Conditions ({doc.extractedConditions.length})
                        </p>
                        <div className="space-y-1">
                          {doc.extractedConditions.map((c: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-white p-2 rounded border"
                            >
                              <div>
                                <span className="text-sm font-medium text-red-700">{c.name}</span>
                                {c.icdCode && (
                                  <span className="ml-2 text-xs text-gray-400">{c.icdCode}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {(c.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medications */}
                    {doc.extractedMedications?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Medications ({doc.extractedMedications.length})
                        </p>
                        <div className="space-y-1">
                          {doc.extractedMedications.map((m: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-white p-2 rounded border"
                            >
                              <div>
                                <span className="text-sm font-medium text-blue-700">{m.name}</span>
                                {m.dosage && (
                                  <span className="ml-2 text-xs text-gray-500">{m.dosage}</span>
                                )}
                                {m.frequency && (
                                  <span className="ml-1 text-xs text-gray-400">{m.frequency}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {(m.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Values */}
                    {doc.extractedLabValues?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Lab Values ({doc.extractedLabValues.length})
                        </p>
                        <div className="space-y-1">
                          {doc.extractedLabValues.map((l: any, i: number) => (
                            <div
                              key={i}
                              className={clsx(
                                'flex items-center justify-between p-2 rounded border',
                                l.abnormal ? 'bg-red-50 border-red-200' : 'bg-white'
                              )}
                            >
                              <div>
                                <span
                                  className={clsx(
                                    'text-sm font-medium',
                                    l.abnormal ? 'text-red-700' : 'text-purple-700'
                                  )}
                                >
                                  {l.testName}
                                </span>
                                <span className="ml-2 text-sm">
                                  {l.value} {l.unit}
                                </span>
                                {l.abnormal && (
                                  <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{l.referenceRange}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Procedures */}
                    {doc.extractedProcedures?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Procedures ({doc.extractedProcedures.length})
                        </p>
                        <div className="space-y-1">
                          {doc.extractedProcedures.map((p: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-white p-2 rounded border"
                            >
                              <div>
                                <span className="text-sm font-medium text-orange-700">{p.name}</span>
                                {p.date && (
                                  <span className="ml-2 text-xs text-gray-500">{p.date}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {(p.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) uploadMutation.mutate(file)
                }}
              >
                <Upload className="w-8 h-8 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Click to select or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, Images (JPG, PNG), or Text files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {uploadMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}

              {uploadMutation.isError && (
                <p className="text-sm text-red-600">
                  Upload failed. Please try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedDoc.fileName}</h3>
                <p className="text-sm text-gray-500">
                  {typeLabels[selectedDoc.documentType] || selectedDoc.documentType}
                </p>
              </div>
              <button onClick={() => setSelectedDoc(null)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedDoc.extractedText ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                    {selectedDoc.extractedText}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No text content available</p>
                  <button
                    onClick={() => {
                      setSelectedDoc(null)
                      processMutation.mutate(selectedDoc.id)
                    }}
                    className="mt-4 btn-primary"
                  >
                    Process Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
