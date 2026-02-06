import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Rule, Condition } from './rule-engine.service';

/**
 * Rule types supported by the config service
 */
export type RuleType = 'risk' | 'test-protocols' | 'decision';

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  version: string;
  timestamp: string;
  modifiedBy?: string;
  changeDescription?: string;
  snapshot: string;  // JSON string of the rules at this version
}

/**
 * Risk rule structure
 */
export interface RiskRule extends Rule {
  category: string;
  actions: {
    createRiskFactor: {
      factorName: string;
      factorDescriptionTemplate: string;
      category: string;
      impactDirection: string;
      source: string;
      severity?: string;
      complexityWeight?: number;
      supportingEvidenceTemplate?: { description: string; valueTemplate: string }[];
    };
    severityRules?: Array<{
      condition?: Condition;
      severity: string;
      complexityWeight: number;
      defaultSeverity?: string;
      defaultComplexityWeight?: number;
    }>;
  };
}

/**
 * Test protocol structure
 */
export interface TestProtocol extends Omit<Rule, 'actions'> {
  tests: Array<{
    testCode: string;
    testName: string;
    testCategory: string;
    requirementType: string;
    clinicalRationale: string;
    protocolReference: string;
    estimatedCost: number;
    estimatedTurnaroundDays: number;
    skipIfExists?: boolean;
  }>;
}

/**
 * Decision rule structure
 */
export interface DecisionRule extends Rule {
  decisionType: string;
  output: {
    name: string;
    description: string;
    guidelineReference: string;
    authorityRequired: string;
    supportingFactors: { factor: string; description: string }[];
    weighingFactors?: { factor: string; description: string }[];
    weighingFactorsTemplate?: { factor: string; descriptionTemplate: string }[];
    weighingFactorsCondition?: {
      condition: Condition;
      factors: { factor: string; description: string }[];
    };
    recommended?: boolean;
    recommendedCondition?: {
      condition: Condition;
      recommended: boolean;
    };
  };
}

/**
 * Config file structure
 */
interface RulesConfig<T> {
  version: string;
  lastModified: string;
  rules?: T[];
  protocols?: T[];
}

@Injectable()
export class RulesConfigService {
  private configDir = path.join(__dirname, '../../../config');
  private historyDir = path.join(this.configDir, 'history');

  constructor() {
    // Ensure history directory exists
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }

  /**
   * Get the config file path for a rule type
   */
  private getConfigPath(type: RuleType): string {
    const fileMap: Record<RuleType, string> = {
      'risk': 'risk-rules.json',
      'test-protocols': 'test-protocols.json',
      'decision': 'decision-rules.json',
    };
    return path.join(this.configDir, fileMap[type]);
  }

  /**
   * Get the history file path for a rule type
   */
  private getHistoryPath(type: RuleType): string {
    return path.join(this.historyDir, `${type}-history.json`);
  }

  /**
   * Load rules config from file
   */
  private loadConfig<T>(type: RuleType): RulesConfig<T> {
    const configPath = this.getConfigPath(type);
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        rules: [],
        protocols: [],
      };
    }
  }

  /**
   * Save rules config to file
   */
  private saveConfig<T>(type: RuleType, config: RulesConfig<T>, modifiedBy?: string): void {
    const configPath = this.getConfigPath(type);

    // Save version history before updating
    this.saveVersionHistory(type, config, modifiedBy);

    // Increment version
    config.version = this.incrementVersion(config.version);
    config.lastModified = new Date().toISOString();

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Save version history entry
   */
  private saveVersionHistory<T>(type: RuleType, config: RulesConfig<T>, modifiedBy?: string): void {
    const historyPath = this.getHistoryPath(type);
    let history: VersionHistoryEntry[] = [];

    try {
      const content = fs.readFileSync(historyPath, 'utf-8');
      history = JSON.parse(content);
    } catch {
      // No history file yet
    }

    // Keep last 50 versions
    if (history.length >= 50) {
      history = history.slice(-49);
    }

    history.push({
      version: config.version,
      timestamp: new Date().toISOString(),
      modifiedBy,
      changeDescription: 'Rule update',
      snapshot: JSON.stringify(config),
    });

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  /**
   * Get rules array from config based on type
   */
  private getRulesArray<T>(config: RulesConfig<T>, type: RuleType): T[] {
    if (type === 'test-protocols') {
      return (config.protocols || []) as T[];
    }
    return (config.rules || []) as T[];
  }

  /**
   * Set rules array in config based on type
   */
  private setRulesArray<T>(config: RulesConfig<T>, type: RuleType, rules: T[]): void {
    if (type === 'test-protocols') {
      config.protocols = rules;
    } else {
      config.rules = rules;
    }
  }

  // ============== CRUD Operations ==============

  /**
   * Get all rules of a type
   */
  async getAllRules<T extends Rule>(type: RuleType): Promise<{ version: string; lastModified: string; rules: T[] }> {
    const config = this.loadConfig<T>(type);
    return {
      version: config.version,
      lastModified: config.lastModified,
      rules: this.getRulesArray(config, type),
    };
  }

  /**
   * Get a single rule by ID
   */
  async getRuleById<T extends Rule>(type: RuleType, id: string): Promise<T> {
    const config = this.loadConfig<T>(type);
    const rules = this.getRulesArray(config, type);
    const rule = rules.find(r => r.id === id);

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    return rule;
  }

  /**
   * Create a new rule
   */
  async createRule<T extends Rule>(type: RuleType, rule: T, modifiedBy?: string): Promise<T> {
    const config = this.loadConfig<T>(type);
    const rules = this.getRulesArray(config, type);

    // Check for duplicate ID
    if (rules.some(r => r.id === rule.id)) {
      throw new BadRequestException(`Rule with ID ${rule.id} already exists`);
    }

    rules.push(rule);
    this.setRulesArray(config, type, rules);
    this.saveConfig(type, config, modifiedBy);

    return rule;
  }

  /**
   * Update an existing rule
   */
  async updateRule<T extends Rule>(type: RuleType, id: string, updates: Partial<T>, modifiedBy?: string): Promise<T> {
    const config = this.loadConfig<T>(type);
    const rules = this.getRulesArray(config, type);
    const index = rules.findIndex(r => r.id === id);

    if (index === -1) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    // Merge updates (don't allow changing ID)
    const updatedRule = { ...rules[index], ...updates, id } as T;
    rules[index] = updatedRule;

    this.setRulesArray(config, type, rules);
    this.saveConfig(type, config, modifiedBy);

    return updatedRule;
  }

  /**
   * Delete a rule
   */
  async deleteRule(type: RuleType, id: string, modifiedBy?: string): Promise<void> {
    const config = this.loadConfig<Rule>(type);
    const rules = this.getRulesArray(config, type);
    const index = rules.findIndex(r => r.id === id);

    if (index === -1) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    rules.splice(index, 1);
    this.setRulesArray(config, type, rules);
    this.saveConfig(type, config, modifiedBy);
  }

  /**
   * Toggle rule enabled status
   */
  async toggleRule<T extends Rule>(type: RuleType, id: string, modifiedBy?: string): Promise<T> {
    const config = this.loadConfig<T>(type);
    const rules = this.getRulesArray(config, type);
    const rule = rules.find(r => r.id === id);

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    rule.enabled = !rule.enabled;
    this.saveConfig(type, config, modifiedBy);

    return rule;
  }

  /**
   * Reorder rules by priority
   */
  async reorderRules(type: RuleType, orderedIds: string[], modifiedBy?: string): Promise<void> {
    const config = this.loadConfig<Rule>(type);
    const rules = this.getRulesArray(config, type);

    // Assign new priorities based on order
    let priority = orderedIds.length * 10;
    for (const id of orderedIds) {
      const rule = rules.find(r => r.id === id);
      if (rule) {
        rule.priority = priority;
        priority -= 10;
      }
    }

    this.saveConfig(type, config, modifiedBy);
  }

  // ============== Version History ==============

  /**
   * Get version history for a rule type
   */
  async getVersionHistory(type: RuleType): Promise<VersionHistoryEntry[]> {
    const historyPath = this.getHistoryPath(type);
    try {
      const content = fs.readFileSync(historyPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(type: RuleType, version: string, modifiedBy?: string): Promise<void> {
    const history = await this.getVersionHistory(type);
    const entry = history.find(h => h.version === version);

    if (!entry) {
      throw new NotFoundException(`Version ${version} not found in history`);
    }

    const restoredConfig = JSON.parse(entry.snapshot);

    // Save current as history before rollback
    const currentConfig = this.loadConfig(type);
    this.saveVersionHistory(type, currentConfig, modifiedBy);

    // Write the restored config
    const configPath = this.getConfigPath(type);
    restoredConfig.lastModified = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(restoredConfig, null, 2), 'utf-8');
  }

  /**
   * Export rules to JSON string
   */
  async exportRules(type: RuleType): Promise<string> {
    const config = this.loadConfig(type);
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import rules from JSON string
   */
  async importRules(type: RuleType, jsonString: string, modifiedBy?: string): Promise<void> {
    const imported = JSON.parse(jsonString);

    // Validate basic structure
    if (!imported.version || (!imported.rules && !imported.protocols)) {
      throw new BadRequestException('Invalid rules config format');
    }

    const configPath = this.getConfigPath(type);

    // Save current version to history first
    const currentConfig = this.loadConfig(type);
    this.saveVersionHistory(type, currentConfig, modifiedBy);

    // Write imported config
    imported.lastModified = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(imported, null, 2), 'utf-8');
  }

  // ============== Product Modification Guidelines ==============

  private getProductGuidelinesPath(): string {
    return path.join(this.configDir, 'product-modification-guidelines.json');
  }

  private getProductGuidelinesHistoryPath(): string {
    return path.join(this.historyDir, 'product-guidelines-history.json');
  }

  private loadProductGuidelines(): any {
    const configPath = this.getProductGuidelinesPath();
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        products: {},
        conditionMapping: { mappings: [] },
        defaultGuidance: {},
      };
    }
  }

  private saveProductGuidelines(config: any, modifiedBy?: string): void {
    const configPath = this.getProductGuidelinesPath();

    // Save version history
    this.saveProductGuidelinesHistory(config, modifiedBy);

    // Increment version
    config.version = this.incrementVersion(config.version || '1.0.0');
    config.lastModified = new Date().toISOString();

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private saveProductGuidelinesHistory(config: any, modifiedBy?: string): void {
    const historyPath = this.getProductGuidelinesHistoryPath();
    let history: VersionHistoryEntry[] = [];

    try {
      const content = fs.readFileSync(historyPath, 'utf-8');
      history = JSON.parse(content);
    } catch {
      // No history file yet
    }

    if (history.length >= 50) {
      history = history.slice(-49);
    }

    history.push({
      version: config.version || '1.0.0',
      timestamp: new Date().toISOString(),
      modifiedBy,
      changeDescription: 'Product guidelines update',
      snapshot: JSON.stringify(config),
    });

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  /**
   * Get product modification guidelines
   */
  async getProductGuidelines(): Promise<any> {
    return this.loadProductGuidelines();
  }

  /**
   * Update entire product guidelines config
   */
  async updateProductGuidelines(guidelines: any, modifiedBy?: string): Promise<any> {
    this.saveProductGuidelines(guidelines, modifiedBy);
    return this.loadProductGuidelines();
  }

  /**
   * Add a new product to guidelines
   */
  async addProductToGuidelines(
    productCode: string,
    productName: string,
    conditions?: any,
    modifiedBy?: string,
  ): Promise<any> {
    const config = this.loadProductGuidelines();

    if (config.products[productCode]) {
      throw new BadRequestException(`Product ${productCode} already exists`);
    }

    config.products[productCode] = {
      productName,
      conditions: conditions || {},
    };

    this.saveProductGuidelines(config, modifiedBy);
    return config.products[productCode];
  }

  /**
   * Update a product in guidelines
   */
  async updateProductInGuidelines(
    productCode: string,
    data: { productName?: string; conditions?: any },
    modifiedBy?: string,
  ): Promise<any> {
    const config = this.loadProductGuidelines();

    if (!config.products[productCode]) {
      throw new NotFoundException(`Product ${productCode} not found`);
    }

    if (data.productName) {
      config.products[productCode].productName = data.productName;
    }
    if (data.conditions) {
      config.products[productCode].conditions = data.conditions;
    }

    this.saveProductGuidelines(config, modifiedBy);
    return config.products[productCode];
  }

  /**
   * Remove a product from guidelines
   */
  async removeProductFromGuidelines(productCode: string, modifiedBy?: string): Promise<void> {
    const config = this.loadProductGuidelines();

    if (!config.products[productCode]) {
      throw new NotFoundException(`Product ${productCode} not found`);
    }

    delete config.products[productCode];
    this.saveProductGuidelines(config, modifiedBy);
  }

  /**
   * Update a specific condition for a product
   */
  async updateProductCondition(
    productCode: string,
    conditionKey: string,
    severityGuidance: any,
    modifiedBy?: string,
  ): Promise<any> {
    const config = this.loadProductGuidelines();

    if (!config.products[productCode]) {
      throw new NotFoundException(`Product ${productCode} not found`);
    }

    if (!config.products[productCode].conditions) {
      config.products[productCode].conditions = {};
    }

    config.products[productCode].conditions[conditionKey] = severityGuidance;
    this.saveProductGuidelines(config, modifiedBy);

    return config.products[productCode].conditions[conditionKey];
  }
}
