import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '../configuration/configuration.service';

interface ExtractedCondition {
  name: string;
  icdCode?: string;
  confidence: number;
  sourceSpan?: string;
  category?: string;
  riskTier?: string;
}

interface ExtractedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  confidence: number;
  sourceSpan?: string;
  category?: string;
}

interface ExtractedLabValue {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  abnormal?: boolean;
  confidence: number;
  sourceSpan?: string;
}

interface ExtractedDate {
  dateType: string;
  date: string;
  confidence: number;
  sourceSpan?: string;
}

interface ExtractedProcedure {
  name: string;
  date?: string;
  confidence: number;
  sourceSpan?: string;
  category?: string;
}

interface ExtractionResult {
  conditions: ExtractedCondition[];
  medications: ExtractedMedication[];
  labValues: ExtractedLabValue[];
  dates: ExtractedDate[];
  procedures: ExtractedProcedure[];
  overallConfidence: number;
}

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);

  // Negation patterns - expanded list
  private readonly negationPatterns = [
    'no ', 'not ', 'negative ', 'denies ', 'denied ', 'deny ',
    'ruled out ', 'rules out ', 'rule out ',
    'no evidence of ', 'no signs of ', 'no symptoms of ',
    'without ', 'absent ', 'absence of ',
    'negative for ', 'free of ', 'clear of ',
    'no history of ', 'no h/o ', 'no hx of ',
    'unremarkable ', 'normal ',
  ];

  // Affirmation patterns
  private readonly affirmationPatterns = [
    'diagnosed with ', 'diagnosis of ', 'dx: ', 'dx of ',
    'history of ', 'h/o ', 'hx of ', 'hx: ',
    'known case of ', 'known ', 'established ',
    'suffering from ', 'treated for ', 'on treatment for ',
    'positive for ', 'confirmed ', 'presents with ',
    'complains of ', 'c/o ', 'complaint of ',
  ];

  constructor(private configService: ConfigurationService) {}

  async extractEntities(text: string): Promise<ExtractionResult> {
    const medicalDictionary = await this.configService.getMedicalDictionary();

    const conditions = this.extractConditions(text, medicalDictionary.conditions || []);
    const medications = this.extractMedications(text, medicalDictionary.medications || []);
    const labValues = this.extractLabValues(text);
    const dates = this.extractDates(text);
    const procedures = this.extractProcedures(text, medicalDictionary.procedures || []);

    const allConfidences = [
      ...conditions.map(c => c.confidence),
      ...medications.map(m => m.confidence),
      ...labValues.map(l => l.confidence),
      ...dates.map(d => d.confidence),
      ...procedures.map(p => p.confidence),
    ];

    const overallConfidence = allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : 0;

    this.logger.log(`Extracted: ${conditions.length} conditions, ${medications.length} medications, ${labValues.length} lab values, ${procedures.length} procedures`);

    return {
      conditions,
      medications,
      labValues,
      dates,
      procedures,
      overallConfidence,
    };
  }

  private extractConditions(text: string, dictionary: any[]): ExtractedCondition[] {
    const conditions: ExtractedCondition[] = [];
    const textLower = text.toLowerCase();
    const foundConditions = new Set<string>();

    for (const condition of dictionary) {
      const canonicalLower = condition.canonicalName.toLowerCase();
      const termsToCheck = [canonicalLower, ...(condition.synonyms || []).map((s: string) => s.toLowerCase())];

      for (const term of termsToCheck) {
        // Skip very short terms that might cause false positives
        if (term.length < 3) continue;

        const index = textLower.indexOf(term);
        if (index !== -1 && !foundConditions.has(canonicalLower)) {
          // Extract surrounding context for source span
          const start = Math.max(0, index - 40);
          const end = Math.min(text.length, index + term.length + 40);
          const contextText = text.substring(start, end);
          const contextLower = contextText.toLowerCase();

          // Check for negation in the surrounding context
          const precedingText = textLower.substring(Math.max(0, index - 50), index);
          const isNegated = this.negationPatterns.some(neg => precedingText.includes(neg));

          if (!isNegated) {
            // Calculate confidence based on match type and context
            let confidence = 0.80;

            // Boost confidence for exact canonical match
            if (term === canonicalLower) {
              confidence = 0.95;
            }

            // Boost confidence if affirmation pattern is present
            if (this.affirmationPatterns.some(aff => precedingText.includes(aff))) {
              confidence = Math.min(0.98, confidence + 0.10);
            }

            conditions.push({
              name: condition.canonicalName,
              icdCode: condition.icdCodes?.[0],
              confidence,
              sourceSpan: `...${contextText.trim()}...`,
              category: condition.category,
              riskTier: condition.riskTier,
            });
            foundConditions.add(canonicalLower);
            break; // Found this condition, move to next
          }
        }
      }
    }

    return conditions;
  }

  private extractMedications(text: string, dictionary: any[]): ExtractedMedication[] {
    const medications: ExtractedMedication[] = [];
    const textLower = text.toLowerCase();
    const foundMedications = new Set<string>();

    // Common dosage patterns
    const dosagePattern = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?|iu|tablet[s]?|tab[s]?|cap[s]?|capsule[s]?)/gi;
    const frequencyPatterns = [
      /once\s*(?:daily|a day|per day)/gi,
      /twice\s*(?:daily|a day|per day)/gi,
      /thrice\s*(?:daily|a day|per day)/gi,
      /(\d+)\s*times?\s*(?:daily|a day|per day)/gi,
      /\b(od|bd|tds|qid|qd|bid|tid|hs|prn|sos)\b/gi,
      /every\s*(\d+)\s*hours?/gi,
      /morning|evening|night|bedtime/gi,
    ];

    for (const med of dictionary) {
      const medNameLower = med.name.toLowerCase();
      const termsToCheck = [medNameLower, ...(med.genericNames || []).map((g: string) => g.toLowerCase())];

      for (const term of termsToCheck) {
        if (term.length < 3) continue;

        const index = textLower.indexOf(term);
        if (index !== -1 && !foundMedications.has(medNameLower)) {
          // Extract context for dosage and frequency
          const contextStart = Math.max(0, index - 20);
          const contextEnd = Math.min(text.length, index + term.length + 80);
          const context = text.substring(contextStart, contextEnd);

          // Find dosage
          let dosage: string | undefined;
          const dosageMatch = context.match(dosagePattern);
          if (dosageMatch) {
            dosage = dosageMatch[0];
          }

          // Find frequency
          let frequency: string | undefined;
          for (const freqPattern of frequencyPatterns) {
            const freqMatch = context.match(freqPattern);
            if (freqMatch) {
              frequency = freqMatch[0];
              break;
            }
          }

          medications.push({
            name: med.name,
            dosage,
            frequency,
            confidence: 0.90,
            sourceSpan: `...${context.trim()}...`,
            category: med.category,
          });
          foundMedications.add(medNameLower);
          break;
        }
      }
    }

    return medications;
  }

  private extractLabValues(text: string): ExtractedLabValue[] {
    const labValues: ExtractedLabValue[] = [];
    const foundLabs = new Set<string>();

    // Extended lab test patterns with reference ranges
    const labPatterns = [
      // Glycemic
      { name: 'HbA1c', pattern: /(?:hba1c|hb\s*a1c|glycated\s*h(?:ae)?moglobin)[:\s]*(\d+(?:\.\d+)?)\s*%?/gi, unit: '%', refRange: '< 6.5%' },
      { name: 'Fasting Blood Sugar', pattern: /(?:fasting\s*(?:blood\s*)?(?:glucose|sugar|bs)|fbs|fbg)[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '70-100 mg/dL' },
      { name: 'Post Prandial Blood Sugar', pattern: /(?:pp(?:bs)?|post\s*prandial|2\s*hr?\s*(?:pp|glucose))[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '< 140 mg/dL' },
      { name: 'Random Blood Sugar', pattern: /(?:random\s*(?:blood\s*)?(?:glucose|sugar)|rbs|rbg)[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '< 200 mg/dL' },

      // Lipid Profile
      { name: 'Total Cholesterol', pattern: /(?:total\s*)?cholesterol[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '< 200 mg/dL' },
      { name: 'LDL Cholesterol', pattern: /ldl(?:\s*cholesterol)?[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '< 100 mg/dL' },
      { name: 'HDL Cholesterol', pattern: /hdl(?:\s*cholesterol)?[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '> 40 mg/dL' },
      { name: 'Triglycerides', pattern: /triglycerides?[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '< 150 mg/dL' },
      { name: 'VLDL', pattern: /vldl[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '< 30 mg/dL' },

      // Renal Function
      { name: 'Creatinine', pattern: /(?:serum\s*)?creatinine[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '0.7-1.3 mg/dL' },
      { name: 'Blood Urea Nitrogen', pattern: /(?:bun|blood\s*urea\s*nitrogen)[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '7-20 mg/dL' },
      { name: 'Urea', pattern: /(?:serum\s*)?urea[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '15-45 mg/dL' },
      { name: 'eGFR', pattern: /egfr[:\s]*(\d+(?:\.\d+)?)\s*(?:ml\/min)?/gi, unit: 'mL/min', refRange: '> 90 mL/min' },
      { name: 'Uric Acid', pattern: /uric\s*acid[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '3.5-7.2 mg/dL' },

      // Liver Function
      { name: 'ALT/SGPT', pattern: /(?:alt|sgpt)[:\s]*(\d+(?:\.\d+)?)\s*(?:u\/l|iu\/l)?/gi, unit: 'U/L', refRange: '7-56 U/L' },
      { name: 'AST/SGOT', pattern: /(?:ast|sgot)[:\s]*(\d+(?:\.\d+)?)\s*(?:u\/l|iu\/l)?/gi, unit: 'U/L', refRange: '10-40 U/L' },
      { name: 'ALP', pattern: /(?:alp|alkaline\s*phosphatase)[:\s]*(\d+(?:\.\d+)?)\s*(?:u\/l|iu\/l)?/gi, unit: 'U/L', refRange: '44-147 U/L' },
      { name: 'GGT', pattern: /(?:ggt|gamma\s*gt)[:\s]*(\d+(?:\.\d+)?)\s*(?:u\/l|iu\/l)?/gi, unit: 'U/L', refRange: '9-48 U/L' },
      { name: 'Total Bilirubin', pattern: /(?:total\s*)?bilirubin[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '0.1-1.2 mg/dL' },
      { name: 'Direct Bilirubin', pattern: /(?:direct|conjugated)\s*bilirubin[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '0-0.3 mg/dL' },
      { name: 'Albumin', pattern: /(?:serum\s*)?albumin[:\s]*(\d+(?:\.\d+)?)\s*(?:g\/dl)?/gi, unit: 'g/dL', refRange: '3.5-5.0 g/dL' },
      { name: 'Total Protein', pattern: /total\s*protein[:\s]*(\d+(?:\.\d+)?)\s*(?:g\/dl)?/gi, unit: 'g/dL', refRange: '6.0-8.3 g/dL' },

      // Hematology
      { name: 'Hemoglobin', pattern: /(?:hb|h(?:ae)?moglobin)[:\s]*(\d+(?:\.\d+)?)\s*(?:g\/dl|gm\/dl)?/gi, unit: 'g/dL', refRange: '12-17 g/dL' },
      { name: 'Hematocrit', pattern: /(?:hct|h(?:ae)?matocrit|pcv)[:\s]*(\d+(?:\.\d+)?)\s*%?/gi, unit: '%', refRange: '36-50%' },
      { name: 'WBC Count', pattern: /(?:wbc|white\s*(?:blood\s*)?cell(?:\s*count)?|tlc)[:\s]*(\d+(?:\.\d+)?)\s*(?:\/cumm|cells\/ul)?/gi, unit: 'cells/uL', refRange: '4000-11000' },
      { name: 'Platelet Count', pattern: /(?:platelet(?:\s*count)?|plt)[:\s]*(\d+(?:\.\d+)?)\s*(?:\/cumm|lakh)?/gi, unit: '/cumm', refRange: '150000-400000' },
      { name: 'RBC Count', pattern: /(?:rbc|red\s*(?:blood\s*)?cell(?:\s*count)?)[:\s]*(\d+(?:\.\d+)?)\s*(?:million)?/gi, unit: 'million/uL', refRange: '4.5-5.5' },
      { name: 'MCV', pattern: /mcv[:\s]*(\d+(?:\.\d+)?)\s*(?:fl)?/gi, unit: 'fL', refRange: '80-100 fL' },
      { name: 'ESR', pattern: /esr[:\s]*(\d+(?:\.\d+)?)\s*(?:mm\/hr)?/gi, unit: 'mm/hr', refRange: '0-20 mm/hr' },

      // Thyroid
      { name: 'TSH', pattern: /tsh[:\s]*(\d+(?:\.\d+)?)\s*(?:miu\/l|uiu\/ml)?/gi, unit: 'mIU/L', refRange: '0.4-4.0 mIU/L' },
      { name: 'T3', pattern: /(?:total\s*)?t3[:\s]*(\d+(?:\.\d+)?)\s*(?:ng\/dl)?/gi, unit: 'ng/dL', refRange: '80-200 ng/dL' },
      { name: 'T4', pattern: /(?:total\s*)?t4[:\s]*(\d+(?:\.\d+)?)\s*(?:ug\/dl)?/gi, unit: 'ug/dL', refRange: '5-12 ug/dL' },
      { name: 'Free T4', pattern: /(?:free\s*t4|ft4)[:\s]*(\d+(?:\.\d+)?)\s*(?:ng\/dl)?/gi, unit: 'ng/dL', refRange: '0.8-1.8 ng/dL' },

      // Cardiac
      { name: 'Troponin', pattern: /troponin[:\s]*(\d+(?:\.\d+)?)\s*(?:ng\/ml)?/gi, unit: 'ng/mL', refRange: '< 0.04 ng/mL' },
      { name: 'BNP', pattern: /(?:bnp|nt-probnp)[:\s]*(\d+(?:\.\d+)?)\s*(?:pg\/ml)?/gi, unit: 'pg/mL', refRange: '< 100 pg/mL' },
      { name: 'CK-MB', pattern: /(?:ck-mb|ckmb)[:\s]*(\d+(?:\.\d+)?)\s*(?:u\/l)?/gi, unit: 'U/L', refRange: '< 25 U/L' },

      // Blood Pressure (special handling)
      { name: 'Blood Pressure Systolic', pattern: /(?:bp|blood\s*pressure)[:\s]*(\d{2,3})\/\d{2,3}/gi, unit: 'mmHg', refRange: '< 120 mmHg' },
      { name: 'Blood Pressure Diastolic', pattern: /(?:bp|blood\s*pressure)[:\s]*\d{2,3}\/(\d{2,3})/gi, unit: 'mmHg', refRange: '< 80 mmHg' },

      // Electrolytes
      { name: 'Sodium', pattern: /(?:serum\s*)?sodium[:\s]*(\d+(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?/gi, unit: 'mEq/L', refRange: '136-145 mEq/L' },
      { name: 'Potassium', pattern: /(?:serum\s*)?potassium[:\s]*(\d+(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?/gi, unit: 'mEq/L', refRange: '3.5-5.0 mEq/L' },
      { name: 'Chloride', pattern: /(?:serum\s*)?chloride[:\s]*(\d+(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?/gi, unit: 'mEq/L', refRange: '98-106 mEq/L' },
      { name: 'Calcium', pattern: /(?:serum\s*)?calcium[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?/gi, unit: 'mg/dL', refRange: '8.5-10.5 mg/dL' },

      // Others
      { name: 'CRP', pattern: /(?:crp|c-reactive\s*protein)[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/l)?/gi, unit: 'mg/L', refRange: '< 10 mg/L' },
      { name: 'Vitamin D', pattern: /(?:vitamin\s*d|25-oh\s*d)[:\s]*(\d+(?:\.\d+)?)\s*(?:ng\/ml)?/gi, unit: 'ng/mL', refRange: '30-100 ng/mL' },
      { name: 'Vitamin B12', pattern: /(?:vitamin\s*b12|b12)[:\s]*(\d+(?:\.\d+)?)\s*(?:pg\/ml)?/gi, unit: 'pg/mL', refRange: '200-900 pg/mL' },
      { name: 'Ferritin', pattern: /ferritin[:\s]*(\d+(?:\.\d+)?)\s*(?:ng\/ml)?/gi, unit: 'ng/mL', refRange: '12-300 ng/mL' },
      { name: 'Iron', pattern: /(?:serum\s*)?iron[:\s]*(\d+(?:\.\d+)?)\s*(?:ug\/dl)?/gi, unit: 'ug/dL', refRange: '60-170 ug/dL' },

      // Urinalysis
      { name: 'Urine Protein', pattern: /(?:urine\s*)?protein[:\s]*(trace|negative|\+{1,4}|\d+)/gi, unit: '', refRange: 'Negative' },
      { name: 'Urine Sugar', pattern: /(?:urine\s*)?(?:sugar|glucose)[:\s]*(trace|negative|\+{1,4}|\d+)/gi, unit: '', refRange: 'Negative' },
      { name: 'Urine Albumin', pattern: /(?:urine\s*)?(?:micro)?albumin[:\s]*(\d+(?:\.\d+)?)\s*(?:mg\/l)?/gi, unit: 'mg/L', refRange: '< 30 mg/L' },
    ];

    for (const lab of labPatterns) {
      const matches = text.matchAll(lab.pattern);
      for (const match of matches) {
        const labKey = lab.name;
        if (foundLabs.has(labKey)) continue;

        const value = match[1];
        const numValue = parseFloat(value);

        // Determine if abnormal based on reference range
        let abnormal = this.isAbnormal(numValue, lab.refRange, value);

        labValues.push({
          testName: lab.name,
          value,
          unit: lab.unit,
          referenceRange: lab.refRange,
          abnormal,
          confidence: 0.88,
          sourceSpan: match[0],
        });
        foundLabs.add(labKey);
      }
    }

    return labValues;
  }

  private isAbnormal(numValue: number, refRange: string, rawValue: string): boolean {
    // Handle qualitative values
    if (isNaN(numValue)) {
      const lowerVal = rawValue.toLowerCase();
      if (lowerVal === 'negative' || lowerVal === 'nil') return false;
      if (lowerVal.includes('+') || lowerVal === 'trace' || lowerVal === 'positive') return true;
      return false;
    }

    // Handle numeric values
    if (refRange.startsWith('<')) {
      const threshold = parseFloat(refRange.replace(/[<\s%a-zA-Z\/]/g, ''));
      return numValue >= threshold;
    } else if (refRange.startsWith('>')) {
      const threshold = parseFloat(refRange.replace(/[>\s%a-zA-Z\/]/g, ''));
      return numValue <= threshold;
    } else if (refRange.includes('-')) {
      const parts = refRange.split('-');
      const low = parseFloat(parts[0].replace(/[^\d.]/g, ''));
      const high = parseFloat(parts[1].replace(/[^\d.]/g, ''));
      return numValue < low || numValue > high;
    }
    return false;
  }

  private extractProcedures(text: string, dictionary: any[]): ExtractedProcedure[] {
    const procedures: ExtractedProcedure[] = [];
    const textLower = text.toLowerCase();
    const foundProcedures = new Set<string>();

    for (const procedure of dictionary) {
      const canonicalLower = procedure.canonicalName.toLowerCase();
      const termsToCheck = [canonicalLower, ...(procedure.synonyms || []).map((s: string) => s.toLowerCase())];

      for (const term of termsToCheck) {
        if (term.length < 3) continue;

        const index = textLower.indexOf(term);
        if (index !== -1 && !foundProcedures.has(canonicalLower)) {
          const start = Math.max(0, index - 40);
          const end = Math.min(text.length, index + term.length + 60);
          const context = text.substring(start, end);

          // Try to find date near the procedure
          const dateMatch = context.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

          procedures.push({
            name: procedure.canonicalName,
            date: dateMatch ? dateMatch[1] : undefined,
            confidence: 0.85,
            sourceSpan: `...${context.trim()}...`,
            category: procedure.category,
          });
          foundProcedures.add(canonicalLower);
          break;
        }
      }
    }

    return procedures;
  }

  private extractDates(text: string): ExtractedDate[] {
    const dates: ExtractedDate[] = [];

    // Date patterns with context
    const datePatterns = [
      { pattern: /diagnosed\s*(?:on|in)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, type: 'diagnosis_date' },
      { pattern: /diagnosed\s*(?:on|in)?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2},?\s*\d{2,4})/gi, type: 'diagnosis_date' },
      { pattern: /since\s*(\d{4})/gi, type: 'condition_start' },
      { pattern: /since\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4})/gi, type: 'condition_start' },
      { pattern: /(?:hospitalized|admitted|hospitalised)\s*(?:on|in)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, type: 'hospitalization_date' },
      { pattern: /(?:surgery|operation|procedure)\s*(?:on|in)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, type: 'surgery_date' },
      { pattern: /(?:last\s*visit|follow\s*up|review)\s*(?:on|in)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, type: 'followup_date' },
      { pattern: /(?:started|commenced|initiated)\s*(?:on|in)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, type: 'treatment_start' },
      { pattern: /date\s*(?:of\s*)?(?:report|test|examination)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, type: 'report_date' },
    ];

    for (const dp of datePatterns) {
      const matches = text.matchAll(dp.pattern);
      for (const match of matches) {
        dates.push({
          dateType: dp.type,
          date: match[1],
          confidence: 0.85,
          sourceSpan: match[0],
        });
      }
    }

    return dates;
  }
}
