import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { DocumentsService } from './documents.service';
import { DocumentProcessingService } from './document-processing.service';

// Configure multer storage
const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

// File filter for allowed types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

@ApiTags('documents')
@Controller('cases/:caseId/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentProcessingService: DocumentProcessingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all documents for a case' })
  async getDocuments(@Param('caseId') caseId: string) {
    return this.documentsService.getDocuments(caseId);
  }

  @Get(':docId')
  @ApiOperation({ summary: 'Get a specific document with extracted data' })
  async getDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
  ) {
    return this.documentsService.getDocument(caseId, docId);
  }

  @Get(':docId/download')
  @ApiOperation({ summary: 'Download the original document file' })
  async downloadDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.getDocument(caseId, docId);

    if (!document.filePath || !fs.existsSync(document.filePath)) {
      throw new NotFoundException('Document file not found');
    }

    res.download(document.filePath, document.fileName || 'document');
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string' },
        userId: { type: 'string' },
        userName: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadDocument(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { documentType: string; userId: string; userName: string },
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.documentsService.uploadDocument(caseId, {
      filePath: file.path,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      documentType: body.documentType || 'other_medical',
      userId: body.userId,
      userName: body.userName,
    });
  }

  @Post(':docId/extract')
  @ApiOperation({ summary: 'Run NLP extraction on a document' })
  async extractDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.documentsService.extractDocument(caseId, docId, body.userId, body.userName);
  }

  @Post(':docId/process')
  @ApiOperation({ summary: 'Process document: extract text and run NLP' })
  async processDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.documentsService.processDocument(caseId, docId, body.userId, body.userName);
  }

  @Post(':docId/verify')
  @ApiOperation({ summary: 'Verify extracted data' })
  async verifyExtraction(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Body() body: {
      field: string;
      verified: boolean;
      correctedValue?: string;
      userId: string;
      userName: string;
    },
  ) {
    return this.documentsService.verifyExtraction(caseId, docId, body);
  }

  @Post(':docId/sync-to-disclosures')
  @ApiOperation({ summary: 'Sync verified extractions to medical disclosures' })
  async syncToDisclosures(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.documentsService.syncExtractionsToDisclosures(caseId, docId, body.userId, body.userName);
  }

  @Post(':docId/manual-text')
  @ApiOperation({ summary: 'Add manual text for documents that could not be processed' })
  async addManualText(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Body() body: { text: string; userId: string; userName: string },
  ) {
    return this.documentsService.setManualText(caseId, docId, body.text, body.userId, body.userName);
  }
}
