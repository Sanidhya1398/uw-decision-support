import { Injectable, BadRequestException } from '@nestjs/common';
import { Rule, Condition, LeafCondition, CompoundCondition, ConditionOperator } from './rule-engine.service';
import { RuleType, RiskRule, TestProtocol, DecisionRule } from './rules-config.service';

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Valid operators for conditions
 */
const VALID_OPERATORS: ConditionOperator[] = [
  '==', '!=', '<', '>', '<=', '>=', 'contains', 'in', 'matches', 'exists', 'notExists'
];

/**
 * Valid risk categories
 */
const VALID_RISK_CATEGORIES = ['MEDICAL', 'LIFESTYLE', 'FAMILY_HISTORY', 'FINANCIAL', 'OCCUPATIONAL'];

/**
 * Valid severity levels
 */
const VALID_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

/**
 * Valid test requirement types
 */
const VALID_REQUIREMENT_TYPES = ['MANDATORY', 'CONDITIONAL', 'SUGGESTED', 'ADDITIONAL'];

/**
 * Valid decision types
 */
const VALID_DECISION_TYPES = ['STANDARD_ACCEPTANCE', 'MODIFIED_ACCEPTANCE', 'DEFERRAL', 'REFERRAL', 'DECLINE'];

@Injectable()
export class RuleValidatorService {
  /**
   * Validate a rule based on its type
   */
  validate(type: RuleType, rule: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Common validation
    this.validateCommonFields(rule, errors, warnings);

    // Type-specific validation
    switch (type) {
      case 'risk':
        this.validateRiskRule(rule, errors, warnings);
        break;
      case 'test-protocols':
        this.validateTestProtocol(rule, errors, warnings);
        break;
      case 'decision':
        this.validateDecisionRule(rule, errors, warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate and throw if invalid
   */
  validateOrThrow(type: RuleType, rule: any): void {
    const result = this.validate(type, rule);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Rule validation failed',
        errors: result.errors,
        warnings: result.warnings,
      });
    }
  }

  /**
   * Validate common rule fields
   */
  private validateCommonFields(rule: any, errors: ValidationError[], warnings: ValidationError[]): void {
    // Required fields
    if (!rule.id || typeof rule.id !== 'string') {
      errors.push({ field: 'id', message: 'Rule ID is required and must be a string', severity: 'error' });
    } else if (!/^[A-Z]+_\d{3}$/i.test(rule.id)) {
      warnings.push({ field: 'id', message: 'Rule ID should follow pattern: PREFIX_NNN (e.g., AGE_001)', severity: 'warning' });
    }

    if (!rule.name || typeof rule.name !== 'string') {
      errors.push({ field: 'name', message: 'Rule name is required and must be a string', severity: 'error' });
    }

    if (typeof rule.enabled !== 'boolean') {
      errors.push({ field: 'enabled', message: 'Rule enabled must be a boolean', severity: 'error' });
    }

    if (typeof rule.priority !== 'number' || rule.priority < 0) {
      errors.push({ field: 'priority', message: 'Rule priority must be a non-negative number', severity: 'error' });
    }

    // Validate conditions
    if (!rule.conditions) {
      errors.push({ field: 'conditions', message: 'Rule conditions are required', severity: 'error' });
    } else {
      this.validateCondition(rule.conditions, 'conditions', errors, warnings);
    }
  }

  /**
   * Validate a condition tree recursively
   */
  private validateCondition(
    condition: Condition,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (this.isCompoundCondition(condition)) {
      this.validateCompoundCondition(condition, path, errors, warnings);
    } else {
      this.validateLeafCondition(condition as LeafCondition, path, errors, warnings);
    }
  }

  /**
   * Check if condition is compound
   */
  private isCompoundCondition(condition: Condition): condition is CompoundCondition {
    return 'conditions' in condition && Array.isArray(condition.conditions);
  }

  /**
   * Validate a compound condition
   */
  private validateCompoundCondition(
    condition: CompoundCondition,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!['AND', 'OR'].includes(condition.operator)) {
      errors.push({
        field: `${path}.operator`,
        message: `Compound condition operator must be 'AND' or 'OR', got '${condition.operator}'`,
        severity: 'error',
      });
    }

    if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) {
      errors.push({
        field: `${path}.conditions`,
        message: 'Compound condition must have at least one sub-condition',
        severity: 'error',
      });
    } else {
      condition.conditions.forEach((subCondition, index) => {
        this.validateCondition(subCondition, `${path}.conditions[${index}]`, errors, warnings);
      });
    }
  }

  /**
   * Validate a leaf condition
   */
  private validateLeafCondition(
    condition: LeafCondition,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!condition.field || typeof condition.field !== 'string') {
      errors.push({
        field: `${path}.field`,
        message: 'Condition field is required and must be a string',
        severity: 'error',
      });
    }

    if (!VALID_OPERATORS.includes(condition.operator)) {
      errors.push({
        field: `${path}.operator`,
        message: `Invalid operator '${condition.operator}'. Valid operators: ${VALID_OPERATORS.join(', ')}`,
        severity: 'error',
      });
    }

    if (condition.value === undefined && !['exists', 'notExists'].includes(condition.operator)) {
      errors.push({
        field: `${path}.value`,
        message: 'Condition value is required (except for exists/notExists operators)',
        severity: 'error',
      });
    }

    // Validate field path format
    if (condition.field) {
      const validFieldPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\[\]|\[[^\]]+\])?(\.[a-zA-Z_][a-zA-Z0-9_]*(\[\]|\[[^\]]+\])?)*$/;
      if (!validFieldPattern.test(condition.field)) {
        warnings.push({
          field: `${path}.field`,
          message: `Field path '${condition.field}' may be invalid. Expected format: field.subfield or field[].subfield`,
          severity: 'warning',
        });
      }
    }

    // Validate regex pattern if matches operator
    if (condition.operator === 'matches' && typeof condition.value === 'string') {
      try {
        new RegExp(condition.value);
      } catch {
        errors.push({
          field: `${path}.value`,
          message: `Invalid regex pattern: ${condition.value}`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate risk rule specific fields
   */
  private validateRiskRule(rule: RiskRule, errors: ValidationError[], warnings: ValidationError[]): void {
    // Category validation
    if (!rule.category || !VALID_RISK_CATEGORIES.includes(rule.category)) {
      errors.push({
        field: 'category',
        message: `Invalid category '${rule.category}'. Valid categories: ${VALID_RISK_CATEGORIES.join(', ')}`,
        severity: 'error',
      });
    }

    // Actions validation
    if (!rule.actions) {
      errors.push({ field: 'actions', message: 'Risk rule must have actions defined', severity: 'error' });
    } else {
      this.validateRiskActions(rule.actions, errors, warnings);
    }
  }

  /**
   * Validate risk rule actions
   */
  private validateRiskActions(
    actions: RiskRule['actions'],
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!actions.createRiskFactor) {
      errors.push({
        field: 'actions.createRiskFactor',
        message: 'Risk rule must define createRiskFactor action',
        severity: 'error',
      });
      return;
    }

    const rf = actions.createRiskFactor;

    if (!rf.factorName) {
      errors.push({
        field: 'actions.createRiskFactor.factorName',
        message: 'Factor name is required',
        severity: 'error',
      });
    }

    if (!rf.factorDescriptionTemplate) {
      errors.push({
        field: 'actions.createRiskFactor.factorDescriptionTemplate',
        message: 'Factor description template is required',
        severity: 'error',
      });
    }

    if (rf.category && !VALID_RISK_CATEGORIES.includes(rf.category)) {
      errors.push({
        field: 'actions.createRiskFactor.category',
        message: `Invalid category '${rf.category}'`,
        severity: 'error',
      });
    }

    if (rf.severity && !VALID_SEVERITIES.includes(rf.severity)) {
      errors.push({
        field: 'actions.createRiskFactor.severity',
        message: `Invalid severity '${rf.severity}'`,
        severity: 'error',
      });
    }

    // Validate severity rules
    if (actions.severityRules) {
      actions.severityRules.forEach((sr, index) => {
        if (sr.severity && !VALID_SEVERITIES.includes(sr.severity)) {
          errors.push({
            field: `actions.severityRules[${index}].severity`,
            message: `Invalid severity '${sr.severity}'`,
            severity: 'error',
          });
        }
        if (sr.condition) {
          this.validateCondition(sr.condition, `actions.severityRules[${index}].condition`, errors, warnings);
        }
      });
    }
  }

  /**
   * Validate test protocol specific fields
   */
  private validateTestProtocol(rule: TestProtocol, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!rule.tests || !Array.isArray(rule.tests) || rule.tests.length === 0) {
      errors.push({
        field: 'tests',
        message: 'Test protocol must have at least one test defined',
        severity: 'error',
      });
      return;
    }

    rule.tests.forEach((test, index) => {
      if (!test.testCode) {
        errors.push({
          field: `tests[${index}].testCode`,
          message: 'Test code is required',
          severity: 'error',
        });
      }

      if (!test.testName) {
        errors.push({
          field: `tests[${index}].testName`,
          message: 'Test name is required',
          severity: 'error',
        });
      }

      if (!VALID_REQUIREMENT_TYPES.includes(test.requirementType)) {
        errors.push({
          field: `tests[${index}].requirementType`,
          message: `Invalid requirement type '${test.requirementType}'`,
          severity: 'error',
        });
      }

      if (typeof test.estimatedCost !== 'number' || test.estimatedCost < 0) {
        warnings.push({
          field: `tests[${index}].estimatedCost`,
          message: 'Estimated cost should be a non-negative number',
          severity: 'warning',
        });
      }

      if (typeof test.estimatedTurnaroundDays !== 'number' || test.estimatedTurnaroundDays < 0) {
        warnings.push({
          field: `tests[${index}].estimatedTurnaroundDays`,
          message: 'Estimated turnaround days should be a non-negative number',
          severity: 'warning',
        });
      }
    });
  }

  /**
   * Validate decision rule specific fields
   */
  private validateDecisionRule(rule: DecisionRule, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!rule.decisionType || !VALID_DECISION_TYPES.includes(rule.decisionType)) {
      errors.push({
        field: 'decisionType',
        message: `Invalid decision type '${rule.decisionType}'. Valid types: ${VALID_DECISION_TYPES.join(', ')}`,
        severity: 'error',
      });
    }

    if (!rule.output) {
      errors.push({ field: 'output', message: 'Decision rule must have output defined', severity: 'error' });
      return;
    }

    if (!rule.output.name) {
      errors.push({ field: 'output.name', message: 'Output name is required', severity: 'error' });
    }

    if (!rule.output.description) {
      errors.push({ field: 'output.description', message: 'Output description is required', severity: 'error' });
    }

    if (!rule.output.guidelineReference) {
      warnings.push({
        field: 'output.guidelineReference',
        message: 'Guideline reference is recommended',
        severity: 'warning',
      });
    }

    if (!rule.output.authorityRequired) {
      warnings.push({
        field: 'output.authorityRequired',
        message: 'Authority required is recommended',
        severity: 'warning',
      });
    }

    // Validate nested conditions
    if (rule.output.weighingFactorsCondition?.condition) {
      this.validateCondition(
        rule.output.weighingFactorsCondition.condition,
        'output.weighingFactorsCondition.condition',
        errors,
        warnings
      );
    }

    if (rule.output.recommendedCondition?.condition) {
      this.validateCondition(
        rule.output.recommendedCondition.condition,
        'output.recommendedCondition.condition',
        errors,
        warnings
      );
    }
  }

  /**
   * Validate batch of rules
   */
  validateBatch(type: RuleType, rules: any[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Check for duplicate IDs
    const ids = new Set<string>();
    rules.forEach((rule, index) => {
      if (rule.id) {
        if (ids.has(rule.id)) {
          allErrors.push({
            field: `rules[${index}].id`,
            message: `Duplicate rule ID: ${rule.id}`,
            severity: 'error',
          });
        }
        ids.add(rule.id);
      }

      // Validate each rule
      const result = this.validate(type, rule);
      result.errors.forEach(e => {
        allErrors.push({ ...e, field: `rules[${index}].${e.field}` });
      });
      result.warnings.forEach(w => {
        allWarnings.push({ ...w, field: `rules[${index}].${w.field}` });
      });
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}
