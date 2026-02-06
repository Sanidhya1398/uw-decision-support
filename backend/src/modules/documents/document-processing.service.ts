import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

// PDF extraction (fallback)
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch {
  pdfParse = null;
}

export interface ProcessingResult {
  text: string;
  method: 'pdf_native' | 'ocr' | 'manual';
  pageCount?: number;
  confidence: number;
  language?: string;
}

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly mlServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // ML Service URL for OCR
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  /**
   * Get the upload directory path
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * Process an uploaded document and extract text
   * Tries ML Service OCR first, falls back to local processing
   */
  async processDocument(filePath: string, mimeType: string): Promise<ProcessingResult> {
    this.logger.log(`Processing document: ${filePath}, type: ${mimeType}`);

    // Try ML Service OCR first (PaddleOCR)
    try {
      const ocrResult = await this.extractWithMlService(filePath, mimeType);
      if (ocrResult && ocrResult.text && ocrResult.text.length > 50) {
        this.logger.log(`ML Service OCR extracted ${ocrResult.text.length} characters`);
        return ocrResult;
      }
    } catch (error) {
      this.logger.warn(`ML Service OCR failed, falling back to local: ${error.message}`);
    }

    // Fallback to local processing
    if (mimeType === 'application/pdf') {
      return this.extractFromPdfLocal(filePath);
    } else if (mimeType.startsWith('image/')) {
      return this.extractFromImageLocal(filePath);
    } else if (mimeType === 'text/plain') {
      return this.extractFromText(filePath);
    } else {
      this.logger.warn(`Unsupported file type: ${mimeType}`);
      return {
        text: '',
        method: 'manual',
        confidence: 0,
      };
    }
  }

  /**
   * Extract text using ML Service (PaddleOCR)
   */
  private async extractWithMlService(filePath: string, mimeType: string): Promise<ProcessingResult> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('extract_structure', 'false');

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/ocr/extract`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 120000, // 2 minutes for large documents
        }),
      );

      const data = response.data;
      if (data.success && data.extraction) {
        const extraction = data.extraction;
        return {
          text: extraction.text || '',
          method: extraction.method === 'native' ? 'pdf_native' : 'ocr',
          pageCount: extraction.page_count,
          confidence: extraction.confidence || 0.9,
          language: extraction.language || 'en',
        };
      }

      throw new Error('Invalid response from ML Service');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.logger.warn('ML Service not available for OCR');
      }
      throw error;
    }
  }

  /**
   * Extract text from PDF using local pdf-parse (fallback)
   */
  private async extractFromPdfLocal(filePath: string): Promise<ProcessingResult> {
    if (!pdfParse) {
      this.logger.warn('pdf-parse not available, returning empty result');
      return {
        text: '',
        method: 'manual',
        confidence: 0,
      };
    }

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      const text = data.text?.trim() || '';
      const hasText = text.length > 50;

      if (hasText) {
        this.logger.log(`Local extraction: ${text.length} characters from PDF (${data.numpages} pages)`);
        return {
          text,
          method: 'pdf_native',
          pageCount: data.numpages,
          confidence: 0.95,
          language: this.detectLanguage(text),
        };
      } else {
        // PDF might be scanned/image-based
        this.logger.log('PDF appears to be image-based, needs OCR');
        return {
          text: '[SCANNED_DOCUMENT: Start the ML Service for OCR processing, or enter text manually.]',
          method: 'ocr',
          confidence: 0.3,
        };
      }
    } catch (error) {
      this.logger.error(`PDF extraction failed: ${error}`);
      return {
        text: '',
        method: 'manual',
        confidence: 0,
      };
    }
  }

  /**
   * Extract text from image (fallback - needs ML Service for actual OCR)
   */
  private async extractFromImageLocal(filePath: string): Promise<ProcessingResult> {
    this.logger.log('Image document - needs ML Service for OCR');

    return {
      text: '[IMAGE_DOCUMENT: Start the ML Service for OCR processing, or enter text manually.]',
      method: 'ocr',
      confidence: 0.3,
    };
  }

  /**
   * Extract text from plain text file
   */
  private async extractFromText(filePath: string): Promise<ProcessingResult> {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      return {
        text: text.trim(),
        method: 'pdf_native',
        confidence: 1.0,
        language: this.detectLanguage(text),
      };
    } catch (error) {
      this.logger.error(`Text extraction failed: ${error}`);
      return {
        text: '',
        method: 'manual',
        confidence: 0,
      };
    }
  }

  /**
   * Simple language detection based on character analysis
   */
  private detectLanguage(text: string): string {
    // Check for Hindi/Devanagari characters
    const devanagariPattern = /[\u0900-\u097F]/;
    if (devanagariPattern.test(text)) {
      return 'hi-en'; // Hindi-English mix common in Indian medical docs
    }
    return 'en';
  }

  /**
   * Delete a file from the uploads directory
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Get file info
   */
  getFileInfo(filePath: string): { size: number; exists: boolean } {
    try {
      const stats = fs.statSync(filePath);
      return { size: stats.size, exists: true };
    } catch {
      return { size: 0, exists: false };
    }
  }

  /**
   * Check if ML Service OCR is available
   */
  async isOcrServiceAvailable(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.mlServiceUrl}/api/v1/ocr/health`, { timeout: 5000 }),
      );
      return response.data?.ocr_available === true;
    } catch {
      return false;
    }
  }
}
