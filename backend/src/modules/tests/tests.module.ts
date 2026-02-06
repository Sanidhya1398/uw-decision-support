import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRecommendation } from '../../entities/test-recommendation.entity';
import { TestResult } from '../../entities/test-result.entity';
import { Case } from '../../entities/case.entity';
import { RiskFactor } from '../../entities/risk-factor.entity';
import { Document } from '../../entities/document.entity';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { AuditModule } from '../audit/audit.module';
import { RulesModule } from '../rules/rules.module';
import { MlModule } from '../ml/ml.module';
import { OverridesModule } from '../overrides/overrides.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestRecommendation, TestResult, Case, RiskFactor, Document]),
    AuditModule,
    RulesModule,
    MlModule,
    OverridesModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
