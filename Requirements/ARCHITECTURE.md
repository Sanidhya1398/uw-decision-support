# System Architecture

## Document Purpose

This document describes the technical architecture of the Health Insurance Underwriting Decision Support System. It covers system components, data flows, integration patterns, and design principles that ensure explainability, auditability, and human oversight.

---

## Architectural Principles

### Separation of Concerns

Each component has a single, well-defined responsibility. Business logic, data access, ML inference, and presentation are isolated in distinct layers. This separation enables independent scaling, testing, and modification of each component.

### API-First Design

All component communication occurs through defined API contracts. The system exposes capabilities as services rather than embedded logic. External systems integrate through the same API patterns used internally.

### Configuration Over Code

Business rules, extraction patterns, templates, and thresholds are maintained in configuration rather than application code. Changes to underwriting logic do not require code deployment.

### Explainability by Design

Every recommendation, score, and suggestion includes explicit reasoning. No component produces outputs without traceable justification. This is an architectural requirement, not an afterthought.

### Human Authority Preservation

No component executes decisions autonomously. All outputs are advisory. System architecture enforces this through API design—there are no endpoints that trigger policy actions without human confirmation.

---

## System Components

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM BOUNDARY                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    PRESENTATION LAYER                                 │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │              Underwriter Workbench (React SPA)                  │ │ │
│  │  │                                                                 │ │ │
│  │  │  • Case Queue        • Risk Display      • Decision Capture    │ │ │
│  │  │  • Case Detail       • Test Review       • Communication Edit  │ │ │
│  │  │  • Document Viewer   • Override Entry    • Audit History       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      │ HTTPS/REST                           │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       API LAYER (Node.js)                             │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │                      API Gateway                                │ │ │
│  │  │                                                                 │ │ │
│  │  │  • Authentication & Authorization    • Rate Limiting           │ │ │
│  │  │  • Request Validation                • API Versioning          │ │ │
│  │  │  • Request/Response Logging          • Error Handling          │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    BUSINESS SERVICES LAYER (NestJS)                   │ │
│  │                                                                       │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │ │
│  │  │    Case      │ │    Risk      │ │    Test      │ │   Comms      │ │ │
│  │  │   Service    │ │   Service    │ │   Service    │ │   Service    │ │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │ │
│  │                                                                       │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │ │
│  │  │   Override   │ │    Audit     │ │   Workflow   │ │  Integration │ │ │
│  │  │   Service    │ │   Service    │ │   Service    │ │   Service    │ │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│            ┌─────────────────────────┼─────────────────────────┐           │
│            │                         │                         │           │
│            ▼                         ▼                         ▼           │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │  PROCESSING      │  │  DATA LAYER          │  │  ML LAYER            │ │
│  │  ENGINES         │  │                      │  │                      │ │
│  │                  │  │  ┌────────────────┐  │  │  ┌────────────────┐  │ │
│  │  ┌────────────┐  │  │  │   Primary      │  │  │  │  ML Service    │  │ │
│  │  │   Rules    │  │  │  │   Database     │  │  │  │  (Python)      │  │ │
│  │  │   Engine   │  │  │  │   (SQLite/     │  │  │  │                │  │ │
│  │  └────────────┘  │  │  │   PostgreSQL)  │  │  │  │  • Inference   │  │ │
│  │                  │  │  └────────────────┘  │  │  │  • Training    │  │ │
│  │  ┌────────────┐  │  │                      │  │  │  • Evaluation  │  │ │
│  │  │    NLP     │  │  │  ┌────────────────┐  │  │  └────────────────┘  │ │
│  │  │  Extractor │  │  │  │  Configuration │  │  │                      │ │
│  │  └────────────┘  │  │  │  Store         │  │  │  ┌────────────────┐  │ │
│  │                  │  │  └────────────────┘  │  │  │  Model         │  │ │
│  │  ┌────────────┐  │  │                      │  │  │  Registry      │  │ │
│  │  │    NLG     │  │  │  ┌────────────────┐  │  │  └────────────────┘  │ │
│  │  │  Assembler │  │  │  │  Audit Log     │  │  │                      │ │
│  │  └────────────┘  │  │  │  Store         │  │  └──────────────────────┘ │
│  │                  │  │  └────────────────┘  │                           │
│  └──────────────────┘  └──────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Presentation Layer

#### Underwriter Workbench

**Technology:** React single-page application

**Purpose:** Provides the user interface for underwriting staff to review cases, examine recommendations, make decisions, and approve communications.

**Responsibilities:**

| Function | Description |
|----------|-------------|
| Case Queue Display | Shows pending cases with complexity indicators and priority flags |
| Case Detail View | Presents consolidated case information, extracted data, and risk factors |
| Recommendation Display | Shows test recommendations, decision options, and supporting rationale |
| Decision Capture | Records underwriter selections and routes to appropriate handlers |
| Override Entry | Captures deviation reasoning when underwriters disagree with recommendations |
| Communication Review | Displays draft correspondence for editing and approval |
| Audit History | Shows decision timeline and historical actions on each case |

**Boundaries:**

The workbench is a presentation layer only. It does not execute business logic, perform calculations, or make API calls that bypass the backend. All state changes result from backend API responses. The frontend displays what the backend computes; it does not compute independently.

**User Role Support:**

| Role | Capabilities |
|------|--------------|
| Junior Underwriter | Full case processing within authority limits; escalation initiation |
| Senior Underwriter | Full case processing all tiers; escalation review; override authority |
| Medical Director | Clinical consultation interface; override authority with clinical rationale |
| Audit (Read-Only) | Case review; audit trail access; no modification capability |
| UW Manager (Read-Only) | Aggregated views; override pattern review; no case modification |

---

### API Layer

#### API Gateway

**Technology:** Node.js

**Purpose:** Single entry point for all external requests. Handles cross-cutting concerns before requests reach business services.

**Responsibilities:**

| Function | Description |
|----------|-------------|
| Authentication | Validates user identity via token verification |
| Authorization | Enforces role-based access control per endpoint |
| Request Validation | Validates request structure and required fields before processing |
| Rate Limiting | Prevents abuse and ensures fair resource allocation |
| API Versioning | Routes requests to appropriate service versions |
| Request Logging | Records all incoming requests for audit and debugging |
| Error Handling | Standardises error responses across all endpoints |

**External Integration Points:**

| Integration | Direction | Purpose |
|-------------|-----------|---------|
| Policy Administration System | Inbound | Receives proposal and case data |
| Document Management System | Inbound | Receives medical documents and reports |
| Correspondence System | Outbound | Sends approved communications for dispatch |
| Identity Provider | Inbound | Validates authentication tokens |

---

### Business Services Layer

#### Case Service

**Purpose:** Manages case lifecycle from receipt through decision.

**Responsibilities:**

- Receives and validates incoming case data from external systems
- Maintains case state and status transitions
- Coordinates processing across other services
- Enforces case routing based on complexity classification
- Manages case assignment and reassignment

**Key Operations:**

| Operation | Description |
|-----------|-------------|
| Case Intake | Validates and stores incoming proposal data |
| Case Retrieval | Returns case details with current status and history |
| Status Update | Transitions case through defined workflow states |
| Assignment | Routes cases to appropriate underwriters based on complexity and authority |

#### Risk Service

**Purpose:** Coordinates risk assessment and produces risk summaries.

**Responsibilities:**

- Orchestrates rules engine evaluation
- Requests ML predictions for applicable models
- Synthesises rule outputs and ML predictions into unified risk view
- Calculates complexity classification
- Produces explainable risk summaries with contributing factors

**Key Operations:**

| Operation | Description |
|-----------|-------------|
| Risk Assessment | Executes full risk evaluation for a case |
| Complexity Classification | Determines case complexity tier |
| Factor Analysis | Identifies and ranks contributing risk factors |
| Risk Summary | Produces human-readable risk narrative with supporting evidence |

#### Test Service

**Purpose:** Generates medical test recommendations with rationale.

**Responsibilities:**

- Evaluates case against test requirement rules
- Requests ML-based yield predictions
- Produces test recommendations with clinical justification
- Estimates expected diagnostic yield per test
- Supports test panel comparison and optimisation

**Key Operations:**

| Operation | Description |
|-----------|-------------|
| Test Recommendation | Generates recommended test panel with rationale |
| Yield Prediction | Estimates diagnostic value of each recommended test |
| Panel Comparison | Compares alternative test combinations |
| Requirement Lookup | Returns regulatory or policy-mandated tests |

#### Communications Service

**Purpose:** Assembles draft communications for underwriter review.

**Responsibilities:**

- Maps decision outcomes to communication templates
- Assembles case-specific content into templates
- Enforces compliance text inclusion
- Tracks communication versions and edits
- Prepares approved communications for dispatch

**Key Operations:**

| Operation | Description |
|-----------|-------------|
| Draft Generation | Creates initial communication draft from templates |
| Draft Update | Incorporates underwriter edits while preserving compliance text |
| Approval Processing | Finalises communication and prepares dispatch payload |
| Template Retrieval | Returns available templates for communication type |

#### Override Service

**Purpose:** Captures and processes underwriter deviations from recommendations.

**Responsibilities:**

- Records overrides with full context and reasoning
- Classifies overrides as material or non-material
- Validates reasoning capture for material overrides
- Feeds override data to learning pipeline
- Supports override pattern analysis

**Key Operations:**

| Operation | Description |
|-----------|-------------|
| Override Recording | Stores deviation with context, reasoning, and classification |
| Materiality Check | Determines if override requires mandatory reasoning |
| Pattern Query | Returns override patterns for specified criteria |
| Learning Export | Prepares override data for ML training pipeline |

#### Audit Service

**Purpose:** Maintains immutable audit records for all system actions.

**Responsibilities:**

- Records all recommendations, decisions, and state changes
- Maintains immutable audit log with tamper evidence
- Supports audit queries by case, user, time range, or action type
- Generates audit reports for regulatory review
- Enforces audit retention policies

**Key Operations:**

| Operation | Description |
|-----------|-------------|
| Event Recording | Stores audit event with full context |
| Audit Query | Returns audit history for specified criteria |
| Report Generation | Produces formatted audit reports |
| Integrity Verification | Validates audit log integrity |

#### Workflow Service

**Purpose:** Manages case state transitions and routing logic.

**Responsibilities:**

- Defines valid state transitions per case type
- Enforces transition preconditions
- Triggers downstream actions on state changes
- Manages escalation routing
- Supports workflow configuration updates

#### Integration Service

**Purpose:** Handles communication with external systems.

**Responsibilities:**

- Manages API connections to external systems
- Transforms data between internal and external formats
- Handles retry logic and failure recovery
- Monitors integration health
- Logs all external communications

---

### Processing Engines

#### Rules Engine

**Purpose:** Executes deterministic business rules from configuration.

**Detailed Description:** See [Rules Engine Architecture](#rules-engine-architecture) section below.

#### NLP Extractor

**Purpose:** Extracts structured data from unstructured medical documents.

**Detailed Description:** See [NLP Architecture](#nlp-architecture) section below.

#### NLG Assembler

**Purpose:** Generates communication text from structured inputs.

**Detailed Description:** See [NLG Architecture](#nlg-architecture) section below.

---

### Data Layer

#### Primary Database

**Technology:** SQLite (MVP/Development) with migration path to PostgreSQL or SQL Server

**Purpose:** Persistent storage for cases, decisions, configurations, and operational data.

**Schema Domains:**

| Domain | Contents |
|--------|----------|
| Case Management | Proposals, cases, applicants, policy details |
| Risk Assessment | Risk scores, factor analyses, complexity classifications |
| Recommendations | Test recommendations, decision options, rationale records |
| Decisions | Underwriter decisions, override records, approval chains |
| Communications | Draft communications, edit history, dispatch records |
| Configuration | Rules, templates, extraction patterns, thresholds |
| Users | User accounts, roles, authority limits, preferences |

**Design Constraints:**

- No SQLite-specific features that prevent migration
- All queries compatible with PostgreSQL and SQL Server
- Foreign key relationships enforced at database level
- Timestamps in UTC for all temporal data
- Soft deletes for audit trail preservation

#### Configuration Store

**Purpose:** Versioned storage for system configuration including rules, templates, and extraction patterns.

**Contents:**

| Configuration Type | Description |
|--------------------|-------------|
| Business Rules | Underwriting rules in structured format |
| Test Protocols | Medical test requirement definitions |
| NLP Dictionaries | Medical terminology, ICD codes, drug databases |
| Extraction Patterns | Document parsing rules |
| Communication Templates | Correspondence templates with variable placeholders |
| Compliance Text | Locked regulatory and disclosure language |
| Threshold Values | Scoring thresholds and classification boundaries |

**Versioning:**

All configuration changes are versioned. Historical configurations are retained to support audit queries that reconstruct system state at any past decision point.

#### Audit Log Store

**Purpose:** Immutable storage for audit events.

**Characteristics:**

- Append-only writes; no updates or deletes
- Cryptographic chaining for tamper evidence
- Separate storage from operational database
- Extended retention per regulatory requirements
- Optimised for time-range and case-based queries

---

### ML Layer

#### ML Service

**Technology:** Python with scikit-learn / LightGBM

**Purpose:** Provides machine learning predictions and model management.

**Detailed Description:** See [ML Architecture](#ml-architecture) section below.

#### Model Registry

**Purpose:** Manages model versions, metadata, and deployment state.

**Contents:**

| Element | Description |
|---------|-------------|
| Model Artifacts | Serialised model files |
| Model Metadata | Training date, parameters, performance metrics |
| Feature Definitions | Input feature specifications per model |
| Deployment State | Active/inactive status per environment |
| Evaluation History | Historical performance measurements |

---

## Rules Engine Architecture

### Purpose

The rules engine executes deterministic business logic that encodes underwriting policy, regulatory requirements, and operational constraints. Rules are the authoritative source for policy-driven decisions; ML cannot override rules.

### Rule Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RULES ENGINE                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RULE CATEGORIES                                  │   │
│  │                                                                     │   │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │   │
│  │  │ ELIGIBILITY       │  │ RISK SCORING      │  │ TEST PROTOCOL   │ │   │
│  │  │ RULES             │  │ RULES             │  │ RULES           │ │   │
│  │  │                   │  │                   │  │                 │ │   │
│  │  │ • Age limits      │  │ • Condition       │  │ • Mandatory     │ │   │
│  │  │ • Sum assured     │  │   weightings      │  │   tests         │ │   │
│  │  │   thresholds      │  │ • Factor          │  │ • Conditional   │ │   │
│  │  │ • Product         │  │   combinations    │  │   tests         │ │   │
│  │  │   eligibility     │  │ • Severity        │  │ • Regulatory    │ │   │
│  │  │ • Occupation      │  │   classifications │  │   requirements  │ │   │
│  │  │   restrictions    │  │ • Exclusion       │  │ • Sum assured   │ │   │
│  │  │                   │  │   triggers        │  │   thresholds    │ │   │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘ │   │
│  │                                                                     │   │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │   │
│  │  │ ROUTING RULES     │  │ COMPLIANCE RULES  │  │ ESCALATION      │ │   │
│  │  │                   │  │                   │  │ RULES           │ │   │
│  │  │ • Complexity      │  │ • Regulatory      │  │                 │ │   │
│  │  │   classification  │  │   disclosures     │  │ • Authority     │ │   │
│  │  │ • Authority       │  │ • Mandatory       │  │   thresholds    │ │   │
│  │  │   matching        │  │   documentation   │  │ • Medical       │ │   │
│  │  │ • Workload        │  │ • Audit           │  │   referral      │ │   │
│  │  │   distribution    │  │   requirements    │  │   triggers      │ │   │
│  │  │                   │  │                   │  │ • Exception     │ │   │
│  │  │                   │  │                   │  │   handling      │ │   │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RULE EXECUTION                                   │   │
│  │                                                                     │   │
│  │   Input          Rule            Execution         Output           │   │
│  │   Context   ───► Selection  ───► & Logging   ───►  with             │   │
│  │                                                    Rationale        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rule Structure

Each rule is defined with:

| Element | Description |
|---------|-------------|
| Rule Identifier | Unique identifier for traceability |
| Rule Category | Classification for organisation and selection |
| Conditions | Boolean expressions evaluated against case data |
| Actions | Outputs produced when conditions are satisfied |
| Priority | Execution order when multiple rules apply |
| Effective Dates | Valid date range for rule applicability |
| Rationale Template | Human-readable explanation of rule purpose |

### Execution Model

**Condition Evaluation:**

Rules are selected based on case context (product type, applicant profile, disclosed conditions). Selected rules are evaluated in priority order. Each rule condition is a boolean expression over case attributes.

**Action Production:**

When conditions are satisfied, the rule produces its defined action—a risk factor, test requirement, routing instruction, or other output. Multiple rules may fire for a single case.

**Conflict Resolution:**

When rules produce conflicting outputs, priority determines precedence. Higher-priority rules override lower-priority rules. Conflicts are logged for audit purposes.

**Rationale Generation:**

Every rule execution produces a rationale record linking the output to the specific rule, the conditions that were satisfied, and the input values that satisfied them. This supports explainability requirements.

### Configuration Management

Rules are maintained in the configuration store with full version history. Rule changes follow a governed process:

1. Proposed change documented with business justification
2. Review by underwriting authority
3. Testing in non-production environment
4. Approval and version increment
5. Deployment with effective date
6. Audit log entry recording change

Rules cannot be modified through the application interface during normal operation. Changes require configuration deployment.

---

## ML Architecture

### Purpose

The ML layer identifies patterns in historical underwriting data that inform recommendations. ML outputs are advisory—they surface insights but do not trigger actions.

### Service Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ML SERVICE (Python)                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INFERENCE PIPELINE                               │   │
│  │                                                                     │   │
│  │   Request     Feature        Model          Response                │   │
│  │   Intake  ──► Extraction ──► Inference ──►  Assembly                │   │
│  │                   │              │              │                   │   │
│  │                   ▼              ▼              ▼                   │   │
│  │              Validation     Confidence    Explanation               │   │
│  │                             Scoring       Generation                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TRAINING PIPELINE                                │   │
│  │                                                                     │   │
│  │   Data         Feature        Model          Model                  │   │
│  │   Extraction ► Engineering ► Training    ──► Evaluation             │   │
│  │       │                          │              │                   │   │
│  │       ▼                          ▼              ▼                   │   │
│  │   Override                  Hyperparameter  Registry                │   │
│  │   Integration               Tuning          Update                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MODEL INVENTORY                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │   │
│  │  │ Complexity      │  │ Test Yield      │  │ Override            │ │   │
│  │  │ Classifier      │  │ Predictor       │  │ Likelihood          │ │   │
│  │  │                 │  │                 │  │ Estimator           │ │   │
│  │  │ Predicts case   │  │ Estimates       │  │ Flags cases         │ │   │
│  │  │ complexity tier │  │ diagnostic      │  │ likely to have      │ │   │
│  │  │ for routing     │  │ value of tests  │  │ recommendations     │ │   │
│  │  │                 │  │                 │  │ overridden          │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model Inventory

**Complexity Classifier**

- **Purpose:** Predicts case complexity tier for routing decisions
- **Inputs:** Applicant demographics, disclosed conditions, sum assured, product type
- **Outputs:** Complexity tier (Routine/Moderate/Complex) with confidence score
- **Use:** Informs case routing; rules may override based on specific triggers

**Test Yield Predictor**

- **Purpose:** Estimates expected diagnostic value of recommended tests
- **Inputs:** Applicant profile, disclosed conditions, test type
- **Outputs:** Yield probability (likelihood test will surface material findings)
- **Use:** Helps underwriters prioritise high-value tests; supports cost-benefit assessment

**Override Likelihood Estimator**

- **Purpose:** Flags cases where system recommendations are likely to be overridden
- **Inputs:** Case features, recommendation details, historical override patterns
- **Outputs:** Override probability with contributing factors
- **Use:** Surfaces cases warranting additional review; identifies potential recommendation gaps

### Interface Abstraction

The Node.js backend communicates with ML through a defined interface contract:

| Endpoint | Input | Output |
|----------|-------|--------|
| Complexity Prediction | Case features | Tier, confidence, factors |
| Yield Prediction | Case features, test list | Per-test yield estimates |
| Override Prediction | Case features, recommendations | Override probability, flags |
| Health Check | None | Service status |

This interface is designed for implementation substitution. If Python deployment is constrained, a Node.js implementation can fulfil the same contract.

### Confidence and Uncertainty

All ML outputs include confidence indicators:

| Indicator | Description |
|-----------|-------------|
| Confidence Score | Model's certainty in prediction (0-1 scale) |
| Feature Coverage | Percentage of expected features present in input |
| Distribution Shift Flag | Indicates if input differs significantly from training data |
| Prediction Interval | Range of likely values for continuous predictions |

Low-confidence predictions are flagged in the user interface. Underwriters are informed when ML outputs may be less reliable.

### Explainability Requirements

Every prediction includes explanation data:

| Element | Description |
|---------|-------------|
| Top Contributing Features | Features with highest influence on prediction |
| Feature Contributions | Direction and magnitude of each feature's effect |
| Comparison Baseline | Reference point for contribution calculations |
| Similar Historical Cases | Past cases with similar profiles and outcomes |

Explanations are generated using model-appropriate techniques (feature importance for tree models, SHAP values where applicable).

---

## NLP Architecture

### Purpose

The NLP layer extracts structured information from unstructured medical documents. It transforms free-text medical reports into normalised data fields that feed risk assessment and recommendation logic.

### Design Principles

**Rule-Based Extraction**

All extraction uses deterministic pattern matching and dictionary lookups. No statistical NLP models, no machine learning in the extraction pipeline. This ensures reproducibility and auditability.

**Governed Dictionaries**

Medical terminology, condition names, medication databases, and laboratory test definitions are maintained as versioned configuration. Adding new terms requires explicit configuration change.

**No Inference**

The NLP layer identifies and extracts; it does not interpret. If a document mentions "elevated glucose," NLP extracts that phrase and associated values. It does not infer diabetes diagnosis.

### Extraction Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NLP EXTRACTION PIPELINE                             │
│                                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │ Document │   │  Text    │   │  Entity  │   │ Relation │   │Structured│  │
│  │  Intake  │──►│ Cleaning │──►│Recognition──►│Extraction│──►│  Output  │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│                                     │              │                        │
│                                     ▼              ▼                        │
│                               ┌──────────┐  ┌──────────┐                   │
│                               │Dictionary│  │ Pattern  │                   │
│                               │ Lookup   │  │ Matching │                   │
│                               └──────────┘  └──────────┘                   │
│                                     │              │                        │
│                                     ▼              ▼                        │
│                               ┌─────────────────────────┐                  │
│                               │   Configuration Store   │                  │
│                               │                         │                  │
│                               │ • Medical Dictionaries  │                  │
│                               │ • ICD Code Mappings     │                  │
│                               │ • Drug Databases        │                  │
│                               │ • Lab Test Definitions  │                  │
│                               │ • Extraction Patterns   │                  │
│                               └─────────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Extraction Categories

| Category | Examples | Output Format |
|----------|----------|---------------|
| Conditions | Diabetes, hypertension, CAD | Condition code, status, severity |
| Medications | Metformin 500mg, Lisinopril 10mg | Drug name, dosage, frequency |
| Laboratory Values | HbA1c 7.2%, Creatinine 1.1 mg/dL | Test name, value, unit, date |
| Vital Signs | BP 140/90, BMI 28.5 | Measurement type, value, date |
| Procedures | Angioplasty 2019, Appendectomy | Procedure name, date |
| Family History | Father MI age 55, Mother diabetes | Relation, condition, age at onset |

### Confidence and Validation

Extractions include confidence indicators:

| Indicator | Description |
|-----------|-------------|
| Match Type | Exact dictionary match vs. fuzzy match vs. pattern match |
| Context Validation | Whether surrounding text supports extraction |
| Completeness | Whether all expected components were found |
| Conflict Flag | Whether multiple conflicting values were found |

Low-confidence extractions are flagged for underwriter review rather than automatically accepted.

---

## NLG Architecture

### Purpose

The NLG layer generates communication text from structured inputs. It transforms decision data, reason codes, and case details into coherent, compliant correspondence.

### Design Principles

**Template-Driven Assembly**

All text generation uses pre-approved templates with variable substitution. No generative AI, no probabilistic text generation. Output is deterministic and reproducible.

**Reason-to-Text Mapping**

Structured reason codes map to approved prose segments. The system does not compose novel explanations; it selects and assembles pre-written text.

**Compliance Text Locking**

Regulatory disclosures, standard clauses, and compliance language are immutable. They cannot be modified by system logic, underwriter edits, or any other mechanism.

### Assembly Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NLG ASSEMBLY PIPELINE                               │
│                                                                             │
│  ┌───────────────┐                                                          │
│  │   INPUTS      │                                                          │
│  │               │                                                          │
│  │ • Decision    │                                                          │
│  │   outcome     │                                                          │
│  │ • Reason      │     ┌─────────────────────────────────────────────┐     │
│  │   codes       │────►│           TEMPLATE SELECTION                │     │
│  │ • Case        │     │                                             │     │
│  │   details     │     │  Decision Type ──► Base Template            │     │
│  │ • Applicant   │     │  Reason Codes  ──► Content Sections         │     │
│  │   data        │     │  Case Context  ──► Conditional Blocks       │     │
│  │               │     └─────────────────────────────────────────────┘     │
│  └───────────────┘                          │                               │
│                                             ▼                               │
│                      ┌─────────────────────────────────────────────┐       │
│                      │           VARIABLE SUBSTITUTION             │       │
│                      │                                             │       │
│                      │  {{applicant_name}}  ──► "Rajesh Kumar"     │       │
│                      │  {{policy_number}}   ──► "HI-2024-78432"    │       │
│                      │  {{test_list}}       ──► "ECG, Lipid Panel" │       │
│                      │  {{due_date}}        ──► "15 February 2024" │       │
│                      └─────────────────────────────────────────────┘       │
│                                             │                               │
│                                             ▼                               │
│                      ┌─────────────────────────────────────────────┐       │
│                      │           COMPLIANCE INJECTION              │       │
│                      │                                             │       │
│                      │  • Regulatory disclosures (LOCKED)          │       │
│                      │  • Standard terms (LOCKED)                  │       │
│                      │  • Privacy notices (LOCKED)                 │       │
│                      └─────────────────────────────────────────────┘       │
│                                             │                               │
│                                             ▼                               │
│                      ┌─────────────────────────────────────────────┐       │
│                      │              DRAFT OUTPUT                   │       │
│                      │                                             │       │
│                      │  ┌─────────────────────────────────────┐   │       │
│                      │  │  Editable Sections                  │   │       │
│                      │  │  (Underwriter can modify)           │   │       │
│                      │  ├─────────────────────────────────────┤   │       │
│                      │  │  Locked Sections                    │   │       │
│                      │  │  (Cannot be modified)               │   │       │
│                      │  └─────────────────────────────────────┘   │       │
│                      └─────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Communication Types

| Type | Purpose | Key Variables |
|------|---------|---------------|
| Requirements Letter | Request additional medical tests | Test list, reasons, due date |
| Clarification Request | Seek additional information | Question list, context |
| Status Update | Inform applicant of case progress | Current status, next steps |
| Decision Communication | Communicate underwriting outcome | Decision, terms, conditions |

### Template Governance

Templates are maintained in the configuration store with version control. Template changes follow governed process similar to rule changes:

1. Draft template with variable placeholders
2. Legal/compliance review for regulatory language
3. Business review for tone and clarity
4. Approval and version increment
5. Deployment with effective date

---

## Learning Loop Architecture

### Purpose

The learning loop captures underwriter expertise through override analysis and uses these insights to improve system recommendations over time.

### Override Classification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OVERRIDE CLASSIFICATION                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MATERIAL OVERRIDES                               │   │
│  │                    (Reasoning Required)                             │   │
│  │                                                                     │   │
│  │  • Test panel changes (add/remove/substitute tests)                │   │
│  │  • Risk tier adjustments                                           │   │
│  │  • Decision option changes (different path than recommended)       │   │
│  │  • Escalation overrides (proceeding when escalation recommended)   │   │
│  │  • Clinical judgment deviations                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   NON-MATERIAL OVERRIDES                            │   │
│  │                   (Reasoning Optional)                              │   │
│  │                                                                     │   │
│  │  • Communication rewording (substance unchanged)                   │   │
│  │  • Formatting adjustments                                          │   │
│  │  • Typo corrections                                                │   │
│  │  • Clarification additions (no decision impact)                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Learning Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LEARNING PIPELINE                                  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. CAPTURE                                                           │  │
│  │                                                                      │  │
│  │    Override      Context         Reasoning        Outcome            │  │
│  │    Event    ───► Snapshot   ───► Capture     ───► Recording          │  │
│  │                                                                      │  │
│  │    • What was recommended                                            │  │
│  │    • What was selected                                               │  │
│  │    • Case state at decision time                                     │  │
│  │    • Underwriter-provided rationale                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 2. AGGREGATE                                                         │  │
│  │                                                                      │  │
│  │    Override data accumulated over time                               │  │
│  │    Grouped by: override type, case profile, underwriter, outcome    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. ANALYSE                                                           │  │
│  │                                                                      │  │
│  │    Pattern Detection:                                                │  │
│  │    • Systematic deviations from recommendations                     │  │
│  │    • Underwriter consensus patterns                                 │  │
│  │    • Case profile clusters with high override rates                 │  │
│  │    • Reasoning theme extraction                                     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 4. SURFACE                                                           │  │
│  │                                                                      │  │
│  │    Insights presented to:                                           │  │
│  │    • ML training pipeline (model improvement)                       │  │
│  │    • UW Management (protocol review)                                │  │
│  │    • Quality team (consistency analysis)                            │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 5. GOVERN                                                            │  │
│  │                                                                      │  │
│  │    Human review and approval required for:                          │  │
│  │    • Rule modifications                                             │  │
│  │    • Threshold adjustments                                          │  │
│  │    • Protocol changes                                               │  │
│  │    • Model retraining decisions                                     │  │
│  │                                                                      │  │
│  │    NO AUTOMATIC SYSTEM CHANGES                                      │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feedback Integration Points

| Destination | How Override Data Is Used |
|-------------|---------------------------|
| ML Models | Override outcomes become training labels; features inform model updates |
| Pattern Reports | Aggregated override trends surface for management review |
| Quality Metrics | Override rates inform recommendation quality measurement |
| Protocol Review | Systematic patterns trigger rule/protocol evaluation |

### Governance Safeguards

**No Self-Modification**

The system cannot modify its own rules, thresholds, or behavior based on learned patterns. Learning produces insights; humans approve changes.

**Override Validation**

Override patterns are validated before influencing model training. Outlier overrides, potentially erroneous decisions, and single-underwriter patterns are flagged for review rather than automatically incorporated.

**Audit Trail**

All learning activities are logged: what data was used, what patterns were detected, what insights were surfaced, and what actions (if any) resulted.

---

## Explainability Architecture

### Design Philosophy

Every system output must be explainable. Underwriters, auditors, and regulators must be able to understand why any recommendation was made. Explainability is not a feature; it is an architectural constraint.

### Explainability Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXPLAINABILITY ARCHITECTURE                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    RECOMMENDATION LEVEL                             │   │
│  │                                                                     │   │
│  │  Every recommendation includes:                                    │   │
│  │  • What is being recommended                                       │   │
│  │  • Why it is being recommended (primary factors)                   │   │
│  │  • What rules or models contributed                                │   │
│  │  • Confidence level                                                │   │
│  │  • Alternative options considered                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FACTOR LEVEL                                     │   │
│  │                                                                     │   │
│  │  For each contributing factor:                                     │   │
│  │  • Source (rule ID, model name, extracted data)                    │   │
│  │  • Input values that triggered it                                  │   │
│  │  • Weight or importance in overall recommendation                  │   │
│  │  • Direction of influence (increases/decreases risk)               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AUDIT LEVEL                                      │   │
│  │                                                                     │   │
│  │  Complete reconstruction capability:                               │   │
│  │  • Full input state at decision time                               │   │
│  │  • Rule versions in effect                                         │   │
│  │  • Model versions used                                             │   │
│  │  • Configuration state                                             │   │
│  │  • Intermediate calculation results                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Explanation Generation

**Rule-Based Explanations**

When a rule fires, the system generates an explanation from the rule's rationale template, populated with the specific values that triggered it.

Example: "ECG recommended because applicant age (58) exceeds threshold (55) for cardiac screening per Rule UW-CARDIAC-003."

**ML-Based Explanations**

When an ML model contributes to a recommendation, the system generates an explanation from feature contributions.

Example: "Complexity classified as Moderate (confidence: 0.82). Primary factors: disclosed hypertension (+0.23), sum assured ₹75L (+0.18), age 52 (+0.12)."

**Composite Explanations**

When rules and ML both contribute, explanations are combined with clear attribution.

Example: "Test panel recommendation based on: mandatory tests per Rule UW-TEST-012 (diabetes disclosure), additional cardiac tests suggested by yield prediction model (72% expected yield for stress test given applicant profile)."

---

## Audit Architecture

### Audit Event Model

Every significant system action produces an audit event:

| Field | Description |
|-------|-------------|
| Event ID | Unique identifier |
| Timestamp | UTC timestamp of event |
| Event Type | Classification (recommendation, decision, override, etc.) |
| Actor | User or system component that triggered event |
| Case Reference | Associated case identifier |
| Action | What was done |
| Inputs | Data state at event time |
| Outputs | Results produced |
| Rationale | Explanation for action |
| Metadata | Additional context (session, IP, component versions) |

### Audit Categories

| Category | Events Captured |
|----------|-----------------|
| Case Lifecycle | Creation, status changes, assignment, closure |
| Recommendations | Risk assessments, test recommendations, decision options generated |
| Decisions | Underwriter selections, approvals, escalations |
| Overrides | Deviations from recommendations with reasoning |
| Communications | Drafts generated, edits made, approvals, dispatches |
| Configuration | Rule changes, template updates, threshold modifications |
| Access | Login, logout, case access, report generation |

### Audit Queries

The audit system supports queries for:

| Query Type | Purpose |
|------------|---------|
| Case History | All events for a specific case |
| User Activity | All actions by a specific user |
| Time Range | All events within a date range |
| Event Type | All events of a specific type |
| Decision Reconstruction | Full context to recreate any past decision |

### Regulatory Support

Audit data supports regulatory requirements:

- Complete decision trail for any policy
- Evidence of human oversight for all decisions
- Configuration state reconstruction at any past date
- Override justification records
- Access and activity logs for compliance review

---

## Data Flow Diagrams

### Case Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CASE PROCESSING FLOW                                │
│                                                                             │
│  EXTERNAL                                                                   │
│  ┌──────────────┐                                                          │
│  │ Policy Admin │                                                          │
│  │ System       │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         │ Proposal Data                                                    │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      CASE INTAKE                                     │  │
│  │                                                                      │  │
│  │  Validate ──► Store ──► Extract (NLP) ──► Classify Complexity       │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      RISK ASSESSMENT                                 │  │
│  │                                                                      │  │
│  │  Rules Engine ──► ML Predictions ──► Factor Synthesis ──► Risk View │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    TEST RECOMMENDATION                               │  │
│  │                                                                      │  │
│  │  Protocol Rules ──► Yield Prediction ──► Panel Assembly ──► Rationale│  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                   UNDERWRITER REVIEW                                 │  │
│  │                                                                      │  │
│  │  Present Case ──► Display Recommendations ──► Capture Decision      │  │
│  │                                                   │                  │  │
│  │                                                   ▼                  │  │
│  │                              ┌─────────────────────────────────────┐ │  │
│  │                              │ Override?                           │ │  │
│  │                              │                                     │ │  │
│  │                              │ YES: Capture reasoning (if material)│ │  │
│  │                              │ NO:  Proceed with recommendation    │ │  │
│  │                              └─────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                   COMMUNICATION GENERATION                           │  │
│  │                                                                      │  │
│  │  Select Template ──► Assemble Draft ──► UW Review ──► Approve       │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              │ Approved Communication                      │
│                              ▼                                              │
│  EXTERNAL                                                                   │
│  ┌──────────────────┐                                                      │
│  │ Correspondence   │                                                      │
│  │ System           │                                                      │
│  └──────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommendation Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDATION GENERATION FLOW                           │
│                                                                             │
│         ┌─────────────────────────────────────────────────────────┐        │
│         │                    CASE CONTEXT                         │        │
│         │                                                         │        │
│         │  • Applicant demographics                              │        │
│         │  • Disclosed conditions (NLP extracted)                │        │
│         │  • Sum assured                                         │        │
│         │  • Product type                                        │        │
│         │  • Supporting documents                                │        │
│         └─────────────────────────────────────────────────────────┘        │
│                                    │                                        │
│                 ┌──────────────────┴──────────────────┐                    │
│                 │                                     │                    │
│                 ▼                                     ▼                    │
│  ┌─────────────────────────────┐     ┌─────────────────────────────┐      │
│  │      RULES ENGINE           │     │       ML SERVICE            │      │
│  │                             │     │                             │      │
│  │  Evaluate eligibility rules │     │  Complexity prediction      │      │
│  │  Apply risk scoring rules   │     │  Yield predictions          │      │
│  │  Check test protocol rules  │     │  Override likelihood        │      │
│  │  Determine routing rules    │     │                             │      │
│  │                             │     │                             │      │
│  │  Output:                    │     │  Output:                    │      │
│  │  • Mandatory requirements   │     │  • Predictions + confidence │      │
│  │  • Rule-based scores        │     │  • Feature contributions    │      │
│  │  • Rule rationale           │     │  • Similar case references  │      │
│  └─────────────────────────────┘     └─────────────────────────────┘      │
│                 │                                     │                    │
│                 └──────────────────┬──────────────────┘                    │
│                                    │                                        │
│                                    ▼                                        │
│         ┌─────────────────────────────────────────────────────────┐        │
│         │                 SYNTHESIS LAYER                         │        │
│         │                                                         │        │
│         │  Combine rule outputs and ML predictions                │        │
│         │  Rules take precedence on conflicts                     │        │
│         │  Generate unified recommendation set                    │        │
│         │  Assemble explanation from both sources                 │        │
│         │                                                         │        │
│         └─────────────────────────────────────────────────────────┘        │
│                                    │                                        │
│                                    ▼                                        │
│         ┌─────────────────────────────────────────────────────────┐        │
│         │              RECOMMENDATION OUTPUT                      │        │
│         │                                                         │        │
│         │  • Risk assessment with factors                        │        │
│         │  • Complexity tier with confidence                     │        │
│         │  • Test panel with per-test rationale and yield        │        │
│         │  • Decision options with supporting reasoning          │        │
│         │  • Flags and alerts                                    │        │
│         │                                                         │        │
│         └─────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Override Learning Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OVERRIDE LEARNING FLOW                               │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    OVERRIDE EVENT                                    │  │
│  │                                                                      │  │
│  │  Underwriter deviates from system recommendation                    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    MATERIALITY CHECK                                 │  │
│  │                                                                      │  │
│  │  Is this a material override?                                       │  │
│  │                                                                      │  │
│  │  YES: Test change, risk tier change, decision path change           │  │
│  │  NO:  Cosmetic edit, formatting, typo fix                           │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                    │                              │                         │
│                    │ Material                     │ Non-material            │
│                    ▼                              ▼                         │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │ MANDATORY REASONING CAPTURE   │  │ OPTIONAL REASONING CAPTURE     │   │
│  │                                │  │                                │   │
│  │ Underwriter must provide      │  │ Underwriter may provide        │   │
│  │ justification                 │  │ explanation if desired         │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                    │                              │                         │
│                    └──────────────┬───────────────┘                        │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    OVERRIDE STORAGE                                  │  │
│  │                                                                      │  │
│  │  Record:                                                            │  │
│  │  • Original recommendation                                          │  │
│  │  • Underwriter selection                                           │  │
│  │  • Case context snapshot                                           │  │
│  │  • Reasoning (if provided)                                         │  │
│  │  • Override classification                                         │  │
│  │  • Timestamp, user ID, case ID                                     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    PERIODIC ANALYSIS                                 │  │
│  │                    (Batch Process)                                   │  │
│  │                                                                      │  │
│  │  • Aggregate overrides by type, profile, underwriter               │  │
│  │  • Detect systematic patterns                                      │  │
│  │  • Identify consensus deviations                                   │  │
│  │  • Extract reasoning themes                                        │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                    ┌──────────────┴──────────────┐                         │
│                    │                             │                         │
│                    ▼                             ▼                         │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │ ML TRAINING PIPELINE          │  │ MANAGEMENT REPORTING           │   │
│  │                                │  │                                │   │
│  │ Override outcomes inform      │  │ Pattern insights surfaced for  │   │
│  │ model retraining              │  │ protocol review                │   │
│  │                                │  │                                │   │
│  │ Features updated based on     │  │ Systematic gaps identified     │   │
│  │ override patterns             │  │ for rule evaluation            │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                    │                             │                         │
│                    └──────────────┬──────────────┘                         │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    HUMAN GOVERNANCE                                  │  │
│  │                                                                      │  │
│  │  Management reviews insights                                        │  │
│  │  Approves or rejects proposed changes                              │  │
│  │  No automatic system modification                                   │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Specifications

### Inbound Integrations

#### Policy Administration System

| Aspect | Specification |
|--------|---------------|
| Direction | Inbound |
| Protocol | REST API |
| Authentication | API key + request signing |
| Data | Proposal details, applicant information, product data |
| Trigger | New proposal submission, case update |
| Error Handling | Retry with exponential backoff; dead letter queue for failures |

#### Document Management System

| Aspect | Specification |
|--------|---------------|
| Direction | Inbound |
| Protocol | REST API |
| Authentication | OAuth 2.0 |
| Data | Medical reports, diagnostic results, supporting documents |
| Trigger | Document upload, document update |
| Format | PDF text content and structured text; text extraction from documents is a preprocessing step handled by the Document Management System |

### Outbound Integrations

#### Correspondence System

| Aspect | Specification |
|--------|---------------|
| Direction | Outbound |
| Protocol | REST API |
| Authentication | API key |
| Data | Approved communication content, recipient details, delivery instructions |
| Trigger | Communication approval |
| Confirmation | Delivery receipt expected; tracked in audit log |

---

## Deployment Architecture

### Environment Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DEPLOYMENT ENVIRONMENTS                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DEVELOPMENT                                      │   │
│  │                                                                     │   │
│  │  • Local developer machines                                        │   │
│  │  • SQLite database                                                 │   │
│  │  • Mock external integrations                                      │   │
│  │  • Full stack locally runnable                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TESTING / QA                                     │   │
│  │                                                                     │   │
│  │  • Shared test environment                                         │   │
│  │  • PostgreSQL database                                             │   │
│  │  • Sandbox external integrations                                   │   │
│  │  • Test data sets                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    STAGING                                          │   │
│  │                                                                     │   │
│  │  • Production-like environment                                     │   │
│  │  • PostgreSQL / SQL Server                                         │   │
│  │  • UAT external integrations                                       │   │
│  │  • Anonymised production data                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PRODUCTION                                       │   │
│  │                                                                     │   │
│  │  • Full production deployment                                      │   │
│  │  • PostgreSQL / SQL Server                                         │   │
│  │  • Live external integrations                                      │   │
│  │  • Full monitoring and alerting                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Deployment

| Component | Deployment Model | Scaling |
|-----------|------------------|---------|
| API Gateway | Container / serverless | Horizontal |
| Business Services | Container | Horizontal |
| ML Service | Container | Horizontal (inference) / Single (training) |
| Database | Managed service | Vertical + read replicas |
| Frontend | Static hosting / CDN | N/A |

---

## Security Architecture

### Authentication and Authorization

| Layer | Mechanism |
|-------|-----------|
| User Authentication | Identity provider integration (SSO) |
| API Authentication | JWT tokens with expiry |
| Service-to-Service | API keys + request signing |
| Authorization | Role-based access control (RBAC) |

### Data Protection

| Aspect | Approach |
|--------|----------|
| Data at Rest | Database encryption |
| Data in Transit | TLS 1.2+ for all communications |
| PII Handling | Field-level access controls; audit logging |
| Document Storage | Encrypted storage; access-controlled retrieval |

### Audit and Compliance

| Requirement | Implementation |
|-------------|----------------|
| Access Logging | All system access logged with user, time, action |
| Decision Trail | Complete audit trail for every recommendation and decision |
| Data Retention | Configurable retention policies per data type |
| Regulatory Access | Query interfaces for compliance and regulatory review |

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| Case | An underwriting evaluation instance for a single proposal |
| Complexity Tier | Classification of case difficulty (Routine, Moderate, Complex) |
| Decision Option | A possible underwriting outcome path presented to the underwriter |
| Material Override | A deviation from system recommendation that affects risk assessment or case handling |
| NLG | Natural Language Generation; template-driven text assembly |
| NLP | Natural Language Processing; rule-based information extraction |
| Override | Any underwriter deviation from system recommendation |
| Recommendation | System-generated suggestion for underwriter consideration |
| Risk Factor | A specific element contributing to risk assessment |
| Yield Prediction | Estimated diagnostic value of a recommended test |
