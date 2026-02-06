# Decision Support Services

## Document Purpose

This document specifies the backend services that provide decision support capabilities to underwriters. Each service is designed to inform and assist human judgment, not to replace it. All outputs are advisory. All actions require underwriter approval.

---

## Service Design Principles

### Advisory by Architecture

Every service produces recommendations, suggestions, or insights. No service produces decisions. The distinction is architectural, not semantic—there are no API endpoints that trigger policy actions without human confirmation.

### Explainability as Requirement

Every service output includes reasoning. Underwriters can always understand why a particular output was generated. This is not optional documentation; it is a mandatory component of every response.

### Human Authority Preservation

Services present options; underwriters choose. Services suggest tests; underwriters order them. Services draft communications; underwriters approve them. This pattern is consistent across all services.

### Override as Feature

Underwriter deviation from service recommendations is expected and supported. Override capture is a core function, not an error condition. The system learns from overrides to improve future recommendations.

---

## Service Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DECISION SUPPORT SERVICES                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌───────────────────┐      ┌───────────────────┐                  │   │
│  │  │ Case Complexity   │      │ Test              │                  │   │
│  │  │ Classification    │      │ Recommendation    │                  │   │
│  │  │ Service           │      │ Service           │                  │   │
│  │  │                   │      │                   │                  │   │
│  │  │ Assigns           │      │ Suggests          │                  │   │
│  │  │ complexity tier   │      │ diagnostic tests  │                  │   │
│  │  │ for routing       │      │ with rationale    │                  │   │
│  │  └───────────────────┘      └───────────────────┘                  │   │
│  │                                                                     │   │
│  │  ┌───────────────────┐      ┌───────────────────┐                  │   │
│  │  │ Test Yield        │      │ Decision Option   │                  │   │
│  │  │ Prediction        │      │ Recommendation    │                  │   │
│  │  │ Service           │      │ Service           │                  │   │
│  │  │                   │      │                   │                  │   │
│  │  │ Estimates         │      │ Presents          │                  │   │
│  │  │ diagnostic value  │      │ available paths   │                  │   │
│  │  │ of tests          │      │ with reasoning    │                  │   │
│  │  └───────────────────┘      └───────────────────┘                  │   │
│  │                                                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ Override Capture & Learning Service                           │ │   │
│  │  │                                                               │ │   │
│  │  │ Records deviations, captures reasoning, informs improvements  │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                              ALL OUTPUTS ARE ADVISORY                       │
│                         ALL ACTIONS REQUIRE HUMAN APPROVAL                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Case Complexity Classification Service

### Purpose

The Case Complexity Classification Service evaluates incoming proposals and assigns a complexity tier that informs case routing. The tier indicates the level of expertise and attention a case is likely to require, enabling appropriate assignment to underwriting staff.

Complexity classification helps operations allocate experienced underwriter time to genuinely complex risks while ensuring straightforward proposals move efficiently through the process.

### Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Applicant Demographics | Age, gender, occupation, location | Proposal data |
| Sum Assured | Coverage amount requested | Proposal data |
| Product Type | Insurance product being applied for | Proposal data |
| Disclosed Conditions | Medical conditions declared by applicant | Proposal data, NLP extraction |
| Disclosed Medications | Current medications reported | Proposal data, NLP extraction |
| Family History | Relevant family medical history | Proposal data |
| Lifestyle Factors | Smoking status, alcohol use, hazardous activities | Proposal data |
| Prior Insurance History | Previous applications, claims, lapses | Policy admin system |
| Document Indicators | Types and volume of supporting documents | Document management |

### Outputs

| Output | Description |
|--------|-------------|
| Complexity Tier | Classification: Routine, Moderate, or Complex |
| Confidence Score | System confidence in the classification (0-1 scale) |
| Contributing Factors | Ranked list of factors influencing the classification |
| Factor Explanations | Human-readable explanation for each contributing factor |
| Suggested Assignment | Recommended underwriter level for case handling |
| Flags | Special conditions requiring attention regardless of tier |

### Complexity Tier Definitions

**Routine**

Cases with straightforward risk profiles that typically do not require senior judgment. Characteristics include: young to middle-aged applicants, no or minimal disclosed conditions, standard sum assured amounts, no adverse lifestyle factors, complete documentation.

**Moderate**

Cases with some complexity factors that require experienced evaluation but do not rise to the level of senior or specialist review. Characteristics include: controlled chronic conditions, moderate sum assured amounts, some lifestyle factors, minor documentation gaps, combinations of low-severity factors.

**Complex**

Cases requiring senior underwriter expertise or specialist consultation. Characteristics include: multiple comorbidities, high-severity conditions, very high sum assured amounts, significant lifestyle risks, incomplete or concerning documentation, unusual combinations of factors.

### What This Service Does

| Capability | Description |
|------------|-------------|
| Evaluates case characteristics | Processes all available proposal data to assess complexity factors |
| Applies classification rules | Executes business rules that define tier boundaries |
| Generates ML-informed predictions | Uses trained models to identify patterns associated with complexity |
| Produces explainable output | Provides reasoning for every classification |
| Identifies special flags | Surfaces conditions requiring attention regardless of overall tier |
| Suggests routing | Recommends appropriate underwriter level for assignment |

### What This Service Does Not Do

| Boundary | Description |
|----------|-------------|
| Does not assign cases | Classification informs routing; humans or workflow systems assign cases |
| Does not determine authority | Authority limits are organisational policy, not service output |
| Does not bypass escalation | Flags and escalation triggers operate independently of tier |
| Does not guarantee accuracy | Classification is advisory; underwriters may reclassify based on review |
| Does not restrict access | Any authorised underwriter can view any case regardless of tier |
| Does not make decisions | Tier assignment has no bearing on underwriting outcome |

### How Underwriters Interact

**Viewing Classification**

When an underwriter opens a case, the complexity tier is displayed prominently along with the confidence score and contributing factors. The underwriter reviews this information as context for their evaluation.

**Reviewing Contributing Factors**

The underwriter can expand the contributing factors section to see detailed explanations for each element influencing the classification. This helps the underwriter understand what the system identified as notable about the case.

**Accepting or Overriding Classification**

The underwriter may proceed with the assigned tier or reclassify the case based on their judgment. If the underwriter changes the tier, the system prompts for reasoning if this constitutes a material override.

**Using Classification for Prioritisation**

Underwriters managing queues can sort and filter by complexity tier, prioritising their attention on cases matching their expertise level or urgency requirements.

### Example Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  COMPLEXITY CLASSIFICATION INTERACTION                      │
│                                                                             │
│  1. CASE RECEIPT                                                           │
│     └──► Proposal data received from policy admin system                   │
│                                                                             │
│  2. CLASSIFICATION PROCESSING                                              │
│     └──► Service evaluates inputs, applies rules, generates prediction     │
│                                                                             │
│  3. RESULT PRESENTATION                                                    │
│     └──► Workbench displays:                                               │
│          ┌─────────────────────────────────────────────────────────┐       │
│          │  Complexity: MODERATE                                   │       │
│          │  Confidence: 0.78                                       │       │
│          │                                                         │       │
│          │  Contributing Factors:                                  │       │
│          │  • Disclosed Type 2 diabetes (controlled)      [+0.25] │       │
│          │  • Sum assured ₹50L (elevated threshold)       [+0.15] │       │
│          │  • Age 48 (mid-range)                          [+0.08] │       │
│          │                                                         │       │
│          │  Suggested Assignment: Senior Underwriter               │       │
│          │                                                         │       │
│          │  [Accept Classification]  [Reclassify Case]             │       │
│          └─────────────────────────────────────────────────────────┘       │
│                                                                             │
│  4. UNDERWRITER ACTION                                                     │
│     └──► Underwriter reviews factors, accepts or adjusts classification    │
│                                                                             │
│  5. CASE ROUTING                                                           │
│     └──► Case enters appropriate queue based on final classification       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Test Recommendation Service

### Purpose

The Test Recommendation Service suggests medical diagnostic tests based on case characteristics, disclosed conditions, and established underwriting protocols. The service helps underwriters identify appropriate tests for each case while providing clinical rationale for each recommendation.

The service aims to promote evidence-based test ordering, reduce unnecessary defensive testing, and ensure regulatory and protocol requirements are met.

### Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Applicant Demographics | Age, gender, BMI | Proposal data |
| Sum Assured | Coverage amount for threshold-based requirements | Proposal data |
| Disclosed Conditions | All medical conditions declared | Proposal data, NLP extraction |
| Condition Details | Severity, duration, treatment status | Proposal data, NLP extraction |
| Current Medications | Active prescriptions | Proposal data, NLP extraction |
| Laboratory Results | Any pre-submitted lab values | Medical documents |
| Family History | Conditions with hereditary relevance | Proposal data |
| Lifestyle Factors | Smoking, alcohol, occupation | Proposal data |
| Product Type | Insurance product for product-specific protocols | Proposal data |
| Prior Test Results | Historical diagnostics on file | Document management |

### Outputs

| Output | Description |
|--------|-------------|
| Recommended Test Panel | List of suggested diagnostic tests |
| Per-Test Rationale | Explanation for why each test is recommended |
| Requirement Type | Classification: Mandatory, Conditional, or Suggested |
| Regulatory Reference | Applicable regulatory requirement if relevant |
| Protocol Reference | Underwriting protocol driving the recommendation |
| Clinical Basis | Medical reasoning supporting the test |
| Expected Turnaround | Typical time to receive results |
| Estimated Cost | Approximate cost for budgeting purposes |

### Recommendation Categories

**Mandatory Tests**

Tests required by regulation or policy regardless of underwriter judgment. These cannot be waived without escalation to appropriate authority. Examples include regulatory-mandated tests for certain sum assured thresholds or specific disclosed conditions.

**Conditional Tests**

Tests recommended based on case-specific factors that the underwriter should order unless specific circumstances justify omission. The underwriter has discretion but should document reasoning if not ordering.

**Suggested Tests**

Tests that may provide useful diagnostic information based on case profile but are not required. The underwriter evaluates whether the expected information value justifies the cost and applicant burden.

### What This Service Does

| Capability | Description |
|------------|-------------|
| Evaluates test requirements | Checks regulatory and policy mandates based on case profile |
| Applies protocol rules | Executes medical underwriting protocols for condition-specific tests |
| Considers condition interactions | Identifies tests warranted by combinations of conditions |
| Generates clinical rationale | Provides medical reasoning for each recommendation |
| References authority sources | Links recommendations to regulations, protocols, or clinical guidelines |
| Supports panel optimisation | Identifies redundant tests or efficient panel combinations |

### What This Service Does Not Do

| Boundary | Description |
|----------|-------------|
| Does not order tests | Recommendations are suggestions; underwriters authorise test orders |
| Does not contact providers | Test requisition and scheduling are external processes |
| Does not interpret results | Result analysis is a separate function performed after test completion |
| Does not override underwriter judgment | Underwriters may modify the panel based on case-specific factors |
| Does not guarantee completeness | Additional tests may be warranted based on information not in system |
| Does not replace clinical expertise | Medical directors may identify needs beyond protocol-driven recommendations |

### How Underwriters Interact

**Reviewing Recommendations**

When the underwriter reaches the test ordering stage, the workbench displays the recommended test panel with rationale for each test. Tests are grouped by requirement category (Mandatory, Conditional, Suggested).

**Understanding Rationale**

The underwriter can expand each test recommendation to see the full clinical basis, protocol reference, and expected diagnostic value. This helps the underwriter evaluate whether each test is appropriate for the specific case.

**Modifying the Panel**

The underwriter may add tests not recommended by the system, remove suggested tests deemed unnecessary, or substitute alternative tests. Modifications to mandatory tests require escalation or documented exception.

**Documenting Deviations**

If the underwriter removes a conditional test or adds tests not recommended, the system prompts for reasoning. This reasoning is stored for audit purposes and feeds the learning loop.

**Approving the Final Panel**

The underwriter confirms the final test panel, which is then communicated to the applicant through the correspondence workflow.

### Example Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TEST RECOMMENDATION INTERACTION                          │
│                                                                             │
│  1. CASE CONTEXT                                                           │
│     └──► Applicant: Age 52, disclosed Type 2 diabetes (HbA1c 7.8%),        │
│          hypertension on ACE inhibitor, sum assured ₹75L                   │
│                                                                             │
│  2. RECOMMENDATION GENERATION                                              │
│     └──► Service evaluates conditions, applies protocols, generates panel  │
│                                                                             │
│  3. PANEL PRESENTATION                                                     │
│     └──► Workbench displays:                                               │
│          ┌─────────────────────────────────────────────────────────┐       │
│          │  RECOMMENDED TEST PANEL                                 │       │
│          │                                                         │       │
│          │  MANDATORY                                              │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │ □ Fasting Lipid Panel                           │   │       │
│          │  │   Basis: Diabetes protocol UW-DM-004            │   │       │
│          │  │   Rationale: Cardiovascular risk assessment     │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │ □ Serum Creatinine + eGFR                       │   │       │
│          │  │   Basis: Diabetes + hypertension protocol       │   │       │
│          │  │   Rationale: Renal function assessment          │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  CONDITIONAL                                            │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │ □ Urine Microalbumin                            │   │       │
│          │  │   Basis: Diabetic nephropathy screening         │   │       │
│          │  │   Rationale: Early renal involvement detection  │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │ □ ECG                                           │   │       │
│          │  │   Basis: Age >50 + cardiovascular risk factors  │   │       │
│          │  │   Rationale: Baseline cardiac assessment        │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  SUGGESTED                                              │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │ □ HbA1c (Repeat)                                │   │       │
│          │  │   Basis: Last reading 8 months old              │   │       │
│          │  │   Rationale: Current glycemic control status    │   │       │
│          │  │   Expected Yield: 68%                           │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  [Add Test]  [Confirm Panel]  [Request Exception]       │       │
│          └─────────────────────────────────────────────────────────┘       │
│                                                                             │
│  4. UNDERWRITER MODIFICATION                                               │
│     └──► Underwriter reviews, adds stress test based on occupation,        │
│          removes suggested HbA1c as recent result available                │
│                                                                             │
│  5. PANEL CONFIRMATION                                                     │
│     └──► Final panel approved, proceeds to communication drafting          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Test Yield Prediction Service

### Purpose

The Test Yield Prediction Service estimates the expected diagnostic value of recommended tests based on historical outcomes for similar case profiles. The service helps underwriters distinguish between tests likely to surface material findings and tests that may be low-value for a particular applicant.

The service supports cost-effective test ordering by providing data-informed guidance on where diagnostic investment is most likely to produce actionable information.

### Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Test Identifier | Specific test being evaluated | Test recommendation |
| Applicant Profile | Demographics, conditions, medications | Proposal data |
| Disclosed Condition Details | Severity, duration, control status | Proposal data, NLP extraction |
| Related Test History | Prior results for related diagnostics | Document management |
| Family History | Hereditary factors relevant to test | Proposal data |
| Lifestyle Factors | Factors affecting test relevance | Proposal data |
| Sum Assured | Coverage level for risk context | Proposal data |

### Outputs

| Output | Description |
|--------|-------------|
| Yield Probability | Estimated likelihood test will surface material findings (0-1 scale) |
| Confidence Interval | Range indicating prediction uncertainty |
| Model Confidence | System confidence in the prediction |
| Yield Category | Classification: High, Moderate, Low expected yield |
| Contributing Factors | Elements of profile driving the prediction |
| Historical Comparison | Outcome rates for similar profiles in historical data |
| Alternative Consideration | Related tests that may provide similar information |

### Yield Categories

**High Expected Yield**

Tests with strong likelihood of producing findings that affect underwriting assessment. Historical data shows similar profiles frequently had material results from this test.

**Moderate Expected Yield**

Tests with reasonable probability of producing useful findings. The test may confirm existing information or occasionally surface new concerns.

**Low Expected Yield**

Tests unlikely to produce findings beyond what is already known. May still be warranted for regulatory compliance or protocol requirements, but expected information gain is limited.

### What This Service Does

| Capability | Description |
|------------|-------------|
| Estimates diagnostic value | Predicts likelihood of material findings based on case profile |
| Analyses historical patterns | Uses past outcomes for similar profiles to inform predictions |
| Quantifies uncertainty | Provides confidence indicators and prediction intervals |
| Identifies yield drivers | Explains which case factors influence the prediction |
| Supports prioritisation | Helps underwriters focus on high-value diagnostics |
| Surfaces alternatives | Identifies related tests that may provide comparable information |

### What This Service Does Not Do

| Boundary | Description |
|----------|-------------|
| Does not determine test necessity | Yield is one factor; regulatory requirements and protocols take precedence |
| Does not predict specific findings | Service estimates likelihood of material findings, not what those findings will be |
| Does not replace clinical judgment | Medical directors may identify value beyond what historical patterns suggest |
| Does not account for all factors | Unique case circumstances may affect yield beyond model inputs |
| Does not guarantee accuracy | Predictions are probabilistic estimates, not certainties |
| Does not authorise test omission | Low yield does not automatically justify skipping required tests |

### How Underwriters Interact

**Viewing Yield Estimates**

Yield predictions appear alongside test recommendations in the workbench. Each test displays its expected yield category and probability, allowing underwriters to quickly assess relative diagnostic value.

**Evaluating Suggested Tests**

For tests in the Suggested category, underwriters use yield predictions to decide whether to include the test. A high-yield suggested test may warrant inclusion; a low-yield suggested test may be reasonably omitted.

**Understanding Prediction Basis**

The underwriter can expand yield predictions to see contributing factors and historical comparison data. This transparency helps underwriters evaluate whether the prediction applies well to the specific case.

**Incorporating Yield into Decisions**

Yield predictions inform but do not dictate test ordering. Underwriters balance yield estimates against cost, applicant burden, protocol requirements, and case-specific factors.

### Example Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TEST YIELD PREDICTION INTERACTION                       │
│                                                                             │
│  1. CONTEXT                                                                │
│     └──► Underwriter reviewing test panel for 45-year-old applicant        │
│          with well-controlled hypertension, no other conditions            │
│                                                                             │
│  2. YIELD DISPLAY                                                          │
│     └──► Workbench shows yield alongside each test:                        │
│          ┌─────────────────────────────────────────────────────────┐       │
│          │  TEST                    YIELD        CATEGORY          │       │
│          │  ──────────────────────────────────────────────────────│       │
│          │  Lipid Panel             0.72         High              │       │
│          │  Serum Creatinine        0.58         Moderate          │       │
│          │  ECG                     0.34         Moderate          │       │
│          │  Stress Test             0.18         Low               │       │
│          │  Echocardiogram          0.12         Low               │       │
│          └─────────────────────────────────────────────────────────┘       │
│                                                                             │
│  3. DETAIL REVIEW                                                          │
│     └──► Underwriter expands Stress Test prediction:                       │
│          ┌─────────────────────────────────────────────────────────┐       │
│          │  Stress Test - Yield Analysis                          │       │
│          │                                                         │       │
│          │  Predicted Yield: 0.18 (Low)                           │       │
│          │  Confidence: 0.81                                       │       │
│          │  Interval: 0.11 - 0.26                                  │       │
│          │                                                         │       │
│          │  Contributing Factors:                                  │       │
│          │  • Well-controlled hypertension         [-0.15]        │       │
│          │  • No chest pain or exertional symptoms [-0.12]        │       │
│          │  • Age <50                              [-0.08]        │       │
│          │  • No diabetes                          [-0.06]        │       │
│          │                                                         │       │
│          │  Historical Comparison:                                 │       │
│          │  Similar profiles (n=342): 14% had material findings   │       │
│          │                                                         │       │
│          │  Alternative: ECG provides baseline cardiac data        │       │
│          │  at lower cost with similar risk stratification         │       │
│          └─────────────────────────────────────────────────────────┘       │
│                                                                             │
│  4. UNDERWRITER DECISION                                                   │
│     └──► Underwriter proceeds with ECG, omits Stress Test as low-yield    │
│          and not required by protocol for this profile                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Decision Option Recommendation Service

### Purpose

The Decision Option Recommendation Service presents underwriters with structured pathways for case disposition based on the accumulated case information, risk assessment, and available test results. The service organises the available options with supporting reasoning to help underwriters efficiently evaluate appropriate next steps.

The service does not recommend a single "correct" decision. It presents the options available under current policy and explains the factors that support or weigh against each option.

### Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Risk Assessment | Comprehensive risk evaluation results | Risk Service |
| Complexity Classification | Assigned complexity tier | Complexity Service |
| Test Results | Completed diagnostic results | Document management |
| Extracted Medical Data | Structured information from documents | NLP extraction |
| Underwriting Guidelines | Applicable policy and protocol rules | Configuration |
| Authority Limits | Underwriter's decision authority | User profile |
| Case History | Prior actions and notes on the case | Case Service |
| Product Terms | Available coverage options and modifications | Product configuration |

### Outputs

| Output | Description |
|--------|-------------|
| Available Options | List of valid decision pathways for the case |
| Per-Option Analysis | Factors supporting and weighing against each option |
| Guideline References | Relevant policy and protocol citations |
| Risk Alignment | How each option aligns with identified risk factors |
| Authority Indicator | Whether option is within underwriter's authority |
| Documentation Requirements | What must be documented for each option |
| Escalation Paths | When and how to escalate if appropriate |

### Decision Option Categories

**Standard Acceptance**

Case proceeds at standard terms without modifications. Appropriate when risk assessment indicates normal risk profile within product guidelines.

**Modified Acceptance**

Case proceeds with specific modifications such as exclusions, waiting periods, or coverage limitations. Appropriate when specific risks warrant targeted adjustments rather than decline.

**Request Additional Information**

Case requires further documentation, clarification, or test results before decision. Appropriate when current information is insufficient for confident assessment.

**Refer for Senior Review**

Case should be evaluated by senior underwriter or specialist. Appropriate when complexity exceeds current underwriter's experience or authority.

**Refer for Medical Director Review**

Case requires clinical judgment beyond standard underwriting expertise. Appropriate for unusual medical presentations or edge cases requiring specialist input.

**Postpone**

Decision deferred pending time-based condition such as treatment stabilisation or waiting period. Appropriate when current status is temporary and reassessment at future date is warranted.

**Decline**

Case does not meet underwriting criteria. This option is presented only when applicable under current guidelines; the underwriter evaluates and decides.

### What This Service Does

| Capability | Description |
|------------|-------------|
| Identifies valid options | Determines which decision pathways are available under current policy |
| Analyses option suitability | Evaluates how case factors align with each option |
| References guidelines | Links options to specific policy and protocol provisions |
| Checks authority limits | Indicates whether options are within underwriter's authority |
| Documents requirements | Specifies what documentation each option requires |
| Supports consistency | Presents options systematically based on case characteristics |

### What This Service Does Not Do

| Boundary | Description |
|----------|-------------|
| Does not select an option | The service presents options; the underwriter decides |
| Does not rank options | Options are presented based on category, not preference |
| Does not execute decisions | Selection of an option initiates further workflow, not policy action |
| Does not override guidelines | Options are constrained by policy; exceptions require escalation |
| Does not replace judgment | Unusual cases may warrant options not explicitly presented |
| Does not guarantee completeness | Underwriters may identify valid approaches beyond presented options |

### How Underwriters Interact

**Reviewing Available Options**

After completing risk assessment and receiving test results, the underwriter navigates to the decision stage. The workbench displays available options with supporting analysis for each.

**Evaluating Option Analysis**

For each option, the underwriter reviews factors that support or weigh against that path. Guideline references help the underwriter understand the policy basis for each option.

**Checking Authority**

Options outside the underwriter's authority are marked accordingly. The underwriter can still view the analysis but must escalate to proceed with those options.

**Selecting a Path**

The underwriter selects the appropriate option based on their judgment. The selection initiates the next workflow step—documentation, escalation, or communication drafting as appropriate.

**Documenting Rationale**

For certain options, the system prompts for documentation of rationale. This is particularly relevant for modified acceptance, decline, or deviation from expected path.

### Example Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   DECISION OPTION RECOMMENDATION INTERACTION                │
│                                                                             │
│  1. CONTEXT                                                                │
│     └──► Case: 55-year-old, Type 2 diabetes (HbA1c 8.1%), hypertension,   │
│          test results received showing mild proteinuria, sum assured ₹1Cr  │
│                                                                             │
│  2. OPTION GENERATION                                                      │
│     └──► Service evaluates case, identifies available pathways             │
│                                                                             │
│  3. OPTION PRESENTATION                                                    │
│     └──► Workbench displays:                                               │
│          ┌─────────────────────────────────────────────────────────┐       │
│          │  DECISION OPTIONS                                       │       │
│          │                                                         │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │  MODIFIED ACCEPTANCE                            │   │       │
│          │  │  Authority: Within Limits                       │   │       │
│          │  │                                                 │   │       │
│          │  │  Supporting Factors:                            │   │       │
│          │  │  • Diabetes controlled with oral medication     │   │       │
│          │  │  • No diabetic retinopathy on exam             │   │       │
│          │  │  • Cardiac assessment normal                    │   │       │
│          │  │                                                 │   │       │
│          │  │  Weighing Factors:                              │   │       │
│          │  │  • Mild proteinuria indicates early nephropathy │   │       │
│          │  │  • HbA1c above target (8.1% vs 7.0% target)    │   │       │
│          │  │                                                 │   │       │
│          │  │  Suggested Modification:                        │   │       │
│          │  │  Renal exclusion per guideline UW-RENAL-007    │   │       │
│          │  │                                                 │   │       │
│          │  │  [Select This Option]                           │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │  REFER FOR MEDICAL DIRECTOR REVIEW              │   │       │
│          │  │  Authority: Available                           │   │       │
│          │  │                                                 │   │       │
│          │  │  Consideration:                                 │   │       │
│          │  │  • Proteinuria progression risk assessment      │   │       │
│          │  │  • Alternative modification options             │   │       │
│          │  │  • Loading consideration vs exclusion           │   │       │
│          │  │                                                 │   │       │
│          │  │  [Select This Option]                           │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │  REQUEST ADDITIONAL INFORMATION                 │   │       │
│          │  │  Authority: Within Limits                       │   │       │
│          │  │                                                 │   │       │
│          │  │  Consideration:                                 │   │       │
│          │  │  • Repeat urine protein to confirm finding      │   │       │
│          │  │  • Nephrology consultation report               │   │       │
│          │  │  • Recent ophthalmology assessment              │   │       │
│          │  │                                                 │   │       │
│          │  │  [Select This Option]                           │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │  STANDARD ACCEPTANCE                            │   │       │
│          │  │  Authority: Within Limits                       │   │       │
│          │  │                                                 │   │       │
│          │  │  Caution:                                       │   │       │
│          │  │  • Proteinuria finding typically warrants       │   │       │
│          │  │    modification per guideline UW-RENAL-007      │   │       │
│          │  │  • Selecting this option requires documented    │   │       │
│          │  │    rationale for deviation                      │   │       │
│          │  │                                                 │   │       │
│          │  │  [Select This Option]                           │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          └─────────────────────────────────────────────────────────┘       │
│                                                                             │
│  4. UNDERWRITER SELECTION                                                  │
│     └──► Underwriter selects "Modified Acceptance" with renal exclusion    │
│                                                                             │
│  5. WORKFLOW CONTINUATION                                                  │
│     └──► System proceeds to documentation and communication drafting       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Override Capture and Learning Service

### Purpose

The Override Capture and Learning Service records instances where underwriters deviate from system recommendations, captures the reasoning behind those deviations, and uses this information to improve future recommendations. The service transforms individual expert judgment into institutional knowledge.

The service operates on the principle that underwriter overrides contain valuable information about gaps between system recommendations and optimal practice. Systematically capturing and analysing overrides enables continuous improvement while preserving complete audit trails.

### Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Original Recommendation | What the system suggested | Recommendation services |
| Underwriter Selection | What the underwriter chose | Workbench interaction |
| Override Classification | Whether deviation is material or non-material | System classification |
| Case Context | Full case state at time of decision | Case Service |
| Underwriter Reasoning | Explanation for deviation (mandatory if material) | Underwriter input |
| Underwriter Profile | Experience level, role, specialisation | User management |
| Outcome Data | Ultimate case result when available | Case lifecycle |

### Outputs

| Output | Description |
|--------|-------------|
| Override Record | Complete documentation of the deviation |
| Learning Data Export | Structured data for ML training pipeline |
| Pattern Analysis | Aggregated override trends and themes |
| Insight Reports | Findings surfaced for management review |
| Quality Metrics | Override rates and consistency indicators |
| Feedback Loop Status | Confirmation of data integration into learning systems |

### Override Categories

**Material Overrides (Reasoning Required)**

Deviations that affect risk assessment, case handling, or clinical recommendations. Examples include:

| Override Type | Description |
|---------------|-------------|
| Test Panel Modification | Adding, removing, or substituting recommended tests |
| Risk Tier Adjustment | Changing the assigned risk classification |
| Decision Path Change | Selecting different decision option than system suggested |
| Complexity Reclassification | Changing the assigned complexity tier |
| Escalation Override | Proceeding when escalation was recommended, or escalating when not recommended |

**Non-Material Overrides (Reasoning Optional)**

Deviations that do not substantively affect case handling. Examples include:

| Override Type | Description |
|---------------|-------------|
| Communication Rewording | Editing draft text without changing substance |
| Formatting Adjustments | Modifying presentation without changing content |
| Clarification Additions | Adding explanatory text that does not change decision |
| Typo Corrections | Fixing errors in system-generated content |

### What This Service Does

| Capability | Description |
|------------|-------------|
| Detects overrides | Identifies when underwriter selection differs from recommendation |
| Classifies materiality | Determines whether override requires mandatory reasoning |
| Captures context | Records full case state at override time |
| Collects reasoning | Prompts for and stores underwriter explanation |
| Aggregates patterns | Identifies systematic deviation trends |
| Feeds learning pipeline | Exports structured data for model improvement |
| Surfaces insights | Produces reports for management review |

### What This Service Does Not Do

| Boundary | Description |
|----------|-------------|
| Does not prevent overrides | Underwriters have full authority to deviate |
| Does not penalise deviation | Overrides are expected and valuable, not errors |
| Does not auto-modify rules | Pattern insights inform human decisions about changes |
| Does not auto-retrain models | ML updates require governance approval |
| Does not expose individual performance | Override data is for system improvement, not underwriter evaluation |
| Does not guarantee learning | Not all overrides contain generalisable insights |

### How Underwriters Interact

**Override Detection**

When an underwriter makes a selection that differs from the system recommendation, the system automatically detects the deviation. The underwriter does not need to explicitly flag overrides.

**Materiality Prompt**

For material overrides, the workbench displays a reasoning prompt. The underwriter provides a brief explanation for their deviation. This is mandatory for material overrides and cannot be skipped.

**Reasoning Input**

The reasoning interface allows free-text explanation supplemented by optional category selection. Common override reasons are available as quick-select options, with free text for case-specific explanations.

**Confirmation**

After providing reasoning, the underwriter confirms the override. The system records the complete override context and proceeds with the underwriter's selection.

**Non-Material Edits**

For non-material changes, the system records the modification without interrupting workflow. The underwriter may optionally provide reasoning but is not required to do so.

### Learning Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEARNING PIPELINE FLOW                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OVERRIDE CAPTURE                                 │   │
│  │                                                                     │   │
│  │  For each material override:                                       │   │
│  │  • Original recommendation stored                                  │   │
│  │  • Underwriter selection stored                                    │   │
│  │  • Case context snapshot created                                   │   │
│  │  • Reasoning text captured                                         │   │
│  │  • Timestamp and user recorded                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PERIODIC AGGREGATION                             │   │
│  │                    (Weekly Batch Process)                           │   │
│  │                                                                     │   │
│  │  • Group overrides by type and category                            │   │
│  │  • Identify frequency patterns                                     │   │
│  │  • Cluster similar case profiles                                   │   │
│  │  • Extract reasoning themes                                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PATTERN ANALYSIS                                 │   │
│  │                                                                     │   │
│  │  Identify systematic patterns:                                     │   │
│  │  • Tests consistently added for certain profiles                   │   │
│  │  • Tests consistently removed as low-value                         │   │
│  │  • Decision options frequently changed                             │   │
│  │  • Complexity classifications often adjusted                       │   │
│  │                                                                     │   │
│  │  Validate patterns:                                                │   │
│  │  • Multiple underwriters showing same deviation                    │   │
│  │  • Consistent reasoning across overrides                           │   │
│  │  • Outcome data supports override value                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                    ┌─────────────────┴─────────────────┐                   │
│                    │                                   │                   │
│                    ▼                                   ▼                   │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │ ML MODEL TRAINING              │  │ MANAGEMENT REPORTING           │   │
│  │                                │  │                                │   │
│  │ Override data informs:        │  │ Insights surfaced:            │   │
│  │ • Feature importance updates  │  │ • Override rate trends        │   │
│  │ • Prediction recalibration    │  │ • Systematic pattern findings │   │
│  │ • New pattern recognition     │  │ • Protocol gap identification │   │
│  │                                │  │ • Recommended rule changes    │   │
│  │ Subject to governance review  │  │                                │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                    │                                   │                   │
│                    └─────────────────┬─────────────────┘                   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HUMAN GOVERNANCE                                 │   │
│  │                                                                     │   │
│  │  Management reviews insights and approves changes:                 │   │
│  │  • Protocol updates based on systematic patterns                   │   │
│  │  • Rule modifications where warranted                              │   │
│  │  • Model retraining authorisation                                  │   │
│  │  • Threshold adjustments                                           │   │
│  │                                                                     │   │
│  │  NO AUTOMATIC CHANGES - ALL MODIFICATIONS REQUIRE APPROVAL         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OVERRIDE CAPTURE INTERACTION                             │
│                                                                             │
│  1. RECOMMENDATION PRESENTED                                               │
│     └──► System recommends: Lipid Panel, HbA1c, Creatinine                 │
│                                                                             │
│  2. UNDERWRITER DEVIATION                                                  │
│     └──► Underwriter adds: Liver Function Tests                            │
│          (not in system recommendation)                                     │
│                                                                             │
│  3. OVERRIDE DETECTED                                                      │
│     └──► System identifies test panel modification (material override)     │
│                                                                             │
│  4. REASONING PROMPT                                                       │
│     └──► Workbench displays:                                               │
│          ┌─────────────────────────────────────────────────────────┐       │
│          │  TEST PANEL MODIFICATION                                │       │
│          │                                                         │       │
│          │  You added: Liver Function Tests                        │       │
│          │  This was not included in the system recommendation.    │       │
│          │                                                         │       │
│          │  Please provide your reasoning:                         │       │
│          │                                                         │       │
│          │  Quick Select:                                          │       │
│          │  ○ Medication interaction concern                       │       │
│          │  ○ Condition-specific protocol                          │       │
│          │  ○ Historical pattern for this profile                  │       │
│          │  ○ Clinical judgment                                    │       │
│          │  ● Other (specify below)                                │       │
│          │                                                         │       │
│          │  ┌─────────────────────────────────────────────────┐   │       │
│          │  │ Applicant on Metformin 2000mg daily for 5+     │   │       │
│          │  │ years. Standard protocol to check hepatic      │   │       │
│          │  │ function with long-term metformin use.         │   │       │
│          │  └─────────────────────────────────────────────────┘   │       │
│          │                                                         │       │
│          │  [Confirm Override]  [Cancel]                           │       │
│          └─────────────────────────────────────────────────────────┘       │
│                                                                             │
│  5. OVERRIDE RECORDED                                                      │
│     └──► System stores:                                                    │
│          • Original recommendation                                         │
│          • Modified panel                                                  │
│          • Case context (applicant profile, medications, conditions)       │
│          • Reasoning: "Long-term metformin, hepatic function check"        │
│          • Override type: Test addition                                    │
│          • Underwriter ID and timestamp                                    │
│                                                                             │
│  6. WORKFLOW CONTINUES                                                     │
│     └──► Case proceeds with underwriter's modified test panel              │
│                                                                             │
│  7. FUTURE PATTERN DETECTION                                               │
│     └──► If multiple underwriters add LFTs for long-term metformin:       │
│          • Pattern surfaced in weekly analysis                            │
│          • Management reviews for potential protocol update               │
│          • If approved, LFT added to metformin protocol                   │
│          • System begins recommending LFT for similar future cases        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Integration

### Service Interaction Pattern

The decision support services operate in sequence during case processing, with each service building on outputs from previous stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVICE INTEGRATION FLOW                                 │
│                                                                             │
│  CASE INTAKE                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ COMPLEXITY CLASSIFICATION SERVICE                                   │   │
│  │                                                                     │   │
│  │ Input: Proposal data, extracted medical information                │   │
│  │ Output: Complexity tier, contributing factors, routing suggestion  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Complexity informs routing and sets context                        │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TEST RECOMMENDATION SERVICE                                         │   │
│  │                                                                     │   │
│  │ Input: Case data, complexity, extracted conditions                 │   │
│  │ Output: Recommended test panel with rationale                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Test list passed to yield service                                  │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TEST YIELD PREDICTION SERVICE                                       │   │
│  │                                                                     │   │
│  │ Input: Recommended tests, applicant profile                        │   │
│  │ Output: Per-test yield estimates                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Combined recommendations presented to underwriter                  │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ UNDERWRITER TEST REVIEW                                             │   │
│  │                                                                     │   │
│  │ Underwriter reviews, modifies, approves test panel                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ If modifications made                                              │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OVERRIDE CAPTURE SERVICE (if applicable)                            │   │
│  │                                                                     │   │
│  │ Input: Original recommendation, underwriter selection, reasoning   │   │
│  │ Output: Override record for learning pipeline                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ After tests complete, results received                             │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION OPTION RECOMMENDATION SERVICE                              │   │
│  │                                                                     │   │
│  │ Input: Risk assessment, test results, case context                 │   │
│  │ Output: Available decision pathways with analysis                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ Options presented to underwriter                                   │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ UNDERWRITER DECISION                                                │   │
│  │                                                                     │   │
│  │ Underwriter evaluates options, selects pathway                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       │ If selection differs from expected path                            │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OVERRIDE CAPTURE SERVICE (if applicable)                            │   │
│  │                                                                     │   │
│  │ Input: Recommended options, underwriter selection, reasoning       │   │
│  │ Output: Override record for learning pipeline                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ▼                                                                     │
│  CASE PROCEEDS TO COMMUNICATION AND DISPOSITION                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cross-Service Data Flow

| Source Service | Destination Service | Data Passed |
|----------------|---------------------|-------------|
| Complexity Classification | Test Recommendation | Complexity tier, contributing factors |
| Complexity Classification | Decision Option | Complexity context for option analysis |
| Test Recommendation | Test Yield Prediction | Recommended test list |
| Test Recommendation | Override Capture | Original recommendation for comparison |
| Test Yield Prediction | Workbench Display | Yield estimates alongside recommendations |
| Decision Option | Override Capture | Recommended options for comparison |
| Override Capture | ML Training Pipeline | Structured override data |
| Override Capture | Pattern Analysis | Aggregated deviation records |

---

## Audit and Compliance

### Service-Level Audit Requirements

Each service maintains audit records for every operation:

| Service | Audited Elements |
|---------|------------------|
| Complexity Classification | Input data, classification result, contributing factors, confidence |
| Test Recommendation | Input data, recommended panel, rationale for each test |
| Test Yield Prediction | Input features, predictions, model version, confidence scores |
| Decision Option Recommendation | Input context, options presented, analysis provided |
| Override Capture | Original recommendation, deviation, reasoning, classification |

### Audit Record Structure

Every service operation produces an audit record containing:

| Field | Description |
|-------|-------------|
| Operation ID | Unique identifier for the operation |
| Service Name | Which service performed the operation |
| Timestamp | When the operation occurred (UTC) |
| Case Reference | Associated case identifier |
| User Reference | Underwriter or system actor |
| Input Summary | Key inputs to the operation |
| Output Summary | Results produced |
| Reasoning | Explanation for output |
| Configuration Version | Rule and model versions in effect |

### Regulatory Traceability

For any case decision, auditors can trace:

1. What complexity tier was assigned and why
2. What tests were recommended and the basis for each
3. What yield predictions were provided
4. What decision options were presented
5. What the underwriter selected
6. Whether and why the underwriter deviated from recommendations
7. What reasoning the underwriter provided

This complete chain supports regulatory inquiry and quality review.

---

## Appendix: Service API Summary

### Complexity Classification Service

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /classify | POST | Generate complexity classification for a case |
| /classification/{caseId} | GET | Retrieve existing classification |
| /reclassify | POST | Record underwriter reclassification |

### Test Recommendation Service

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /recommend | POST | Generate test recommendations for a case |
| /recommendations/{caseId} | GET | Retrieve existing recommendations |
| /protocols | GET | List available test protocols |

### Test Yield Prediction Service

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /predict | POST | Generate yield predictions for test list |
| /predictions/{caseId} | GET | Retrieve existing predictions |

### Decision Option Recommendation Service

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /options | POST | Generate decision options for a case |
| /options/{caseId} | GET | Retrieve existing options |
| /select | POST | Record underwriter option selection |

### Override Capture Service

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /record | POST | Record an override with reasoning |
| /overrides/{caseId} | GET | Retrieve overrides for a case |
| /patterns | GET | Retrieve override pattern analysis |
| /export | POST | Export override data for ML training |
