import { useState } from 'react'
import clsx from 'clsx'
import {
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Tag,
} from 'lucide-react'

// Pre-defined reasoning tags for common override scenarios
const REASONING_TAGS = {
  complexity_tier: [
    'Additional medical context available',
    'Historical claim data favorable',
    'Applicant stability factors',
    'Industry experience judgment',
    'Similar case precedent',
    'Compensating factors present',
    'Risk mitigants identified',
    'Protocol exception justified',
  ],
  risk_severity: [
    'Condition well-controlled',
    'Recent improvement documented',
    'Favorable medication response',
    'No recent complications',
    'Lifestyle changes noted',
    'Family history mitigated',
    'Age-related adjustment',
    'Disclosure clarification',
  ],
  test_recommendation: [
    'Recent test results available',
    'Alternative test sufficient',
    'Low yield expected',
    'Cost-benefit consideration',
    'Applicant medical records clear',
    'Clinical judgment override',
    'Protocol not applicable',
    'Risk already quantified',
  ],
  decision_option: [
    'Overall risk acceptable',
    'Pricing adequately addresses risk',
    'Compensating factors present',
    'Similar case outcomes favorable',
    'Medical director guidance',
    'Reinsurer requirements met',
    'Business consideration',
    'Applicant profile strong',
  ],
}

export interface OverrideReasoningModalProps {
  isOpen: boolean
  onClose: () => void
  overrideType: 'complexity_tier' | 'risk_severity' | 'test_recommendation' | 'decision_option'
  systemRecommendation: string
  systemRecommendationDetails?: Record<string, unknown>
  systemConfidence?: number
  options?: { value: string; label: string }[]
  currentValue?: string
  onSubmit: (data: {
    underwriterChoice: string
    reasoning: string
    reasoningTags: string[]
  }) => Promise<void>
  title: string
  description?: string
}

export default function OverrideReasoningModal({
  isOpen,
  onClose,
  overrideType,
  systemRecommendation,
  systemRecommendationDetails,
  systemConfidence,
  options = [],
  currentValue,
  onSubmit,
  title,
  description,
}: OverrideReasoningModalProps) {
  const [selectedValue, setSelectedValue] = useState(currentValue || '')
  const [reasoning, setReasoning] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tags = REASONING_TAGS[overrideType] || []

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    if (!selectedValue) {
      setError('Please select a new value')
      return
    }
    if (!reasoning.trim() && selectedTags.length === 0) {
      setError('Please provide a reason for this override')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        underwriterChoice: selectedValue,
        reasoning: reasoning.trim(),
        reasoningTags: selectedTags,
      })
      onClose()
    } catch (err) {
      setError('Failed to submit override. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDirection = () => {
    if (!options.length || !selectedValue || !currentValue) return null
    const currentIndex = options.findIndex(o => o.value === currentValue)
    const selectedIndex = options.findIndex(o => o.value === selectedValue)
    if (selectedIndex > currentIndex) return 'upgrade'
    if (selectedIndex < currentIndex) return 'downgrade'
    return null
  }

  const direction = getDirection()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-gray-600 mb-6">{description}</p>
        )}

        {/* System Recommendation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">System Recommendation</span>
          </div>
          <p className="text-lg font-semibold text-blue-900">{systemRecommendation}</p>
          {systemConfidence !== undefined && (
            <p className="text-sm text-blue-700 mt-1">
              Confidence: {(systemConfidence * 100).toFixed(0)}%
            </p>
          )}
          {systemRecommendationDetails && Object.keys(systemRecommendationDetails).length > 0 && (
            <div className="mt-2 text-sm text-blue-800">
              {Object.entries(systemRecommendationDetails).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Override Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select New Value
          </label>
          <div className="grid grid-cols-2 gap-3">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedValue(option.value)}
                className={clsx(
                  'p-3 border-2 rounded-lg text-left transition-all',
                  selectedValue === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300',
                  option.value === currentValue && 'opacity-50'
                )}
                disabled={option.value === currentValue}
              >
                <span className="font-medium">{option.label}</span>
                {option.value === currentValue && (
                  <span className="ml-2 text-xs text-gray-500">(Current)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direction Indicator */}
        {direction && (
          <div className={clsx(
            'flex items-center gap-2 p-3 rounded-lg mb-6',
            direction === 'upgrade' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'
          )}>
            {direction === 'upgrade' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            <span className="font-medium">
              {direction === 'upgrade' ? 'More Conservative' : 'Less Conservative'}
            </span>
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">
              {direction === 'upgrade'
                ? 'This change increases caution/restrictions'
                : 'This change decreases caution/restrictions'}
            </span>
          </div>
        )}

        {/* Reasoning Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Quick Reason Tags (select applicable)
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm border transition-all',
                  selectedTags.includes(tag)
                    ? 'border-primary-500 bg-primary-100 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Free-form Reasoning */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Reasoning
            {selectedTags.length === 0 && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Provide detailed reasoning for this override..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            This reasoning will be recorded for training and audit purposes.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isSubmitting || !selectedValue}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Override'}
          </button>
        </div>
      </div>
    </div>
  )
}
