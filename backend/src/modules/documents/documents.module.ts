import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Document } from '../../entities/document.entity';
import { Case } from '../../entities/case.entity';
import { MedicalDisclosure } from '../../entities/medical-disclosure.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessingService } from './document-processing.service';
import { AuditModule } from '../audit/audit.module';
import { NlpModule } from '../nlp/nlp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Case, MedicalDisclosure]),
    MulterModule.register({
      dest: './uploads',
    }),
    HttpModule,
    ConfigModule,
    AuditModule,
    NlpModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessingService],
  exports: [DocumentsService, DocumentProcessingService],
})
export class DocumentsModule {}
