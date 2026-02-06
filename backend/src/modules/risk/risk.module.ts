import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskFactor } from '../../entities/risk-factor.entity';
import { Case } from '../../entities/case.entity';
import { Document } from '../../entities/document.entity';
import { TestResult } from '../../entities/test-result.entity';
import { TestRecommendation } from '../../entities/test-recommendation.entity';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { AuditModule } from '../audit/audit.module';
import { RulesModule } from '../rules/rules.module';
import { MlModule } from '../ml/ml.module';
import { OverridesModule } from '../overrides/overrides.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiskFactor, Case, Document, TestResult, TestRecommendation]),
    AuditModule,
    RulesModule,
    MlModule,
    OverridesModule,
  ],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
