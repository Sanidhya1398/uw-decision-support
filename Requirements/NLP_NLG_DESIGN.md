# Natural Language Processing and Generation Design

## Document Purpose

This document specifies the design principles, scope, and governance of the natural language processing (NLP) and natural language generation (NLG) components within the underwriting decision support system. Both components handle text—NLP extracts structured information from unstructured documents; NLG assembles structured data into human-readable communications. Neither component makes decisions or operates autonomously.

---

## Design Philosophy

### Text as Data, Not as Decision

The system treats text as a source of structured information and a medium for communication. NLP extracts facts from documents; it does not interpret their meaning or determine their significance. NLG assembles approved content into communications; it does not compose novel text or make judgments about what to say.

### Determinism Over Probability

Both NLP and NLG use rule-based, deterministic approaches. Given the same input, the system produces the same output every time. This reproducibility is essential for audit, compliance, and underwriter trust. Probabilistic models, machine learning classifiers, and generative AI are not used in these components.

### Governance as Enabler

Rules are not static constraints but governed configurations that evolve through controlled processes. The system can adapt to new medical terminology, updated regulatory language, and refined communication practices—but only through explicit, auditable changes approved by appropriate authorities.

---

## Natural Language Processing (NLP)

### Purpose

The NLP component extracts structured information from unstructured medical documents. It transforms free-text physician notes, laboratory reports, diagnostic summaries, and prescription records into normalised data fields that feed risk assessment and recommendation logic.

### Document Preprocessing Boundary

The NLP component operates on text content. PDF text extraction and any image-to-text conversion are preprocessing responsibilities handled by the Document Management System integration or external services before documents reach the NLP extraction pipeline. The decision support system does not include OCR or document scanning capabilities. Documents are expected to arrive as extractable text.

### Extraction Scope

The NLP component extracts specific categories of medical and clinical information relevant to underwriting evaluation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NLP EXTRACTION SCOPE                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MEDICAL CONDITIONS                               │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Condition name (normalised to standard terminology)             │   │
│  │  • ICD code mapping where identifiable                             │   │
│  │  • Status (active, resolved, chronic, acute)                       │   │
│  │  • Severity indicators                                             │   │
│  │  • Duration or onset date                                          │   │
│  │  • Treatment status                                                │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "Patient has well-controlled Type 2 DM,            │   │
│  │  diagnosed 2018, currently on Metformin 1000mg BD"                 │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  {                                                                 │   │
│  │    condition: "Type 2 Diabetes Mellitus",                          │   │
│  │    icd_code: "E11",                                                │   │
│  │    status: "active",                                               │   │
│  │    control: "well-controlled",                                     │   │
│  │    onset_year: 2018,                                               │   │
│  │    treatment: "Metformin 1000mg twice daily"                       │   │
│  │  }                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MEDICATIONS                                      │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Drug name (normalised to generic where possible)                │   │
│  │  • Dosage amount and unit                                          │   │
│  │  • Frequency                                                       │   │
│  │  • Route of administration                                         │   │
│  │  • Indication if stated                                            │   │
│  │  • Duration if stated                                              │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "Rx: Amlodipine 5mg OD for hypertension,           │   │
│  │  Atorvastatin 20mg HS"                                             │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  [                                                                 │   │
│  │    {                                                               │   │
│  │      drug: "Amlodipine",                                           │   │
│  │      dosage: 5,                                                    │   │
│  │      unit: "mg",                                                   │   │
│  │      frequency: "once daily",                                      │   │
│  │      indication: "hypertension"                                    │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      drug: "Atorvastatin",                                         │   │
│  │      dosage: 20,                                                   │   │
│  │      unit: "mg",                                                   │   │
│  │      frequency: "at bedtime",                                      │   │
│  │      indication: null                                              │   │
│  │    }                                                               │   │
│  │  ]                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LABORATORY VALUES                                │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Test name (normalised)                                          │   │
│  │  • Result value                                                    │   │
│  │  • Unit of measurement                                             │   │
│  │  • Reference range if provided                                     │   │
│  │  • Date of test                                                    │   │
│  │  • Abnormal flag if indicated                                      │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "HbA1c: 7.8% (ref: <6.5%) dated 15/03/2024.        │   │
│  │  Serum Creatinine: 1.2 mg/dL (normal)"                             │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  [                                                                 │   │
│  │    {                                                               │   │
│  │      test: "HbA1c",                                                │   │
│  │      value: 7.8,                                                   │   │
│  │      unit: "%",                                                    │   │
│  │      reference_max: 6.5,                                           │   │
│  │      date: "2024-03-15",                                           │   │
│  │      abnormal: true                                                │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      test: "Serum Creatinine",                                     │   │
│  │      value: 1.2,                                                   │   │
│  │      unit: "mg/dL",                                                │   │
│  │      date: null,                                                   │   │
│  │      abnormal: false                                               │   │
│  │    }                                                               │   │
│  │  ]                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    VITAL SIGNS                                      │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Measurement type                                                │   │
│  │  • Value(s)                                                        │   │
│  │  • Unit                                                            │   │
│  │  • Date of measurement                                             │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "Vitals: BP 142/88 mmHg, HR 76 bpm,                │   │
│  │  BMI 27.3 kg/m²"                                                   │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  [                                                                 │   │
│  │    {                                                               │   │
│  │      type: "Blood Pressure",                                       │   │
│  │      systolic: 142,                                                │   │
│  │      diastolic: 88,                                                │   │
│  │      unit: "mmHg"                                                  │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      type: "Heart Rate",                                           │   │
│  │      value: 76,                                                    │   │
│  │      unit: "bpm"                                                   │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      type: "BMI",                                                  │   │
│  │      value: 27.3,                                                  │   │
│  │      unit: "kg/m²"                                                 │   │
│  │    }                                                               │   │
│  │  ]                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PROCEDURES AND SURGERIES                         │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Procedure name (normalised)                                     │   │
│  │  • Date or year                                                    │   │
│  │  • Indication if stated                                            │   │
│  │  • Outcome if stated                                               │   │
│  │  • Facility if stated                                              │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "Surgical history: Appendectomy 2015,              │   │
│  │  PTCA with stent to LAD in March 2022 at Apollo Hospital"          │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  [                                                                 │   │
│  │    {                                                               │   │
│  │      procedure: "Appendectomy",                                    │   │
│  │      year: 2015,                                                   │   │
│  │      indication: null                                              │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      procedure: "PTCA with stent",                                 │   │
│  │      location: "LAD",                                              │   │
│  │      date: "2022-03",                                              │   │
│  │      facility: "Apollo Hospital"                                   │   │
│  │    }                                                               │   │
│  │  ]                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FAMILY HISTORY                                   │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Relationship to applicant                                       │   │
│  │  • Condition                                                       │   │
│  │  • Age at diagnosis or onset                                       │   │
│  │  • Outcome if stated (alive, deceased)                             │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "Family Hx: Father - MI at age 52, deceased.       │   │
│  │  Mother - Type 2 DM, alive. Brother - hypertension."               │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  [                                                                 │   │
│  │    {                                                               │   │
│  │      relation: "Father",                                           │   │
│  │      condition: "Myocardial Infarction",                           │   │
│  │      age_at_onset: 52,                                             │   │
│  │      status: "deceased"                                            │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      relation: "Mother",                                           │   │
│  │      condition: "Type 2 Diabetes Mellitus",                        │   │
│  │      status: "alive"                                               │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      relation: "Brother",                                          │   │
│  │      condition: "Hypertension"                                     │   │
│  │    }                                                               │   │
│  │  ]                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CLINICAL OBSERVATIONS                            │   │
│  │                                                                     │   │
│  │  Extracted Elements:                                               │   │
│  │  • Finding type                                                    │   │
│  │  • Description                                                     │   │
│  │  • Location or system                                              │   │
│  │  • Severity or grade if stated                                     │   │
│  │                                                                     │   │
│  │  Underwriting Example:                                             │   │
│  │  Document text: "Fundoscopy: Mild non-proliferative diabetic       │   │
│  │  retinopathy, bilateral. No macular edema."                        │   │
│  │                                                                     │   │
│  │  Extracted:                                                        │   │
│  │  {                                                                 │   │
│  │    finding: "Diabetic Retinopathy",                                │   │
│  │    subtype: "Non-proliferative",                                   │   │
│  │    severity: "Mild",                                               │   │
│  │    laterality: "bilateral",                                        │   │
│  │    complications: ["No macular edema"]                             │   │
│  │  }                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What NLP Extracts vs. What It Does Not Extract

| Extracted | Not Extracted |
|-----------|---------------|
| Disease names and codes | Prognosis assessments |
| Laboratory values and dates | Treatment adequacy judgments |
| Medication names and dosages | Compliance evaluations |
| Procedure names and dates | Risk interpretations |
| Vital sign measurements | Severity classifications beyond explicit statements |
| Family history facts | Inferred conditions |
| Clinical findings as stated | Physician opinions or recommendations |

### Rule-Based Approach

The NLP component uses deterministic, rule-based extraction rather than statistical or machine learning methods. This design choice is deliberate and serves specific objectives.

#### How Rule-Based Extraction Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RULE-BASED EXTRACTION PIPELINE                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: TEXT PREPROCESSING                                          │   │
│  │                                                                     │   │
│  │ • Normalise whitespace and line breaks                             │   │
│  │ • Standardise common abbreviations                                 │   │
│  │ • Segment into logical sections where possible                     │   │
│  │ • Identify document type (lab report, discharge summary, etc.)     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: DICTIONARY MATCHING                                         │   │
│  │                                                                     │   │
│  │ Apply governed dictionaries to identify:                           │   │
│  │ • Medical condition terms                                          │   │
│  │ • Drug names (brand and generic)                                   │   │
│  │ • Laboratory test names                                            │   │
│  │ • Anatomical terms                                                 │   │
│  │ • Clinical abbreviations                                           │   │
│  │                                                                     │   │
│  │ Example Dictionary Entry:                                          │   │
│  │ {                                                                  │   │
│  │   terms: ["Type 2 DM", "T2DM", "Type II Diabetes",                │   │
│  │           "NIDDM", "Type 2 Diabetes Mellitus"],                    │   │
│  │   canonical: "Type 2 Diabetes Mellitus",                           │   │
│  │   icd_code: "E11",                                                 │   │
│  │   category: "endocrine"                                            │   │
│  │ }                                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: PATTERN MATCHING                                            │   │
│  │                                                                     │   │
│  │ Apply extraction patterns to identify:                             │   │
│  │ • Numeric values with units                                        │   │
│  │ • Date formats                                                     │   │
│  │ • Dosage expressions                                               │   │
│  │ • Reference ranges                                                 │   │
│  │ • Status indicators                                                │   │
│  │                                                                     │   │
│  │ Example Pattern:                                                   │   │
│  │ Laboratory Value Pattern:                                          │   │
│  │ {test_name}: {value} {unit} (?:\(ref:? {range}\))?                │   │
│  │                                                                     │   │
│  │ Matches: "HbA1c: 7.8% (ref: <6.5%)"                               │   │
│  │ Extracts: test=HbA1c, value=7.8, unit=%, ref_max=6.5              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: RELATION EXTRACTION                                         │   │
│  │                                                                     │   │
│  │ Link extracted entities based on proximity and context:            │   │
│  │ • Associate medications with conditions                            │   │
│  │ • Link test results with dates                                     │   │
│  │ • Connect procedures with indications                              │   │
│  │ • Associate family members with conditions                         │   │
│  │                                                                     │   │
│  │ Example:                                                           │   │
│  │ Text: "Metformin 1000mg BD for Type 2 DM"                          │   │
│  │ Relation: medication(Metformin) → indication(Type 2 DM)            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 5: NORMALISATION AND VALIDATION                                │   │
│  │                                                                     │   │
│  │ • Map extracted terms to canonical forms                           │   │
│  │ • Validate value ranges (flag implausible values)                  │   │
│  │ • Standardise date formats                                         │   │
│  │ • Assign confidence scores                                         │   │
│  │ • Flag ambiguous or uncertain extractions                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 6: STRUCTURED OUTPUT                                           │   │
│  │                                                                     │   │
│  │ Produce structured extraction result with:                         │   │
│  │ • Extracted entities by category                                   │   │
│  │ • Source text spans for each extraction                            │   │
│  │ • Confidence indicators                                            │   │
│  │ • Flags for underwriter review                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Rules Over Machine Learning

| Consideration | Rule-Based Approach | ML-Based Approach |
|---------------|---------------------|-------------------|
| Reproducibility | Same input always produces same output | Outputs may vary with model versions |
| Explainability | Can trace extraction to specific rule | Difficult to explain why entity was identified |
| Auditability | Rule version and match recorded | Model behaviour hard to audit |
| Error Analysis | Missed extraction indicates rule gap | Missed extraction may be hard to diagnose |
| Governance | Rule changes follow controlled process | Model retraining has unpredictable effects |
| Regulatory Comfort | Deterministic behaviour easy to validate | Probabilistic behaviour harder to certify |
| Edge Cases | Explicit handling, fails predictably | May produce plausible but incorrect extractions |

For underwriting applications where extracted information directly influences risk assessment, the predictability and auditability of rule-based extraction outweighs the potential coverage benefits of statistical methods.

### Why Rules Are Governed, Not Static

The extraction rules are not hardcoded constants. They are governed configurations that evolve through controlled processes. This distinction is important.

#### The Governance Imperative

Medical terminology evolves. New drugs enter the market. Diagnostic tests are renamed or refined. Regulatory requirements change. Regional language variations exist. A static extraction system would quickly become obsolete.

However, uncontrolled changes to extraction rules pose risks:
- Changes could alter how existing conditions are identified, affecting consistency
- New rules might conflict with existing patterns
- Modifications could have unintended effects on downstream processing
- Audit trails require knowing what rules were in effect at any point in time

Governed rules balance adaptability with control.

#### Governance Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NLP RULE GOVERNANCE PROCESS                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. CHANGE REQUEST                                                   │   │
│  │                                                                     │   │
│  │ Trigger: Underwriter flags unrecognised term, new drug approved,   │   │
│  │ terminology update identified, extraction gap discovered            │   │
│  │                                                                     │   │
│  │ Documentation: What change is needed, why, expected impact          │   │
│  │                                                                     │   │
│  │ Underwriting Example:                                              │   │
│  │ "New diabetes medication 'Tirzepatide' (brand: Mounjaro) not       │   │
│  │ being extracted. Approved by CDSCO in 2023. Need to add to         │   │
│  │ drug dictionary with appropriate classification."                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. REVIEW AND APPROVAL                                              │   │
│  │                                                                     │   │
│  │ Medical Review: Confirm terminology accuracy, classification        │   │
│  │ Technical Review: Assess pattern conflicts, extraction impacts      │   │
│  │ Compliance Review: Verify no regulatory implications                │   │
│  │                                                                     │   │
│  │ Approval Authority: Designated rule governance committee            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. IMPLEMENTATION                                                   │   │
│  │                                                                     │   │
│  │ • Draft rule or dictionary update                                  │   │
│  │ • Test against sample documents                                    │   │
│  │ • Verify no regression on existing extractions                     │   │
│  │ • Document expected behaviour                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. VERSIONING AND DEPLOYMENT                                        │   │
│  │                                                                     │   │
│  │ • Assign version number to updated rule set                        │   │
│  │ • Record change in audit log                                       │   │
│  │ • Deploy to non-production environment for validation              │   │
│  │ • Promote to production with effective date                        │   │
│  │                                                                     │   │
│  │ Version Record:                                                    │   │
│  │ {                                                                  │   │
│  │   version: "2024.03.15",                                           │   │
│  │   change_type: "dictionary_addition",                              │   │
│  │   description: "Added Tirzepatide to diabetes medications",        │   │
│  │   approved_by: "Medical Director",                                 │   │
│  │   effective_date: "2024-03-20"                                     │   │
│  │ }                                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. MONITORING AND FEEDBACK                                          │   │
│  │                                                                     │   │
│  │ • Track extraction rates for new rules                             │   │
│  │ • Monitor for unexpected impacts                                   │   │
│  │ • Collect underwriter feedback                                     │   │
│  │ • Identify next improvement opportunities                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Configuration Categories

| Category | Contents | Change Frequency |
|----------|----------|------------------|
| Medical Dictionaries | Condition names, synonyms, ICD mappings | Monthly updates |
| Drug Database | Medication names, dosage forms, classifications | Monthly updates |
| Laboratory Tests | Test names, units, reference ranges | Quarterly updates |
| Extraction Patterns | Regex patterns, structural rules | As needed |
| Abbreviation Maps | Clinical abbreviations and expansions | Quarterly updates |
| Regional Variants | India-specific terminology and conventions | As needed |

### Why NLP Does Not Make Decisions

The NLP component extracts information. It does not interpret that information or determine its significance for underwriting. This boundary is fundamental to the system design.

#### The Extraction-Interpretation Boundary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTRACTION VS. INTERPRETATION                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NLP DOES (EXTRACTION)                            │   │
│  │                                                                     │   │
│  │  Input: "HbA1c 8.2%, Serum Creatinine 1.4 mg/dL"                   │   │
│  │                                                                     │   │
│  │  Output:                                                           │   │
│  │  {                                                                 │   │
│  │    lab_results: [                                                  │   │
│  │      { test: "HbA1c", value: 8.2, unit: "%" },                     │   │
│  │      { test: "Serum Creatinine", value: 1.4, unit: "mg/dL" }       │   │
│  │    ]                                                               │   │
│  │  }                                                                 │   │
│  │                                                                     │   │
│  │  NLP extracted the values. Full stop.                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NLP DOES NOT DO (INTERPRETATION)                 │   │
│  │                                                                     │   │
│  │  ✗ "HbA1c 8.2% indicates poor glycemic control"                    │   │
│  │  ✗ "Creatinine 1.4 suggests possible renal impairment"             │   │
│  │  ✗ "These results warrant cardiac workup"                          │   │
│  │  ✗ "This applicant is high-risk"                                   │   │
│  │  ✗ "Additional tests are needed"                                   │   │
│  │                                                                     │   │
│  │  These are interpretations that belong to:                         │   │
│  │  • Business rules (threshold comparisons)                          │   │
│  │  • Risk assessment service (factor analysis)                       │   │
│  │  • Underwriter judgment (final evaluation)                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why This Boundary Matters

**Audit Clarity**

When an underwriting decision is reviewed, it must be clear what information was available and how it was used. If NLP made interpretive judgments, the audit trail becomes muddied—did the underwriter rely on NLP's interpretation, or did they evaluate the raw data?

**Underwriter Authority**

Underwriters are trained to interpret medical information in context. An HbA1c of 8.2% has different significance for a 25-year-old newly diagnosed diabetic versus a 60-year-old with 20-year disease history. NLP cannot make these contextual judgments.

**Error Containment**

If NLP makes an extraction error (misreading 8.2% as 6.2%), the error is visible in the structured data and can be caught during review. If NLP made interpretive conclusions based on the erroneous extraction, the error would be compounded and harder to detect.

**Regulatory Defensibility**

Regulators understand that computers can read documents and extract values. They are appropriately sceptical of computers making medical judgments. Keeping NLP in the extraction role maintains a defensible system posture.

### Confidence and Uncertainty Handling

Not all extractions are equally reliable. The NLP component explicitly models uncertainty.

#### Confidence Indicators

| Indicator | Meaning |
|-----------|---------|
| High Confidence | Exact dictionary match, clear pattern match, unambiguous context |
| Moderate Confidence | Fuzzy match, pattern match with some ambiguity, unclear context |
| Low Confidence | Partial match, multiple possible interpretations, unusual format |
| Flagged for Review | Conflicting information, implausible values, critical extraction with uncertainty |

#### Underwriter Review Triggers

The system flags extractions for mandatory underwriter verification when:

| Trigger | Example |
|---------|---------|
| Critical field with low confidence | Condition name extracted with fuzzy match |
| Implausible value | Laboratory result outside physiological range |
| Conflicting extractions | Two different values for same test in same document |
| Multiple possible interpretations | Ambiguous abbreviation with multiple expansions |
| Missing expected information | Diabetes mentioned but no HbA1c found |

#### Underwriting Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIDENCE FLAGGING EXAMPLE                              │
│                                                                             │
│  Document Text:                                                            │
│  "Pt with DM2 on metformin, last A1c 71% per outside records.              │
│  Cr 1.1, eGFR 68."                                                         │
│                                                                             │
│  Extraction Results:                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Condition: Type 2 Diabetes Mellitus                                 │   │
│  │ Confidence: HIGH (exact match for "DM2")                           │   │
│  │ Status: ✓ Accepted                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Medication: Metformin                                               │   │
│  │ Confidence: HIGH (exact dictionary match)                          │   │
│  │ Status: ✓ Accepted                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠ Lab Result: HbA1c 71%                                            │   │
│  │ Confidence: LOW                                                     │   │
│  │ Flag: IMPLAUSIBLE VALUE                                            │   │
│  │ Note: HbA1c 71% is outside physiological range (typically 4-14%)   │   │
│  │ Possible: Transcription error, may be 7.1%                         │   │
│  │ Status: ⚠ FLAGGED FOR UNDERWRITER VERIFICATION                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Lab Result: Creatinine 1.1 mg/dL                                    │   │
│  │ Confidence: HIGH                                                    │   │
│  │ Status: ✓ Accepted                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Lab Result: eGFR 68 mL/min/1.73m²                                   │   │
│  │ Confidence: MODERATE (unit inferred, not stated)                   │   │
│  │ Status: ✓ Accepted with note                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Natural Language Generation (NLG)

### Purpose

The NLG component assembles structured data into human-readable communications for applicants, agents, and other stakeholders. It transforms underwriting decisions, test requirements, and status information into clear, compliant, and consistent correspondence.

### Reason-Driven Communication

Communications are not generated from templates alone. They are assembled from structured reasons that explicitly identify why each element of the communication is included.

#### The Reason-Driven Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REASON-DRIVEN COMMUNICATION MODEL                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    STRUCTURED INPUTS                                │   │
│  │                                                                     │   │
│  │  Decision Context:                                                 │   │
│  │  {                                                                 │   │
│  │    decision_type: "requirements_request",                          │   │
│  │    case_id: "UW-2024-78432",                                       │   │
│  │    applicant_name: "Rajesh Kumar",                                 │   │
│  │    product: "Health Shield Gold"                                   │   │
│  │  }                                                                 │   │
│  │                                                                     │   │
│  │  Reason Codes:                                                     │   │
│  │  [                                                                 │   │
│  │    {                                                               │   │
│  │      code: "REQ-DM-LIPID",                                         │   │
│  │      reason: "Lipid panel required for disclosed diabetes",        │   │
│  │      test: "Fasting Lipid Profile",                                │   │
│  │      protocol_ref: "UW-DM-004"                                     │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      code: "REQ-AGE-ECG",                                          │   │
│  │      reason: "ECG required for applicant age above 50",            │   │
│  │      test: "12-Lead ECG",                                          │   │
│  │      protocol_ref: "UW-AGE-002"                                    │   │
│  │    },                                                              │   │
│  │    {                                                               │   │
│  │      code: "REQ-DM-RENAL",                                         │   │
│  │      reason: "Renal function assessment for diabetes",             │   │
│  │      test: "Serum Creatinine with eGFR",                           │   │
│  │      protocol_ref: "UW-DM-004"                                     │   │
│  │    }                                                               │   │
│  │  ]                                                                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NLG ASSEMBLY PROCESS                             │   │
│  │                                                                     │   │
│  │  1. Select base template for communication type                    │   │
│  │  2. Map each reason code to approved prose segment                 │   │
│  │  3. Substitute case-specific variables                             │   │
│  │  4. Insert mandatory compliance text                               │   │
│  │  5. Assemble sections in prescribed order                          │   │
│  │  6. Apply formatting standards                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GENERATED COMMUNICATION                          │   │
│  │                                                                     │   │
│  │  Dear Mr. Rajesh Kumar,                                            │   │
│  │                                                                     │   │
│  │  Thank you for your application for Health Shield Gold.            │   │
│  │  Reference: UW-2024-78432                                          │   │
│  │                                                                     │   │
│  │  To complete our evaluation, we require the following              │   │
│  │  medical tests:                                                    │   │
│  │                                                                     │   │
│  │  1. Fasting Lipid Profile                                          │   │
│  │     This test helps us assess cardiovascular health factors        │   │
│  │     relevant to your application.                                  │   │
│  │                                                                     │   │
│  │  2. 12-Lead ECG                                                    │   │
│  │     This provides a baseline assessment of cardiac function.       │   │
│  │                                                                     │   │
│  │  3. Serum Creatinine with eGFR                                     │   │
│  │     This evaluates kidney function as part of our standard         │   │
│  │     health assessment.                                             │   │
│  │                                                                     │   │
│  │  Please complete these tests at any of our empaneled diagnostic    │   │
│  │  centres within 30 days.                                           │   │
│  │                                                                     │   │
│  │  [COMPLIANCE TEXT - LOCKED]                                        │   │
│  │  Your personal health information will be handled in accordance    │   │
│  │  with applicable privacy regulations...                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Note: Underwriter reviews draft and may edit non-locked sections          │
│  before approval.                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Reason Codes Matter

**Audit Trail**

Every sentence in a communication traces to a specific reason code. Auditors can verify that required disclosures were made, that test requests were justified, and that communication content matches the underwriting record.

**Consistency**

The same reason code always produces the same prose. Different underwriters handling similar cases will send consistent communications, improving applicant experience and reducing confusion.

**Compliance Verification**

Automated checks can verify that all mandatory reasons have corresponding content, that required disclosures are present, and that prohibited language is absent.

**Training and Quality**

New underwriters can learn from the mapping between reason codes and communication content, understanding how different situations should be explained to applicants.

### Why Pure Templates Are Avoided

A simple template-based approach would fill variables into fixed text structures. The reason-driven model is more sophisticated because pure templates have significant limitations.

#### Limitations of Pure Templates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PURE TEMPLATE LIMITATIONS                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PROBLEM 1: COMBINATORIAL EXPLOSION                                  │   │
│  │                                                                     │   │
│  │ A requirements letter might need to request:                       │   │
│  │ • Any combination of 30+ possible tests                            │   │
│  │ • For any of 100+ condition combinations                           │   │
│  │ • With various urgency levels                                      │   │
│  │ • For different products                                           │   │
│  │                                                                     │   │
│  │ Pure templates would require thousands of variants.                │   │
│  │ Reason-driven assembly handles this through composition.           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PROBLEM 2: CONTEXT SENSITIVITY                                      │   │
│  │                                                                     │   │
│  │ How a test is explained may depend on context:                     │   │
│  │                                                                     │   │
│  │ Diabetes case requesting lipid panel:                              │   │
│  │ "This test helps us assess cardiovascular factors associated       │   │
│  │  with your disclosed condition."                                   │   │
│  │                                                                     │   │
│  │ Routine case requesting same lipid panel:                          │   │
│  │ "This is a standard health screening test included in our          │   │
│  │  evaluation process."                                              │   │
│  │                                                                     │   │
│  │ Reason codes carry context; templates do not.                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PROBLEM 3: AUDIT GRANULARITY                                        │   │
│  │                                                                     │   │
│  │ With pure templates, audit shows: "Template REQ-LETTER-003 used"   │   │
│  │                                                                     │   │
│  │ With reason-driven assembly, audit shows:                          │   │
│  │ • Reason REQ-DM-LIPID triggered lipid panel explanation            │   │
│  │ • Reason REQ-AGE-ECG triggered ECG explanation                     │   │
│  │ • Compliance block PRIV-001 inserted                               │   │
│  │                                                                     │   │
│  │ Granular audit supports detailed compliance review.                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PROBLEM 4: MAINTENANCE BURDEN                                       │   │
│  │                                                                     │   │
│  │ If privacy disclosure wording changes:                             │   │
│  │                                                                     │   │
│  │ Pure templates: Update every template containing the disclosure    │   │
│  │ Reason-driven: Update the single compliance block, automatically   │   │
│  │                propagates to all communications                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### The Hybrid Approach

The system uses templates for overall structure combined with reason-driven content blocks:

| Element | Approach |
|---------|----------|
| Communication structure | Template defines sections and ordering |
| Opening and closing | Template with variable substitution |
| Content blocks | Reason codes map to approved prose segments |
| Test explanations | Reason-specific text selected based on context |
| Compliance text | Locked blocks inserted by communication type |
| Formatting | Template defines layout standards |

### Why Free Text Is Controlled

The system does not use generative AI or allow unconstrained text composition. All generated text derives from pre-approved content.

#### The Controlled Generation Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTROLLED TEXT GENERATION                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    WHAT THE SYSTEM DOES                             │   │
│  │                                                                     │   │
│  │  Structured Input:                                                 │   │
│  │  {                                                                 │   │
│  │    reason_code: "DECLINE-RECENT-MI",                               │   │
│  │    parameters: {                                                   │   │
│  │      event: "myocardial infarction",                               │   │
│  │      date: "March 2024",                                           │   │
│  │      waiting_period: "24 months"                                   │   │
│  │    }                                                               │   │
│  │  }                                                                 │   │
│  │                                                                     │   │
│  │  Approved Content Block:                                           │   │
│  │  "Based on our review, we are unable to offer coverage at this    │   │
│  │  time due to a recent {event}. Our guidelines require a period    │   │
│  │  of {waiting_period} following such an event before we can        │   │
│  │  consider an application. You are welcome to reapply after        │   │
│  │  {future_date}."                                                   │   │
│  │                                                                     │   │
│  │  Generated Output:                                                 │   │
│  │  "Based on our review, we are unable to offer coverage at this    │   │
│  │  time due to a recent myocardial infarction. Our guidelines       │   │
│  │  require a period of 24 months following such an event before     │   │
│  │  we can consider an application. You are welcome to reapply       │   │
│  │  after March 2026."                                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    WHAT THE SYSTEM DOES NOT DO                      │   │
│  │                                                                     │   │
│  │  ✗ Generate novel explanations                                     │   │
│  │  ✗ Compose creative phrasing                                       │   │
│  │  ✗ Produce unpredictable output                                    │   │
│  │  ✗ Use AI language models at runtime                               │   │
│  │  ✗ Create text not traceable to approved content                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why This Matters for Underwriting

**Regulatory Compliance**

Insurance communications are regulated. Specific disclosures are required. Certain phrases may be prohibited. Generative text could inadvertently include non-compliant language. Controlled generation ensures every word has been reviewed and approved.

**Legal Defensibility**

If a communication is challenged, the insurer must demonstrate that the content was appropriate and authorised. Controlled generation provides clear provenance for every element of the communication.

**Consistency**

Applicants receiving similar decisions should receive similar communications. Generative approaches may produce varied phrasing that creates apparent inconsistency even when decisions are consistent.

**Underwriter Review Feasibility**

Underwriters must review and approve communications. If generated text were novel each time, thorough review would require reading every word carefully. With controlled generation, underwriters can focus on case-specific variables while trusting that standard content is correct.

### Communication Categories

| Category | Purpose | Key Elements |
|----------|---------|--------------|
| Requirements Request | Request medical tests or documentation | Test list, reasons, deadline, instructions |
| Clarification Request | Seek additional information | Questions, context, response instructions |
| Status Update | Inform on case progress | Current status, next steps, timeline |
| Decision Communication | Communicate underwriting outcome | Decision, terms, rationale (as appropriate), next steps |
| Modification Notice | Inform of coverage modifications | Changes, effective date, explanation |

### Compliance and Audit Safeguards

The NLG component includes multiple safeguards to ensure regulatory compliance and audit readiness.

#### Locked Compliance Text

Certain text elements cannot be modified by any system logic, underwriter action, or configuration change. These locked elements include:

| Element | Purpose |
|---------|---------|
| Privacy Disclosures | IRDAI-mandated privacy notices |
| Rights Notifications | Applicant rights regarding decisions |
| Appeal Information | How to contest or appeal decisions |
| Regulatory Identifiers | License numbers, registration details |
| Standard Disclaimers | Legally required disclaimer language |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOCKED COMPLIANCE TEXT                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PRIVACY DISCLOSURE (LOCKED)                      │   │
│  │                                                                     │   │
│  │  Block ID: COMPLIANCE-PRIVACY-001                                  │   │
│  │  Effective: 2024-01-01                                             │   │
│  │  Status: LOCKED - Cannot be modified                               │   │
│  │                                                                     │   │
│  │  Text:                                                             │   │
│  │  "Your personal health information provided in connection with     │   │
│  │  this application will be used solely for underwriting purposes   │   │
│  │  and will be handled in accordance with applicable data           │   │
│  │  protection regulations. We will not share your information with  │   │
│  │  third parties except as required for processing your application │   │
│  │  or as mandated by law. You have the right to access and correct  │   │
│  │  your personal information by contacting our customer service."   │   │
│  │                                                                     │   │
│  │  Modification Process:                                             │   │
│  │  • Requires Legal and Compliance approval                          │   │
│  │  • Requires CEO or designated authority sign-off                   │   │
│  │  • Change logged with full justification                           │   │
│  │  • Previous versions retained indefinitely                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Editable vs. Non-Editable Sections

Communications have clearly defined editable and non-editable regions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION EDIT ZONES                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [HEADER - NOT EDITABLE]                                           │   │
│  │  Company letterhead, reference numbers, date                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  [SALUTATION - LIMITED EDIT]                                       │   │
│  │  Underwriter may correct name spelling only                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  [BODY CONTENT - EDITABLE]                                         │   │
│  │  Underwriter may add clarifications, adjust tone,                  │   │
│  │  add case-specific context                                         │   │
│  │                                                                     │   │
│  │  Constraints:                                                      │   │
│  │  • Cannot remove required disclosures                              │   │
│  │  • Cannot change decision outcome wording                          │   │
│  │  • Cannot add commitments not supported by decision                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  [COMPLIANCE BLOCK - LOCKED]                                       │   │
│  │  Privacy notice, rights notification, appeal information           │   │
│  │  Cannot be edited, removed, or reordered                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  [CLOSING - LIMITED EDIT]                                          │   │
│  │  Underwriter may adjust closing pleasantry                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  [SIGNATURE BLOCK - NOT EDITABLE]                                  │   │
│  │  Authorised signatory information                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Audit Trail for Communications

Every communication generates a comprehensive audit record:

| Audit Element | Content |
|---------------|---------|
| Communication ID | Unique identifier |
| Case Reference | Associated case |
| Communication Type | Category of communication |
| Reason Codes Used | All reason codes that contributed content |
| Template Version | Version of structural template |
| Content Block Versions | Versions of all content blocks used |
| Compliance Blocks | List of locked compliance elements included |
| Underwriter Edits | Diff showing any underwriter modifications |
| Approval Timestamp | When underwriter approved |
| Approving User | Who approved |
| Dispatch Confirmation | When sent to correspondence system |

#### Prohibited Content Detection

The system includes checks for content that should not appear in communications:

| Check | Purpose |
|-------|---------|
| Prohibited Terms | Flags legally problematic phrases |
| Discriminatory Language | Detects potentially discriminatory statements |
| Commitment Detection | Flags language that could create unintended obligations |
| Tone Analysis | Identifies inappropriately casual or harsh phrasing |
| Completeness Check | Verifies required elements are present |

### Underwriter Interaction with Communications

#### Review Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION REVIEW WORKFLOW                            │
│                                                                             │
│  1. DRAFT GENERATION                                                       │
│     └──► System generates draft based on decision and reason codes         │
│                                                                             │
│  2. DRAFT PRESENTATION                                                     │
│     └──► Workbench displays draft with:                                    │
│          • Edit zones clearly marked                                       │
│          • Locked sections indicated                                       │
│          • Reason codes visible for reference                              │
│                                                                             │
│  3. UNDERWRITER REVIEW                                                     │
│     └──► Underwriter reads draft, verifies:                                │
│          • Accuracy of case-specific details                               │
│          • Appropriateness of tone                                         │
│          • Completeness of information                                     │
│                                                                             │
│  4. OPTIONAL EDITING                                                       │
│     └──► Underwriter may:                                                  │
│          • Correct factual errors in editable sections                     │
│          • Add clarifying information                                      │
│          • Adjust phrasing in editable sections                            │
│          • NOT modify locked compliance text                               │
│                                                                             │
│  5. EDIT TRACKING                                                          │
│     └──► System records all modifications:                                 │
│          • Original text                                                   │
│          • Modified text                                                   │
│          • Edit timestamp                                                  │
│          • Edit justification (if material change)                         │
│                                                                             │
│  6. APPROVAL                                                               │
│     └──► Underwriter confirms communication is ready:                      │
│          • System validates all required elements present                  │
│          • System checks for prohibited content                            │
│          • Approval recorded with timestamp                                │
│                                                                             │
│  7. DISPATCH HANDOFF                                                       │
│     └──► Approved communication sent to correspondence system              │
│          • Payload includes full audit trail                               │
│          • Confirmation received and logged                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Underwriting Example: Requirements Letter Review

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REQUIREMENTS LETTER REVIEW                               │
│                                                                             │
│  Case: UW-2024-78432                                                       │
│  Applicant: Rajesh Kumar                                                   │
│  Decision: Request additional tests                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DRAFT COMMUNICATION                              │   │
│  │                                                                     │   │
│  │  [LOCKED - Company Header]                                         │   │
│  │  ════════════════════════════════════════════════════════════════  │   │
│  │  ABC Health Insurance Limited                                      │   │
│  │  Reference: UW-2024-78432                                          │   │
│  │  Date: 15 March 2024                                               │   │
│  │  ════════════════════════════════════════════════════════════════  │   │
│  │                                                                     │   │
│  │  [LIMITED EDIT - Salutation]                                       │   │
│  │  Dear Mr. Rajesh Kumar,                                            │   │
│  │                                                                     │   │
│  │  [EDITABLE - Body]                                                 │   │
│  │  Thank you for your application for Health Shield Gold.            │   │
│  │                                                                     │   │
│  │  To complete our evaluation of your application, we require        │   │
│  │  the following medical tests:                                      │   │
│  │                                                                     │   │
│  │  1. Fasting Lipid Profile                                          │   │
│  │     [Reason: REQ-DM-LIPID]                                         │   │
│  │     This test helps us assess cardiovascular health factors        │   │
│  │     relevant to your application.                                  │   │
│  │                                                                     │   │
│  │  2. 12-Lead ECG                                                    │   │
│  │     [Reason: REQ-AGE-ECG]                                          │   │
│  │     This provides a baseline assessment of cardiac function.       │   │
│  │                                                                     │   │
│  │  3. Serum Creatinine with eGFR                                     │   │
│  │     [Reason: REQ-DM-RENAL]                                         │   │
│  │     This evaluates kidney function as part of our standard         │   │
│  │     health assessment.                                             │   │
│  │                                                                     │   │
│  │  Please complete these tests at any of our empaneled               │   │
│  │  diagnostic centres within 30 days. A list of centres is           │   │
│  │  available at www.abchealth.com/centres or by calling              │   │
│  │  1800-XXX-XXXX.                                                    │   │
│  │                                                                     │   │
│  │  [LOCKED - Compliance Block]                                       │   │
│  │  ════════════════════════════════════════════════════════════════  │   │
│  │  Your personal health information provided in connection with      │   │
│  │  this application will be used solely for underwriting purposes... │   │
│  │  ════════════════════════════════════════════════════════════════  │   │
│  │                                                                     │   │
│  │  [LIMITED EDIT - Closing]                                          │   │
│  │  We look forward to receiving your test results and completing     │   │
│  │  the evaluation of your application.                               │   │
│  │                                                                     │   │
│  │  Yours sincerely,                                                  │   │
│  │                                                                     │   │
│  │  [LOCKED - Signature Block]                                        │   │
│  │  Underwriting Department                                           │   │
│  │  ABC Health Insurance Limited                                      │   │
│  │  IRDAI Reg No: XXX                                                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Underwriter Action:                                                       │
│  • Notes that applicant mentioned he travels frequently for work           │
│  • Adds to editable section: "If you require additional time due to       │
│    travel commitments, please contact us to discuss an extension."         │
│  • Approves communication                                                  │
│                                                                             │
│  System records:                                                           │
│  • Edit: Added travel accommodation sentence                               │
│  • Classification: Non-material (clarification, no decision impact)        │
│  • Approval: 15 March 2024, 14:32 IST                                      │
│  • Approver: Underwriter ID UW-0234                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Architecture

### NLP and NLG Placement in System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NLP AND NLG IN SYSTEM CONTEXT                            │
│                                                                             │
│  DOCUMENT INTAKE                                                           │
│       │                                                                     │
│       │ Unstructured medical documents                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NLP EXTRACTION                                   │   │
│  │                                                                     │   │
│  │  Input: PDF text content, text documents                           │   │
│  │  Process: Rule-based extraction                                    │   │
│  │  Output: Structured medical data                                   │   │
│  │  Note: Document text extraction handled by external systems        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Structured data                                                    │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RISK ASSESSMENT & DECISION SUPPORT               │   │
│  │                                                                     │   │
│  │  • Rules Engine evaluates extracted data                           │   │
│  │  • ML models provide predictions                                   │   │
│  │  • Recommendations generated                                       │   │
│  │  • Underwriter reviews and decides                                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Decision + Reason codes                                            │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NLG ASSEMBLY                                     │   │
│  │                                                                     │   │
│  │  Input: Decision context, reason codes, case data                  │   │
│  │  Process: Template + reason-driven assembly                        │   │
│  │  Output: Draft communication                                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Draft for review                                                   │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UNDERWRITER REVIEW                               │   │
│  │                                                                     │   │
│  │  • Review draft                                                    │   │
│  │  • Edit permitted sections                                         │   │
│  │  • Approve communication                                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Approved communication                                             │
│       ▼                                                                     │
│  CORRESPONDENCE SYSTEM (External)                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

| Stage | Input | Process | Output |
|-------|-------|---------|--------|
| Document Receipt | Raw documents | Storage, queuing | Document ready for processing |
| NLP Extraction | Unstructured text | Rule-based extraction | Structured medical data |
| Data Validation | Extracted data | Confidence scoring, flagging | Validated data + review flags |
| Risk Assessment | Validated data | Rules + ML evaluation | Risk factors, recommendations |
| Decision Support | Risk assessment | Option presentation | Decision options for underwriter |
| Decision Capture | Underwriter selection | Recording, override detection | Confirmed decision + reasons |
| NLG Assembly | Decision + reasons | Template + reason assembly | Draft communication |
| Communication Review | Draft | Underwriter review, editing | Approved communication |
| Dispatch | Approved communication | Handoff to correspondence | Sent communication |

---

## Governance Summary

### NLP Governance

| Aspect | Governance Mechanism |
|--------|---------------------|
| Dictionary Updates | Medical review + technical review + approval |
| Pattern Changes | Technical review + testing + approval |
| New Extractions | Business justification + medical review + implementation |
| Version Control | All changes versioned with effective dates |
| Audit Trail | Every extraction traceable to rule version |

### NLG Governance

| Aspect | Governance Mechanism |
|--------|---------------------|
| Template Changes | Business review + compliance review + approval |
| Content Block Updates | Compliance review + legal review where needed |
| Compliance Text Changes | Legal + compliance + executive approval |
| Reason Code Mapping | Underwriting review + compliance review |
| Version Control | All content versioned with effective dates |
| Audit Trail | Every communication traceable to content versions |

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| Canonical Form | Standard representation of a term, regardless of input variation |
| Compliance Block | Locked text element containing regulatory-required content |
| Confidence Score | Measure of extraction reliability (0-1 scale) |
| Content Block | Pre-approved text segment associated with a reason code |
| Dictionary | Governed list of terms with mappings to canonical forms |
| Edit Zone | Region of communication where underwriter modification is permitted |
| Extraction Pattern | Rule defining how to identify and extract specific information types |
| Locked Text | Content that cannot be modified by system or user |
| Normalisation | Process of converting extracted data to standard formats |
| Reason Code | Structured identifier explaining why content is included |
| Reason-Driven | Generation approach where content is selected based on explicit reasons |
| Rule-Based | Deterministic approach using explicit patterns rather than statistical models |
