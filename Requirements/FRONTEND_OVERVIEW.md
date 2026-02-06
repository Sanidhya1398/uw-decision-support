# Frontend Overview: Underwriter Workbench

## Document Purpose

This document specifies the underwriter workbench—the primary user interface through which underwriting staff interact with the decision support system. It describes who uses the system, what they see, what they can do, and what the interface must never do. This is a product specification, not a visual design document.

---

## Product Vision

The underwriter workbench is a tool that makes underwriters more effective, not a system that replaces them. It presents information clearly, surfaces relevant recommendations, captures decisions efficiently, and maintains complete audit trails. The interface respects underwriter expertise by providing support without presuming to decide.

Every screen answers two questions: "What do I need to know?" and "What should I do next?" The interface guides without constraining, informs without overwhelming, and documents without burdening.

---

## Target Users

### User Roles

The workbench serves three primary user roles with distinct responsibilities and needs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER ROLES                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    JUNIOR UNDERWRITER                               │   │
│  │                                                                     │   │
│  │  Profile:                                                          │   │
│  │  • 0-3 years underwriting experience                               │   │
│  │  • Completed foundational underwriting training                    │   │
│  │  • Working toward professional certifications                      │   │
│  │                                                                     │   │
│  │  Responsibilities:                                                 │   │
│  │  • Process routine and moderate complexity cases                   │   │
│  │  • Apply standard underwriting protocols                           │   │
│  │  • Escalate cases exceeding authority or expertise                 │   │
│  │  • Document decisions thoroughly                                   │   │
│  │                                                                     │   │
│  │  Authority Limits:                                                 │   │
│  │  • Sum assured up to defined threshold (e.g., ₹50L)               │   │
│  │  • Standard risk profiles only                                     │   │
│  │  • Cannot approve substandard terms without senior review          │   │
│  │  • Cannot decline without senior review                            │   │
│  │                                                                     │   │
│  │  Interface Needs:                                                  │   │
│  │  • Clear guidance on protocols and requirements                    │   │
│  │  • Visible escalation paths                                        │   │
│  │  • Learning-oriented context (why recommendations are made)        │   │
│  │  • Confidence indicators for system suggestions                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SENIOR UNDERWRITER                               │   │
│  │                                                                     │   │
│  │  Profile:                                                          │   │
│  │  • 3-10+ years underwriting experience                             │   │
│  │  • Professional certifications held                                │   │
│  │  • Deep knowledge of medical and financial underwriting            │   │
│  │                                                                     │   │
│  │  Responsibilities:                                                 │   │
│  │  • Process all complexity tiers including complex cases            │   │
│  │  • Review escalations from junior underwriters                     │   │
│  │  • Make substandard and decline decisions                          │   │
│  │  • Mentor junior staff                                             │   │
│  │  • Identify cases requiring Medical Director input                 │   │
│  │                                                                     │   │
│  │  Authority Limits:                                                 │   │
│  │  • Sum assured up to elevated threshold (e.g., ₹2Cr)              │   │
│  │  • Can approve substandard terms within guidelines                 │   │
│  │  • Can decline within guidelines                                   │   │
│  │  • Must escalate edge cases and policy exceptions                  │   │
│  │                                                                     │   │
│  │  Interface Needs:                                                  │   │
│  │  • Efficient case processing (minimal clicks for common actions)   │   │
│  │  • Quick access to historical patterns and similar cases           │   │
│  │  • Override capability with streamlined reasoning capture          │   │
│  │  • Escalation queue management                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MEDICAL DIRECTOR                                 │   │
│  │                                                                     │   │
│  │  Profile:                                                          │   │
│  │  • Licensed physician with clinical experience                     │   │
│  │  • Insurance medicine expertise                                    │   │
│  │  • Authority on medical underwriting standards                     │   │
│  │                                                                     │   │
│  │  Responsibilities:                                                 │   │
│  │  • Provide clinical judgment on complex medical cases              │   │
│  │  • Review edge cases referred by senior underwriters               │   │
│  │  • Approve exceptions to standard medical protocols                │   │
│  │  • Guide protocol development and updates                          │   │
│  │  • Final authority on medical risk assessment                      │   │
│  │                                                                     │   │
│  │  Authority Limits:                                                 │   │
│  │  • Highest medical underwriting authority                          │   │
│  │  • Can override standard protocols with documented rationale       │   │
│  │  • Must escalate policy exceptions to Chief Underwriter            │   │
│  │                                                                     │   │
│  │  Interface Needs:                                                  │   │
│  │  • Clinical detail emphasis (full medical records access)          │   │
│  │  • Consultation workflow (input without full case ownership)       │   │
│  │  • Protocol exception documentation                                │   │
│  │  • Efficient queue for referred cases                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Secondary User Roles

The workbench also supports read-only or limited-function access for oversight roles:

| Role | Access Level | Purpose |
|------|--------------|---------|
| Underwriting Manager | Read + Reports | Team oversight, performance monitoring, pattern review |
| Audit | Read Only | Decision review, compliance verification, audit trail access |
| Quality Assurance | Read + Annotations | Decision sampling, quality scoring, feedback provision |

These roles do not process cases and are not the primary design focus. Their needs are met through filtered views of the same underlying screens.

---

## Information Architecture

### Screen Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCREEN HIERARCHY                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DASHBOARD                                        │   │
│  │                    Entry point and overview                         │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│          ┌───────────────────────┼───────────────────────┐                 │
│          │                       │                       │                 │
│          ▼                       ▼                       ▼                 │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐          │
│  │  CASE QUEUE   │      │ CASE DETAIL   │      │   REPORTS     │          │
│  │               │      │               │      │               │          │
│  │  Work list    │      │  Single case  │      │  Analytics    │          │
│  │  management   │──────│  processing   │      │  and exports  │          │
│  └───────────────┘      └───────┬───────┘      └───────────────┘          │
│                                 │                                          │
│          ┌──────────────────────┼──────────────────────┐                   │
│          │                      │                      │                   │
│          ▼                      ▼                      ▼                   │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐            │
│  │    RISK       │     │    TEST       │     │  DECISION     │            │
│  │  ASSESSMENT   │     │  MANAGEMENT   │     │  WORKSPACE    │            │
│  │               │     │               │     │               │            │
│  │  Risk factors │     │  Test orders  │     │  Decision     │            │
│  │  and analysis │     │  and results  │     │  selection    │            │
│  └───────────────┘     └───────────────┘     └───────┬───────┘            │
│                                                      │                     │
│                                                      ▼                     │
│                                             ┌───────────────┐              │
│                                             │ COMMUNICATION │              │
│                                             │    REVIEW     │              │
│                                             │               │              │
│                                             │ Draft review  │              │
│                                             │ and approval  │              │
│                                             └───────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

### 1. Dashboard

#### Purpose

The dashboard provides underwriters with an at-a-glance view of their work status and priorities. It answers: "What needs my attention right now?"

#### Information Displayed

| Element | Description |
|---------|-------------|
| Case Queue Summary | Count of cases by status (pending, in progress, awaiting info, awaiting review) |
| Priority Alerts | Cases requiring urgent attention (approaching SLA, escalations received) |
| Personal Metrics | Cases processed today/this week, average processing time |
| Team Notifications | Announcements, system updates, protocol changes |
| Quick Actions | Shortcuts to common tasks (next case, pending approvals) |

#### Role Variations

| Role | Dashboard Additions |
|------|---------------------|
| Junior Underwriter | Escalation status (cases sent for review), learning tips |
| Senior Underwriter | Escalation inbox (cases awaiting their review), team queue visibility |
| Medical Director | Consultation requests, pending clinical reviews |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Open Next Case | Navigate to highest-priority case in queue |
| View Full Queue | Navigate to case queue screen |
| Access Reports | Navigate to reports section |
| Acknowledge Alert | Mark priority alert as seen |

---

### 2. Case Queue

#### Purpose

The case queue displays all cases assigned to or accessible by the underwriter. It enables work management, prioritisation, and case selection. It answers: "Which case should I work on?"

#### Information Displayed

| Column | Description |
|--------|-------------|
| Case Reference | Unique identifier for the case |
| Applicant Name | Primary applicant name |
| Product | Insurance product applied for |
| Sum Assured | Coverage amount requested |
| Complexity | Assigned complexity tier (Routine, Moderate, Complex) |
| Status | Current case status |
| Age in Queue | Time since case entered current status |
| SLA Status | On track, at risk, or breached |
| Assigned To | Current case owner |
| Flags | Special indicators (escalation, priority, waiting) |

#### Filtering and Sorting

| Filter | Options |
|--------|---------|
| Status | All, Pending Review, In Progress, Awaiting Information, Awaiting Decision |
| Complexity | All, Routine, Moderate, Complex |
| Assignment | My Cases, Unassigned, Team Cases |
| SLA Status | All, On Track, At Risk, Breached |
| Date Range | Received date, last activity date |

| Sort | Options |
|------|---------|
| Priority | System-calculated priority score |
| Age | Oldest first, newest first |
| SLA | Most urgent first |
| Complexity | Routine first, complex first |
| Sum Assured | Highest first, lowest first |

#### Role Variations

| Role | Queue Scope |
|------|-------------|
| Junior Underwriter | Own cases + unassigned routine/moderate cases |
| Senior Underwriter | Own cases + escalation inbox + all team cases |
| Medical Director | Consultation requests + referred cases |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Open Case | Navigate to case detail for selected case |
| Assign to Self | Take ownership of unassigned case |
| Reassign | Transfer case to another underwriter (with permission) |
| Bulk Select | Select multiple cases for bulk actions |
| Export List | Download queue as spreadsheet |

---

### 3. Case Detail

#### Purpose

The case detail screen is the primary workspace for evaluating a single case. It presents all relevant information and provides access to assessment, testing, and decision functions. It answers: "What do I need to know about this case?"

#### Information Displayed

**Header Section**

| Element | Description |
|---------|-------------|
| Case Reference | Unique identifier |
| Status Badge | Current case status with visual indicator |
| Complexity Badge | Assigned complexity tier |
| SLA Indicator | Time remaining or elapsed |
| Quick Actions | Common actions accessible from header |

**Applicant Information**

| Element | Description |
|---------|-------------|
| Personal Details | Name, age, gender, occupation, location |
| Contact Information | Address, phone, email |
| Policy Details | Product, sum assured, premium basis, policy term |
| Agent Information | Distributing agent, channel |

**Medical Summary**

| Element | Description |
|---------|-------------|
| Disclosed Conditions | List of conditions declared by applicant |
| Current Medications | Active prescriptions |
| Lifestyle Factors | Smoking, alcohol, hazardous activities |
| Family History | Relevant hereditary conditions |
| BMI and Vitals | Height, weight, BMI, blood pressure if available |

**Document Panel**

| Element | Description |
|---------|-------------|
| Document List | All documents associated with case |
| Document Type | Classification (application, medical report, lab result, etc.) |
| Upload Date | When document was received |
| Processing Status | Pending review, extracted, verified |
| Quick View | Preview without leaving case detail |

**Extracted Data**

| Element | Description |
|---------|-------------|
| NLP Extractions | Structured data extracted from documents |
| Confidence Indicators | Extraction confidence levels |
| Review Flags | Items requiring underwriter verification |
| Source Links | Navigate to source document for each extraction |

**Case Timeline**

| Element | Description |
|---------|-------------|
| Activity History | Chronological list of all case activities |
| Status Changes | When and why status changed |
| User Actions | Who did what, when |
| System Events | Automated processing events |
| Notes | Underwriter notes and comments |

#### Navigation Tabs

The case detail screen includes tabs for deeper exploration:

| Tab | Content |
|-----|---------|
| Overview | Summary view (default) |
| Risk Assessment | Detailed risk analysis |
| Tests | Test recommendations and results |
| Decision | Decision options and selection |
| Communications | Draft and sent correspondence |
| Documents | Full document management |
| History | Complete audit trail |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Add Note | Record observation or comment |
| Upload Document | Attach additional documentation |
| Request Information | Initiate information request workflow |
| Escalate | Send case for senior review |
| Navigate to Assessment | Proceed to risk assessment |
| Navigate to Tests | Proceed to test management |
| Navigate to Decision | Proceed to decision workspace |

---

### 4. Risk Assessment Screen

#### Purpose

The risk assessment screen presents the system's analysis of case risk factors and allows underwriters to review, verify, and adjust the assessment. It answers: "What are the risk factors and how significant are they?"

#### Information Displayed

**Complexity Classification**

| Element | Description |
|---------|-------------|
| Assigned Tier | Routine, Moderate, or Complex |
| Confidence Score | System confidence in classification |
| Contributing Factors | Factors driving the classification |
| Factor Weights | Relative importance of each factor |
| Suggested Routing | Recommended underwriter level |

**Risk Factor Analysis**

| Element | Description |
|---------|-------------|
| Factor Category | Medical, lifestyle, financial, occupational |
| Factor Description | Specific risk factor identified |
| Severity | Low, moderate, high, critical |
| Source | Where factor was identified (disclosure, extraction, test) |
| Impact Direction | Increases risk, decreases risk, neutral |
| Supporting Evidence | Data points supporting the factor |

**Risk Summary**

| Element | Description |
|---------|-------------|
| Overall Risk Profile | Narrative summary of key risks |
| Primary Concerns | Top risk factors requiring attention |
| Mitigating Factors | Factors that reduce risk |
| Comparison to Similar Cases | How this profile compares historically |
| Confidence Indicators | System confidence in assessment |

**Rule Triggers**

| Element | Description |
|---------|-------------|
| Triggered Rules | Business rules that fired for this case |
| Rule Reference | Rule identifier for audit |
| Rule Rationale | Why the rule applies |
| Rule Output | What the rule produced (requirement, flag, etc.) |

**ML Insights**

| Element | Description |
|---------|-------------|
| Predictions | ML model predictions with confidence |
| Feature Contributions | What drove each prediction |
| Override Likelihood | Historical override rate for similar profiles |
| Similar Cases | Historical cases with similar profiles |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Verify Extraction | Confirm or correct extracted data |
| Add Risk Factor | Manually add factor not identified by system |
| Adjust Severity | Override system severity assessment |
| Reclassify Complexity | Change complexity tier (with reasoning) |
| Add Assessment Note | Document observation or concern |
| Proceed to Tests | Navigate to test management |
| Request Consultation | Request Medical Director input on specific factor |

---

### 5. Test Management Screen

#### Purpose

The test management screen presents recommended tests, captures test ordering decisions, and displays test results. It answers: "What tests should be ordered and what did they show?"

#### Information Displayed

**Test Recommendations**

| Element | Description |
|---------|-------------|
| Recommended Panel | System-suggested tests |
| Requirement Type | Mandatory, Conditional, Suggested |
| Clinical Rationale | Why test is recommended |
| Protocol Reference | Underwriting protocol citation |
| Expected Yield | Predicted diagnostic value |
| Estimated Cost | Approximate test cost |
| Turnaround Time | Expected time to receive results |

**Test Categories**

| Category | Description |
|----------|-------------|
| Mandatory | Required by regulation or policy; cannot be waived |
| Conditional | Recommended based on case factors; discretionary |
| Suggested | May provide value; underwriter judgment |
| Additional | Tests available but not recommended |

**Test Results (when available)**

| Element | Description |
|---------|-------------|
| Test Name | Specific test performed |
| Result Value | Reported result |
| Reference Range | Normal range for comparison |
| Abnormal Flag | Whether result is outside normal |
| Result Date | When test was performed |
| Source Document | Link to result document |

**Result Interpretation Aids**

| Element | Description |
|---------|-------------|
| Clinical Context | What the result means for this applicant |
| Risk Implications | How result affects risk assessment |
| Follow-up Suggestions | Additional tests or information that may be warranted |
| Historical Comparison | Comparison to prior results if available |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Approve Panel | Accept recommended test panel as-is |
| Add Test | Add test not in recommendations |
| Remove Test | Remove recommended test (conditional/suggested only) |
| Substitute Test | Replace recommended test with alternative |
| Document Reasoning | Provide rationale for panel modifications |
| Order Tests | Finalise panel and initiate ordering workflow |
| View Result | Open detailed result view |
| Request Retest | Order repeat of specific test |
| Proceed to Decision | Navigate to decision workspace |

---

### 6. Decision Workspace

#### Purpose

The decision workspace presents available decision options, supports decision selection, and captures decision rationale. It answers: "What are my options and which should I select?"

#### Information Displayed

**Decision Context Summary**

| Element | Description |
|---------|-------------|
| Risk Summary | Key points from risk assessment |
| Test Summary | Material findings from test results |
| Flags and Alerts | Outstanding concerns or requirements |
| Authority Check | Whether decision options are within user's authority |

**Decision Options**

| Element | Description |
|---------|-------------|
| Option Name | Standard Acceptance, Modified Acceptance, etc. |
| Option Description | What this option means |
| Supporting Factors | Case elements that support this option |
| Weighing Factors | Case elements that weigh against this option |
| Guideline Reference | Relevant policy or protocol citation |
| Authority Required | Underwriter level needed to select |
| Documentation Required | What must be documented for this option |

**Option Categories**

| Category | Options Included |
|----------|------------------|
| Acceptance | Standard terms, modified terms (with specific modifications) |
| Deferral | Request additional information, request additional tests |
| Referral | Senior review, Medical Director review, specialist consultation |
| Postponement | Defer decision pending time-based condition |
| Decline | Unable to offer coverage (within guidelines) |

**Modification Details (for Modified Acceptance)**

| Element | Description |
|---------|-------------|
| Available Modifications | Exclusions, waiting periods, benefit limits |
| Modification Rationale | Why modification is warranted |
| Guideline Basis | Protocol supporting the modification |
| Applicant Impact | How modification affects coverage |

**Historical Context**

| Element | Description |
|---------|-------------|
| Similar Cases | How similar profiles were decided |
| Outcome Distribution | Percentage breakdown by decision type |
| Override Patterns | Common deviations for this profile |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Select Option | Choose a decision pathway |
| Document Rationale | Provide reasoning for selection |
| Add Condition | Attach specific conditions to decision |
| Specify Modification | Define exclusion or limitation details |
| Escalate | Refer to higher authority |
| Request Consultation | Seek input before deciding |
| Preview Communication | See draft correspondence for selected option |
| Confirm Decision | Finalise decision and proceed to communication |

---

### 7. Communication Review Screen

#### Purpose

The communication review screen presents system-generated draft correspondence for underwriter review, editing, and approval. It answers: "What will we tell the applicant and is it correct?"

#### Information Displayed

**Draft Communication**

| Element | Description |
|---------|-------------|
| Communication Type | Requirements letter, decision notice, etc. |
| Recipient | Applicant, agent, or other party |
| Subject Line | Communication subject |
| Body Content | Full draft text |
| Edit Zones | Clearly marked editable vs. locked sections |
| Reason Codes | System reasons driving content (visible for reference) |

**Content Structure**

| Section | Editability |
|---------|-------------|
| Header/Letterhead | Locked |
| Salutation | Limited (name correction only) |
| Body Paragraphs | Editable |
| Compliance Disclosures | Locked |
| Closing | Limited |
| Signature Block | Locked |

**Supporting Information**

| Element | Description |
|---------|-------------|
| Decision Summary | What decision this communication reflects |
| Included Elements | What information is covered |
| Omitted Elements | What is intentionally not included |
| Tone Guidance | Appropriate tone for this communication type |

**Compliance Checklist**

| Element | Description |
|---------|-------------|
| Required Disclosures | Regulatory disclosures that must be present |
| Verification Status | Whether each requirement is satisfied |
| Prohibited Content | Content that must not appear |
| Validation Status | Whether draft passes all checks |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Edit Content | Modify text in editable sections |
| Preview | View formatted communication as recipient will see it |
| Validate | Run compliance checks |
| Save Draft | Save changes without approving |
| Approve | Finalise communication for dispatch |
| Reject Draft | Request regeneration with different parameters |
| Add Attachment | Include additional documents with communication |

---

### 8. Reports and Analytics

#### Purpose

The reports section provides underwriters and managers with performance metrics, trend analysis, and exportable data. It answers: "How am I/we performing and what patterns exist?"

#### Available Reports

**Personal Performance**

| Report | Content |
|--------|---------|
| Cases Processed | Volume by time period, status, complexity |
| Processing Time | Average time by case type |
| Decision Distribution | Breakdown of decisions made |
| Override Patterns | Where user deviates from recommendations |

**Queue Analytics**

| Report | Content |
|--------|---------|
| Queue Depth | Current backlog by category |
| Aging Analysis | Cases by time in queue |
| SLA Performance | On-time vs. breached |
| Bottleneck Identification | Where cases are delayed |

**Team Performance (Manager View)**

| Report | Content |
|--------|---------|
| Team Throughput | Volume across team members |
| Consistency Analysis | Decision variation across underwriters |
| Escalation Patterns | What's being escalated and why |
| Training Opportunities | Areas where guidance may help |

**System Insights**

| Report | Content |
|--------|---------|
| Recommendation Accuracy | How often recommendations are followed |
| Override Analysis | Aggregated override patterns |
| Test Yield Analysis | Actual vs. predicted diagnostic yield |
| Processing Efficiency | Time saved vs. manual baseline |

#### User Actions Available

| Action | Description |
|--------|-------------|
| Generate Report | Run report with selected parameters |
| Schedule Report | Set up recurring report delivery |
| Export Data | Download report data as spreadsheet |
| Share Report | Send report to colleagues |

---

## Cross-Cutting Features

### Search

Global search available from all screens:

| Search Scope | Searchable Fields |
|--------------|-------------------|
| Cases | Case reference, applicant name, policy number |
| Documents | Document content, filename |
| Communications | Correspondence content, recipient |

### Notifications

Real-time alerts for:

| Notification Type | Trigger |
|-------------------|---------|
| Escalation Received | Another underwriter escalates case to user |
| Information Received | Requested documents or test results arrive |
| SLA Warning | Case approaching SLA threshold |
| Assignment | Case assigned to user |
| System Alert | Important system announcements |

### Help and Guidance

Contextual assistance throughout:

| Help Type | Description |
|-----------|-------------|
| Field Tooltips | Hover explanations for data fields |
| Protocol Links | Quick access to relevant underwriting protocols |
| Guided Workflows | Step-by-step assistance for complex tasks |
| Knowledge Base | Searchable documentation and FAQs |

### Accessibility

The interface supports:

| Requirement | Implementation |
|-------------|----------------|
| Keyboard Navigation | All functions accessible without mouse |
| Screen Reader Support | Proper labelling and structure |
| Colour Contrast | WCAG AA compliance |
| Text Scaling | Functional at 200% zoom |
| Focus Indicators | Visible focus states |

---

## Frontend Constraints

### What the Frontend Must Never Do

The following constraints are absolute. The frontend is a presentation and interaction layer, not a decision-making component.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND PROHIBITIONS                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO BUSINESS LOGIC EXECUTION                      │   │
│  │                                                                     │   │
│  │  The frontend displays results of backend calculations.            │   │
│  │  It does not perform:                                              │   │
│  │  • Risk scoring or calculation                                     │   │
│  │  • Complexity classification                                       │   │
│  │  • Test recommendation logic                                       │   │
│  │  • Decision option determination                                   │   │
│  │  • Compliance validation                                           │   │
│  │                                                                     │   │
│  │  All business logic executes on the backend. The frontend          │   │
│  │  renders what the backend provides.                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO DIRECT DATA MODIFICATION                      │   │
│  │                                                                     │   │
│  │  The frontend cannot write directly to the database.               │   │
│  │  All data changes flow through backend APIs that:                  │   │
│  │  • Validate the change                                             │   │
│  │  • Check authorisation                                             │   │
│  │  • Record audit trail                                              │   │
│  │  • Apply business rules                                            │   │
│  │                                                                     │   │
│  │  The frontend sends requests; the backend decides whether          │   │
│  │  to execute them.                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO POLICY ACTION TRIGGERS                        │   │
│  │                                                                     │   │
│  │  The frontend cannot trigger actions that affect policies:         │   │
│  │  • Cannot issue policies                                           │   │
│  │  • Cannot decline applications                                     │   │
│  │  • Cannot modify coverage terms                                    │   │
│  │  • Cannot dispatch communications without backend approval         │   │
│  │  • Cannot order tests without backend validation                   │   │
│  │                                                                     │   │
│  │  The frontend captures underwriter intent. The backend             │   │
│  │  validates and executes (or routes to external systems).           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO AUTHORISATION DECISIONS                       │   │
│  │                                                                     │   │
│  │  The frontend does not determine what users can do.                │   │
│  │  • User permissions are enforced by the backend                    │   │
│  │  • The frontend may hide unavailable options for usability         │   │
│  │  • But hiding is cosmetic; the backend enforces                    │   │
│  │                                                                     │   │
│  │  A user cannot gain access to functions by manipulating            │   │
│  │  the frontend. Authorisation is server-side.                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO SENSITIVE DATA CACHING                        │   │
│  │                                                                     │   │
│  │  The frontend does not persistently store:                         │   │
│  │  • Personal health information                                     │   │
│  │  • Medical records or test results                                 │   │
│  │  • Financial information                                           │   │
│  │  • Authentication credentials                                      │   │
│  │                                                                     │   │
│  │  Session data for immediate use is acceptable.                     │   │
│  │  Persistent local storage of sensitive data is prohibited.         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO BACKEND BYPASS                                │   │
│  │                                                                     │   │
│  │  The frontend cannot:                                              │   │
│  │  • Call external systems directly                                  │   │
│  │  • Access databases directly                                       │   │
│  │  • Invoke ML models directly                                       │   │
│  │  • Send communications directly                                    │   │
│  │                                                                     │   │
│  │  All external interactions flow through the backend API layer.     │   │
│  │  The frontend knows only about the backend.                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO COMPLIANCE TEXT MODIFICATION                  │   │
│  │                                                                     │   │
│  │  Locked compliance text in communications cannot be edited         │   │
│  │  through the frontend. The UI must:                                │   │
│  │  • Visually distinguish locked content                             │   │
│  │  • Prevent edit actions on locked sections                         │   │
│  │  • Not provide workarounds (copy-paste, etc.)                      │   │
│  │                                                                     │   │
│  │  The backend also validates that approved communications           │   │
│  │  contain unmodified compliance text.                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NO AUDIT TRAIL GAPS                              │   │
│  │                                                                     │   │
│  │  Every user action that affects case state must be recorded.       │   │
│  │  The frontend must:                                                │   │
│  │  • Send all actions through audited API endpoints                  │   │
│  │  • Not provide ways to make changes without audit capture          │   │
│  │  • Not allow bulk actions that bypass individual audit records     │   │
│  │                                                                     │   │
│  │  If an action happened, there must be an audit record.             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What the Frontend Must Always Do

| Requirement | Rationale |
|-------------|-----------|
| Show confidence indicators | Users must know when system suggestions are uncertain |
| Display reasoning | Users must understand why recommendations are made |
| Preserve user input | Draft text, notes, and work-in-progress must not be lost |
| Confirm destructive actions | Irreversible actions require explicit confirmation |
| Indicate loading states | Users must know when operations are in progress |
| Handle errors gracefully | Failures must be communicated clearly with recovery options |
| Maintain session security | Timeout inactive sessions; require re-authentication |
| Log client-side errors | Frontend errors must be captured for debugging |

---

## User Experience Principles

### Efficiency

| Principle | Implementation |
|-----------|----------------|
| Minimise clicks | Common workflows completable in few steps |
| Keyboard shortcuts | Power users can work without mouse |
| Smart defaults | System pre-selects likely options |
| Batch operations | Handle multiple items where appropriate |
| Persistent filters | Remember user preferences |

### Clarity

| Principle | Implementation |
|-----------|----------------|
| Progressive disclosure | Show summary first, details on demand |
| Visual hierarchy | Important information prominent |
| Consistent terminology | Same words mean same things everywhere |
| Status visibility | Always clear what state case is in |
| Outcome preview | Show what will happen before committing |

### Trust

| Principle | Implementation |
|-----------|----------------|
| Transparency | Show how recommendations were derived |
| Confidence indication | Display uncertainty appropriately |
| Override support | Never block professional judgment |
| Audit visibility | Users can see their action history |
| Error honesty | Admit when something went wrong |

### Safety

| Principle | Implementation |
|-----------|----------------|
| Confirmation dialogs | Verify before irreversible actions |
| Undo capability | Reverse recent actions where possible |
| Draft preservation | Auto-save work in progress |
| Session protection | Prevent concurrent edit conflicts |
| Data validation | Catch errors before submission |

---

## Technical Specifications

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | Latest - 2 |
| Firefox | Latest - 2 |
| Safari | Latest - 2 |
| Edge | Latest - 2 |

### Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load | < 3 seconds |
| Screen Navigation | < 1 second |
| Search Results | < 2 seconds |
| Form Submission | < 2 seconds |
| Report Generation | < 5 seconds (simple), < 30 seconds (complex) |

### Offline Behaviour

The application requires network connectivity. Offline mode is not supported due to:
- Real-time data requirements
- Audit trail integrity
- Security considerations

The interface clearly indicates connection status and prevents actions when offline.

---

## Appendix: Screen-to-API Mapping

| Screen | Primary API Endpoints |
|--------|----------------------|
| Dashboard | GET /dashboard, GET /notifications |
| Case Queue | GET /cases, POST /cases/assign |
| Case Detail | GET /cases/{id}, POST /cases/{id}/notes |
| Risk Assessment | GET /cases/{id}/risk, POST /cases/{id}/risk/override |
| Test Management | GET /cases/{id}/tests, POST /cases/{id}/tests/order |
| Decision Workspace | GET /cases/{id}/options, POST /cases/{id}/decision |
| Communication Review | GET /cases/{id}/communications, POST /cases/{id}/communications/approve |
| Reports | GET /reports/{type}, POST /reports/export |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial specification |

This document should be reviewed when user requirements change or significant interface modifications are proposed.
