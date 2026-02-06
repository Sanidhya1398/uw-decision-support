import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentType, ExtractionStatus, ExtractionMethod } from '../../entities/document.entity';
import { Case } from '../../entities/case.entity';
import { MedicalDisclosure, DisclosureType, ConditionStatus } from '../../entities/medical-disclosure.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';
import { NlpService } from '../nlp/nlp.service';
import { DocumentProcessingService } from './document-processing.service';

interface UploadDocumentData {
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  userId: string;
  userName: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    @InjectRepository(MedicalDisclosure)
    private disclosureRepository: Repository<MedicalDisclosure>,
    private auditService: AuditService,
    private nlpService: NlpService,
    private documentProcessingService: DocumentProcessingService,
  ) {}

  async getDocuments(caseId: string) {
    return this.documentRepository.find({
      where: { case: { id: caseId } },
      order: { receivedDate: 'DESC' },
    });
  }

  async getDocument(caseId: string, docId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: docId, case: { id: caseId } },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${docId} not found`);
    }

    return document;
  }

  /**
   * Upload a new document
   */
  async uploadDocument(caseId: string, data: UploadDocumentData) {
    const caseEntity = await this.caseRepository.findOne({ where: { id: caseId } });
    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const document = this.documentRepository.create({
      documentType: data.documentType as DocumentType,
      fileName: data.fileName,
      fileType: data.fileType,
      filePath: data.filePath,
      fileSize: data.fileSize,
      sourceSystem: 'upload',
      receivedDate: new Date(),
      extractionStatus: ExtractionStatus.PENDING,
      case: { id: caseId } as any,
    });

    await this.documentRepository.save(document);

    await this.auditService.log({
      caseId,
      action: AuditAction.DOCUMENT_UPLOADED,
      category: AuditCategory.DOCUMENT_PROCESSING,
      description: `Document uploaded: ${data.fileName}`,
      userId: data.userId,
      userName: data.userName,
      relatedEntityType: 'Document',
      relatedEntityId: document.id,
      metadata: {
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
      },
    });

    return document;
  }

  /**
   * Process document: extract text from file and run NLP
   */
  async processDocument(caseId: string, docId: string, userId: string, userName: string) {
    const document = await this.getDocument(caseId, docId);

    if (!document.filePath) {
      throw new Error('Document has no file path');
    }

    // Extract text from file
    const result = await this.documentProcessingService.processDocument(
      document.filePath,
      document.fileType || 'application/pdf',
    );

    document.extractedText = result.text;
    document.extractionMethod = result.method as ExtractionMethod;
    if (result.pageCount) document.pageCount = result.pageCount;
    if (result.language) document.languageDetected = result.language;

    if (result.text && result.text.length > 100 && !result.text.startsWith('[')) {
      // Run NLP extraction
      const extractions = await this.nlpService.extractEntities(result.text);

      document.extractedConditions = extractions.conditions;
      document.extractedMedications = extractions.medications;
      document.extractedLabValues = extractions.labValues;
      document.extractedDates = extractions.dates;
      document.extractedProcedures = extractions.procedures;
      document.extractionStatus = ExtractionStatus.EXTRACTED;
      document.extractionConfidence = extractions.overallConfidence;
    } else {
      document.extractionStatus = result.confidence > 0.5 ? ExtractionStatus.EXTRACTED : ExtractionStatus.PENDING;
      document.extractionConfidence = result.confidence;
    }

    document.extractionDate = new Date();
    await this.documentRepository.save(document);

    await this.auditService.log({
      caseId,
      action: AuditAction.DOCUMENT_EXTRACTED,
      category: AuditCategory.DOCUMENT_PROCESSING,
      description: `Document processed via ${result.method}: ${document.extractedConditions?.length || 0} conditions, ${document.extractedMedications?.length || 0} medications, ${document.extractedLabValues?.length || 0} lab values extracted`,
      userId,
      userName,
      relatedEntityType: 'Document',
      relatedEntityId: docId,
      metadata: {
        extractionMethod: result.method,
        textLength: result.text?.length || 0,
        confidence: result.confidence,
      },
    });

    return document;
  }

  /**
   * Run NLP extraction on a document (legacy method for documents with existing text)
   */
  async extractDocument(caseId: string, docId: string, userId: string, userName: string) {
    const document = await this.getDocument(caseId, docId);

    if (!document.extractedText) {
      throw new Error('No extracted text available for this document');
    }

    // Run NLP extraction
    const extractions = await this.nlpService.extractEntities(document.extractedText);

    // Update document with extractions
    document.extractedConditions = extractions.conditions;
    document.extractedMedications = extractions.medications;
    document.extractedLabValues = extractions.labValues;
    document.extractedDates = extractions.dates;
    document.extractionStatus = ExtractionStatus.EXTRACTED;
    document.extractionDate = new Date();
    document.extractionConfidence = extractions.overallConfidence;

    await this.documentRepository.save(document);

    await this.auditService.log({
      caseId,
      action: AuditAction.DOCUMENT_EXTRACTED,
      category: AuditCategory.DOCUMENT_PROCESSING,
      description: `Document processed: ${extractions.conditions.length} conditions, ${extractions.medications.length} medications, ${extractions.labValues.length} lab values extracted`,
      userId,
      userName,
      relatedEntityType: 'Document',
      relatedEntityId: docId,
    });

    return document;
  }

  /**
   * Set manual text for a document that couldn't be processed automatically
   */
  async setManualText(caseId: string, docId: string, text: string, userId: string, userName: string) {
    const document = await this.getDocument(caseId, docId);

    document.extractedText = text;
    document.extractionMethod = ExtractionMethod.MANUAL;
    document.extractionStatus = ExtractionStatus.PENDING;

    await this.documentRepository.save(document);

    await this.auditService.log({
      caseId,
      action: AuditAction.NOTE_ADDED,
      category: AuditCategory.DOCUMENT_PROCESSING,
      description: `Manual text added to document: ${text.length} characters`,
      userId,
      userName,
      relatedEntityType: 'Document',
      relatedEntityId: docId,
    });

    return document;
  }

  /**
   * Verify or correct extracted data
   */
  async verifyExtraction(caseId: string, docId: string, data: {
    field: string;
    index?: number;
    verified: boolean;
    correctedValue?: any;
    userId: string;
    userName: string;
  }) {
    const document = await this.getDocument(caseId, docId);

    // Update the specific extraction based on field and index
    if (data.correctedValue !== undefined && data.index !== undefined) {
      switch (data.field) {
        case 'conditions':
          if (document.extractedConditions && document.extractedConditions[data.index]) {
            document.extractedConditions[data.index] = {
              ...document.extractedConditions[data.index],
              ...data.correctedValue,
              verified: true,
            };
          }
          break;
        case 'medications':
          if (document.extractedMedications && document.extractedMedications[data.index]) {
            document.extractedMedications[data.index] = {
              ...document.extractedMedications[data.index],
              ...data.correctedValue,
              verified: true,
            };
          }
          break;
        case 'labValues':
          if (document.extractedLabValues && document.extractedLabValues[data.index]) {
            document.extractedLabValues[data.index] = {
              ...document.extractedLabValues[data.index],
              ...data.correctedValue,
              verified: true,
            };
          }
          break;
      }
      await this.documentRepository.save(document);
    }

    await this.auditService.log({
      caseId,
      action: data.correctedValue ? AuditAction.EXTRACTION_CORRECTED : AuditAction.EXTRACTION_VERIFIED,
      category: AuditCategory.DOCUMENT_PROCESSING,
      description: data.correctedValue
        ? `Extraction corrected for ${data.field}[${data.index}]`
        : `Extraction verified for ${data.field}`,
      userId: data.userId,
      userName: data.userName,
      relatedEntityType: 'Document',
      relatedEntityId: docId,
      metadata: {
        field: data.field,
        index: data.index,
        verified: data.verified,
        correctedValue: data.correctedValue,
      },
    });

    return { success: true, document };
  }

  /**
   * Sync verified extractions to MedicalDisclosure records
   */
  async syncExtractionsToDisclosures(caseId: string, docId: string, userId: string, userName: string) {
    const document = await this.getDocument(caseId, docId);
    const created: string[] = [];

    // Sync conditions
    if (document.extractedConditions) {
      for (const condition of document.extractedConditions) {
        // Check if already exists
        const existing = await this.disclosureRepository.findOne({
          where: {
            case: { id: caseId },
            disclosureType: DisclosureType.CONDITION,
            conditionName: condition.name,
          },
        });

        if (!existing) {
          const disclosure = new MedicalDisclosure();
          disclosure.case = { id: caseId } as Case;
          disclosure.disclosureType = DisclosureType.CONDITION;
          disclosure.conditionName = condition.name;
          if (condition.icdCode) disclosure.icdCode = condition.icdCode;
          disclosure.conditionStatus = ConditionStatus.ACTIVE;
          disclosure.sourceDocumentId = docId;
          disclosure.extractionConfidence = condition.confidence;
          await this.disclosureRepository.save(disclosure);
          created.push(`Condition: ${condition.name}`);
        }
      }
    }

    // Sync medications
    if (document.extractedMedications) {
      for (const medication of document.extractedMedications) {
        // Check if already exists
        const existing = await this.disclosureRepository.findOne({
          where: {
            case: { id: caseId },
            disclosureType: DisclosureType.MEDICATION,
            drugName: medication.name,
          },
        });

        if (!existing) {
          const disclosure = new MedicalDisclosure();
          disclosure.case = { id: caseId } as Case;
          disclosure.disclosureType = DisclosureType.MEDICATION;
          disclosure.drugName = medication.name;
          if (medication.dosage) disclosure.dosage = medication.dosage;
          if (medication.frequency) disclosure.frequency = medication.frequency;
          disclosure.sourceDocumentId = docId;
          disclosure.extractionConfidence = medication.confidence;
          await this.disclosureRepository.save(disclosure);
          created.push(`Medication: ${medication.name}`);
        }
      }
    }

    await this.auditService.log({
      caseId,
      action: AuditAction.NOTE_ADDED,
      category: AuditCategory.DOCUMENT_PROCESSING,
      description: `Synced ${created.length} extractions to medical disclosures: ${created.join(', ')}`,
      userId,
      userName,
      relatedEntityType: 'Document',
      relatedEntityId: docId,
      metadata: { created },
    });

    return {
      success: true,
      created,
      message: `Created ${created.length} new medical disclosure records`,
    };
  }
}
