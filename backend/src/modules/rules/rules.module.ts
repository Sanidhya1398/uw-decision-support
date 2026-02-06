import { Module, Global } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RuleEngineService } from './rule-engine.service';
import { RulesConfigService } from './rules-config.service';
import { RuleValidatorService } from './rule-validator.service';
import { RulesController } from './rules.controller';
import { ConfigurationModule } from '../configuration/configuration.module';

@Global()
@Module({
  imports: [ConfigurationModule],
  controllers: [RulesController],
  providers: [
    RulesService,
    RuleEngineService,
    RulesConfigService,
    RuleValidatorService,
  ],
  exports: [
    RulesService,
    RuleEngineService,
    RulesConfigService,
    RuleValidatorService,
  ],
})
export class RulesModule {}
