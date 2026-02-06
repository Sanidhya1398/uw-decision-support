import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Feature modules
import { CasesModule } from './modules/cases/cases.module';
import { RiskModule } from './modules/risk/risk.module';
import { TestsModule } from './modules/tests/tests.module';
import { DecisionsModule } from './modules/decisions/decisions.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { AuditModule } from './modules/audit/audit.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NlpModule } from './modules/nlp/nlp.module';
import { MlModule } from './modules/ml/ml.module';
import { RulesModule } from './modules/rules/rules.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { OverridesModule } from './modules/overrides/overrides.module';

// Entities
import { Case } from './entities/case.entity';
import { Applicant } from './entities/applicant.entity';
import { MedicalDisclosure } from './entities/medical-disclosure.entity';
import { Document } from './entities/document.entity';
import { TestRecommendation } from './entities/test-recommendation.entity';
import { TestResult } from './entities/test-result.entity';
import { Decision } from './entities/decision.entity';
import { Communication } from './entities/communication.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Override } from './entities/override.entity';
import { RiskFactor } from './entities/risk-factor.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'uw_decision_support.db',
      entities: [
        Case,
        Applicant,
        MedicalDisclosure,
        Document,
        TestRecommendation,
        TestResult,
        Decision,
        Communication,
        AuditLog,
        Override,
        RiskFactor,
      ],
      synchronize: true, // Auto-create tables (dev only)
      logging: false,
    }),
    CasesModule,
    RiskModule,
    TestsModule,
    DecisionsModule,
    CommunicationsModule,
    AuditModule,
    DocumentsModule,
    NlpModule,
    MlModule,
    RulesModule,
    ConfigurationModule,
    OverridesModule,
  ],
})
export class AppModule {}
