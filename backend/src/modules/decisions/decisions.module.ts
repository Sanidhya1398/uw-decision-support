import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Decision } from '../../entities/decision.entity';
import { Case } from '../../entities/case.entity';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { AuditModule } from '../audit/audit.module';
import { RulesModule } from '../rules/rules.module';
import { OverridesModule } from '../overrides/overrides.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Decision, Case]),
    AuditModule,
    RulesModule,
    OverridesModule,
  ],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
