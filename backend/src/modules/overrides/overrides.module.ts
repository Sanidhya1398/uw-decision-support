import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Override } from '../../entities/override.entity';
import { Case } from '../../entities/case.entity';
import { OverridesController } from './overrides.controller';
import { OverridesService } from './overrides.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Override, Case]),
    AuditModule,
  ],
  controllers: [OverridesController],
  providers: [OverridesService],
  exports: [OverridesService],
})
export class OverridesModule {}
