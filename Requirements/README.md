# Health Insurance Underwriting Decision Support System

## Overview

A decision-support platform for health insurance underwriting operations. The system provides risk assessment insights, test recommendations, and communication drafting capabilities to assist underwriters in evaluating proposals. All decisions remain with qualified underwriting personnel.

---

## Problem Statement

### Current State Challenges

Health insurance underwriting operations face persistent operational challenges that affect throughput, consistency, and turnaround time.

**Capacity Constraints**

Complex cases requiring senior underwriter judgment queue behind routine administrative tasks. Experienced underwriters spend significant time on file assembly, information synthesis, and correspondence drafting rather than on the risk evaluation work that requires their expertise. This creates bottlenecks at the senior level while routine cases wait unnecessarily.

**Inconsistent Test Ordering**

Medical test recommendations vary based on individual underwriter experience and practice patterns rather than evidence-based protocols. Identical proposals reviewed by different underwriters may result in materially different test panels—not due to differing risk assessments, but due to differing habits. This creates cost variability and inconsistent applicant experiences.

**Defensive Over-Investigation**

Without systematic guidance on expected diagnostic yield, underwriters tend toward conservative over-ordering of medical tests. This increases per-case acquisition costs, extends time-to-decision, and introduces friction in the applicant journey without proportionate improvement in risk selection outcomes.

**Limited Institutional Memory**

When experienced underwriters deviate from standard approaches based on pattern recognition developed over years of practice, that knowledge remains with the individual. The organisation has no systematic mechanism to capture why seasoned underwriters make certain decisions or to transfer that accumulated judgment to less experienced staff.

**Manual Communication Burden**

Drafting requirements letters, clarification requests, and status updates consumes substantial underwriter time. While content is largely standardised, each communication requires manual assembly and case-specific customisation.

### Business Objective

Improve underwriting efficiency, consistency, and turnaround time while preserving existing underwriting guidelines, risk appetite, and decision authority structures.

---

## Solution Overview

The system functions as an intelligent assistant layer for underwriting operations. It processes proposal data, synthesises relevant information, provides evidence-based recommendations, and drafts communications. It does not make decisions.

### Core Capabilities

**Case Intelligence**

The system ingests proposal data, medical disclosures, and supporting documentation via API integration with existing policy administration systems. It extracts structured information from unstructured medical documents and assembles a consolidated case view for underwriter review.

**Complexity Classification**

Each case receives a complexity tier assignment based on applicant profile, disclosed conditions, sum assured, and historical patterns. Classification enables intelligent routing so that straightforward proposals reach appropriate staff while complex risks are prioritised for senior review.

**Risk Assessment Support**

The system evaluates disclosed information against established underwriting protocols and historical outcomes. It identifies risk factors, flags potential concerns, and provides structured risk summaries. All assessments include explicit reasoning and contributing factors.

**Test Recommendations**

Based on disclosed conditions, applicant demographics, sum assured, and medical underwriting protocols, the system recommends specific diagnostic tests. Each recommendation includes clinical rationale, regulatory basis, and expected diagnostic yield based on historical outcomes for similar profiles.

**Decision Option Presentation**

The system presents underwriters with structured decision pathways—such as proceed with standard terms, proceed with exclusions, request additional information, or refer for senior review—along with supporting rationale for each option. Underwriters select the appropriate path.

**Communication Drafting**

Based on underwriter-selected decisions, the system generates draft correspondence pre-populated with case-specific details. Underwriters review, modify as appropriate, and approve before dispatch through existing correspondence systems.

**Continuous Improvement**

When underwriters deviate from system recommendations, these overrides are captured along with reasoning. This feedback informs ongoing refinement and surfaces patterns for quality review and potential protocol updates.

---

## What the System Does

| Capability | Description |
|------------|-------------|
| Case complexity classification | Assigns complexity tiers to enable appropriate case routing |
| Medical information extraction | Extracts structured data from unstructured medical documents |
| Risk factor identification | Identifies and summarises risk factors with explicit reasoning |
| Test recommendations | Suggests diagnostic tests with clinical rationale and expected yield |
| Decision option presentation | Presents structured decision pathways with supporting rationale |
| Communication drafting | Generates draft correspondence for underwriter review and approval |
| Override capture | Records underwriter deviations with reasoning for continuous improvement |
| Audit trail maintenance | Maintains complete records of recommendations, decisions, and rationale |

---

## What the System Does NOT Do

| Boundary | Description |
|----------|-------------|
| No automated decisions | The system does not accept, decline, postpone, or modify any application |
| No pricing calculation | Premium rating, loading factors, and pricing are entirely out of scope |
| No rule overrides | Business rules are immutable; the system cannot circumvent underwriting policy |
| No autonomous operation | All system outputs are advisory; no actions execute without human approval |
| No customer interaction | The system serves underwriting staff only; no applicant-facing capabilities |
| No workflow replacement | The system integrates with existing platforms; it does not replace case management |
| No opaque processing | Every recommendation includes explicit reasoning traceable to inputs and rules |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SYSTEMS                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ Policy Admin     │  │ Document         │  │ Correspondence           │   │
│  │ System           │  │ Management       │  │ System                   │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────▲─────────────┘   │
│           │                     │                         │                 │
└───────────┼─────────────────────┼─────────────────────────┼─────────────────┘
            │ Proposal Data       │ Documents               │ Approved Comms
            ▼                     ▼                         │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DECISION SUPPORT SYSTEM                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      API GATEWAY (Node.js)                          │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                    CORE SERVICES (Node.js/NestJS)                   │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ Case        │ │ Risk        │ │ Test        │ │ Communication│   │   │
│  │  │ Management  │ │ Assessment  │ │ Recommender │ │ Drafting    │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ Rules       │ │ NLP         │ │ NLG         │ │ Audit       │   │   │
│  │  │ Engine      │ │ Extraction  │ │ Assembly    │ │ Service     │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│        ┌───────────────────────────┼───────────────────────────┐           │
│        │                           │                           │           │
│        ▼                           ▼                           ▼           │
│  ┌───────────────┐     ┌───────────────────────┐     ┌─────────────────┐   │
│  │ ML Service    │     │ Database              │     │ Configuration   │   │
│  │ (Python)      │     │ (SQLite/PostgreSQL)   │     │ Store           │   │
│  │               │     │                       │     │                 │   │
│  │ - Inference   │     │ - Cases               │     │ - Business Rules│   │
│  │ - Training    │     │ - Decisions           │     │ - NLP Rules     │   │
│  │ - Override    │     │ - Overrides           │     │ - Phrase Blocks │   │
│  │   Learning    │     │ - Audit Logs          │     │ - Compliance    │   │
│  └───────────────┘     └───────────────────────┘     └─────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            ▲
            │
┌───────────┴─────────────────────────────────────────────────────────────────┐
│                     UNDERWRITER WORKBENCH (React)                           │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Case Queue  │ │ Case Detail │ │ Decision    │ │ Communication       │   │
│  │ & Triage    │ │ & Assessment│ │ Workspace   │ │ Review              │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**API Gateway**

Handles authentication, request routing, rate limiting, and API versioning. All external and internal communication flows through this layer.

**Core Services**

The primary business logic layer implementing case management, risk assessment, test recommendations, and communication drafting. Built on Node.js with NestJS framework.

**Rules Engine**

Executes deterministic business rules from configuration. All rule applications are logged with inputs, outputs, and rule identifiers for audit purposes.

**NLP Extraction**

Rule-based extraction of structured information from unstructured medical documents. Governed dictionaries and pattern-matching rules identify diseases, laboratory values, medications, and dates.

**NLG Assembly**

Reason-driven communication drafting using approved phrase blocks. Structured underwriting reasons are mapped to pre-approved, regulator-safe language units to assemble case-specific communications. Compliance language is locked and immutable.

**ML Service**

Python microservice handling predictive model inference and training. Communicates with core services via defined API contract. Interface is abstracted to permit Node.js fallback implementation if required.

**Database**

Relational storage for cases, decisions, overrides, and audit logs. SQLite for development with clean migration path to PostgreSQL or SQL Server.

**Configuration Store**

Versioned storage for business rules, NLP extraction rules, communication phrase blocks, and compliance text.

**Underwriter Workbench**

React single-page application providing case queue management, risk assessment display, decision capture, and communication review interfaces.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend Framework | Node.js with NestJS | Primary API and business logic layer |
| Frontend Framework | React | Underwriter workbench interface |
| Database | SQLite (MVP) | Migration path to PostgreSQL / SQL Server |
| ML Runtime | Python with scikit-learn / LightGBM | Abstracted interface permits Node.js fallback |
| NLP | Rule-based extraction in Node.js | Governed dictionaries and pattern matching |
| NLG | Reason-driven assembly in Node.js | Structured reasons to approved phrase blocks |
| API Style | RESTful | JSON request/response |

### Technology Principles

**No Generative AI at Runtime**

Text generation uses deterministic reason-driven assembly from structured inputs and approved phrase blocks. Large language models and probabilistic text generation are not used in production processing.

**Explainable Outputs**

Every recommendation traces to specific inputs, rules, and historical patterns. No opaque scoring or unexplainable predictions.

**Configuration-Driven Logic**

Business rules, extraction patterns, and phrase blocks are maintained in versioned configuration rather than embedded in application code.

**Abstracted Integrations**

External system integrations and ML capabilities are accessed through defined interfaces, permitting implementation substitution without core application changes.

---

## Governance and Human-in-the-Loop Principles

### Decision Authority

**Humans Decide, Systems Support**

The system provides information, analysis, and recommendations. Underwriters evaluate this input alongside their professional judgment and make all accept, decline, or modify decisions. No automated decision execution exists in the system.

**Authority Tiers**

- Junior Underwriters process routine and moderate complexity cases within defined authority limits
- Senior Underwriters handle all complexity tiers and review escalations
- Medical Directors provide clinical judgment on edge cases requiring specialist input

**Escalation Paths**

Cases exceeding underwriter authority automatically flag for escalation. The system facilitates routing but does not prevent underwriters from escalating any case they believe warrants senior review.

### Override Governance

**Capture and Learning**

When underwriters deviate from system recommendations on material matters—test selection, risk tier assignment, decision pathway—the system captures the override with mandatory reasoning. This creates an institutional record of expert judgment that informs continuous improvement.

**Pattern Surfacing**

Override patterns are analysed to identify systematic gaps between system recommendations and underwriter practice. These insights surface to underwriting management for review and potential protocol updates.

**Human Approval of Changes**

Machine learning insights do not automatically modify system behaviour. Pattern analysis may suggest rule changes or threshold adjustments; humans review and approve any modifications through standard governance processes.

### Audit and Compliance

**Complete Audit Trail**

Every recommendation, decision, and override is logged with timestamp, user identification, inputs considered, and reasoning provided. Audit history is immutable and retained per regulatory requirements.

**Regulatory Alignment**

System design assumes IRDAI regulatory oversight. All recommendations include traceable rationale suitable for regulatory inquiry. Compliance text in communications is locked and cannot be modified by system logic or user action.

**Explainability Requirement**

No recommendation enters the system without explicit reasoning. Underwriters can always understand why a particular test, risk assessment, or decision option is being suggested.

### Operational Boundaries

**What the System Controls**

- Recommendation logic and presentation
- Draft communication assembly
- Audit trail maintenance
- Override capture and analysis

**What Humans Control**

- All underwriting decisions
- Communication approval and dispatch
- Rule and threshold modifications
- Authority limit definitions
- Escalation judgments

---

## Project Status

This system is in active development for Phase 1 implementation. Current focus areas include core API development, rule engine implementation, and underwriter workbench interface design.

---

## Documentation

Additional documentation is maintained separately covering:

- API specifications and contracts
- Database schema design
- Business rule configuration
- NLP extraction rule governance
- Communication phrase block management
- ML model documentation
- Integration specifications

---

## Contact

For questions regarding this system, contact the underwriting technology team.
