# Data Contracts

## Document Purpose

This document specifies the data contracts for the underwriting decision support system. It defines what data the system expects, which fields are mandatory versus optional, accepted formats, data source assumptions, and how the system handles data quality issues including missing fields and low-confidence values.

The system is a consumer of data, not a producer. It receives structured and semi-structured information from upstream systems and processes that information to support underwriting decisions. Understanding what the system expects—and what it does not handle—is essential for successful integration.

---

## Data Philosophy

### System as Data Consumer

The decision support system operates downstream of data capture and digitisation processes. It expects to receive data that has already been:

- Captured from applicants via proposal forms
- Extracted from documents by document management systems
- Validated at point of entry where applicable
- Transmitted via secure API integrations

The system does not perform primary data capture, document scanning, or optical character recognition.

### Data Quality Partnership

Data quality is a shared responsibility. The system includes mechanisms to flag questionable data and surface confidence indicators, but it cannot compensate for fundamentally incomplete or incorrect source data. Upstream systems are responsible for data capture accuracy; this system is responsible for appropriate handling of the data it receives.

### Explicit Over Implicit

The system prefers explicit, structured data over implicit or inferred information. When structured fields are available, they take precedence over extracted text. When extraction is necessary, confidence indicators accompany the results.

---

## Data Source Assumptions

### External Systems and Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCE LANDSCAPE                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    EXTERNAL TO THIS SYSTEM                          │   │
│  │                    (Upstream Responsibilities)                      │   │
│  │                                                                     │   │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │   │
│  │  │ Proposal Capture  │  │ Document          │  │ Hospital/Lab    │ │   │
│  │  │ Systems           │  │ Management        │  │ Information     │ │   │
│  │  │                   │  │ Systems           │  │ Systems         │ │   │
│  │  │ • Web portals     │  │ • Document intake │  │ • HL7/FHIR      │ │   │
│  │  │ • Agent systems   │  │ • OCR processing  │  │ • Lab feeds     │ │   │
│  │  │ • Paper digitise  │  │ • Text extraction │  │ • EMR extracts  │ │   │
│  │  │ • Data validation │  │ • Classification  │  │ • Structured    │ │   │
│  │  │                   │  │                   │  │   results       │ │   │
│  │  └─────────┬─────────┘  └─────────┬─────────┘  └────────┬────────┘ │   │
│  │            │                      │                     │          │   │
│  └────────────┼──────────────────────┼─────────────────────┼──────────┘   │
│               │                      │                     │              │
│               │    Structured Data   │   Extracted Text    │  Structured  │
│               │    via API           │   via API           │  Data/API    │
│               ▼                      ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                    DECISION SUPPORT SYSTEM                          │   │
│  │                    (This System's Scope)                            │   │
│  │                                                                     │   │
│  │  • Receives structured proposal data                               │   │
│  │  • Receives pre-extracted document text                            │   │
│  │  • Performs rule-based NLP on text to extract medical entities     │   │
│  │  • Does NOT perform OCR                                            │   │
│  │  • Does NOT scan documents                                         │   │
│  │  • Does NOT digitise paper forms                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### OCR and Document Scanning: Explicitly Out of Scope

**The decision support system does not include OCR (Optical Character Recognition) or document scanning capabilities.**

| Responsibility | Owner | Notes |
|----------------|-------|-------|
| Scanning paper documents | Document Management System | Physical to digital conversion |
| OCR processing | Document Management System | Image to text conversion |
| Handwriting recognition | Document Management System | If supported by DMS |
| PDF text extraction | Document Management System | Embedded text extraction |
| Image preprocessing | Document Management System | Quality enhancement for OCR |
| Document classification | Document Management System | Identifying document types |

The decision support system receives text content that has already been extracted by upstream systems. If a document arrives as an image without extracted text, the system cannot process it—it must be returned to the document management workflow for text extraction.

### Source System Expectations

| Source System | Expected Data | Format | Integration |
|---------------|---------------|--------|-------------|
| Policy Administration | Proposal details, applicant info, product data | Structured JSON | REST API |
| Document Management | Extracted text, document metadata | Text + JSON metadata | REST API |
| Hospital/Lab Systems | Structured test results | HL7 FHIR or structured JSON | REST API (where available) |
| Agent Portals | Proposal submissions | Structured JSON | REST API |

---

## Data Categories

### Category Overview

The system processes four primary categories of data:

| Category | Description | Primary Source |
|----------|-------------|----------------|
| Proposal Data | Structured application information | Policy Administration System |
| Document Content | Extracted text from medical documents | Document Management System |
| Test Results | Laboratory and diagnostic results | Hospital systems, Document extraction |
| Reference Data | Configuration, rules, protocols | Internal configuration |

---

## Proposal Data Contract

### Applicant Information

#### Personal Details

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| applicant_id | String | Yes | UUID or system ID | Must be unique |
| first_name | String | Yes | Text, max 100 chars | Non-empty |
| last_name | String | Yes | Text, max 100 chars | Non-empty |
| date_of_birth | Date | Yes | ISO 8601 (YYYY-MM-DD) | Valid date, not future |
| gender | Enum | Yes | "male", "female", "other" | Valid enum value |
| nationality | String | Yes | ISO 3166-1 alpha-2 | Valid country code |
| marital_status | Enum | No | "single", "married", "divorced", "widowed" | Valid enum if provided |
| occupation | String | Yes | Text, max 200 chars | Non-empty |
| occupation_code | String | No | Standard occupation code | Valid code if provided |
| annual_income | Number | Yes | Positive decimal | > 0 |
| income_currency | String | Yes | ISO 4217 (e.g., "INR") | Valid currency code |

#### Contact Information

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| address_line_1 | String | Yes | Text, max 200 chars | Non-empty |
| address_line_2 | String | No | Text, max 200 chars | — |
| city | String | Yes | Text, max 100 chars | Non-empty |
| state | String | Yes | Text or state code | Valid for country |
| postal_code | String | Yes | Text, max 20 chars | Valid format for country |
| country | String | Yes | ISO 3166-1 alpha-2 | Valid country code |
| phone_primary | String | Yes | E.164 format | Valid phone number |
| phone_secondary | String | No | E.164 format | Valid if provided |
| email | String | Yes | Email format | Valid email |

#### Physical Characteristics

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| height_cm | Number | Yes | Positive integer | 50-300 |
| weight_kg | Number | Yes | Positive decimal | 10-500 |
| bmi | Number | No | Calculated decimal | System calculates if not provided |

### Policy Details

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| proposal_id | String | Yes | UUID or system ID | Must be unique |
| proposal_date | DateTime | Yes | ISO 8601 | Valid datetime, not future |
| product_code | String | Yes | Product identifier | Must exist in product catalog |
| product_name | String | Yes | Text | Non-empty |
| sum_assured | Number | Yes | Positive decimal | Within product limits |
| sum_assured_currency | String | Yes | ISO 4217 | Valid currency code |
| policy_term_years | Integer | No | Positive integer | Within product limits |
| premium_frequency | Enum | No | "monthly", "quarterly", "annual", "single" | Valid enum |
| rider_codes | Array | No | Array of product codes | Valid rider codes |

### Medical Disclosures

#### Conditions Disclosed

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| conditions | Array | Yes | Array of condition objects | May be empty array |
| conditions[].condition_name | String | Yes (per item) | Text | Non-empty |
| conditions[].icd_code | String | No | ICD-10 format | Valid ICD-10 if provided |
| conditions[].diagnosis_date | Date | No | ISO 8601 | Valid date if provided |
| conditions[].current_status | Enum | No | "active", "resolved", "chronic", "acute" | Valid enum |
| conditions[].treatment_status | Enum | No | "treated", "untreated", "monitoring" | Valid enum |
| conditions[].treating_physician | String | No | Text | — |
| conditions[].notes | String | No | Text, max 1000 chars | — |

#### Medications Disclosed

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| medications | Array | Yes | Array of medication objects | May be empty array |
| medications[].drug_name | String | Yes (per item) | Text | Non-empty |
| medications[].generic_name | String | No | Text | — |
| medications[].dosage | String | No | Text (e.g., "500mg") | — |
| medications[].frequency | String | No | Text (e.g., "twice daily") | — |
| medications[].start_date | Date | No | ISO 8601 | Valid date if provided |
| medications[].indication | String | No | Text | — |

#### Family History

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| family_history | Array | Yes | Array of history objects | May be empty array |
| family_history[].relationship | Enum | Yes (per item) | "father", "mother", "sibling", "grandparent" | Valid enum |
| family_history[].condition | String | Yes (per item) | Text | Non-empty |
| family_history[].age_at_diagnosis | Integer | No | Positive integer | 0-120 |
| family_history[].age_at_death | Integer | No | Positive integer | 0-120 |
| family_history[].current_status | Enum | No | "alive", "deceased" | Valid enum |

#### Lifestyle Factors

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| smoking_status | Enum | Yes | "never", "former", "current" | Valid enum |
| smoking_quantity | String | No | Text (e.g., "10 cigarettes/day") | Required if current smoker |
| smoking_duration_years | Integer | No | Positive integer | Required if current/former |
| smoking_quit_date | Date | No | ISO 8601 | Required if former smoker |
| alcohol_status | Enum | Yes | "never", "social", "regular", "heavy" | Valid enum |
| alcohol_quantity | String | No | Text (e.g., "2-3 drinks/week") | — |
| hazardous_activities | Array | No | Array of strings | — |
| hazardous_activities_details | String | No | Text, max 1000 chars | — |

### Distribution Information

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| agent_id | String | No | Agent identifier | Valid agent if provided |
| agent_name | String | No | Text | — |
| channel | Enum | Yes | "agent", "direct", "bancassurance", "online" | Valid enum |
| branch_code | String | No | Branch identifier | Valid branch if provided |

---

## Document Content Contract

### Document Metadata

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| document_id | String | Yes | UUID | Must be unique |
| case_id | String | Yes | Case identifier | Must exist |
| document_type | Enum | Yes | See document type enum | Valid enum |
| document_date | Date | No | ISO 8601 | Valid date if provided |
| received_date | DateTime | Yes | ISO 8601 | Valid datetime |
| source_system | String | Yes | System identifier | Known source |
| file_name | String | No | Text | — |
| file_type | String | Yes | MIME type | Supported type |
| page_count | Integer | No | Positive integer | — |
| extraction_status | Enum | Yes | "pending", "extracted", "failed", "manual" | Valid enum |
| extraction_confidence | Number | No | 0-1 decimal | — |

### Document Type Enumeration

| Value | Description |
|-------|-------------|
| medical_report | General medical examination report |
| lab_result | Laboratory test results |
| discharge_summary | Hospital discharge summary |
| prescription | Prescription or medication list |
| diagnostic_imaging | Radiology or imaging report |
| specialist_report | Specialist consultation report |
| ecg_report | Electrocardiogram report |
| pathology_report | Pathology or biopsy report |
| insurance_form | Insurance-specific medical form |
| attending_physician | Attending physician statement |
| other_medical | Other medical document |
| identity_document | ID proof (passport, Aadhaar, etc.) |
| financial_document | Income or financial proof |

### Extracted Text Content

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| extracted_text | String | Yes* | Plain text | *Required if extraction_status = "extracted" |
| extraction_method | Enum | Yes* | "pdf_native", "ocr", "manual" | Valid enum |
| extraction_date | DateTime | Yes* | ISO 8601 | Valid datetime |
| extraction_confidence | Number | No | 0-1 decimal | — |
| language_detected | String | No | ISO 639-1 | Valid language code |
| page_texts | Array | No | Array of per-page text | — |

**Note**: The `extraction_method` field indicates how text was extracted upstream. Value "ocr" indicates the Document Management System performed OCR before sending to this system. This system does not perform OCR itself.

### Pre-Structured Extractions (Optional)

If the Document Management System provides pre-extracted structured data, it may be included:

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| pre_extracted_data | Object | No | Structured extraction | — |
| pre_extracted_data.conditions | Array | No | Condition objects | — |
| pre_extracted_data.medications | Array | No | Medication objects | — |
| pre_extracted_data.lab_results | Array | No | Lab result objects | — |
| pre_extracted_data.extraction_source | String | No | "dms_nlp", "hospital_feed", "manual" | — |

When pre-extracted structured data is provided, this system may use it directly or perform its own extraction for validation, depending on configuration.

---

## Test Results Contract

### Structured Test Results

When test results arrive as structured data (preferred):

| Field | Type | Mandatory | Format | Validation |
|-------|------|-----------|--------|------------|
| result_id | String | Yes | UUID | Must be unique |
| case_id | String | Yes | Case identifier | Must exist |
| test_code | String | Yes | Standard test code (LOINC preferred) | Valid code |
| test_name | String | Yes | Text | Non-empty |
| result_value | String/Number | Yes | Depends on test type | — |
| result_unit | String | Yes | Standard unit | Valid unit for test |
| reference_range_low | Number | No | Decimal | — |
| reference_range_high | Number | No | Decimal | — |
| reference_range_text | String | No | Text (e.g., "< 6.5%") | — |
| abnormal_flag | Enum | No | "normal", "low", "high", "critical_low", "critical_high" | Valid enum |
| test_date | Date | Yes | ISO 8601 | Valid date |
| result_date | DateTime | No | ISO 8601 | Valid datetime |
| performing_lab | String | No | Text | — |
| lab_accreditation | String | No | Accreditation ID | — |
| ordering_physician | String | No | Text | — |
| specimen_type | String | No | Text (e.g., "blood", "urine") | — |
| fasting_status | Enum | No | "fasting", "non_fasting", "unknown" | Valid enum |
| comments | String | No | Text | — |

### Common Test Categories

| Category | Common Tests | Expected Result Type |
|----------|--------------|---------------------|
| Glycemic | HbA1c, Fasting Glucose, OGTT | Numeric |
| Lipid | Total Cholesterol, LDL, HDL, Triglycerides | Numeric |
| Renal | Creatinine, BUN, eGFR | Numeric |
| Hepatic | ALT, AST, ALP, Bilirubin, Albumin | Numeric |
| Hematology | Hemoglobin, WBC, Platelet Count | Numeric |
| Cardiac | Troponin, BNP, CK-MB | Numeric |
| Thyroid | TSH, T3, T4 | Numeric |
| Urine | Protein, Glucose, Microalbumin | Numeric or Qualitative |
| Imaging | ECG, Echo, Stress Test | Report/Interpretation |

---

## Reference Data Contract

### Product Configuration

| Field | Type | Mandatory | Format |
|-------|------|-----------|--------|
| product_code | String | Yes | Identifier |
| product_name | String | Yes | Text |
| min_entry_age | Integer | Yes | Years |
| max_entry_age | Integer | Yes | Years |
| min_sum_assured | Number | Yes | Currency amount |
| max_sum_assured | Number | Yes | Currency amount |
| medical_requirements | Array | Yes | Requirement rules |
| available_riders | Array | No | Rider codes |

### Underwriting Rules

| Field | Type | Mandatory | Format |
|-------|------|-----------|--------|
| rule_id | String | Yes | Identifier |
| rule_name | String | Yes | Text |
| rule_category | Enum | Yes | Category type |
| conditions | Object | Yes | Rule conditions |
| actions | Object | Yes | Rule outputs |
| effective_date | Date | Yes | ISO 8601 |
| expiry_date | Date | No | ISO 8601 |
| version | Integer | Yes | Version number |

### Medical Dictionaries

| Field | Type | Mandatory | Format |
|-------|------|-----------|--------|
| term_id | String | Yes | Identifier |
| canonical_name | String | Yes | Standard name |
| synonyms | Array | Yes | Alternative names |
| icd_codes | Array | No | ICD-10 codes |
| category | Enum | Yes | Medical category |
| underwriting_class | Enum | No | Risk classification |

---

## Data Quality Handling

### Mandatory Field Validation

When mandatory fields are missing, the system responds according to field criticality:

| Criticality | Missing Field Response | Example Fields |
|-------------|----------------------|----------------|
| Critical | Reject intake, return error | applicant_id, proposal_id, date_of_birth |
| High | Accept with flag, block processing | sum_assured, product_code, smoking_status |
| Medium | Accept with flag, continue with caution | occupation, medical conditions |
| Low | Accept, note as incomplete | secondary phone, detailed notes |

### Missing Field Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MISSING FIELD HANDLING FLOW                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FIELD RECEIVED?                                  │   │
│  │                                                                     │   │
│  │                         │                                          │   │
│  │              ┌──────────┴──────────┐                               │   │
│  │              │                     │                               │   │
│  │              ▼                     ▼                               │   │
│  │           YES                     NO                               │   │
│  │              │                     │                               │   │
│  │              ▼                     ▼                               │   │
│  │     ┌─────────────┐      ┌─────────────────┐                       │   │
│  │     │ Validate    │      │ Check if        │                       │   │
│  │     │ format and  │      │ mandatory       │                       │   │
│  │     │ constraints │      │                 │                       │   │
│  │     └──────┬──────┘      └────────┬────────┘                       │   │
│  │            │                      │                                │   │
│  │            ▼               ┌──────┴──────┐                         │   │
│  │     ┌─────────────┐        │             │                         │   │
│  │     │ Valid?      │        ▼             ▼                         │   │
│  │     └──────┬──────┘   MANDATORY     OPTIONAL                       │   │
│  │            │               │             │                         │   │
│  │     ┌──────┴──────┐        ▼             ▼                         │   │
│  │     │             │   ┌─────────┐   ┌─────────┐                    │   │
│  │     ▼             ▼   │ Check   │   │ Set     │                    │   │
│  │   VALID       INVALID │ critic- │   │ default │                    │   │
│  │     │             │   │ ality   │   │ or null │                    │   │
│  │     ▼             ▼   └────┬────┘   └────┬────┘                    │   │
│  │ ┌────────┐  ┌─────────┐    │             │                         │   │
│  │ │Accept  │  │ Flag    │    ▼             ▼                         │   │
│  │ │field   │  │ quality │ ┌──────┐    ┌─────────┐                    │   │
│  │ │        │  │ issue   │ │CRIT- │    │ Flag as │                    │   │
│  │ └────────┘  └─────────┘ │ICAL? │    │ incom-  │                    │   │
│  │                         └──┬───┘    │ plete   │                    │   │
│  │                            │        └─────────┘                    │   │
│  │                     ┌──────┴──────┐                                │   │
│  │                     │             │                                │   │
│  │                     ▼             ▼                                │   │
│  │                   YES            NO                                │   │
│  │                     │             │                                │   │
│  │                     ▼             ▼                                │   │
│  │              ┌──────────┐  ┌───────────┐                           │   │
│  │              │ REJECT   │  │ Flag +    │                           │   │
│  │              │ intake   │  │ request   │                           │   │
│  │              │          │  │ info      │                           │   │
│  │              └──────────┘  └───────────┘                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Confidence Scoring

Data confidence is tracked at multiple levels:

| Level | Confidence Source | Score Range | Usage |
|-------|-------------------|-------------|-------|
| Field | Source system indication | 0.0 - 1.0 | Flag low-confidence fields |
| Extraction | NLP extraction confidence | 0.0 - 1.0 | Flag uncertain extractions |
| Document | Overall document quality | 0.0 - 1.0 | Flag poor-quality documents |
| Case | Aggregate data quality | 0.0 - 1.0 | Inform underwriter review |

#### Confidence Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| High confidence | ≥ 0.85 | Accept without flag |
| Medium confidence | 0.60 - 0.84 | Accept with review indicator |
| Low confidence | 0.40 - 0.59 | Flag for manual verification |
| Very low confidence | < 0.40 | Require manual verification before use |

### Data Conflict Resolution

When multiple sources provide conflicting data:

| Scenario | Resolution |
|----------|------------|
| Structured vs extracted | Prefer structured; flag discrepancy |
| Multiple documents | Prefer most recent; flag conflict |
| Proposal vs document | Flag for underwriter resolution |
| Different confidence levels | Prefer higher confidence; retain lower for reference |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFLICT HANDLING EXAMPLE                                │
│                                                                             │
│  Source 1: Proposal Form                                                   │
│  └─ Disclosed condition: "Type 2 Diabetes"                                 │
│  └─ Diagnosis date: 2020                                                   │
│                                                                             │
│  Source 2: Medical Report (extracted)                                      │
│  └─ Extracted condition: "Type 2 Diabetes Mellitus"                        │
│  └─ Extracted date: "diagnosed in 2018"                                    │
│  └─ Extraction confidence: 0.82                                            │
│                                                                             │
│  Resolution:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Condition: Type 2 Diabetes Mellitus (canonical)                    │   │
│  │ Diagnosis date: CONFLICT FLAGGED                                   │   │
│  │   - Proposal states: 2020                                          │   │
│  │   - Document states: 2018 (confidence: 0.82)                       │   │
│  │ Action: Underwriter to verify correct diagnosis date               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Specifications

### Inbound API Contract

#### Proposal Submission Endpoint

```
POST /api/v1/cases

Request:
{
  "proposal": { ... proposal data per contract ... },
  "applicant": { ... applicant data per contract ... },
  "medical_disclosures": { ... disclosures per contract ... },
  "documents": [ ... document references ... ]
}

Response (Success):
{
  "case_id": "uuid",
  "status": "received",
  "validation_result": {
    "valid": true,
    "warnings": [ ... non-blocking issues ... ]
  },
  "created_at": "ISO 8601 datetime"
}

Response (Validation Failure):
{
  "error": "validation_failed",
  "validation_result": {
    "valid": false,
    "errors": [
      {
        "field": "applicant.date_of_birth",
        "error": "required_field_missing",
        "message": "Date of birth is required"
      }
    ]
  }
}
```

#### Document Submission Endpoint

```
POST /api/v1/cases/{case_id}/documents

Request:
{
  "document_metadata": { ... metadata per contract ... },
  "extracted_text": "... text content ...",
  "pre_extracted_data": { ... optional structured extractions ... }
}

Response (Success):
{
  "document_id": "uuid",
  "case_id": "case_uuid",
  "status": "received",
  "processing_status": "queued"
}
```

#### Test Results Submission Endpoint

```
POST /api/v1/cases/{case_id}/test-results

Request:
{
  "results": [ ... array of test results per contract ... ],
  "source": "lab_feed" | "document_extraction" | "manual_entry",
  "source_reference": "optional reference id"
}

Response (Success):
{
  "received_count": 5,
  "processed_count": 5,
  "case_id": "case_uuid",
  "processing_status": "complete"
}
```

### Data Validation Rules

| Rule Type | Description | Response |
|-----------|-------------|----------|
| Type validation | Field matches expected type | Error with field path |
| Format validation | Field matches expected format | Error with expected format |
| Range validation | Numeric field within range | Error with valid range |
| Enum validation | Value in allowed list | Error with allowed values |
| Reference validation | Foreign key exists | Error with reference details |
| Business validation | Cross-field rules | Error with rule description |

### Error Response Format

All validation errors follow a consistent format:

```json
{
  "error_code": "validation_failed",
  "message": "Request validation failed",
  "details": [
    {
      "field": "applicant.date_of_birth",
      "value": null,
      "rule": "required",
      "message": "Date of birth is required"
    },
    {
      "field": "medical_disclosures.smoking_status",
      "value": "sometimes",
      "rule": "enum",
      "message": "Value must be one of: never, former, current",
      "allowed_values": ["never", "former", "current"]
    }
  ]
}
```

---

## Data Retention and Privacy

### Retention Periods

| Data Category | Retention Period | Basis |
|---------------|------------------|-------|
| Proposal data | Policy lifetime + 8 years | Regulatory requirement |
| Medical documents | Policy lifetime + 8 years | Regulatory requirement |
| Test results | Policy lifetime + 8 years | Regulatory requirement |
| Audit logs | 10 years minimum | Compliance requirement |
| Processing logs | 2 years | Operational requirement |

### Data Sensitivity Classification

| Classification | Examples | Handling |
|----------------|----------|----------|
| Highly sensitive | Medical conditions, test results, medications | Encrypted at rest, access logged, need-to-know |
| Sensitive | Personal identifiers, financial data | Encrypted at rest, access controlled |
| Internal | Processing metadata, system logs | Standard access controls |
| Public | Product information, general rules | No special handling |

### Privacy Controls

| Control | Implementation |
|---------|----------------|
| Access logging | All access to sensitive data logged |
| Field-level encryption | Highly sensitive fields encrypted |
| Data minimisation | Only necessary fields transmitted |
| Consent tracking | Consent status tracked per applicant |
| Right to access | Export capability for applicant data |
| Right to rectification | Correction workflow supported |

---

## Appendix: Field Reference

### Enumeration Values

#### Gender
- male
- female
- other

#### Marital Status
- single
- married
- divorced
- widowed

#### Smoking Status
- never
- former
- current

#### Alcohol Status
- never
- social
- regular
- heavy

#### Condition Status
- active
- resolved
- chronic
- acute

#### Treatment Status
- treated
- untreated
- monitoring

#### Document Type
- medical_report
- lab_result
- discharge_summary
- prescription
- diagnostic_imaging
- specialist_report
- ecg_report
- pathology_report
- insurance_form
- attending_physician
- other_medical
- identity_document
- financial_document

#### Extraction Status
- pending
- extracted
- failed
- manual

#### Extraction Method
- pdf_native
- ocr
- manual

### Standard Code Systems

| Code System | Usage | Reference |
|-------------|-------|-----------|
| ICD-10 | Disease classification | WHO ICD-10 |
| LOINC | Laboratory tests | LOINC.org |
| ISO 3166-1 | Country codes | ISO standard |
| ISO 4217 | Currency codes | ISO standard |
| ISO 639-1 | Language codes | ISO standard |
| E.164 | Phone numbers | ITU-T standard |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial specification |

This document should be reviewed when integration requirements change or new data sources are added.
