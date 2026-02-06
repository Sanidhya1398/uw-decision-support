# Machine Learning Scope and Boundaries

## Document Purpose

This document defines the scope, boundaries, and governance of machine learning within the underwriting decision support system. It is written for Chief Underwriters, Risk Officers, and senior leadership who need to understand exactly what ML does, what it influences, and what it cannot do.

The fundamental principle is simple: **ML provides advice; humans decide**. This document explains how that principle is implemented in practice.

---

## Executive Summary

### ML in One Paragraph

The system uses machine learning to identify patterns in historical underwriting data and surface those patterns as recommendations to underwriters. ML predicts which cases are likely to be complex, which tests are likely to yield useful findings, and which recommendations underwriters are likely to override. These predictions help underwriters work more efficiently by focusing attention where it matters most. ML does not make decisions, does not modify policy, and cannot act without human approval.

### Key Boundaries

| ML Does | ML Does Not |
|---------|-------------|
| Predict case complexity | Assign cases to underwriters |
| Estimate test diagnostic yield | Order tests |
| Flag cases likely to need override | Override recommendations automatically |
| Learn from underwriter behaviour | Change underwriting rules |
| Surface patterns for review | Modify risk appetite |
| Provide confidence scores | Make accept/decline decisions |

---

## ML Model Inventory

### Active Models

The system employs three machine learning models, each with a specific, bounded purpose:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ML MODEL INVENTORY                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  MODEL 1: COMPLEXITY CLASSIFIER                                    │   │
│  │  ══════════════════════════════                                    │   │
│  │                                                                     │   │
│  │  Purpose:                                                          │   │
│  │  Predicts the complexity tier (Routine, Moderate, Complex) for     │   │
│  │  incoming cases to inform routing decisions.                       │   │
│  │                                                                     │   │
│  │  Business Value:                                                   │   │
│  │  Ensures complex cases reach experienced underwriters quickly      │   │
│  │  while routine cases flow efficiently to appropriate staff.        │   │
│  │                                                                     │   │
│  │  Algorithm: Gradient Boosted Trees (LightGBM)                      │   │
│  │  Training Data: Historical cases with final complexity assessment  │   │
│  │  Retraining: Quarterly or when performance degrades                │   │
│  │                                                                     │   │
│  │  Outputs:                                                          │   │
│  │  • Predicted tier: Routine / Moderate / Complex                    │   │
│  │  • Confidence score: 0.0 - 1.0                                     │   │
│  │  • Top contributing factors with weights                           │   │
│  │                                                                     │   │
│  │  What It Cannot Do:                                                │   │
│  │  • Cannot assign cases to specific underwriters                    │   │
│  │  • Cannot prevent any underwriter from viewing any case            │   │
│  │  • Cannot determine underwriter authority limits                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  MODEL 2: TEST YIELD PREDICTOR                                     │   │
│  │  ═════════════════════════════                                     │   │
│  │                                                                     │   │
│  │  Purpose:                                                          │   │
│  │  Estimates the likelihood that a recommended test will produce     │   │
│  │  material findings for a specific applicant profile.               │   │
│  │                                                                     │   │
│  │  Business Value:                                                   │   │
│  │  Helps underwriters distinguish between high-value tests and       │   │
│  │  potentially low-yield defensive testing, supporting cost-         │   │
│  │  effective test ordering without compromising risk assessment.     │   │
│  │                                                                     │   │
│  │  Algorithm: Gradient Boosted Trees (LightGBM)                      │   │
│  │  Training Data: Historical test orders with outcome data           │   │
│  │  Retraining: Quarterly or when outcome data accumulates            │   │
│  │                                                                     │   │
│  │  Outputs:                                                          │   │
│  │  • Yield probability: 0.0 - 1.0 per test                          │   │
│  │  • Yield category: High / Moderate / Low                          │   │
│  │  • Contributing factors for prediction                            │   │
│  │                                                                     │   │
│  │  What It Cannot Do:                                                │   │
│  │  • Cannot order tests                                              │   │
│  │  • Cannot remove mandatory tests from recommendations              │   │
│  │  • Cannot override regulatory test requirements                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  MODEL 3: OVERRIDE LIKELIHOOD ESTIMATOR                            │   │
│  │  ══════════════════════════════════════                            │   │
│  │                                                                     │   │
│  │  Purpose:                                                          │   │
│  │  Identifies cases where system recommendations are likely to be    │   │
│  │  overridden by underwriters, flagging potential recommendation     │   │
│  │  gaps.                                                             │   │
│  │                                                                     │   │
│  │  Business Value:                                                   │   │
│  │  Alerts underwriters to pay closer attention when historical       │   │
│  │  patterns suggest the standard recommendation may not fit the      │   │
│  │  case. Surfaces systematic gaps for protocol improvement.          │   │
│  │                                                                     │   │
│  │  Algorithm: Gradient Boosted Trees (LightGBM)                      │   │
│  │  Training Data: Historical recommendations and override records    │   │
│  │  Retraining: Quarterly or when override patterns shift             │   │
│  │                                                                     │   │
│  │  Outputs:                                                          │   │
│  │  • Override probability: 0.0 - 1.0                                │   │
│  │  • Override type prediction: test / tier / decision               │   │
│  │  • Factors associated with override likelihood                    │   │
│  │                                                                     │   │
│  │  What It Cannot Do:                                                │   │
│  │  • Cannot modify recommendations based on prediction               │   │
│  │  • Cannot pre-emptively change outputs to avoid overrides          │   │
│  │  • Cannot influence the recommendation it is predicting about      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model Architecture Summary

| Model | Input Features | Output | Interpretability |
|-------|---------------|--------|------------------|
| Complexity Classifier | ~40 features (demographics, conditions, sum assured, medications, history) | Tier + confidence + factors | Feature importance, SHAP values |
| Test Yield Predictor | ~30 features per test (profile + test type + condition interactions) | Yield probability + category | Feature importance per prediction |
| Override Likelihood | ~50 features (case profile + recommendation details) | Override probability + type | Factor contribution scores |

### Models Explicitly Not Included

The following model types are **not** part of the system:

| Model Type | Why Excluded |
|------------|--------------|
| Automated decision model | Decisions are made by humans, not algorithms |
| Pricing/rating model | Pricing is out of scope for this system |
| Fraud detection model | Separate concern, different system |
| Mortality/morbidity model | Actuarial function, not underwriting decision support |
| Natural language generation model | NLG uses templates, not generative ML |
| Deep learning / neural networks | Interpretability requirements favour tree-based models |

---

## What ML Influences

### Influence vs. Decision

ML influences underwriter attention and provides supporting information. It does not make decisions or take actions. The distinction is fundamental:

| Influence (ML Does This) | Decision (Humans Do This) |
|--------------------------|---------------------------|
| Suggests complexity tier | Confirms or changes tier |
| Estimates test yield | Orders or declines tests |
| Flags likely override | Proceeds with or modifies recommendation |
| Ranks contributing factors | Weighs factors in judgment |
| Surfaces similar cases | Evaluates relevance of comparisons |

### Specific Influence Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ML INFLUENCE IN CASE WORKFLOW                            │
│                                                                             │
│  CASE RECEIVED                                                             │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  COMPLEXITY CLASSIFICATION                                          │   │
│  │                                                                     │   │
│  │  ML Influence:                                                     │   │
│  │  • Predicts tier (Routine/Moderate/Complex)                        │   │
│  │  • Provides confidence score                                       │   │
│  │  • Lists contributing factors                                      │   │
│  │                                                                     │   │
│  │  Human Decision:                                                   │   │
│  │  • Accepts or overrides predicted tier                             │   │
│  │  • Routes case based on final classification                       │   │
│  │                                                                     │   │
│  │  ML Influence Level: MODERATE                                      │   │
│  │  (Informs routing but underwriter can always reclassify)           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RISK ASSESSMENT                                                    │   │
│  │                                                                     │   │
│  │  ML Influence:                                                     │   │
│  │  • Ranks risk factors by predicted importance                      │   │
│  │  • Surfaces similar historical cases                               │   │
│  │  • Flags unusual factor combinations                               │   │
│  │                                                                     │   │
│  │  Human Decision:                                                   │   │
│  │  • Evaluates all risk factors                                      │   │
│  │  • Determines which factors are material                           │   │
│  │  • Forms risk assessment judgment                                  │   │
│  │                                                                     │   │
│  │  ML Influence Level: LOW                                           │   │
│  │  (Supporting information only; assessment is rule + human driven)  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TEST RECOMMENDATION                                                │   │
│  │                                                                     │   │
│  │  ML Influence:                                                     │   │
│  │  • Predicts yield for each recommended test                        │   │
│  │  • Ranks tests by expected diagnostic value                        │   │
│  │  • Flags tests with historically low yield for profile             │   │
│  │                                                                     │   │
│  │  Human Decision:                                                   │   │
│  │  • Reviews test panel                                              │   │
│  │  • Adds, removes, or substitutes tests                             │   │
│  │  • Approves final test order                                       │   │
│  │                                                                     │   │
│  │  ML Influence Level: MODERATE                                      │   │
│  │  (Yield predictions inform cost-benefit but don't override         │   │
│  │   protocol requirements or underwriter judgment)                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DECISION OPTIONS                                                   │   │
│  │                                                                     │   │
│  │  ML Influence:                                                     │   │
│  │  • Predicts likelihood of override for each option                 │   │
│  │  • Flags if similar cases frequently deviated                      │   │
│  │  • Surfaces historical decision distribution                       │   │
│  │                                                                     │   │
│  │  Human Decision:                                                   │   │
│  │  • Evaluates all available options                                 │   │
│  │  • Selects appropriate decision pathway                            │   │
│  │  • Documents rationale                                             │   │
│  │                                                                     │   │
│  │  ML Influence Level: LOW                                           │   │
│  │  (Historical context only; decision options from rules, not ML)    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ▼                                                                     │
│  UNDERWRITER MAKES DECISION (No ML involvement in final decision)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Influence Level Definitions

| Level | Definition | Examples |
|-------|------------|----------|
| **None** | ML has no role | Final accept/decline decision, rule configuration, authority limits |
| **Low** | ML provides background context | Similar case references, historical patterns, factor ranking |
| **Moderate** | ML provides actionable suggestions | Complexity prediction, yield estimates, override flags |
| **High** | ML recommendation is primary input | Not applicable—no high-influence ML in this system |

---

## What ML Is NOT Allowed To Do

### Absolute Prohibitions

The following are **architectural constraints**, not policy guidelines. The system is designed so that ML cannot perform these actions even if the models suggested them.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ML PROHIBITIONS (ARCHITECTURAL)                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PROHIBITION 1: NO UNDERWRITING DECISIONS                          │   │
│  │  ════════════════════════════════════════                          │   │
│  │                                                                     │   │
│  │  ML cannot:                                                        │   │
│  │  • Accept any application                                          │   │
│  │  • Decline any application                                         │   │
│  │  • Postpone any application                                        │   │
│  │  • Approve modified terms                                          │   │
│  │  • Apply exclusions or limitations                                 │   │
│  │                                                                     │   │
│  │  Why: Underwriting decisions require professional judgment that    │   │
│  │  considers context, nuance, and factors that may not be captured   │   │
│  │  in training data. Regulators and policyholders expect human       │   │
│  │  accountability for coverage decisions.                            │   │
│  │                                                                     │   │
│  │  Enforcement: No API endpoints exist for ML to execute decisions.  │   │
│  │  Decision recording requires authenticated underwriter action.     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PROHIBITION 2: NO RULE MODIFICATION                               │   │
│  │  ═══════════════════════════════════                               │   │
│  │                                                                     │   │
│  │  ML cannot:                                                        │   │
│  │  • Change underwriting guidelines                                  │   │
│  │  • Modify business rules                                           │   │
│  │  • Adjust protocol thresholds                                      │   │
│  │  • Add or remove test requirements                                 │   │
│  │  • Alter escalation triggers                                       │   │
│  │                                                                     │   │
│  │  Why: Underwriting rules represent deliberate policy decisions     │   │
│  │  made by qualified professionals. Changes require governance       │   │
│  │  review, not algorithmic adjustment.                               │   │
│  │                                                                     │   │
│  │  Enforcement: Rules stored in configuration with read-only ML      │   │
│  │  access. Configuration changes require authenticated admin action  │   │
│  │  through separate governance workflow.                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PROHIBITION 3: NO RISK APPETITE CHANGES                           │   │
│  │  ═══════════════════════════════════════                           │   │
│  │                                                                     │   │
│  │  ML cannot:                                                        │   │
│  │  • Change what conditions are declinable                           │   │
│  │  • Modify acceptance criteria                                      │   │
│  │  • Adjust coverage limits                                          │   │
│  │  • Alter product eligibility rules                                 │   │
│  │  • Expand or restrict risk classes                                 │   │
│  │                                                                     │   │
│  │  Why: Risk appetite is a board-level decision reflecting company   │   │
│  │  strategy, capital position, and regulatory commitments. It is     │   │
│  │  not subject to algorithmic optimization.                          │   │
│  │                                                                     │   │
│  │  Enforcement: Risk appetite parameters stored separately from      │   │
│  │  ML-accessible data. Changes require board-level approval.         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PROHIBITION 4: NO AUTHORITY CHANGES                               │   │
│  │  ═══════════════════════════════════                               │   │
│  │                                                                     │   │
│  │  ML cannot:                                                        │   │
│  │  • Modify underwriter authority limits                             │   │
│  │  • Change escalation requirements                                  │   │
│  │  • Adjust approval hierarchies                                     │   │
│  │  • Grant or revoke permissions                                     │   │
│  │                                                                     │   │
│  │  Why: Authority structures reflect organisational governance,      │   │
│  │  regulatory requirements, and professional qualifications.         │   │
│  │                                                                     │   │
│  │  Enforcement: Authority defined in identity and access management  │   │
│  │  system, not in ML-accessible configuration.                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PROHIBITION 5: NO COMPLIANCE OVERRIDE                             │   │
│  │  ════════════════════════════════════                              │   │
│  │                                                                     │   │
│  │  ML cannot:                                                        │   │
│  │  • Bypass regulatory requirements                                  │   │
│  │  • Skip mandatory disclosures                                      │   │
│  │  • Circumvent audit requirements                                   │   │
│  │  • Modify compliance text                                          │   │
│  │  • Learn to avoid compliance controls                              │   │
│  │                                                                     │   │
│  │  Why: Compliance requirements are non-negotiable legal and         │   │
│  │  regulatory obligations. They are not optimization targets.        │   │
│  │                                                                     │   │
│  │  Enforcement: Compliance controls operate independently of ML.     │   │
│  │  ML outputs are not inputs to compliance validation.               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PROHIBITION 6: NO SELF-MODIFICATION                               │   │
│  │  ═══════════════════════════════════                               │   │
│  │                                                                     │   │
│  │  ML cannot:                                                        │   │
│  │  • Retrain itself automatically                                    │   │
│  │  • Adjust its own parameters                                       │   │
│  │  • Modify its own feature inputs                                   │   │
│  │  • Change its output interpretation                                │   │
│  │  • Expand its own scope                                            │   │
│  │                                                                     │   │
│  │  Why: Model changes must be validated, tested, and approved        │   │
│  │  through governance processes. Self-modifying systems are          │   │
│  │  unpredictable and unauditable.                                    │   │
│  │                                                                     │   │
│  │  Enforcement: Model serving is separate from model training.       │   │
│  │  Production models are immutable. Retraining requires explicit     │   │
│  │  governance approval and deployment process.                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Summary Table: ML Boundaries

| Action | Permitted | Enforcement |
|--------|-----------|-------------|
| Predict complexity | ✓ Yes | — |
| Assign cases | ✗ No | No assignment API for ML |
| Estimate test yield | ✓ Yes | — |
| Order tests | ✗ No | Orders require underwriter action |
| Flag likely overrides | ✓ Yes | — |
| Modify recommendations | ✗ No | Recommendations from rules, not ML |
| Surface similar cases | ✓ Yes | — |
| Make accept/decline | ✗ No | No decision API for ML |
| Change rules | ✗ No | Rules in read-only store for ML |
| Adjust risk appetite | ✗ No | Appetite in separate governance |
| Modify authority | ✗ No | Authority in IAM system |
| Bypass compliance | ✗ No | Compliance independent of ML |
| Retrain automatically | ✗ No | Training requires approval |

---

## Learning from Underwriter Overrides

### The Learning Principle

When experienced underwriters consistently deviate from system recommendations, that deviation often represents valuable professional judgment that the system should learn from. The override learning mechanism captures this expertise systematically.

### How Override Learning Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OVERRIDE LEARNING FLOW                                   │
│                                                                             │
│  STAGE 1: CAPTURE                                                          │
│  ═══════════════                                                           │
│                                                                             │
│  When an underwriter deviates from a system recommendation:                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Recorded:                                                         │   │
│  │  • What the system recommended                                     │   │
│  │  • What the underwriter selected                                   │   │
│  │  • Complete case context at decision time                          │   │
│  │  • Underwriter's reasoning (mandatory for material overrides)      │   │
│  │  • Underwriter profile (experience, role)                          │   │
│  │  • Timestamp                                                       │   │
│  │                                                                     │   │
│  │  Example:                                                          │   │
│  │  System recommended: Standard lipid panel                          │   │
│  │  Underwriter selected: Lipid panel + Liver Function Tests          │   │
│  │  Reasoning: "Long-term metformin use (6+ years) warrants           │   │
│  │              hepatic monitoring per clinical best practice"        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                      │                                      │
│                                      ▼                                      │
│                                                                             │
│  STAGE 2: AGGREGATE                                                        │
│  ══════════════════                                                        │
│                                                                             │
│  Override data accumulates over time. Weekly batch processing:             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Analysis:                                                         │   │
│  │  • Group overrides by type (test, tier, decision)                  │   │
│  │  • Cluster by case profile                                         │   │
│  │  • Identify frequency patterns                                     │   │
│  │  • Extract reasoning themes                                        │   │
│  │                                                                     │   │
│  │  Example Finding:                                                  │   │
│  │  "For applicants on Metformin ≥1500mg for ≥5 years:               │   │
│  │   - 73% of cases had LFT added (n=142 cases)                      │   │
│  │   - Pattern consistent across 8 different underwriters            │   │
│  │   - Primary reasoning theme: hepatic monitoring"                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                      │                                      │
│                                      ▼                                      │
│                                                                             │
│  STAGE 3: VALIDATE                                                         │
│  ═════════════════                                                         │
│                                                                             │
│  Patterns are validated before influencing the system:                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Validation Checks:                                                │   │
│  │                                                                     │   │
│  │  Statistical:                                                      │   │
│  │  □ Sufficient sample size (minimum varies by pattern type)         │   │
│  │  □ Consistent across time periods                                  │   │
│  │  □ Consistent across underwriters (not single-person pattern)      │   │
│  │                                                                     │   │
│  │  Clinical:                                                         │   │
│  │  □ Medical Director review for clinical validity                   │   │
│  │  □ Reasoning aligns with clinical guidelines                       │   │
│  │  □ No contraindications identified                                 │   │
│  │                                                                     │   │
│  │  Business:                                                         │   │
│  │  □ Does not conflict with policy                                   │   │
│  │  □ Cost-benefit is reasonable                                      │   │
│  │  □ No regulatory concerns                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                      │                                      │
│                                      ▼                                      │
│                                                                             │
│  STAGE 4: SURFACE                                                          │
│  ════════════════                                                          │
│                                                                             │
│  Validated patterns are surfaced for action:                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Surfacing Options:                                                │   │
│  │                                                                     │   │
│  │  Option A: Improve ML Predictions                                  │   │
│  │  Pattern data used to retrain models, improving:                   │   │
│  │  • Complexity predictions                                          │   │
│  │  • Yield estimates                                                 │   │
│  │  • Override likelihood flags                                       │   │
│  │  → Requires: ML Governance Committee approval                      │   │
│  │                                                                     │   │
│  │  Option B: Add Advisory Suggestion                                 │   │
│  │  System begins surfacing pattern as suggestion:                    │   │
│  │  "Underwriters frequently add LFT for this profile"                │   │
│  │  → Requires: Underwriting Management approval                      │   │
│  │                                                                     │   │
│  │  Option C: Recommend Protocol Change                               │   │
│  │  Pattern presented to protocol governance for rule update:         │   │
│  │  "Consider adding LFT to metformin protocol"                       │   │
│  │  → Requires: Protocol Governance Committee decision                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                      │                                      │
│                                      ▼                                      │
│                                                                             │
│  STAGE 5: GOVERN                                                           │
│  ═══════════════                                                           │
│                                                                             │
│  Human approval required for all changes:                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  NO AUTOMATIC CHANGES                                              │   │
│  │                                                                     │   │
│  │  • ML cannot modify itself based on learned patterns               │   │
│  │  • Rules cannot be updated without governance approval             │   │
│  │  • All changes go through standard approval processes              │   │
│  │                                                                     │   │
│  │  The system LEARNS and SUGGESTS                                    │   │
│  │  Humans DECIDE and IMPLEMENT                                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Override Learning Can and Cannot Do

| Learning Can | Learning Cannot |
|--------------|-----------------|
| Identify patterns in overrides | Automatically change recommendations |
| Calculate override frequencies | Modify business rules |
| Cluster similar deviations | Add tests to protocols |
| Extract reasoning themes | Remove mandatory requirements |
| Suggest protocol reviews | Implement protocol changes |
| Improve prediction accuracy | Change what predictions mean |
| Flag likely-override cases | Pre-emptively modify those cases |

### Governance Safeguards

| Safeguard | Purpose |
|-----------|---------|
| Minimum sample sizes | Prevent learning from outliers |
| Multi-underwriter validation | Ensure pattern is not individual bias |
| Medical Director review | Validate clinical appropriateness |
| Governance approval gates | Ensure human oversight of all changes |
| Audit trail | Track what was learned and how it was applied |
| Rollback capability | Reverse changes if issues emerge |

---

## Model Governance

### Governance Structure

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
│  │  • Chief Actuary                                                   │   │
│  │  • Medical Director                                                │   │
│  │  • Head of Technology                                              │   │
│  │                                                                     │   │
│  │  Responsibilities:                                                 │   │
│  │  • Approve new model development                                   │   │
│  │  • Approve model deployment to production                          │   │
│  │  • Review model performance reports                                │   │
│  │  • Approve retraining decisions                                    │   │
│  │  • Approve model retirement                                        │   │
│  │  • Resolve escalated issues                                        │   │
│  │                                                                     │   │
│  │  Meeting Frequency: Monthly (ad-hoc as needed)                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model Lifecycle Governance

| Phase | Governance Requirements |
|-------|------------------------|
| **Concept** | Business case, purpose definition, boundary specification → Committee approval |
| **Development** | Training data review, methodology documentation, fairness criteria |
| **Validation** | Performance testing, bias testing, Chief Underwriter sign-off |
| **Deployment** | Integration testing, Risk Officer approval, deployment plan |
| **Monitoring** | Weekly performance review, monthly governance report |
| **Retraining** | Trigger documentation, Committee approval, re-validation |
| **Retirement** | Retirement justification, Committee approval, transition plan |

### Model Change Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODEL CHANGE GOVERNANCE                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRIGGER                                                           │   │
│  │  • Performance degradation detected                                │   │
│  │  • Significant override pattern identified                         │   │
│  │  • Scheduled periodic refresh                                      │   │
│  │  • Business requirement change                                     │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROPOSAL                                                          │   │
│  │  • Document change rationale                                       │   │
│  │  • Specify expected impact                                         │   │
│  │  • Identify risks                                                  │   │
│  │  • Propose validation approach                                     │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REVIEW                                                            │   │
│  │  • Technical review (Model Validation Team)                        │   │
│  │  • Business review (Chief Underwriter)                             │   │
│  │  • Risk review (Risk Officer)                                      │   │
│  │  • Compliance review (if applicable)                               │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  APPROVAL                                                          │   │
│  │  • ML Governance Committee decision                                │   │
│  │  • Conditions documented                                           │   │
│  │  • Approval recorded in governance log                             │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  IMPLEMENTATION                                                    │   │
│  │  • Model training/retraining                                       │   │
│  │  • Validation testing                                              │   │
│  │  • Staged deployment                                               │   │
│  │  • Monitoring activation                                           │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST-DEPLOYMENT                                                   │   │
│  │  • Performance monitoring                                          │   │
│  │  • Feedback collection                                             │   │
│  │  • Issue escalation if needed                                      │   │
│  │  • Report to Committee                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Version Control

Every model version is documented with:

| Element | Description |
|---------|-------------|
| Version ID | Unique identifier (e.g., "complexity-classifier-v2.3.1") |
| Training date | When model was trained |
| Training data | Identifier for exact data used |
| Parameters | Hyperparameters and configuration |
| Performance metrics | Validation metrics at training time |
| Approval record | Who approved, when, under what conditions |
| Deployment date | When deployed to production |
| Status | Active / Shadow / Deprecated / Retired |

### Emergency Procedures

| Scenario | Action | Authority |
|----------|--------|-----------|
| Model producing incorrect outputs | Disable model; revert to rules-only | Technical Operations (immediate) |
| Performance degradation detected | Flag for review; consider rollback | Technical Ops + Risk Officer |
| Bias concern identified | Suspend model; investigate | Chief Risk Officer + Compliance |
| Regulatory inquiry | Prepare documentation; support review | Head of Compliance |

---

## Key Messages for Leadership

### For the Chief Underwriter

1. **Your underwriters remain in control.** ML provides information to help them work more efficiently. It does not tell them what to decide or second-guess their professional judgment.

2. **Your expertise is being captured.** When your best underwriters override system recommendations, that expertise is systematically captured so it can benefit the entire team.

3. **Protocols are protected.** ML cannot change underwriting guidelines. If patterns suggest a protocol update is warranted, that recommendation comes to you through normal governance channels.

4. **You have veto power.** No model deploys without your sign-off. No model changes without your approval. You can disable any model at any time.

### For the Risk Officer

1. **Risk appetite is board-controlled.** ML cannot modify what risks the company accepts. Risk parameters are governed separately and are not accessible to ML processes.

2. **Models are bounded by design.** The prohibitions described in this document are architectural, not policy. The system is built so that ML cannot do prohibited things.

3. **Audit trails are complete.** Every ML prediction, every override, every model change is logged. Decision reconstruction is always possible.

4. **You can turn it off.** If any ML component causes concern, it can be disabled instantly. The system continues to function using rules alone.

### For Compliance Leadership

1. **Explainability is built in.** Every ML prediction includes the factors that drove it. There are no black boxes.

2. **Humans make all decisions.** ML is advisory only. The decision record shows an underwriter made the decision, not an algorithm.

3. **Fairness is tested.** Models undergo bias testing before deployment and ongoing monitoring after. Results are reported to the governance committee.

4. **Documentation is ready.** If regulators ask about ML use, we can provide: model inventory, governance records, performance metrics, fairness audits, and complete audit trails.

---

## Appendix: Frequently Asked Questions

**Q: Can ML decline an applicant?**
A: No. ML cannot make any underwriting decision—accept, decline, or modify. All decisions are made by qualified underwriters.

**Q: What if ML learns discriminatory patterns from historical data?**
A: Models are tested for bias before deployment and monitored continuously. Protected attributes are excluded from features. If discriminatory patterns are detected, the model is suspended for investigation.

**Q: Can underwriters ignore ML recommendations?**
A: Absolutely. ML recommendations are advisory. Underwriters can—and should—apply their professional judgment. Overrides are expected and valuable.

**Q: What happens if an ML model fails?**
A: The system continues operating using business rules alone. ML is an enhancement, not a dependency.

**Q: How often are models updated?**
A: Typically quarterly, or when performance monitoring indicates need. All updates require governance approval.

**Q: Can ML access applicant data after a decision is made?**
A: Outcome data (claims, lapses) may be used for model training with appropriate governance. This helps models learn from actual results, not just predictions.

**Q: Who is accountable for ML decisions?**
A: ML does not make decisions—underwriters do. Underwriters are accountable for their decisions. The ML Governance Committee is accountable for model fitness.

---

## Document Control

| Version | Date | Author | Approved By |
|---------|------|--------|-------------|
| 1.0 | [Date] | [Author] | ML Governance Committee |

This document is subject to annual review and update whenever ML scope changes.
