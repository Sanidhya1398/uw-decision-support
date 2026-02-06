import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Case } from '../../entities/case.entity';
import { Applicant } from '../../entities/applicant.entity';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Case, Applicant]),
    AuditModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
