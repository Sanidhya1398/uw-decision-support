# Project: Health Insurance Underwriting Decision Support System

## Overview
A decision-support platform for health insurance underwriting operations (Indian market, IRDAI regulated). The system provides risk assessment insights, test recommendations, and communication drafting to assist underwriters. All decisions remain with qualified underwriting personnel — no automated decisions.

## Tech Stack
- **Backend**: Node.js + NestJS + TypeORM + SQLite (migration path to PostgreSQL)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + React Query (TanStack) + Zustand
- **ML Service**: Python + scikit-learn / LightGBM (3 models: Complexity Classifier, Test Yield Predictor, Override Likelihood Estimator)
- **NLP/NLG**: Rule-based extraction (no ML), reason-driven text assembly (no generative AI)

## Project Structure
```
D:\UW AUTO 2\
├── backend\                    # NestJS API (port 3001)
│   ├── config\                 # JSON config files (rules, protocols, guidelines)
│   │   ├── risk-rules.json
│   │   ├── test-protocols.json
│   │   ├── decision-rules.json
│   │   ├── evidence-coverage-rules.json
│   │   ├── medical-dictionary.json
│   │   └── product-modification-guidelines.json
│   ├── src\
│   │   ├── entities\           # TypeORM entities
│   │   │   ├── case.entity.ts            # Case with productCode, productName, complexityTier, status
│   │   │   ├── applicant.entity.ts
│   │   │   ├── medical-disclosure.entity.ts
│   │   │   ├── risk-factor.entity.ts     # RiskFactor with severity, impactDirection, category
│   │   │   ├── test-recommendation.entity.ts
│   │   │   ├── test-result.entity.ts
│   │   │   ├── decision.entity.ts
│   │   │   ├── communication.entity.ts
│   │   │   ├── document.entity.ts
│   │   │   ├── override.entity.ts
│   │   │   └── audit-log.entity.ts       # AuditLog with AuditAction enum, AuditCategory enum
│   │   ├── modules\
│   │   │   ├── cases\          # Case management (CRUD, assign, status, notes, history)
│   │   │   ├── risk\           # Risk assessment (factors, complexity classification)
│   │   │   ├── tests\          # Test recommendations, ordering, removal impact
│   │   │   ├── decisions\      # Decision options, making decisions, product guidance
│   │   │   ├── communications\ # Communication generation, editing, approval
│   │   │   ├── documents\      # Document upload, extraction, verification
│   │   │   ├── overrides\      # Override capture, patterns, validation, learning
│   │   │   ├── rules\          # Rules engine (JSON config evaluation, 13 operators)
│   │   │   ├── audit\          # Audit logging service
│   │   │   ├── nlp\            # Rule-based medical entity extraction
│   │   │   └── ml\             # ML service integration (Python microservice)
│   │   └── database\
│   │       ├── seed.ts         # Main database seeder
│   │       └── seed-learning.ts # Learning data seeder
│   └── uw_decision_support.db  # SQLite database file
├── frontend\                   # React SPA (port 3000, proxies /api to 3001)
│   └── src\
│       ├── components\
│       │   ├── case\           # Case detail tab components
│       │   │   ├── DecisionTab.tsx       # Decision options + product guidance panel
│       │   │   ├── RiskTab.tsx
│       │   │   ├── TestsTab.tsx
│       │   │   ├── CommunicationTab.tsx
│       │   │   ├── DocumentsTab.tsx
│       │   │   ├── OverridesTab.tsx
│       │   │   └── HistoryTab.tsx
│       │   └── ...
│       ├── pages\              # Route pages (Dashboard, CaseQueue, CaseDetail, RulesAdmin)
│       ├── services\
│       │   └── api.ts          # Centralized Axios API layer
│       └── stores\
│           └── authStore.ts    # Zustand auth store
├── ml-service\                 # Python ML microservice
├── Requirements\               # 8 markdown requirement docs
└── Project Docs\               # Additional project documentation
```

## Key Commands
- **Backend build**: `cd backend && npm run build` (nest build)
- **Backend dev**: `cd backend && npm run start:dev` (nest start --watch, port 3001)
- **Frontend dev**: `cd frontend && npm run dev` (vite, port 3000)
- **Frontend build**: `cd frontend && npm run build` (tsc && vite build)
- **Seed DB**: `cd backend && npm run seed`
- **Swagger docs**: http://localhost:3001/api/docs

## Key Patterns
- **Config-driven rules**: All business rules in JSON under `backend/config/`, evaluated by RulesService with compound conditions and 13 operators
- **Audit trail**: Every action logged via AuditService with AuditAction enum and AuditCategory
- **Human-in-the-loop**: All outputs are advisory; no automated decisions
- **Override learning**: Captures underwriter deviations for ML improvement
- **API structure**: REST at `/api/v1/`, case-scoped endpoints like `/api/v1/cases/:caseId/decisions`

## Database Notes
- SQLite file: `backend/uw_decision_support.db`
- Product codes in DB use format like `TERM-LIFE-01` (not underscores)
- Risk factor severity/impactDirection may be stored in mixed case (both `low` and `LOW`) — always normalize to lowercase when comparing
- Seeded cases: UW-2024-001 through UW-2024-128+

## Architecture Principles
- No generative AI at runtime — deterministic rule-based processing only
- Explainable outputs — every recommendation traces to inputs and rules
- No premium calculation — system never computes prices
- No automated decisions — all actions require human approval
- Compliance text is locked and immutable
