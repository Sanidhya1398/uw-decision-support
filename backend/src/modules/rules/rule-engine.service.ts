import { Injectable } from '@nestjs/common';

/**
 * Condition operators supported by the rule engine
 */
export type ConditionOperator =
  | '==' | '!=' | '<' | '>' | '<=' | '>='
  | 'contains' | 'in' | 'matches' | 'exists' | 'notExists';

/**
 * A leaf condition that compares a field value
 */
export interface LeafCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  caseInsensitive?: boolean;
}

/**
 * A compound condition with AND/OR logic
 */
export interface CompoundCondition {
  operator: 'AND' | 'OR';
  conditions: (LeafCondition | CompoundCondition)[];
}

/**
 * Union type for any condition
 */
export type Condition = LeafCondition | CompoundCondition;

/**
 * Result of evaluating a condition on array fields
 */
export interface ConditionResult {
  matched: boolean;
  matchedItems?: any[];  // For array field matching, contains the matched items
  context?: Record<string, any>;  // Additional context from evaluation
}

/**
 * Generic rule structure
 */
export interface Rule<TActions = any> {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: Condition;
  actions?: TActions;
  alwaysInclude?: boolean;
}

/**
 * Result of evaluating a rule
 */
export interface RuleEvaluationResult<TActions = any> {
  rule: Rule<TActions>;
  matched: boolean;
  matchedItems?: any[];
  evaluationContext?: Record<string, any>;
}

@Injectable()
export class RuleEngineService {
  /**
   * Evaluate a single condition against data context
   */
  evaluateCondition(condition: Condition, context: Record<string, any>): ConditionResult {
    if (this.isCompoundCondition(condition)) {
      return this.evaluateCompoundCondition(condition, context);
    }
    return this.evaluateLeafCondition(condition, context);
  }

  /**
   * Evaluate multiple rules against data context
   * Returns rules that matched, sorted by priority (highest first)
   */
  evaluateRules<TActions = any>(
    rules: Rule<TActions>[],
    context: Record<string, any>
  ): RuleEvaluationResult<TActions>[] {
    const results: RuleEvaluationResult<TActions>[] = [];

    // Filter to enabled rules and sort by priority
    const enabledRules = rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of enabledRules) {
      const conditionResult = this.evaluateCondition(rule.conditions, context);

      if (conditionResult.matched || rule.alwaysInclude) {
        results.push({
          rule,
          matched: conditionResult.matched,
          matchedItems: conditionResult.matchedItems,
          evaluationContext: conditionResult.context,
        });
      }
    }

    return results;
  }

  /**
   * Check if a condition is a compound condition
   */
  private isCompoundCondition(condition: Condition): condition is CompoundCondition {
    return 'conditions' in condition && Array.isArray(condition.conditions);
  }

  /**
   * Evaluate a compound AND/OR condition
   */
  private evaluateCompoundCondition(
    condition: CompoundCondition,
    context: Record<string, any>
  ): ConditionResult {
    const { operator, conditions } = condition;
    let allMatchedItems: any[] = [];
    let combinedContext: Record<string, any> = {};

    if (operator === 'AND') {
      for (const subCondition of conditions) {
        const result = this.evaluateCondition(subCondition, context);
        if (!result.matched) {
          return { matched: false };
        }
        if (result.matchedItems) {
          allMatchedItems = [...allMatchedItems, ...result.matchedItems];
        }
        if (result.context) {
          combinedContext = { ...combinedContext, ...result.context };
        }
      }
      return {
        matched: true,
        matchedItems: allMatchedItems.length > 0 ? allMatchedItems : undefined,
        context: Object.keys(combinedContext).length > 0 ? combinedContext : undefined,
      };
    }

    if (operator === 'OR') {
      for (const subCondition of conditions) {
        const result = this.evaluateCondition(subCondition, context);
        if (result.matched) {
          return {
            matched: true,
            matchedItems: result.matchedItems,
            context: result.context,
          };
        }
      }
      return { matched: false };
    }

    return { matched: false };
  }

  /**
   * Evaluate a leaf condition
   */
  private evaluateLeafCondition(
    condition: LeafCondition,
    context: Record<string, any>
  ): ConditionResult {
    const { field, operator, value, caseInsensitive } = condition;

    // Handle array field notation: field[].property or field[filter].property
    if (field.includes('[]') || field.match(/\[[^\]]+\]/)) {
      return this.evaluateArrayFieldCondition(condition, context);
    }

    // Handle aggregate notation: field[severity=critical].count
    if (field.includes('.count')) {
      return this.evaluateAggregateCondition(condition, context);
    }

    // Get the field value from context
    const fieldValue = this.getFieldValue(field, context);

    // Evaluate the condition
    const matched = this.compareValues(fieldValue, operator, value, caseInsensitive);

    return { matched };
  }

  /**
   * Evaluate a condition on array fields
   * Supports: medicalDisclosures[].conditionName
   */
  private evaluateArrayFieldCondition(
    condition: LeafCondition,
    context: Record<string, any>
  ): ConditionResult {
    const { field, operator, value, caseInsensitive } = condition;

    // Parse the array field notation
    const arrayMatch = field.match(/^([^[\]]+)\[\]\.(.+)$/);
    if (!arrayMatch) {
      // Handle filtered array: field[filter].property
      return this.evaluateFilteredArrayCondition(condition, context);
    }

    const [, arrayField, property] = arrayMatch;
    const array = this.getFieldValue(arrayField, context);

    if (!Array.isArray(array)) {
      return { matched: false };
    }

    // Find all items that match the condition
    const matchedItems: any[] = [];
    for (const item of array) {
      const itemValue = this.getFieldValue(property, item);
      if (this.compareValues(itemValue, operator, value, caseInsensitive)) {
        matchedItems.push(item);
      }
    }

    if (matchedItems.length > 0) {
      return {
        matched: true,
        matchedItems,
        context: { matchedDisclosure: matchedItems[0] },  // First match for template substitution
      };
    }

    return { matched: false };
  }

  /**
   * Evaluate a condition on filtered arrays
   * Supports: riskFactors[severity=critical].count
   */
  private evaluateFilteredArrayCondition(
    condition: LeafCondition,
    context: Record<string, any>
  ): ConditionResult {
    const { field, operator, value } = condition;

    // Parse: arrayField[filterKey=filterValue].aggregateOp
    const filterMatch = field.match(/^([^[\]]+)\[([^=]+)=([^\]]+)\]\.(.+)$/);
    if (!filterMatch) {
      return { matched: false };
    }

    const [, arrayField, filterKey, filterValue, aggregateOp] = filterMatch;
    const array = this.getFieldValue(arrayField, context);

    if (!Array.isArray(array)) {
      return { matched: false };
    }

    // Filter the array
    const filteredItems = array.filter(item => {
      const itemValue = this.getFieldValue(filterKey, item);
      return String(itemValue).toLowerCase() === filterValue.toLowerCase();
    });

    // Apply aggregate operation
    if (aggregateOp === 'count') {
      const count = filteredItems.length;
      return {
        matched: this.compareValues(count, operator, value, false),
        context: { [`${arrayField}.${filterKey}=${filterValue}.count`]: count },
      };
    }

    return { matched: false };
  }

  /**
   * Evaluate aggregate conditions
   */
  private evaluateAggregateCondition(
    condition: LeafCondition,
    context: Record<string, any>
  ): ConditionResult {
    // This is handled by evaluateFilteredArrayCondition for filtered arrays
    // For simple array.count, handle here
    const { field, operator, value } = condition;

    const countMatch = field.match(/^(.+)\.count$/);
    if (!countMatch) {
      return { matched: false };
    }

    const arrayField = countMatch[1];
    const array = this.getFieldValue(arrayField, context);

    if (!Array.isArray(array)) {
      return { matched: false };
    }

    return {
      matched: this.compareValues(array.length, operator, value, false),
    };
  }

  /**
   * Get a nested field value from an object using dot notation
   */
  getFieldValue(field: string, obj: Record<string, any>): any {
    if (!obj || !field) {
      return undefined;
    }

    const parts = field.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Compare two values using the specified operator
   */
  private compareValues(
    fieldValue: any,
    operator: ConditionOperator,
    compareValue: any,
    caseInsensitive?: boolean
  ): boolean {
    // Handle null/undefined
    if (operator === 'exists') {
      return fieldValue !== null && fieldValue !== undefined;
    }
    if (operator === 'notExists') {
      return fieldValue === null || fieldValue === undefined;
    }

    if (fieldValue === null || fieldValue === undefined) {
      return operator === '!=' && compareValue !== null && compareValue !== undefined;
    }

    // Normalize strings for case-insensitive comparison
    let normalizedField = fieldValue;
    let normalizedCompare = compareValue;

    if (caseInsensitive && typeof fieldValue === 'string') {
      normalizedField = fieldValue.toLowerCase();
    }
    if (caseInsensitive && typeof compareValue === 'string') {
      normalizedCompare = compareValue.toLowerCase();
    }

    switch (operator) {
      case '==':
        return normalizedField === normalizedCompare;

      case '!=':
        return normalizedField !== normalizedCompare;

      case '<':
        return Number(fieldValue) < Number(compareValue);

      case '>':
        return Number(fieldValue) > Number(compareValue);

      case '<=':
        return Number(fieldValue) <= Number(compareValue);

      case '>=':
        return Number(fieldValue) >= Number(compareValue);

      case 'contains':
        if (typeof normalizedField === 'string') {
          return normalizedField.includes(normalizedCompare);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(item =>
            caseInsensitive && typeof item === 'string'
              ? item.toLowerCase().includes(normalizedCompare)
              : item === compareValue
          );
        }
        return false;

      case 'in':
        if (Array.isArray(compareValue)) {
          return caseInsensitive && typeof fieldValue === 'string'
            ? compareValue.some(v =>
                typeof v === 'string'
                  ? v.toLowerCase() === normalizedField
                  : v === fieldValue
              )
            : compareValue.includes(fieldValue);
        }
        return false;

      case 'matches':
        if (typeof fieldValue === 'string') {
          const flags = caseInsensitive ? 'i' : '';
          const regex = new RegExp(compareValue, flags);
          return regex.test(fieldValue);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Substitute template variables in a string
   * Supports: {{field.path}} syntax
   */
  substituteTemplate(template: string, context: Record<string, any>): string {
    if (!template) return template;

    return template.replace(/\{\{([^}]+)\}\}/g, (match, fieldPath) => {
      const value = this.getFieldValue(fieldPath.trim(), context);
      return value !== undefined && value !== null ? String(value) : 'Not specified';
    });
  }

  /**
   * Substitute template variables in an object recursively
   */
  substituteTemplateInObject<T extends Record<string, any>>(
    obj: T,
    context: Record<string, any>
  ): T {
    if (!obj) return obj;

    const result: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.substituteTemplate(value, context);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.substituteTemplateInObject(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Calculate computed fields for rule evaluation context
   */
  enrichContextWithComputedFields(context: Record<string, any>): Record<string, any> {
    const enriched = { ...context };

    // Calculate age if dateOfBirth is present
    if (context.applicant?.dateOfBirth && !context.applicant?.age) {
      enriched.applicant = {
        ...enriched.applicant,
        age: this.calculateAge(context.applicant.dateOfBirth),
      };
    }

    // Calculate BMI if height and weight are present
    if (context.applicant?.heightCm && context.applicant?.weightKg && !context.applicant?.bmi) {
      enriched.applicant = {
        ...enriched.applicant,
        bmi: this.calculateBMI(context.applicant.heightCm, context.applicant.weightKg),
      };
    }

    // Add risk factor counts
    if (context.riskFactors && Array.isArray(context.riskFactors)) {
      const elevatedCount = context.riskFactors.filter(
        (f: any) => f.severity === 'high' || f.severity === 'moderate' ||
                    f.severity === 'HIGH' || f.severity === 'MODERATE'
      ).length;
      // Preserve the array (spreading into {} would destroy Array.isArray check)
      const riskFactorsArray = [...context.riskFactors] as any;
      riskFactorsArray.elevatedCount = elevatedCount;
      enriched.riskFactors = riskFactorsArray;
    }

    return enriched;
  }

  private calculateAge(dateOfBirth: Date | string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }
}
