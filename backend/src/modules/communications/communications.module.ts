import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Communication } from '../../entities/communication.entity';
import { Case } from '../../entities/case.entity';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { NlgAssemblyService } from './nlg-assembly.service';
import { EnhancedNlgService } from './enhanced-nlg.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Communication, Case]),
    AuditModule,
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, NlgAssemblyService, EnhancedNlgService],
  exports: [CommunicationsService, NlgAssemblyService, EnhancedNlgService],
})
export class CommunicationsModule {}
