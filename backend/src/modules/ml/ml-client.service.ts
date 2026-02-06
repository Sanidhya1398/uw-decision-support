import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';
import { ComplexityTier } from '../../entities/case.entity';
import { YieldCategory } from '../../entities/test-recommendation.entity';
import { MlService } from './ml.service';

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests go through
  OPEN = 'OPEN',         // Failing, requests go to fallback
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * ML complexity prediction result
 */
interface ComplexityResult {
  tier: ComplexityTier;
  confidence: number;
  factors: { factor: string; weight: number; direction: string }[];
  source: 'python_ml' | 'fallback';
  modelVersion?: string;
}

/**
 * ML test yield prediction result
 */
interface YieldResult {
  probability: number;
  category: YieldCategory;
  factors: { factor: string; weight: number }[];
  source: 'python_ml' | 'fallback';
  modelVersion?: string;
}

/**
 * ML Client Service
 *
 * Calls the Python ML microservice for predictions with:
 * - Circuit breaker pattern for resilience
 * - Automatic fallback to deterministic MlService
 * - Request timeout handling
 * - Health monitoring
 */
@Injectable()
export class MlClientService implements OnModuleInit {
  private readonly logger = new Logger(MlClientService.name);

  // Python ML service configuration
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  private readonly apiPrefix = '/api/v1';
  private readonly requestTimeoutMs = 5000; // 5 second timeout

  // Circuit breaker configuration
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private readonly failureThreshold = 3; // Open circuit after 3 failures
  private readonly resetTimeoutMs = 30000; // Try to recover after 30 seconds
  private lastFailureTime: number = 0;

  // Health check interval
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = false;

  constructor(
    private readonly httpService: HttpService,
    private readonly fallbackMlService: MlService,
  ) {}

  async onModuleInit() {
    // Initial health check
    await this.checkHealth();

    // Periodic health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  /**
   * Classify case complexity using Python ML service with fallback
   */
  async classifyComplexity(caseEntity: any): Promise<ComplexityResult> {
    // Check circuit breaker
    if (this.shouldUseFallback()) {
      return this.fallbackComplexityClassification(caseEntity);
    }

    try {
      const response = await this.callPythonService<any>('/classify-complexity', {
        case_id: caseEntity.id,
        applicant: this.mapApplicant(caseEntity.applicant),
        sum_assured: Number(caseEntity.sumAssured) || 0,
        medical_disclosures: this.mapDisclosures(caseEntity.medicalDisclosures || []),
        existing_risk_factors: (caseEntity.riskFactors || []).map((rf: any) => ({
          name: rf.factorName,
          severity: rf.severity,
          category: rf.category,
        })),
      });

      // Record success
      this.recordSuccess();

      // Map response to internal format
      return {
        tier: response.tier as ComplexityTier,
        confidence: response.confidence,
        factors: response.feature_contributions.map((fc: any) => ({
          factor: fc.feature,
          weight: fc.contribution,
          direction: fc.direction === 'increases' ? 'increases_complexity' : 'decreases_complexity',
        })),
        source: 'python_ml',
        modelVersion: response.model_version,
      };
    } catch (error) {
      this.logger.warn(`Python ML service call failed: ${error.message}`);
      this.recordFailure();
      return this.fallbackComplexityClassification(caseEntity);
    }
  }

  /**
   * Predict test yield using Python ML service with fallback
   */
  async predictTestYield(caseEntity: any, testCode: string): Promise<YieldResult> {
    // Check circuit breaker
    if (this.shouldUseFallback()) {
      return this.fallbackTestYieldPrediction(caseEntity, testCode);
    }

    try {
      const response = await this.callPythonService<any>('/predict-test-yield', {
        case_id: caseEntity.id,
        test_code: testCode,
        applicant: this.mapApplicant(caseEntity.applicant),
        sum_assured: Number(caseEntity.sumAssured) || 0,
        medical_disclosures: this.mapDisclosures(caseEntity.medicalDisclosures || []),
      });

      // Record success
      this.recordSuccess();

      // Map yield to category
      const category = this.mapYieldToCategory(response.predicted_yield);

      return {
        probability: response.predicted_yield,
        category,
        factors: response.feature_contributions.map((fc: any) => ({
          factor: fc.feature,
          weight: fc.contribution,
        })),
        source: 'python_ml',
        modelVersion: response.model_version,
      };
    } catch (error) {
      this.logger.warn(`Python ML service call failed for test yield: ${error.message}`);
      this.recordFailure();
      return this.fallbackTestYieldPrediction(caseEntity, testCode);
    }
  }

  /**
   * Trigger model retraining
   */
  async triggerTraining(modelType: 'complexity' | 'test_yield', force = false): Promise<any> {
    try {
      const response = await this.callPythonService<any>('/training/trigger', {
        model_type: modelType,
        force,
      });
      return response;
    } catch (error) {
      this.logger.error(`Failed to trigger training: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get training job status
   */
  async getTrainingStatus(jobId: string): Promise<any> {
    try {
      const url = `${this.mlServiceUrl}${this.apiPrefix}/training/status/${jobId}`;
      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(this.requestTimeoutMs),
          catchError(err => {
            throw new Error(err.message);
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get training status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<any> {
    try {
      const url = `${this.mlServiceUrl}${this.apiPrefix}/models/info`;
      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(this.requestTimeoutMs),
          catchError(err => {
            throw new Error(err.message);
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get model info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const url = `${this.mlServiceUrl}${this.apiPrefix}/health`;
      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(3000),
          catchError(() => of(null)),
        ),
      );

      this.isHealthy = response?.data?.status === 'healthy';

      if (this.isHealthy && this.circuitState === CircuitState.OPEN) {
        this.logger.log('ML service recovered, transitioning to HALF_OPEN');
        this.circuitState = CircuitState.HALF_OPEN;
      }

      return this.isHealthy;
    } catch {
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    circuitState: CircuitState;
    isHealthy: boolean;
    failureCount: number;
    mlServiceUrl: string;
  } {
    return {
      circuitState: this.circuitState,
      isHealthy: this.isHealthy,
      failureCount: this.failureCount,
      mlServiceUrl: this.mlServiceUrl,
    };
  }

  // ============== Private Methods ==============

  /**
   * Call Python ML service
   */
  private async callPythonService<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.mlServiceUrl}${this.apiPrefix}${endpoint}`;

    const response = await firstValueFrom(
      this.httpService.post(url, data).pipe(
        timeout(this.requestTimeoutMs),
        catchError(err => {
          throw new Error(err.response?.data?.detail || err.message);
        }),
      ),
    );

    return response.data as T;
  }

  /**
   * Check if we should use fallback based on circuit breaker state
   */
  private shouldUseFallback(): boolean {
    switch (this.circuitState) {
      case CircuitState.OPEN:
        // Check if enough time has passed to try again
        if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
          this.logger.log('Circuit breaker transitioning to HALF_OPEN');
          this.circuitState = CircuitState.HALF_OPEN;
          return false;
        }
        return true;

      case CircuitState.HALF_OPEN:
        // Let one request through to test
        return false;

      case CircuitState.CLOSED:
      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker transitioning to CLOSED');
      this.circuitState = CircuitState.CLOSED;
    }
    this.failureCount = 0;
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.warn('Circuit breaker transitioning to OPEN after HALF_OPEN failure');
      this.circuitState = CircuitState.OPEN;
    } else if (this.failureCount >= this.failureThreshold) {
      this.logger.warn(`Circuit breaker OPEN after ${this.failureCount} failures`);
      this.circuitState = CircuitState.OPEN;
    }
  }

  /**
   * Fallback to deterministic complexity classification
   */
  private async fallbackComplexityClassification(caseEntity: any): Promise<ComplexityResult> {
    const result = await this.fallbackMlService.classifyComplexity(caseEntity);
    return {
      ...result,
      source: 'fallback',
    };
  }

  /**
   * Fallback to deterministic test yield prediction
   */
  private async fallbackTestYieldPrediction(caseEntity: any, testCode: string): Promise<YieldResult> {
    const result = await this.fallbackMlService.predictTestYield(caseEntity, testCode);
    return {
      ...result,
      source: 'fallback',
    };
  }

  /**
   * Map applicant to Python service format
   */
  private mapApplicant(applicant: any): any {
    if (!applicant) return {};

    return {
      age: applicant.age,
      bmi: applicant.bmi,
      smoking_status: applicant.smokingStatus,
      height_cm: applicant.heightCm,
      weight_kg: applicant.weightKg,
    };
  }

  /**
   * Map disclosures to Python service format
   */
  private mapDisclosures(disclosures: any[]): any[] {
    return disclosures.map(d => ({
      disclosure_type: d.disclosureType,
      condition_name: d.conditionName,
      condition_status: d.conditionStatus,
      medication_name: d.drugName,
      family_condition: d.familyCondition,
      family_relationship: d.familyRelationship,
    }));
  }

  /**
   * Map yield probability to category
   */
  private mapYieldToCategory(probability: number): YieldCategory {
    if (probability >= 0.65) {
      return YieldCategory.HIGH;
    } else if (probability >= 0.40) {
      return YieldCategory.MODERATE;
    }
    return YieldCategory.LOW;
  }
}
