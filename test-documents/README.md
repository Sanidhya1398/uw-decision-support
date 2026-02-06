# Test Documents for OCR Testing

This folder contains sample medical documents for testing the OCR extraction functionality.

## Documents Included

### 1. sample-medical-report.html
**Type:** Medical Examination Report for Insurance
**Patient:** Rajesh Kumar Sharma, 45M
**Key Findings:**
- Type 2 Diabetes (HbA1c 7.8%)
- Newly diagnosed Hypertension (142/92)
- Dyslipidemia
- BMI 28.7 (Overweight)
- Former smoker
- Family history of cardiac disease

### 2. sample-lab-report.html
**Type:** Pathology Lab Report (SRL Diagnostics)
**Patient:** Anita Desai, 52F
**Key Findings:**
- Anemia (Hb 10.2)
- Hypothyroidism (TSH 8.72, elevated Anti-TPO)
- Dyslipidemia (high cholesterol, LDL)
- Elevated liver enzymes (SGPT, SGOT, GGT)
- Prediabetes (HbA1c 6.2%)

### 3. sample-discharge-summary.html
**Type:** Hospital Discharge Summary (Fortis)
**Patient:** Suresh Chandra Gupta, 58M
**Key Findings:**
- Acute Anterior Wall STEMI (Heart Attack)
- Triple Vessel Coronary Artery Disease
- LVEF 35% (reduced heart function)
- Uncontrolled Diabetes (HbA1c 9.8%)
- Primary PCI done with stent
- CABG recommended
- Chronic smoker, regular alcohol use

## How to Convert to PDF for Testing

### Option 1: Browser Print to PDF (Recommended)
1. Open any `.html` file in Chrome/Edge/Firefox
2. Press `Ctrl + P` (Print)
3. Select "Save as PDF" or "Microsoft Print to PDF"
4. Save to this folder with `.pdf` extension

### Option 2: Use Online Converter
- https://www.ilovepdf.com/html-to-pdf
- https://cloudconvert.com/html-to-pdf

## Testing the OCR

### Via API (curl or Postman):
```bash
# Test file upload OCR
curl -X POST "http://localhost:8000/api/v1/ocr/extract" \
  -F "file=@sample-medical-report.pdf" \
  -F "extract_structure=false"

# Test OCR health
curl "http://localhost:8000/api/v1/ocr/health"
```

### Via Frontend:
1. Open http://localhost:3000
2. Navigate to any case
3. Go to "Documents" tab
4. Upload a PDF document
5. The system will extract text using OCR
6. Extracted entities should appear in Patient Info

## Expected OCR Results

The OCR should extract key medical entities like:
- Patient demographics (name, age, gender)
- Medical conditions (Diabetes, Hypertension, etc.)
- Lab values (HbA1c, cholesterol, etc.)
- Medications
- Hospital/Doctor information
- Dates

## Notes

- These are fictional sample documents for testing only
- Names, addresses, and medical details are completely fabricated
- Documents simulate realistic Indian medical reports
