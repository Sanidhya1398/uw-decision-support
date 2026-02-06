import { useState } from 'react'

interface LeafCondition {
  field: string
  operator: string
  value: any
  caseInsensitive?: boolean
}

interface CompoundCondition {
  operator: 'AND' | 'OR'
  conditions: (LeafCondition | CompoundCondition)[]
}

type Condition = LeafCondition | CompoundCondition

interface ConditionBuilderProps {
  condition: Condition
  onChange: (condition: Condition) => void
  depth?: number
}

const OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '>=', label: 'greater than or equal' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less than or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in array' },
  { value: 'matches', label: 'matches regex' },
  { value: 'exists', label: 'exists' },
  { value: 'notExists', label: 'does not exist' },
]

const FIELD_SUGGESTIONS = [
  'applicant.age',
  'applicant.bmi',
  'applicant.smokingStatus',
  'applicant.heightCm',
  'applicant.weightKg',
  'case.sumAssured',
  'case.status',
  'medicalDisclosures[].disclosureType',
  'medicalDisclosures[].conditionName',
  'medicalDisclosures[].conditionStatus',
  'medicalDisclosures[].familyCondition',
  'medicalDisclosures[].familyRelationship',
  'riskFactors[severity=critical].count',
  'riskFactors[severity=high].count',
  'riskFactors[severity=moderate].count',
]

function isCompoundCondition(condition: Condition): condition is CompoundCondition {
  return 'conditions' in condition && Array.isArray(condition.conditions)
}

function LeafConditionEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: LeafCondition
  onChange: (condition: LeafCondition) => void
  onRemove?: () => void
}) {
  const [showFieldSuggestions, setShowFieldSuggestions] = useState(false)

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
      <div className="relative flex-1">
        <input
          type="text"
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value })}
          onFocus={() => setShowFieldSuggestions(true)}
          onBlur={() => setTimeout(() => setShowFieldSuggestions(false), 200)}
          placeholder="Field path..."
          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {showFieldSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {FIELD_SUGGESTIONS.filter(f => f.includes(condition.field)).map((field) => (
              <button
                key={field}
                type="button"
                className="w-full px-3 py-1 text-left text-sm hover:bg-gray-100"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange({ ...condition, field })
                  setShowFieldSuggestions(false)
                }}
              >
                {field}
              </button>
            ))}
          </div>
        )}
      </div>

      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {!['exists', 'notExists'].includes(condition.operator) && (
        <input
          type="text"
          value={String(condition.value ?? '')}
          onChange={(e) => {
            const val = e.target.value
            // Try to parse as number or boolean
            let parsedValue: any = val
            if (val === 'true') parsedValue = true
            else if (val === 'false') parsedValue = false
            else if (!isNaN(Number(val)) && val !== '') parsedValue = Number(val)
            onChange({ ...condition, value: parsedValue })
          }}
          placeholder="Value..."
          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      <label className="flex items-center gap-1 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={condition.caseInsensitive ?? false}
          onChange={(e) => onChange({ ...condition, caseInsensitive: e.target.checked })}
          className="rounded"
        />
        Case insensitive
      </label>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="Remove condition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function ConditionBuilder({ condition, onChange, depth = 0 }: ConditionBuilderProps) {
  const borderColors = ['border-blue-300', 'border-green-300', 'border-purple-300', 'border-orange-300']
  const bgColors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50']

  if (!isCompoundCondition(condition)) {
    return (
      <LeafConditionEditor
        condition={condition}
        onChange={onChange}
      />
    )
  }

  const addLeafCondition = () => {
    onChange({
      ...condition,
      conditions: [
        ...condition.conditions,
        { field: '', operator: '==', value: '' },
      ],
    })
  }

  const addGroupCondition = () => {
    onChange({
      ...condition,
      conditions: [
        ...condition.conditions,
        {
          operator: 'AND',
          conditions: [{ field: '', operator: '==', value: '' }],
        },
      ],
    })
  }

  const updateConditionAt = (index: number, updated: Condition) => {
    const newConditions = [...condition.conditions]
    newConditions[index] = updated
    onChange({ ...condition, conditions: newConditions })
  }

  const removeConditionAt = (index: number) => {
    const newConditions = condition.conditions.filter((_, i) => i !== index)
    onChange({ ...condition, conditions: newConditions })
  }

  const toggleOperator = () => {
    onChange({
      ...condition,
      operator: condition.operator === 'AND' ? 'OR' : 'AND',
    })
  }

  return (
    <div className={`p-3 rounded-lg border-2 ${borderColors[depth % borderColors.length]} ${bgColors[depth % bgColors.length]}`}>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={toggleOperator}
          className={`px-3 py-1 text-xs font-semibold rounded ${
            condition.operator === 'AND'
              ? 'bg-blue-600 text-white'
              : 'bg-orange-600 text-white'
          }`}
        >
          {condition.operator}
        </button>
        <span className="text-xs text-gray-500">
          {condition.operator === 'AND' ? 'All conditions must match' : 'Any condition must match'}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={addLeafCondition}
          className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50"
        >
          + Condition
        </button>
        <button
          type="button"
          onClick={addGroupCondition}
          className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50"
        >
          + Group
        </button>
      </div>

      <div className="space-y-2">
        {condition.conditions.map((subCondition, index) => (
          <div key={index} className="relative">
            {isCompoundCondition(subCondition) ? (
              <div className="relative">
                <ConditionBuilder
                  condition={subCondition}
                  onChange={(updated) => updateConditionAt(index, updated)}
                  depth={depth + 1}
                />
                <button
                  type="button"
                  onClick={() => removeConditionAt(index)}
                  className="absolute -top-1 -right-1 p-1 bg-white border border-red-300 rounded-full text-red-600 hover:bg-red-50"
                  title="Remove group"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <LeafConditionEditor
                condition={subCondition}
                onChange={(updated) => updateConditionAt(index, updated)}
                onRemove={condition.conditions.length > 1 ? () => removeConditionAt(index) : undefined}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
