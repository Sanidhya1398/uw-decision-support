import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { RulesConfigService, RuleType, RiskRule, TestProtocol, DecisionRule } from './rules-config.service';
import { RuleValidatorService, ValidationResult } from './rule-validator.service';

/**
 * DTO for creating/updating a risk rule
 */
class RiskRuleDto implements Partial<RiskRule> {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  category: string;
  conditions: any;
  actions: any;
}

/**
 * DTO for creating/updating a test protocol
 */
class TestProtocolDto implements Partial<TestProtocol> {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: any;
  tests: any[];
}

/**
 * DTO for creating/updating a decision rule
 */
class DecisionRuleDto implements Partial<DecisionRule> {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  decisionType: string;
  conditions: any;
  output: any;
  alwaysInclude?: boolean;
}

/**
 * DTO for validation request
 */
class ValidateRuleDto {
  type: RuleType;
  rule: any;
}

/**
 * DTO for reorder request
 */
class ReorderRulesDto {
  orderedIds: string[];
}

/**
 * DTO for import request
 */
class ImportRulesDto {
  jsonContent: string;
}

@ApiTags('Rules')
@Controller('rules')
export class RulesController {
  constructor(
    private readonly rulesConfigService: RulesConfigService,
    private readonly ruleValidatorService: RuleValidatorService,
  ) {}

  // ============== Risk Rules ==============

  @Get('risk')
  @ApiOperation({ summary: 'Get all risk rules' })
  @ApiResponse({ status: 200, description: 'List of risk rules' })
  async getRiskRules() {
    return this.rulesConfigService.getAllRules<RiskRule>('risk');
  }

  @Get('risk/:id')
  @ApiOperation({ summary: 'Get a risk rule by ID' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Risk rule details' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRiskRule(@Param('id') id: string) {
    return this.rulesConfigService.getRuleById<RiskRule>('risk', id);
  }

  @Post('risk')
  @ApiOperation({ summary: 'Create a new risk rule' })
  @ApiBody({ type: RiskRuleDto })
  @ApiResponse({ status: 201, description: 'Rule created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createRiskRule(
    @Body() rule: RiskRuleDto,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    this.ruleValidatorService.validateOrThrow('risk', rule);
    return this.rulesConfigService.createRule<RiskRule>('risk', rule as RiskRule, modifiedBy);
  }

  @Put('risk/:id')
  @ApiOperation({ summary: 'Update a risk rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiBody({ type: RiskRuleDto })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRiskRule(
    @Param('id') id: string,
    @Body() updates: Partial<RiskRuleDto>,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    // Validate the complete rule after merge
    const existing = await this.rulesConfigService.getRuleById<RiskRule>('risk', id);
    const merged = { ...existing, ...updates, id };
    this.ruleValidatorService.validateOrThrow('risk', merged);
    return this.rulesConfigService.updateRule<RiskRule>('risk', id, updates as Partial<RiskRule>, modifiedBy);
  }

  @Delete('risk/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a risk rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 204, description: 'Rule deleted' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRiskRule(
    @Param('id') id: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.deleteRule('risk', id, modifiedBy);
  }

  @Post('risk/:id/toggle')
  @ApiOperation({ summary: 'Toggle risk rule enabled status' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule toggled' })
  async toggleRiskRule(
    @Param('id') id: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.toggleRule<RiskRule>('risk', id, modifiedBy);
  }

  // ============== Test Protocols ==============

  @Get('test-protocols')
  @ApiOperation({ summary: 'Get all test protocols' })
  @ApiResponse({ status: 200, description: 'List of test protocols' })
  async getTestProtocols() {
    return this.rulesConfigService.getAllRules<TestProtocol>('test-protocols');
  }

  @Get('test-protocols/:id')
  @ApiOperation({ summary: 'Get a test protocol by ID' })
  @ApiParam({ name: 'id', description: 'Protocol ID' })
  @ApiResponse({ status: 200, description: 'Test protocol details' })
  @ApiResponse({ status: 404, description: 'Protocol not found' })
  async getTestProtocol(@Param('id') id: string) {
    return this.rulesConfigService.getRuleById<TestProtocol>('test-protocols', id);
  }

  @Post('test-protocols')
  @ApiOperation({ summary: 'Create a new test protocol' })
  @ApiBody({ type: TestProtocolDto })
  @ApiResponse({ status: 201, description: 'Protocol created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createTestProtocol(
    @Body() protocol: TestProtocolDto,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    this.ruleValidatorService.validateOrThrow('test-protocols', protocol);
    return this.rulesConfigService.createRule<TestProtocol>('test-protocols', protocol as TestProtocol, modifiedBy);
  }

  @Put('test-protocols/:id')
  @ApiOperation({ summary: 'Update a test protocol' })
  @ApiParam({ name: 'id', description: 'Protocol ID' })
  @ApiBody({ type: TestProtocolDto })
  @ApiResponse({ status: 200, description: 'Protocol updated' })
  @ApiResponse({ status: 404, description: 'Protocol not found' })
  async updateTestProtocol(
    @Param('id') id: string,
    @Body() updates: Partial<TestProtocolDto>,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    const existing = await this.rulesConfigService.getRuleById<TestProtocol>('test-protocols', id);
    const merged = { ...existing, ...updates, id };
    this.ruleValidatorService.validateOrThrow('test-protocols', merged);
    return this.rulesConfigService.updateRule<TestProtocol>('test-protocols', id, updates as Partial<TestProtocol>, modifiedBy);
  }

  @Delete('test-protocols/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a test protocol' })
  @ApiParam({ name: 'id', description: 'Protocol ID' })
  @ApiResponse({ status: 204, description: 'Protocol deleted' })
  @ApiResponse({ status: 404, description: 'Protocol not found' })
  async deleteTestProtocol(
    @Param('id') id: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.deleteRule('test-protocols', id, modifiedBy);
  }

  @Post('test-protocols/:id/toggle')
  @ApiOperation({ summary: 'Toggle test protocol enabled status' })
  @ApiParam({ name: 'id', description: 'Protocol ID' })
  @ApiResponse({ status: 200, description: 'Protocol toggled' })
  async toggleTestProtocol(
    @Param('id') id: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.toggleRule<TestProtocol>('test-protocols', id, modifiedBy);
  }

  // ============== Decision Rules ==============

  @Get('decision')
  @ApiOperation({ summary: 'Get all decision rules' })
  @ApiResponse({ status: 200, description: 'List of decision rules' })
  async getDecisionRules() {
    return this.rulesConfigService.getAllRules<DecisionRule>('decision');
  }

  @Get('decision/:id')
  @ApiOperation({ summary: 'Get a decision rule by ID' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule details' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getDecisionRule(@Param('id') id: string) {
    return this.rulesConfigService.getRuleById<DecisionRule>('decision', id);
  }

  @Post('decision')
  @ApiOperation({ summary: 'Create a new decision rule' })
  @ApiBody({ type: DecisionRuleDto })
  @ApiResponse({ status: 201, description: 'Rule created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createDecisionRule(
    @Body() rule: DecisionRuleDto,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    this.ruleValidatorService.validateOrThrow('decision', rule);
    return this.rulesConfigService.createRule<DecisionRule>('decision', rule as DecisionRule, modifiedBy);
  }

  @Put('decision/:id')
  @ApiOperation({ summary: 'Update a decision rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiBody({ type: DecisionRuleDto })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateDecisionRule(
    @Param('id') id: string,
    @Body() updates: Partial<DecisionRuleDto>,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    const existing = await this.rulesConfigService.getRuleById<DecisionRule>('decision', id);
    const merged = { ...existing, ...updates, id };
    this.ruleValidatorService.validateOrThrow('decision', merged);
    return this.rulesConfigService.updateRule<DecisionRule>('decision', id, updates as Partial<DecisionRule>, modifiedBy);
  }

  @Delete('decision/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a decision rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 204, description: 'Rule deleted' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteDecisionRule(
    @Param('id') id: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.deleteRule('decision', id, modifiedBy);
  }

  @Post('decision/:id/toggle')
  @ApiOperation({ summary: 'Toggle decision rule enabled status' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule toggled' })
  async toggleDecisionRule(
    @Param('id') id: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.toggleRule<DecisionRule>('decision', id, modifiedBy);
  }

  // ============== Validation ==============

  @Post('validate')
  @ApiOperation({ summary: 'Validate a rule before saving' })
  @ApiBody({ type: ValidateRuleDto })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateRule(@Body() dto: ValidateRuleDto): Promise<ValidationResult> {
    return this.ruleValidatorService.validate(dto.type, dto.rule);
  }

  // ============== Version History ==============

  @Get(':type/history')
  @ApiOperation({ summary: 'Get version history for a rule type' })
  @ApiParam({ name: 'type', description: 'Rule type (risk, test-protocols, decision)' })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getVersionHistory(@Param('type') type: RuleType) {
    return this.rulesConfigService.getVersionHistory(type);
  }

  @Post(':type/rollback/:version')
  @ApiOperation({ summary: 'Rollback to a previous version' })
  @ApiParam({ name: 'type', description: 'Rule type (risk, test-protocols, decision)' })
  @ApiParam({ name: 'version', description: 'Version to rollback to' })
  @ApiResponse({ status: 200, description: 'Rollback successful' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async rollbackToVersion(
    @Param('type') type: RuleType,
    @Param('version') version: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.rollbackToVersion(type, version, modifiedBy);
    return { success: true, message: `Rolled back ${type} rules to version ${version}` };
  }

  // ============== Reorder ==============

  @Post(':type/reorder')
  @ApiOperation({ summary: 'Reorder rules by priority' })
  @ApiParam({ name: 'type', description: 'Rule type (risk, test-protocols, decision)' })
  @ApiBody({ type: ReorderRulesDto })
  @ApiResponse({ status: 200, description: 'Rules reordered' })
  async reorderRules(
    @Param('type') type: RuleType,
    @Body() dto: ReorderRulesDto,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.reorderRules(type, dto.orderedIds, modifiedBy);
    return { success: true, message: 'Rules reordered successfully' };
  }

  // ============== Export/Import ==============

  @Get(':type/export')
  @ApiOperation({ summary: 'Export rules as JSON' })
  @ApiParam({ name: 'type', description: 'Rule type (risk, test-protocols, decision)' })
  @ApiResponse({ status: 200, description: 'JSON export' })
  async exportRules(@Param('type') type: RuleType) {
    const json = await this.rulesConfigService.exportRules(type);
    return { type, content: json };
  }

  @Post(':type/import')
  @ApiOperation({ summary: 'Import rules from JSON' })
  @ApiParam({ name: 'type', description: 'Rule type (risk, test-protocols, decision)' })
  @ApiBody({ type: ImportRulesDto })
  @ApiResponse({ status: 200, description: 'Import successful' })
  @ApiResponse({ status: 400, description: 'Invalid JSON format' })
  async importRules(
    @Param('type') type: RuleType,
    @Body() dto: ImportRulesDto,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.importRules(type, dto.jsonContent, modifiedBy);
    return { success: true, message: `Imported ${type} rules successfully` };
  }

  // ============== Product Modification Guidelines ==============

  @Get('product-guidelines')
  @ApiOperation({ summary: 'Get product modification guidelines' })
  @ApiResponse({ status: 200, description: 'Product modification guidelines' })
  async getProductGuidelines() {
    return this.rulesConfigService.getProductGuidelines();
  }

  @Put('product-guidelines')
  @ApiOperation({ summary: 'Update product modification guidelines' })
  @ApiResponse({ status: 200, description: 'Guidelines updated' })
  async updateProductGuidelines(
    @Body() guidelines: any,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.updateProductGuidelines(guidelines, modifiedBy);
  }

  @Post('product-guidelines/product')
  @ApiOperation({ summary: 'Add a new product to guidelines' })
  @ApiResponse({ status: 201, description: 'Product added' })
  async addProductToGuidelines(
    @Body() data: { productCode: string; productName: string; conditions?: any },
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.addProductToGuidelines(data.productCode, data.productName, data.conditions, modifiedBy);
  }

  @Put('product-guidelines/product/:productCode')
  @ApiOperation({ summary: 'Update a product in guidelines' })
  @ApiParam({ name: 'productCode', description: 'Product code' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProductInGuidelines(
    @Param('productCode') productCode: string,
    @Body() data: { productName?: string; conditions?: any },
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.updateProductInGuidelines(productCode, data, modifiedBy);
  }

  @Delete('product-guidelines/product/:productCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product from guidelines' })
  @ApiParam({ name: 'productCode', description: 'Product code' })
  @ApiResponse({ status: 204, description: 'Product removed' })
  async removeProductFromGuidelines(
    @Param('productCode') productCode: string,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    await this.rulesConfigService.removeProductFromGuidelines(productCode, modifiedBy);
  }

  @Put('product-guidelines/product/:productCode/condition/:conditionKey')
  @ApiOperation({ summary: 'Update a condition for a product' })
  @ApiParam({ name: 'productCode', description: 'Product code' })
  @ApiParam({ name: 'conditionKey', description: 'Condition key (e.g., diabetes, hypertension)' })
  @ApiResponse({ status: 200, description: 'Condition updated' })
  async updateProductCondition(
    @Param('productCode') productCode: string,
    @Param('conditionKey') conditionKey: string,
    @Body() severityGuidance: any,
    @Headers('x-modified-by') modifiedBy?: string,
  ) {
    return this.rulesConfigService.updateProductCondition(productCode, conditionKey, severityGuidance, modifiedBy);
  }
}
