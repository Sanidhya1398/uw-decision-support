# Learning and Governance Framework

## Document Purpose

This document explains how the underwriting decision support system learns from underwriter expertise while maintaining strict governance controls. It is written for Chief Underwriters, Risk Officers, and Compliance leadership who need to understand and approve the learning mechanisms before deployment.

The core principle is straightforward: the system observes how experienced underwriters work, identifies patterns in their expert judgment, and uses those patterns to improve future recommendations. At no point does the system modify its own rules, change underwriting policy, or make autonomous decisions. Learning improves advice; humans retain all authority.

---

## Executive Summary

### What the System Does

The system captures instances where underwriters deviate from its recommendations, records the reasoning behind those deviations, analyses patterns across many cases, and uses those patterns to improve the relevance and accuracy of future recommendations.

### What the System Does Not Do

The system does not modify underwriting guidelines. It does not change risk appetite. It does not adjust authority limits. It does not alter compliance requirements. It does not make decisions. All policy changes require human review and approval through existing governance processes.

### Why This Matters

Underwriting expertise is institutional knowledge. When a senior underwriter consistently adds a specific test for a particular risk profile—even when protocols do not require it—that represents valuable judgment developed over years of experience. Without systematic capture, this knowledge remains with individuals and is lost when they leave. The learning framework preserves and scales expert judgment while keeping humans in control.

---

## Override Capture Framework

### What Constitutes an Override

An override occurs whenever an underwriter's action differs from the system's recommendation. The system does not treat overrides as errors or exceptions—they are expected, valuable, and actively encouraged when professional judgment warrants deviation.

### Override Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OVERRIDE CLASSIFICATION                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MATERIAL OVERRIDES                               │   │
│  │                    Reasoning Capture: MANDATORY                     │   │
│  │                                                                     │   │
│  │  These overrides affect risk assessment, case handling, or         │   │
│  │  clinical recommendations. They represent substantive professional │   │
│  │  judgment that the system should learn from.                       │   │
│  │                                                                     │   │
│  │  Examples:                                                         │   │
│  │                                                                     │   │
│  │  Test Panel Modifications                                          │   │
│  │  ├─ Adding tests not recommended by the system                     │   │
│  │  ├─ Removing recommended tests (non-mandatory)                     │   │
│  │  └─ Substituting alternative tests                                 │   │
│  │                                                                     │   │
│  │  Risk Assessment Changes                                           │   │
│  │  ├─ Adjusting complexity tier classification                       │   │
│  │  ├─ Modifying risk factor weighting                                │   │
│  │  └─ Changing risk category assignment                              │   │
│  │                                                                     │   │
│  │  Decision Path Deviations                                          │   │
│  │  ├─ Selecting different decision option than suggested             │   │
│  │  ├─ Proceeding when escalation was recommended                     │   │
│  │  └─ Escalating when standard processing was suggested              │   │
│  │                                                                     │   │
│  │  Clinical Judgment Applications                                    │   │
│  │  ├─ Medical Director overrides on clinical grounds                 │   │
│  │  └─ Specialist consultation recommendations                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NON-MATERIAL OVERRIDES                           │   │
│  │                    Reasoning Capture: OPTIONAL                      │   │
│  │                                                                     │   │
│  │  These overrides do not substantively affect case handling.        │   │
│  │  They are recorded for completeness but do not require             │   │
│  │  justification and typically do not inform learning.               │   │
│  │                                                                     │   │
│  │  Examples:                                                         │   │
│  │  ├─ Rewording communication text (substance unchanged)             │   │
│  │  ├─ Formatting adjustments                                         │   │
│  │  ├─ Correcting typographical errors                                │   │
│  │  └─ Adding clarifying notes (no decision impact)                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Override Data Captured

For every material override, the system captures a complete record enabling both audit and learning:

| Data Element | Purpose | Retention |
|--------------|---------|-----------|
| Original Recommendation | What the system suggested | Permanent |
| Underwriter Selection | What the underwriter chose | Permanent |
| Case Context Snapshot | Full case state at decision time | Permanent |
| Underwriter Reasoning | Explanation for deviation | Permanent |
| Underwriter Profile | Role, experience level, specialisation | Permanent |
| Timestamp | When the override occurred | Permanent |
| Override Classification | Material vs non-material determination | Permanent |
| Outcome Data | Case result when available (linked later) | Permanent |

### Reasoning Capture Requirements

Material overrides require underwriters to provide reasoning. This is not bureaucratic overhead—it is the mechanism by which expert judgment becomes institutional knowledge.

**Reasoning Interface Design**

The system provides structured reasoning capture that balances completeness with workflow efficiency:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REASONING CAPTURE INTERFACE                              │
│                                                                             │
│  Override Detected: Test Panel Modification                                │
│  You added: Liver Function Tests                                           │
│  System recommendation did not include this test.                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Why are you adding this test?                                     │   │
│  │                                                                     │   │
│  │  Common Reasons (select if applicable):                            │   │
│  │  ○ Medication-related monitoring                                   │   │
│  │  ○ Condition-specific protocol (specify condition)                 │   │
│  │  ○ Duration/severity of disclosed condition                        │   │
│  │  ○ Multiple condition interaction                                  │   │
│  │  ○ Historical pattern for this profile                             │   │
│  │  ○ Clinical judgment based on examination findings                 │   │
│  │  ● Other (explain below)                                           │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Patient on Metformin 2000mg daily for 6+ years. Adding LFT │   │   │
│  │  │ per standard practice for long-term metformin monitoring    │   │   │
│  │  │ given association with rare hepatic effects.                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  Confidence in this override:                                      │   │
│  │  ○ Standard practice (should always apply)                         │   │
│  │  ● Case-specific judgment (may not generalise)                     │   │
│  │  ○ Uncertain (seeking feedback)                                    │   │
│  │                                                                     │   │
│  │  [Confirm Override]                                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Reasoning Quality**

The value of learning depends on reasoning quality. Vague reasoning ("clinical judgment") provides less learning value than specific reasoning ("long-term metformin use warrants hepatic monitoring"). The system encourages specificity without mandating lengthy explanations.

### Override Handling Principles

| Principle | Implementation |
|-----------|----------------|
| No Friction for Necessary Overrides | Override capture is streamlined; underwriters are not penalised for deviating |
| Reasoning is Investment, Not Burden | Framed as contributing to institutional knowledge, not justifying deviation |
| All Overrides Are Valid | System does not challenge or block overrides; it records and learns |
| Outcome Feedback Welcome | Underwriters can flag when override proved correct or incorrect |
| Privacy of Individual Patterns | Override analysis focuses on aggregate patterns, not individual performance |

---

## Machine Learning Framework

### How ML Learns from Overrides

The ML component analyses override data to identify patterns that can improve future recommendations. This is a supervised learning process where underwriter decisions serve as training signal.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ML LEARNING PIPELINE                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 1: DATA COLLECTION                                            │   │
│  │                                                                     │   │
│  │ Override records accumulated continuously:                         │   │
│  │ • Case features at decision time                                   │   │
│  │ • System recommendation                                            │   │
│  │ • Underwriter selection                                            │   │
│  │ • Reasoning category and text                                      │   │
│  │ • Outcome data when available                                      │   │
│  │                                                                     │   │
│  │ Volume: Hundreds to thousands of overrides per month               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 2: PATTERN IDENTIFICATION                                     │   │
│  │ (Automated Analysis - Weekly Batch)                                 │   │
│  │                                                                     │   │
│  │ Statistical analysis identifies:                                   │   │
│  │ • Case profiles with high override rates                           │   │
│  │ • Consistent deviations across multiple underwriters               │   │
│  │ • Reasoning themes that appear repeatedly                          │   │
│  │ • Correlations between case features and override types            │   │
│  │                                                                     │   │
│  │ Example Finding:                                                   │   │
│  │ "For applicants on Metformin >1500mg daily for >5 years,           │   │
│  │  underwriters add LFT 73% of the time (n=142 cases).               │   │
│  │  Primary reasoning: long-term metformin hepatic monitoring.        │   │
│  │  Override rate consistent across 8 different underwriters."        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 3: PATTERN VALIDATION                                         │   │
│  │ (Automated Checks + Human Review)                                   │   │
│  │                                                                     │   │
│  │ Before patterns influence recommendations, validation ensures:     │   │
│  │                                                                     │   │
│  │ Statistical Validity                                               │   │
│  │ • Sufficient sample size (minimum thresholds by pattern type)      │   │
│  │ • Consistency across time periods                                  │   │
│  │ • Consistency across underwriter subgroups                         │   │
│  │                                                                     │   │
│  │ Clinical Validity                                                  │   │
│  │ • Reasoning is medically sound                                     │   │
│  │ • Pattern aligns with clinical guidelines                          │   │
│  │ • No contraindications identified                                  │   │
│  │                                                                     │   │
│  │ Business Validity                                                  │   │
│  │ • Pattern does not conflict with policy                            │   │
│  │ • Cost-benefit is reasonable                                       │   │
│  │ • No regulatory concerns                                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 4: MODEL UPDATE                                               │   │
│  │ (Governance-Approved Changes Only)                                  │   │
│  │                                                                     │   │
│  │ Validated patterns may result in:                                  │   │
│  │                                                                     │   │
│  │ A. ML Model Retraining                                             │   │
│  │    • Prediction models updated with new training data              │   │
│  │    • Confidence calibration adjusted                               │   │
│  │    • Feature importance recalculated                               │   │
│  │    → Requires ML Governance approval                               │   │
│  │                                                                     │   │
│  │ B. Recommendation Surfacing                                        │   │
│  │    • System begins suggesting the pattern-identified action        │   │
│  │    • Presented as "frequently added by underwriters"               │   │
│  │    • Still advisory, still requires underwriter selection          │   │
│  │    → Requires Underwriting Management approval                     │   │
│  │                                                                     │   │
│  │ C. Protocol Review Trigger                                         │   │
│  │    • Pattern surfaced to protocol governance committee             │   │
│  │    • May result in formal protocol change                          │   │
│  │    • Formal change follows standard governance process             │   │
│  │    → Requires Protocol Governance approval                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 5: MONITORING AND FEEDBACK                                    │   │
│  │ (Continuous)                                                        │   │
│  │                                                                     │   │
│  │ After changes are deployed:                                        │   │
│  │ • Track acceptance rate of new recommendations                     │   │
│  │ • Monitor for new override patterns                                │   │
│  │ • Collect underwriter feedback                                     │   │
│  │ • Measure outcome correlation where available                      │   │
│  │                                                                     │   │
│  │ Feedback informs next learning cycle                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ML Model Inventory

The system employs specific models with defined, bounded purposes:

| Model | Purpose | Learning Source |
|-------|---------|-----------------|
| Complexity Classifier | Predicts case complexity tier for routing | Override data on complexity reclassifications |
| Test Yield Predictor | Estimates diagnostic value of tests | Override data on test additions/removals + outcome data |
| Override Likelihood Estimator | Flags cases where recommendation may be overridden | Historical override patterns by case profile |

### What ML Is Permitted to Adjust

ML learning is bounded. The system can improve within defined parameters but cannot expand its own authority or modify policy.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ML PERMITTED ADJUSTMENTS                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONFIDENCE CALIBRATION                           │   │
│  │                    Permitted: YES                                   │   │
│  │                                                                     │   │
│  │  ML may adjust how confident it is in its predictions based on     │   │
│  │  observed accuracy.                                                │   │
│  │                                                                     │   │
│  │  Example:                                                          │   │
│  │  If the complexity classifier predicts "Routine" with 85%          │   │
│  │  confidence for a certain profile, but underwriters reclassify     │   │
│  │  40% of such cases to "Moderate," the model learns to report       │   │
│  │  lower confidence for that profile.                                │   │
│  │                                                                     │   │
│  │  Impact: Underwriters see more accurate confidence indicators.     │   │
│  │  Risk: None—confidence scores are informational only.              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RELEVANCE RANKING                                │   │
│  │                    Permitted: YES                                   │   │
│  │                                                                     │   │
│  │  ML may adjust how recommendations are ordered or emphasised       │   │
│  │  based on predicted relevance.                                     │   │
│  │                                                                     │   │
│  │  Example:                                                          │   │
│  │  If underwriters frequently add renal function tests for           │   │
│  │  diabetic applicants on certain medications, the model learns      │   │
│  │  to surface renal tests more prominently for those profiles.       │   │
│  │                                                                     │   │
│  │  Impact: More relevant recommendations appear first.               │   │
│  │  Risk: Minimal—underwriters still see all applicable options.      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    YIELD PREDICTIONS                                │   │
│  │                    Permitted: YES                                   │   │
│  │                                                                     │   │
│  │  ML may update predicted diagnostic yield based on outcome data    │   │
│  │  and underwriter patterns.                                         │   │
│  │                                                                     │   │
│  │  Example:                                                          │   │
│  │  If a test consistently shows material findings for a certain      │   │
│  │  profile (based on outcome feedback), the model increases its      │   │
│  │  yield prediction for that test-profile combination.               │   │
│  │                                                                     │   │
│  │  Impact: Better cost-benefit guidance for test ordering.           │   │
│  │  Risk: Minimal—yield is advisory; protocols still govern.          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PATTERN FLAGGING                                 │   │
│  │                    Permitted: YES                                   │   │
│  │                                                                     │   │
│  │  ML may flag cases that match profiles with high historical        │   │
│  │  override rates, alerting underwriters to pay special attention.   │   │
│  │                                                                     │   │
│  │  Example:                                                          │   │
│  │  "Cases with this combination of factors have a 45% override       │   │
│  │  rate on test recommendations. Review carefully."                  │   │
│  │                                                                     │   │
│  │  Impact: Underwriters are alerted to potential recommendation      │   │
│  │  gaps without changing the underlying recommendation.              │   │
│  │  Risk: None—flagging is purely informational.                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SIMILAR CASE SURFACING                           │   │
│  │                    Permitted: YES                                   │   │
│  │                                                                     │   │
│  │  ML may identify and surface historical cases with similar         │   │
│  │  profiles and their outcomes.                                      │   │
│  │                                                                     │   │
│  │  Example:                                                          │   │
│  │  "12 similar cases processed in past 6 months. 8 accepted with     │   │
│  │  standard terms, 3 with cardiac exclusion, 1 declined."            │   │
│  │                                                                     │   │
│  │  Impact: Underwriters have historical context for consistency.     │   │
│  │  Risk: Minimal—presented as reference, not directive.              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What ML Is NOT Permitted to Adjust

The following are explicitly outside ML authority. These boundaries are enforced architecturally—the system is designed so that ML cannot modify these elements even if training data suggested such changes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ML PROHIBITED ADJUSTMENTS                                │
│                    ARCHITECTURAL ENFORCEMENT                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UNDERWRITING RULES                               │   │
│  │                    ML Authority: NONE                               │   │
│  │                                                                     │   │
│  │  Business rules that define underwriting policy are stored in      │   │
│  │  configuration that ML cannot write to. Rules can only be          │   │
│  │  modified through governed configuration management.               │   │
│  │                                                                     │   │
│  │  Examples of protected rules:                                      │   │
│  │  • "Applicants with MI within 24 months require Medical Director   │   │
│  │    review" — ML cannot shorten or lengthen this period             │   │
│  │  • "Sum assured above ₹1Cr requires senior underwriter" — ML       │   │
│  │    cannot change this threshold                                    │   │
│  │  • "Disclosed HIV requires specific protocol" — ML cannot          │   │
│  │    modify the protocol reference                                   │   │
│  │                                                                     │   │
│  │  Even if 100% of underwriters consistently override a rule,        │   │
│  │  ML surfaces this as insight for human review—it does not          │   │
│  │  change the rule.                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MANDATORY TEST REQUIREMENTS                      │   │
│  │                    ML Authority: NONE                               │   │
│  │                                                                     │   │
│  │  Tests classified as "Mandatory" are required by regulation or     │   │
│  │  policy. ML cannot reclassify mandatory tests or suggest their     │   │
│  │  omission.                                                         │   │
│  │                                                                     │   │
│  │  Examples:                                                         │   │
│  │  • HIV test for sum assured above regulatory threshold             │   │
│  │  • Medical examination for specified coverage amounts              │   │
│  │  • Specific tests mandated by IRDAI guidelines                     │   │
│  │                                                                     │   │
│  │  ML may learn that these tests have low yield for certain          │   │
│  │  profiles—this insight is surfaced for regulatory affairs          │   │
│  │  review, not acted upon automatically.                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AUTHORITY LIMITS                                 │   │
│  │                    ML Authority: NONE                               │   │
│  │                                                                     │   │
│  │  Which underwriters can approve which decisions is organisational  │   │
│  │  policy. ML cannot expand or restrict authority.                   │   │
│  │                                                                     │   │
│  │  Examples:                                                         │   │
│  │  • Junior underwriter authority ceiling                            │   │
│  │  • Medical Director escalation triggers                            │   │
│  │  • Approval limits by sum assured                                  │   │
│  │                                                                     │   │
│  │  If ML identifies that junior underwriters successfully handle     │   │
│  │  cases above their authority limit when escalated, this is         │   │
│  │  reported for management review—not automatically adjusted.        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RISK APPETITE PARAMETERS                         │   │
│  │                    ML Authority: NONE                               │   │
│  │                                                                     │   │
│  │  Fundamental risk acceptance criteria are board-level decisions.   │   │
│  │  ML cannot modify what risks the company is willing to accept.     │   │
│  │                                                                     │   │
│  │  Examples:                                                         │   │
│  │  • Conditions that result in automatic decline                     │   │
│  │  • Maximum coverage amounts by age band                            │   │
│  │  • Excluded occupations or activities                              │   │
│  │                                                                     │   │
│  │  ML may identify that certain declined profiles rarely result      │   │
│  │  in claims when accepted by competitors—this is strategic          │   │
│  │  intelligence for product teams, not operational adjustment.       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    COMPLIANCE REQUIREMENTS                          │   │
│  │                    ML Authority: NONE                               │   │
│  │                                                                     │   │
│  │  Regulatory compliance requirements are non-negotiable. ML         │   │
│  │  cannot learn to circumvent or relax compliance controls.          │   │
│  │                                                                     │   │
│  │  Examples:                                                         │   │
│  │  • IRDAI disclosure requirements                                   │   │
│  │  • Documentation retention mandates                                │   │
│  │  • Audit trail completeness requirements                           │   │
│  │  • Anti-discrimination provisions                                  │   │
│  │                                                                     │   │
│  │  Compliance requirements are not inputs to ML training and are     │   │
│  │  enforced independently of ML recommendations.                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DECISION EXECUTION                               │   │
│  │                    ML Authority: NONE                               │   │
│  │                                                                     │   │
│  │  ML cannot execute any underwriting decision. There are no         │   │
│  │  system pathways by which ML output triggers policy actions.       │   │
│  │                                                                     │   │
│  │  ML produces:                                                      │   │
│  │  • Predictions (advisory)                                          │   │
│  │  • Confidence scores (informational)                               │   │
│  │  • Pattern flags (alerting)                                        │   │
│  │  • Similar case references (contextual)                            │   │
│  │                                                                     │   │
│  │  ML does not produce:                                              │   │
│  │  • Accept/decline decisions                                        │   │
│  │  • Test orders                                                     │   │
│  │  • Policy modifications                                            │   │
│  │  • Applicant communications                                        │   │
│  │                                                                     │   │
│  │  This is architectural—no amount of training or learning can       │   │
│  │  create decision execution capability.                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Enforcement

The prohibition boundaries above are not policy statements—they are architectural constraints enforced by system design:

| Boundary | Enforcement Mechanism |
|----------|----------------------|
| Rules immutable to ML | Rules stored in separate configuration; ML has read-only access |
| Mandatory tests protected | Mandatory flag set in protocol configuration; ML cannot modify |
| Authority limits preserved | Authority defined in user management; ML has no write access |
| Risk appetite unchanged | Risk parameters in board-approved configuration; versioned separately |
| Compliance enforced | Compliance checks run independently of ML recommendations |
| No decision execution | No API endpoints exist for ML to trigger policy actions |

---

## Model Governance Framework

### Model Lifecycle

Every ML model follows a governed lifecycle from development through retirement:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODEL LIFECYCLE                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. DEVELOPMENT                                                      │   │
│  │                                                                     │   │
│  │ • Model purpose defined and approved                               │   │
│  │ • Training data requirements specified                             │   │
│  │ • Boundary constraints documented                                  │   │
│  │ • Success criteria established                                     │   │
│  │ • Bias and fairness requirements defined                           │   │
│  │                                                                     │   │
│  │ Approval Required: ML Governance Committee                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. TRAINING                                                         │   │
│  │                                                                     │   │
│  │ • Training data prepared and validated                             │   │
│  │ • Model trained per approved methodology                           │   │
│  │ • Training process logged                                          │   │
│  │ • Initial performance metrics calculated                           │   │
│  │                                                                     │   │
│  │ Documentation: Training data provenance, parameters, metrics       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. VALIDATION                                                       │   │
│  │                                                                     │   │
│  │ • Performance tested on held-out data                              │   │
│  │ • Bias and fairness testing completed                              │   │
│  │ • Edge case behaviour evaluated                                    │   │
│  │ • Comparison to baseline/previous version                          │   │
│  │ • Boundary constraint verification                                 │   │
│  │                                                                     │   │
│  │ Approval Required: Model Validation Team + Chief Underwriter       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. DEPLOYMENT                                                       │   │
│  │                                                                     │   │
│  │ • Model registered with version identifier                         │   │
│  │ • Deployment to staging environment                                │   │
│  │ • Integration testing with production systems                      │   │
│  │ • Gradual rollout or shadow mode testing                           │   │
│  │ • Production deployment with monitoring                            │   │
│  │                                                                     │   │
│  │ Approval Required: Technical Operations + Risk Officer             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. MONITORING                                                       │   │
│  │                                                                     │   │
│  │ • Continuous performance tracking                                  │   │
│  │ • Drift detection (input distribution, prediction distribution)    │   │
│  │ • Override rate monitoring                                         │   │
│  │ • Feedback collection                                              │   │
│  │ • Periodic bias audits                                             │   │
│  │                                                                     │   │
│  │ Reporting: Monthly model performance reports to governance         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. RETRAINING OR RETIREMENT                                         │   │
│  │                                                                     │   │
│  │ Triggers for retraining:                                           │   │
│  │ • Performance degradation below threshold                          │   │
│  │ • Significant drift detected                                       │   │
│  │ • New override patterns warrant incorporation                      │   │
│  │ • Scheduled periodic refresh                                       │   │
│  │                                                                     │   │
│  │ Triggers for retirement:                                           │   │
│  │ • Model no longer serves business need                             │   │
│  │ • Replaced by superior approach                                    │   │
│  │ • Fundamental issues identified                                    │   │
│  │                                                                     │   │
│  │ Approval Required: ML Governance Committee                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model Versioning

Every model version is uniquely identified and its complete lineage is preserved:

| Version Element | Content |
|-----------------|---------|
| Model Identifier | Unique name (e.g., "complexity-classifier") |
| Version Number | Semantic versioning (e.g., "2.3.1") |
| Training Date | When this version was trained |
| Training Data Snapshot | Identifier for exact training data used |
| Training Parameters | Hyperparameters and configuration |
| Performance Metrics | Validation metrics at training time |
| Deployment Date | When deployed to production |
| Status | Active, Shadow, Deprecated, Retired |
| Predecessor | Previous version this replaced |
| Change Summary | What changed from previous version |

### Model Registry

All models are registered in a central registry that provides:

| Capability | Purpose |
|------------|---------|
| Version History | Complete history of all model versions |
| Audit Trail | Who approved what, when |
| Performance Tracking | Metrics over time for each version |
| Rollback Capability | Ability to revert to previous versions |
| Lineage Tracking | Data and model dependencies |
| Documentation Links | Associated documentation for each version |

### Governance Committee Structure

ML governance involves multiple stakeholders with defined responsibilities:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ML GOVERNANCE STRUCTURE                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ML GOVERNANCE COMMITTEE                          │   │
│  │                                                                     │   │
│  │  Composition:                                                      │   │
│  │  • Chief Underwriter (Chair)                                       │   │
│  │  • Chief Risk Officer                                              │   │
│  │  • Head of Compliance                                              │   │
│  │  • Head of Technology                                              │   │
│  │  • Chief Actuary                                                   │   │
│  │  • Medical Director                                                │   │
│  │                                                                     │   │
│  │  Responsibilities:                                                 │   │
│  │  • Approve new model development                                   │   │
│  │  • Approve model deployment                                        │   │
│  │  • Review model performance reports                                │   │
│  │  • Approve retraining decisions                                    │   │
│  │  • Approve retirement decisions                                    │   │
│  │  • Resolve escalated issues                                        │   │
│  │                                                                     │   │
│  │  Meeting Frequency: Monthly, with ad-hoc as needed                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    WORKING GROUPS                                   │   │
│  │                                                                     │   │
│  │  Model Validation Team                                             │   │
│  │  • Technical validation of model performance                       │   │
│  │  • Bias and fairness testing                                       │   │
│  │  • Edge case analysis                                              │   │
│  │                                                                     │   │
│  │  Underwriting Review Panel                                         │   │
│  │  • Clinical validity of learned patterns                           │   │
│  │  • Protocol alignment assessment                                   │   │
│  │  • Practical usability evaluation                                  │   │
│  │                                                                     │   │
│  │  Technical Operations Team                                         │   │
│  │  • Deployment readiness                                            │   │
│  │  • Integration testing                                             │   │
│  │  • Production monitoring                                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decision Rights Matrix

| Decision | Authority | Escalation |
|----------|-----------|------------|
| New model concept | ML Governance Committee | Board Risk Committee |
| Training data selection | Model Validation Team | ML Governance Committee |
| Training methodology | Model Validation Team | ML Governance Committee |
| Validation criteria | Chief Underwriter + Chief Risk Officer | ML Governance Committee |
| Deployment approval | Technical Operations + Risk Officer | ML Governance Committee |
| Emergency rollback | Technical Operations (immediate) | ML Governance Committee (review) |
| Retraining trigger | Model Validation Team | ML Governance Committee |
| Retirement decision | ML Governance Committee | Board Risk Committee |

---

## Regulatory Compliance Framework

### Why This Approach Is Regulator-Safe

The learning framework is designed to satisfy regulatory expectations for explainability, human oversight, and auditability. This section explains how the design addresses specific regulatory concerns.

### Explainability Requirements

Regulators expect that decisions affecting policyholders can be explained. The system satisfies this requirement at multiple levels:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXPLAINABILITY FRAMEWORK                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DECISION LEVEL                                   │   │
│  │                                                                     │   │
│  │  Every underwriting decision is made by a human underwriter.       │   │
│  │  The explanation for any decision is the underwriter's judgment    │   │
│  │  applied to the case facts, supported by documented reasoning.     │   │
│  │                                                                     │   │
│  │  ML contributed: Advisory information                              │   │
│  │  ML decided: Nothing                                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RECOMMENDATION LEVEL                             │   │
│  │                                                                     │   │
│  │  Every system recommendation includes explicit reasoning:          │   │
│  │  • Which rules contributed and why they fired                      │   │
│  │  • Which ML predictions contributed and their confidence           │   │
│  │  • Which case factors influenced the recommendation                │   │
│  │                                                                     │   │
│  │  No "black box" recommendations. Everything is traceable.          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MODEL LEVEL                                      │   │
│  │                                                                     │   │
│  │  ML models are interpretable by design:                            │   │
│  │  • Tree-based models (LightGBM) with feature importance           │   │
│  │  • Feature contributions for each prediction                       │   │
│  │  • No deep learning or opaque architectures                        │   │
│  │                                                                     │   │
│  │  For any prediction, we can show:                                  │   │
│  │  • Which features had most influence                               │   │
│  │  • Direction of influence (increases/decreases prediction)         │   │
│  │  • Comparison to baseline                                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LEARNING LEVEL                                   │   │
│  │                                                                     │   │
│  │  How the system learned can be explained:                          │   │
│  │  • Training data provenance documented                             │   │
│  │  • Override patterns that informed model updates identified        │   │
│  │  • Governance approvals recorded                                   │   │
│  │                                                                     │   │
│  │  "This model learned to flag renal tests for long-term metformin   │   │
│  │  users because 73% of underwriters added this test for such        │   │
│  │  profiles over 6 months (142 cases, 8 underwriters)."              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Human Oversight Requirements

Regulators require that humans maintain meaningful oversight of algorithmic systems. This system provides:

| Oversight Mechanism | Implementation |
|---------------------|----------------|
| Human Decision Authority | All decisions made by underwriters; ML is advisory only |
| Override Capability | Underwriters can deviate from any recommendation |
| Review Before Action | Recommendations presented for review, not executed automatically |
| Governance Approval | ML changes require human approval through governance process |
| Monitoring and Intervention | Continuous monitoring with ability to disable ML components |
| Audit and Accountability | Complete audit trail of recommendations, decisions, and overrides |

### Audit Trail Requirements

The system maintains comprehensive audit trails supporting regulatory inquiry:

| Audit Requirement | System Capability |
|-------------------|-------------------|
| Decision Reconstruction | Full case state, recommendations, and underwriter reasoning recoverable |
| Model Version Tracking | Which model version was active for any historical decision |
| Training Data Provenance | What data trained which model version |
| Governance Documentation | Approval records for all model deployments |
| Override Records | Complete history of underwriter deviations |
| Performance History | Model accuracy metrics over time |

### Fairness and Non-Discrimination

ML systems must not discriminate on prohibited grounds. The framework addresses this through:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FAIRNESS FRAMEWORK                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TRAINING DATA CONTROLS                           │   │
│  │                                                                     │   │
│  │  • Protected attributes excluded from training features            │   │
│  │  • Proxy variable analysis performed                               │   │
│  │  • Training data reviewed for historical bias                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MODEL TESTING                                    │   │
│  │                                                                     │   │
│  │  • Fairness metrics calculated across demographic groups           │   │
│  │  • Disparate impact analysis performed                             │   │
│  │  • Results reviewed before deployment approval                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ONGOING MONITORING                               │   │
│  │                                                                     │   │
│  │  • Recommendation patterns monitored by demographic segments       │   │
│  │  • Anomalies flagged for review                                    │   │
│  │  • Periodic fairness audits conducted                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HUMAN OVERSIGHT AS SAFEGUARD                     │   │
│  │                                                                     │   │
│  │  Even if ML produced biased recommendations, human underwriters    │   │
│  │  make all decisions. Trained underwriters applying professional    │   │
│  │  judgment provide an additional layer of protection against        │   │
│  │  discriminatory outcomes.                                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Regulatory Inquiry Readiness

The system is designed to respond to regulatory inquiries efficiently:

| Inquiry Type | System Response Capability |
|--------------|---------------------------|
| "Why was this applicant treated this way?" | Full decision trail with underwriter reasoning |
| "What role did algorithms play?" | Clear separation of ML advisory vs human decision |
| "How does the algorithm work?" | Model documentation, feature importance, training data description |
| "Is the algorithm fair?" | Fairness testing results, monitoring reports |
| "Who approved this algorithm?" | Governance committee records, approval documentation |
| "Can you turn off the algorithm?" | Yes, ML components can be disabled; system reverts to rule-only mode |

### IRDAI Alignment

The framework aligns with IRDAI expectations for technology use in insurance:

| IRDAI Expectation | Framework Response |
|-------------------|-------------------|
| Transparency in underwriting | Complete audit trail; explainable recommendations |
| Fair treatment of policyholders | Fairness testing; human oversight; non-discrimination controls |
| Grievance redressal | Decision reconstruction capability; clear accountability |
| Data protection | Training data governance; access controls; retention policies |
| Operational resilience | Ability to operate without ML; rollback capability |

---

## Operational Controls

### Emergency Procedures

The framework includes procedures for addressing ML-related issues:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMERGENCY PROCEDURES                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MODEL DISABLE                                    │   │
│  │                                                                     │   │
│  │  Trigger: Model producing clearly incorrect recommendations        │   │
│  │  Authority: Technical Operations (immediate)                       │   │
│  │  Action: Disable specific model; system continues with rules only  │   │
│  │  Follow-up: ML Governance Committee review within 24 hours         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    VERSION ROLLBACK                                 │   │
│  │                                                                     │   │
│  │  Trigger: New model version performing worse than predecessor      │   │
│  │  Authority: Technical Operations + Risk Officer                    │   │
│  │  Action: Revert to previous model version                          │   │
│  │  Follow-up: Investigation and ML Governance Committee report       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BIAS CONCERN                                     │   │
│  │                                                                     │   │
│  │  Trigger: Potential discriminatory pattern identified              │   │
│  │  Authority: Chief Risk Officer + Head of Compliance                │   │
│  │  Action: Immediate investigation; model suspension if confirmed    │   │
│  │  Follow-up: Root cause analysis; remediation plan; board report    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    REGULATORY INQUIRY                               │   │
│  │                                                                     │   │
│  │  Trigger: Regulator requests information about ML use              │   │
│  │  Authority: Head of Compliance                                     │   │
│  │  Action: Prepare documentation package from governance records     │   │
│  │  Support: ML Governance Committee technical assistance             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Monitoring and Reporting

Ongoing monitoring ensures the framework operates as intended:

| Monitoring Area | Frequency | Audience |
|-----------------|-----------|----------|
| Model Performance Metrics | Daily automated, weekly review | Technical Operations |
| Override Rate Trends | Weekly | Underwriting Management |
| Fairness Metrics | Monthly | Risk and Compliance |
| Governance Compliance | Monthly | ML Governance Committee |
| Regulatory Alignment | Quarterly | Board Risk Committee |

### Reporting Cadence

| Report | Frequency | Owner | Audience |
|--------|-----------|-------|----------|
| Model Performance Dashboard | Continuous | Technical Operations | All stakeholders |
| Override Pattern Analysis | Weekly | Underwriting Analytics | Underwriting Management |
| ML Governance Summary | Monthly | ML Governance Committee | Executive Leadership |
| Fairness Audit Report | Quarterly | Risk and Compliance | Board Risk Committee |
| Annual ML Review | Annually | ML Governance Committee | Board |

---

## Summary: Key Safeguards

### For Chief Underwriters

1. **Underwriters remain in control.** Every decision is made by a qualified underwriter. ML provides advice; humans decide.

2. **Expert judgment is preserved.** The system learns from how your best underwriters work, scaling their expertise across the organisation.

3. **Overrides are encouraged.** When professional judgment differs from system recommendations, the system captures that expertise rather than penalising deviation.

4. **Protocols are protected.** ML cannot change underwriting guidelines or risk appetite. Policy changes follow existing governance processes.

### For Risk Officers

1. **Risk appetite is board-controlled.** ML cannot modify what risks the company accepts. Risk parameters are governed separately.

2. **Audit trails are complete.** Every recommendation, decision, and override is recorded. Decision reconstruction is always possible.

3. **Models are governed.** No model deploys without validation, approval, and monitoring. Emergency procedures exist for issues.

4. **Human oversight is architectural.** The system is designed so that ML cannot execute decisions—this is not policy, it is system structure.

### For Compliance Leadership

1. **Explainability is built in.** Every recommendation can be explained. Every decision can be traced. No black boxes.

2. **Fairness is tested.** Models undergo bias testing before deployment and ongoing monitoring after.

3. **Regulatory inquiry ready.** Documentation supports rapid response to regulatory questions about ML use.

4. **Compliance requirements are immutable.** ML cannot learn to circumvent regulatory requirements. Compliance controls operate independently.

---

## Appendix: Governance Checklist

### Before Model Development

- [ ] Business case documented and approved
- [ ] Model purpose clearly defined
- [ ] Boundary constraints specified
- [ ] Training data requirements identified
- [ ] Fairness criteria established
- [ ] Success metrics defined
- [ ] ML Governance Committee approval obtained

### Before Model Deployment

- [ ] Training completed per approved methodology
- [ ] Validation testing passed
- [ ] Fairness testing completed and reviewed
- [ ] Performance meets established criteria
- [ ] Documentation complete
- [ ] Integration testing passed
- [ ] Chief Underwriter approval obtained
- [ ] Risk Officer approval obtained
- [ ] Deployment plan approved

### Ongoing Operations

- [ ] Daily performance monitoring active
- [ ] Weekly override analysis reviewed
- [ ] Monthly governance report submitted
- [ ] Quarterly fairness audit completed
- [ ] Annual comprehensive review conducted
- [ ] Emergency procedures tested annually
- [ ] Governance committee meetings held per schedule

---

## Document Control

| Version | Date | Author | Approved By |
|---------|------|--------|-------------|
| 1.0 | [Date] | [Author] | ML Governance Committee |

This document is subject to annual review or earlier if significant changes to the framework are proposed.
