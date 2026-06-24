# Management Tools Integration & Project Cost Control — Proposal

**Status:** Approved for Phase 1 development  
**Date:** 2026-05-20  
**Audience:** Product owner, PMO leads, developers  

**Decisions recorded:**

| # | Decision |
|---|----------|
| D1 | **Full Program entity** — `PGM-YYYY-NNN` parent; **project numbers** `{program}-P{NN}`; one program → many projects |
| D2 | **Baseline unlock** — **Admin only** |
| D3 | Default monitoring cadence — *not specified; default to **monthly** in implementation unless changed* |
| D4 | **Procurement in Phase 1** — `projectId` on POs + **frontload pipeline**: opportunity number → quotation numbers → **signed quotation** rolls into project commitment |
| D5 | **Management Hub** — **keep flat grid** (no tile grouping); add top CTAs only |
| D6 | **Playbook** — **English first** |  

---

## 1. Executive summary

STREFEX today offers **16 management modules** from the Management Hub, but they behave mostly as **separate apps**. Project Management tracks **budget vs task costs**; Enterprise and Cost Management hold **company-wide cost structures** with no project link; Procurement, Contracts, and Spend Analysis do not roll up into a project baseline.

**Proposal:** Introduce a **Program → Project** hierarchy with **structured numbering** (`PGM-2026-001` / `PGM-2026-001-P02`), a shared **Cost Control Pack** per project (baseline, commitments, actuals, forecast, variance), and cross-module links — so program setup and budget planning become the spine for monitoring across Management Hub tools, without rebuilding the platform as a monolithic ERP.

**Recommended approach:** Phased delivery over 4 stages; **Phase 1** delivers program/project spine, control UX, playbook, and **procurement frontload + PO linking**.

---

## 2. Current state (as-is)

### 2.1 Management Hub modules

| Module | Path | Data store | Linked to project? |
|--------|------|------------|------------------|
| Project Management | `/project-management` | `projectStore` | Self (budget + task `cost`) |
| Cost Management | `/cost-management` | `costStore` | No |
| Enterprise Management | `/enterprise/*` | `enterpriseStore` | No |
| Procurement | `/procurement` | `procurementStore` | No |
| Contract Management | `/contracts` | contracts snapshot | No |
| Spend Analysis | `/spend-analysis` | derived from procurement | No |
| Vendor Master | `/vendors` | `vendorStore` | No |
| Audit management | `/management/auditors` | Supabase + Audit Pro | Optional audit ↔ project (future) |
| Production, HR, Team, etc. | various | separate stores | No |

Cloud sync (`tenant_workspace_snapshots`) already syncs `projects`, `cost`, `enterprise`, `procurement`, etc. **in parallel** — but there is **no shared key** tying spend in one module to a project in another.

### 2.2 What Project Management already does well

- Project **budget** + currency at creation  
- **Task-level cost** rolls up to `totalSpent` in portfolio executive summary  
- **RAG status**, KPIs, benefits narrative, risk register (Falcon-style PPM)  
- **Portfolio roll-up** PDF with budget remaining across projects  

### 2.3 Gaps

1. **No single “source of truth” for project budget** — Enterprise OPEX/CAPEX and Cost BOM scenarios are not allocated to projects.  
2. **Procurement POs / contracts** cannot be tagged to a project → Spend Analysis is company-wide only.  
3. **No formal control stages** — baseline vs approved changes vs actuals vs forecast.  
4. **Management Hub is a flat launcher** — no guided workflow from “new initiative” to “budget approved → execute → monitor”.  
5. **Dual project models** — frontend `projectStore` (rich) vs backend FastAPI `projects` (thin ORM); production uses **Supabase workspace snapshots**, not FastAPI, for PM data today.

---

## 3. Design principles (keep scope sane)

1. **Project as optional anchor, not mandatory everywhere** — Small teams may use Enterprise-only; linking is encouraged, not forced.  
2. **Additive schema** — Add `projectId` + `costControl` fields; do not migrate entire Enterprise structure into projects.  
3. **Roll-up, don’t duplicate** — Modules keep their native UI; project view **aggregates** pointers and totals.  
4. **Tenant-scoped** — All links respect existing company isolation and RLS.  
5. **Offline-first compatible** — Works with current Zustand + snapshot sync (last-write-wins).  
6. **Guideline before automation** — Ship **in-app playbook** and checklist before heavy integrations.

---

## 4. Proposed model: Program spine + Cost Control Pack

### 4.1 Entities

```
Company (tenant)
  └── Program (parent portfolio bucket — required for numbered projects)
        │   programNumber  e.g. PGM-2026-001
        │   name, sponsor, dates, program-level budget (optional roll-up target)
        │
        └── Project (1..N per program; each has its own projectNumber)
              │   projectNumber  e.g. PGM-2026-001-P02
              ├── Schedule & tasks (existing PM)
              ├── Cost Control Pack (new)
              ├── Links → procurement items, contracts, cost scenarios, audits
              └── Monitoring → RAG, variance, alerts
```

**Decision (D1):** **Program is a first-class parent entity**, not a free-text tag. Every project belongs to exactly one program (or a tenant **default program** for legacy/orphan projects). **One program → many projects.**

**Standalone projects without a program** are discouraged for new work; migration puts existing projects into `PGM-LEGACY-001` (or similar) so numbering stays consistent.

### 4.1.1 Numbering scheme

| Field | Format | Example | Rules |
|-------|--------|---------|-------|
| **Program number** | `PGM-{YYYY}-{NNN}` | `PGM-2026-001` | Auto-increment `NNN` per tenant per calendar year; editable only before first child project is created |
| **Project number** | `{programNumber}-P{NN}` | `PGM-2026-001-P02` | Auto-increment `NN` within the program; shown in portfolio, PDF, procurement tags |
| **Display label** | `{projectNumber} · {name}` | `PGM-2026-001-P02 · Line 4 Retrofit` | Used in lists, Command Center header, linked POs |

**Optional later:** tenant prefix (e.g. `STX-PGM-2026-001`) for multi-entity groups; ERP external code field on program/project.

**Number immutability:** Once a project reaches stage **Execute (G3)** or has linked POs, `projectNumber` and `programId` cannot change (admin override with audit log only).

### 4.1.2 Program-level roll-up

Programs aggregate child projects for portfolio reporting:

| Program metric | Calculation |
|----------------|-------------|
| **Program budget target** | Optional manual cap at program level |
| **Sum of project baselines** | Σ `costControl.baselineBudget` |
| **Sum of actuals / EAC** | Σ project actuals / EAC |
| **Program RAG** | Worst child RAG, or weighted by budget (configurable in Phase 3) |
| **Active projects** | Count where `stage` ∉ `closed` |

Program Command Center (Phase 1) lists child projects with numbers, stage, budget variance — drill-down to Project Command Center.

### 4.2 Cost Control Pack (per project)

| Field | Purpose |
|-------|---------|
| **baselineBudget** | Approved budget at gate (may equal `budget` today) |
| **baselineDate** | When baseline was locked |
| **contingency** | % or fixed reserve |
| **approvedChanges** | Sum of change orders (manual or linked) |
| **committed** | Signed quotations + approved POs + contracts (not yet invoiced) |
| **actuals** | Task costs + posted procurement + manual actuals |
| **forecastAtComplete (EAC)** | actuals + remaining task estimate + open commitments |
| **variance** | baseline + approvedChanges − EAC |

**Derived metrics (portfolio + project dashboard):**

- **CPI** (optional later): earned value / actual  
- **Budget consumed %** = actuals / (baseline + approvedChanges)  
- **Commitment coverage** = (actuals + committed) / baseline  

### 4.3 Control gates (guideline — can start as checklist UI)

| Gate | Name | Exit criteria |
|------|------|----------------|
| G0 | Idea | Name, sponsor, rough benefit (`benefitNote`) |
| G1 | Charter | Scope tags, initial schedule, risk stub |
| G2 | **Budget baseline** | `baselineBudget` set, currency, contingency, approver recorded |
| G3 | Execute | Tasks baselined; procurement/contracts may reference project |
| G4 | Monitor | Weekly/monthly: RAG, variance review, portfolio PDF |
| G5 | Close | Actuals reconciled, benefits note updated, RAG → closed |

Gates can be **`project.stage`** enum: `idea | charter | baseline | execute | monitor | closed`.

**Baseline lock (D2):** At Gate G2, `costControl.baselineLockedAt` is set. Only users with role **`admin`** (or `superadmin`) may unlock or change `baselineBudget` after lock. Project lead and finance users may propose changes via `approvedChanges` entries; unlock itself is admin-only.

### 4.4 Procurement frontload pipeline (Phase 1 — D4)

Procurement today is PR → PO only. Phase 1 adds an **upstream chain** tied to projects before PO issuance:

```
Project (PGM-…-P02)
  └── Opportunity (OPP-2026-NNN)     — sourcing need / RFQ umbrella
        └── Quotation (QUO-2026-NNN)  — vendor quote(s); may be several per opportunity
              └── [signed] ──► committed on project + optional PO creation
                    └── Purchase Order (PO-2026-NNN) — existing flow, inherits links
```

| Stage | Number format | Required project link | Rolls into `committed`? |
|-------|---------------|----------------------|-------------------------|
| **Opportunity** | `OPP-{YYYY}-{NNN}` | **Yes** (`projectId`, `projectNumber`, `programId`) | No |
| **Quotation** | `QUO-{YYYY}-{NNN}` | **Yes** (inherits from opportunity) | No until signed |
| **Signed quotation** | same `QUO-…` | Yes | **Yes** — amount added to project `committed` |
| **Purchase order** | `PO-{YYYY}-{NNN}` | **Yes** | **Yes** — approved/open PO value (no double-count when PO created from signed quote) |

**External references (user-entered, optional):**

- `supplierQuotationRef` — vendor’s own quotation number on the quote record  
- `opportunityTitle` / `description` — human-readable sourcing context  

**Signed quotation rule:** When `quotation.status` becomes **`signed`**, the quotation amount is included in the project **committed** total and appears in **Project Command Center → Linked procurement**. User may then **“Create PO from signed quotation”** (one click); PO inherits `opportunityId`, `quotationId`, `projectId`; committed moves from quote to PO without double-counting.

**Soft warnings (Phase 1):** Creating opportunity, quotation, or PO without `projectId` shows a warning; admin may override for non-project spend.

---

## 5. Module linking matrix (target state)

| Source module | Link mechanism | Rolls into project |
|---------------|----------------|-------------------|
| **Project Management** | Native | Task `cost` → **actuals (schedule)** |
| **Procurement — Opportunity** | `projectId` on `OPP-…` | Tracking only; parent of quotations |
| **Procurement — Quotation** | `projectId`, `opportunityId` | **committed** when `status === signed` |
| **Procurement — PO** | `projectId`, `quotationId?` | **committed** + **actuals** when received |
| **Procurement — PR** | `projectId` (optional Phase 1) | Feeds PO; inherits project on convert |
| **Contracts** | `projectId` on contract | **committed** (contract value) — Phase 2 |
| **Cost Management** | `linkedProjectId` on scenario/BOM | Reference only → “open cost model” — Phase 3 |
| **Enterprise** | Allocate % or fixed amount to project | Optional **planned OPEX/CAPEX** line in baseline wizard — Phase 3 |
| **Vendor Master** | via procurement/contract | Indirect |
| **Audit management** | `projectId` on audit plan | Compliance / risk context — Phase 4 |
| **Spend Analysis** | filter by `projectId` | Portfolio spend view — Phase 2 |
| **AI Insights** | context = project | Recommendations scoped to variance/RAG — Phase 4 |

**Phase 1 links:** PM + **opportunity / quotation / PO** with `projectId`; signed quotations → **committed**; playbook (EN).  
**Phase 2:** Contracts `projectId`; Spend Analysis filter; PR project tagging enforced.  
**Phase 3:** Cost/Enterprise reference links + allocation wizard; EAC automation.  
**Phase 4:** Alerts, audit links, AI context, ERP codes.

---

## 6. User journeys

### 6.0 Create program (new — before or alongside first project)

**Wizard (2 steps):**

1. **Program identity** — Name, sponsor, planned start/end, optional program budget target  
2. **Confirm number** — System assigns `PGM-2026-001` (preview); user confirms  

On finish → **Program Command Center** with empty project list + **“Add project to this program”** CTA.

### 6.1 Create project with budget (enhanced wizard)

**Today:** Name + budget + currency → Gantt.

**Proposed wizard (4 steps):**

1. **Program & identity** — Select existing program (required) or create new program inline; name; **assigned project number** (preview `…-P03`); sponsor; currency; planned dates  
2. **Budget baseline (G2)** — Baseline amount, contingency %, funding source (OPEX/CAPEX/mixed), link to Enterprise allocation (optional)  
3. **Scope & schedule** — Import template / blank Gantt, high-level phases  
4. **Control setup** — KPIs (existing), benefit note, initial risks, **monitoring cadence** (weekly/monthly)

On finish → land on **Project Command Center** (new tab on PM), not only Gantt. Program roll-up updates automatically.

**Management Hub CTAs:** “New program” and “Add project to program” (program picker if not launched from Program Command Center).

### 6.2 Project Command Center (new PM sub-view)

Single page per project with tiles:

- **Schedule health** → Gantt (existing)  
- **Budget control** → baseline / committed (signed quotes + POs) / actual / EAC / variance bar  
- **Linked procurement** → opportunities, quotations (with numbers), signed quotes, POs (Phase 1)  
- **Risks & RAG** → existing Falcon panels  
- **Quick links** → “New opportunity for this project”, “Create PO from signed quote”, “Open Gantt”  
- **Guideline checklist** → current gate + next actions  
- **Baseline lock** → lock at G2; **Unlock baseline** button visible to **admin only** (D2)  

### 6.3 Portfolio monitoring (extend existing)

Portfolio view gains a **two-level hierarchy**:

1. **Program rows** — program number, name, child count, aggregated baseline / spent / EAC, program RAG  
2. **Project rows** (expandable under program) — project number, name, stage, budget remaining, variance  

Add columns at project level:

- **Program / project number**  
- **Stage** (gate)  
- **EAC vs baseline**  
- **Commitment %**  
- Drill-down → Project Command Center (program row → Program Command Center)  

Executive PDF already exports roll-up — extend with **program sections** and **variance summary** per program + portfolio total.

### 6.4 Management Hub (D5 — flat grid)

**Keep the existing flat module grid** — no tile grouping in Phase 1.

Add a slim **action bar** above the grid (does not replace or regroup tiles):

- **New program** → create program wizard  
- **Add project** → create project wizard (program picker)  
- **New procurement opportunity** → opportunity form with required project picker  

Playbook link: “Project & cost control guide” (English, D6).

### 6.5 Create procurement opportunity (Phase 1)

From Project Command Center, Procurement dashboard, or Management Hub action bar:

1. **Select project** — required; shows `PGM-…-P02 · name`  
2. **Opportunity** — auto `OPP-2026-NNN`, title, category, estimated value  
3. **Add quotations** — one or more `QUO-2026-NNN` with vendor, amount, `supplierQuotationRef`  
4. **Mark quotation signed** — sets status `signed`, date, signatory; **updates project committed**  
5. **Create PO** — optional from signed quote; PO carries `opportunityId` + `quotationId` + `projectId`

---

## 7. In-app guideline (Project & Cost Control Playbook)

**Language (D6):** English only in Phase 1. Russian (and other locales) via i18n keys in a later pass.

Ship as collapsible panel + link from PM, Procurement, and Management Hub action bar (content in repo, not PDF-only):

### 7.1 Roles

| Role | Responsibility |
|------|----------------|
| **Sponsor** | Approves baseline (G2), accepts variance exceptions |
| **Project lead** | Schedule, task costs, RAG, weekly status |
| **Finance / controller** | Baseline lock, change orders, reconciliation |
| **Procurement** | Opportunities & quotations tagged to project; signed quotes → committed; POs inherit links |
| **Program manager** | Owns program charter, program budget target, cross-project dependencies |
| **Portfolio manager** | Portfolio RAG, program/project PDF, stage gates |

### 7.2 Monitoring cadence

| Cadence | Actions |
|---------|---------|
| **Weekly** | Update task progress & costs; review RAG; note new risks |
| **Monthly** | Reconcile committed vs actual; update EAC; portfolio PDF |
| **Quarterly** | Benefits vs plan; re-baseline if variance > threshold (e.g. 10%) |

### 7.3 Thresholds (defaults, tenant-configurable later)

| Signal | Amber | Red |
|--------|-------|-----|
| Budget consumed | > 85% | > 100% or EAC > baseline + contingency |
| Schedule (weighted progress vs plan) | > 1 week slip | > 3 weeks |
| Open escalated risks | ≥ 1 | ≥ 2 |

Align with existing **portfolio RAG** — optionally **auto-suggest** RAG from thresholds (Phase 3).

### 7.4 Rules of thumb

1. **One baseline per project** — changes go through `approvedChanges`; **only admin may unlock baseline** (D2).  
2. **Every opportunity and PO should have a `projectId`** — soft warning if missing; signed quotations count toward **committed**.  
3. **Procurement chain:** Opportunity (`OPP-…`) → Quotation (`QUO-…`) → **signed** → PO (`PO-…`); do not double-count quote and PO when PO is created from signed quote.  
4. **Task cost = labor/material estimate**; **signed quotes / POs = committed/actual** — playbook explains anti-double-count rules.  
5. **Close project (G5)** only when committed = actuals and benefits note filled.

---

## 8. Data model (minimal additive — Phase 1–2)

### 8.1 New `programStore` (or `programs[]` alongside `projects[]`)

New Zustand store, tenant-persisted, cloud snapshot key **`programs`** (document in `WORKSPACE_CLOUD_SYNC.md`).

```javascript
// programStore — one record per program
{
  id: 'pgm-1739123456789',
  programNumber: 'PGM-2026-001',   // unique per tenant; auto-generated
  name: '2026 Plant Expansion',
  sponsor: '',
  description: '',
  plannedStart: '2026-01-01',
  plannedEnd: '2027-06-30',
  budgetTarget: null,              // optional program-level cap
  currency: 'EUR',
  stage: 'active',                 // draft | active | on_hold | closed
  createdAt: '2026-05-01',
  createdBy: 'user-…',
  _createdBy: 'user-…',
  nextProjectSeq: 3,               // next P-number will be P03
}
```

**Store actions:** `addProgram`, `updateProgram`, `getProgramById`, `getProjectsForProgram(programId)`, `allocateNextProjectNumber(programId)`, `getProgramRollup(programId)`.

**Sequence counters:** `nextProjectSeq` on program; tenant-level `nextProgramSeqByYear` in store meta (or derive max from existing numbers on create).

### 8.2 Extend `projectStore` project object

```javascript
{
  // existing: id, name, budget, currency, tasks, risks, kpis, portfolioRag, ...

  programId: 'pgm-1739123456789',  // required (after migration)
  projectNumber: 'PGM-2026-001-P02', // unique per tenant; auto from program
  stage: 'baseline',               // idea | charter | baseline | execute | monitor | closed
  sponsor: '',

  costControl: {
    baselineBudget: 50000,         // locked at G2; init = budget
    baselineLockedAt: '2026-05-01',
    baselineLockedBy: 'user-…',    // admin who locked
    contingencyPct: 10,
    approvedChanges: 0,
    otherActuals: 0,               // manual non-task spend
    // committed: computed from signed quotations + open POs (Phase 1)
    // eac computed in Phase 3
  },

  links: {
    opportunityIds: [],            // Phase 1
    quotationIds: [],              // Phase 1
    procurementIds: [],            // PO ids — Phase 1
    contractIds: [],               // Phase 2
    costScenarioIds: [],           // Phase 3
    auditIds: [],                  // Phase 4
  },
}
```

**Migration helper (Phase 1):** For each existing project without `programId`, create one legacy program `PGM-LEGACY-001` and assign sequential `…-P01`, `…-P02`, …

### 8.3 Extend `procurementStore` (Phase 1)

New collections alongside `requisitions` and `purchaseOrders`:

```javascript
// Opportunity
{
  id: 'opp-…',
  opportunityNumber: 'OPP-2026-001',
  projectId: 'proj-…',
  projectNumber: 'PGM-2026-001-P02',
  programId: 'pgm-…',
  title: '',
  description: '',
  category: '',
  estimatedValue: 0,
  currency: 'EUR',
  status: 'open',                // open | on_hold | closed | cancelled
  quotationIds: ['quo-…'],
  createdAt: '…',
  _createdBy: '…',
}

// Quotation
{
  id: 'quo-…',
  quotationNumber: 'QUO-2026-001',
  opportunityId: 'opp-…',
  projectId: 'proj-…',
  projectNumber: 'PGM-2026-001-P02',
  programId: 'pgm-…',
  vendor: '',
  supplierQuotationRef: '',      // vendor’s own quote number
  amount: 0,
  currency: 'EUR',
  status: 'draft',               // draft | sent | received | signed | rejected | expired
  signedAt: null,
  signedBy: '',
  linkedPOId: null,              // set when PO created from this quote
  createdAt: '…',
  _createdBy: '…',
}
```

Extend existing **PR** and **PO** records:

```javascript
{
  projectId: 'proj-xxx' | null,
  projectNumber: 'PGM-2026-001-P02',
  programId: 'pgm-…' | null,
  opportunityId: 'opp-…' | null,
  quotationId: 'quo-…' | null,   // when PO created from signed quote
  amount / totalAmount,
  status,
  ...
}
```

**Store actions:** `createOpportunity`, `addQuotation`, `signQuotation`, `createPOFromQuotation`, `getCommittedForProject(projectId)` (signed quotes not yet converted + open approved POs).

### 8.4 Extend contract items (Phase 2)

```javascript
{
  projectId: 'proj-xxx' | null,
  projectNumber: 'PGM-2026-001-P02',  // denormalized for display / ERP export
  programId: 'pgm-…' | null,
  amount,
  status,
  ...
}
```

### 8.5 Snapshot sync

- **`projects`** snapshot — extended project fields (`programId`, `projectNumber`, `costControl`, `links`, …)  
- **`programs`** snapshot — new key for program entities  
- **`procurement`** snapshot — add `opportunities[]`, `quotations[]`; extend PR/PO with `projectId`  
- Document all in `WORKSPACE_CLOUD_SYNC.md`

### 8.6 Backend FastAPI

**Defer** ORM alignment until Supabase-native project table is needed. Frontend-first matches current production architecture.

---

## 9. Phased implementation roadmap

### Phase 1 — Programs, control, procurement frontload (6–8 weeks)

**Goal:** Program/project hierarchy, numbering, control UX, **procurement opportunity → quotation → signed → PO** linked to projects.

- [ ] **`programStore`** + cloud sync key `programs`  
- [ ] **Program / project numbers** + legacy migration  
- [ ] **Create program** wizard + **Program Command Center**  
- [ ] **Project Command Center** + create project wizard (program picker)  
- [ ] Project **stage** + **baseline lock** — **admin-only unlock** (D2)  
- [ ] **`procurementStore`**: `opportunities[]`, `quotations[]`, `OPP-` / `QUO-` numbering  
- [ ] **`projectId`** on opportunity, quotation, PO; **signed quotation → committed**  
- [ ] **Create PO from signed quotation**; anti-double-count in `getCommittedForProject`  
- [ ] Procurement UI: opportunity/quotation tabs or section on Procurement dashboard  
- [ ] Portfolio grouped by program + committed column from procurement  
- [ ] In-app **Playbook** (English, D6)  
- [ ] Management Hub: **flat grid** + top action bar CTAs (D5) — no tile regrouping  

### Phase 2 — Contracts & spend views (4–6 weeks)

- [ ] `projectId` on contracts  
- [ ] Spend Analysis: filter by project / program  
- [ ] PR `projectId` encouraged on submit  
- [ ] Warnings when PO has no project (stricter than Phase 1)

### Phase 3 — Cost & Enterprise references (4–6 weeks)

- [ ] Link cost scenarios / BOM to project (read-only reference)  
- [ ] Optional **allocation wizard**: pull Enterprise OPEX/CAPEX slice into baseline  
- [ ] Auto-suggest portfolio RAG from thresholds  
- [ ] EAC calculation (tasks + commitments + other actuals)  

### Phase 4 — Monitoring & integrations (ongoing)

- [ ] Email/in-app alerts on red thresholds  
- [ ] Audit plan ↔ project  
- [ ] AI Insights project context  
- [ ] ERP sync maps external project codes  

---

## 10. UI mock concepts (text)

### Program Command Center layout

```
[← Portfolio]  PGM-2026-001 · 2026 Plant Expansion     Stage: Active   RAG: ● Amber

┌─ Program roll-up ────────────────────────────────────────────┐
│ Budget target €500k │ Σ baselines €420k │ Σ actual €210k     │
│ Projects: 3 active, 1 closed │ [Add project to program]      │
└──────────────────────────────────────────────────────────────┘

┌─ Projects in program ────────────────────────────────────────┐
│ PGM-2026-001-P01  Utilities upgrade    Execute   ● Green    │
│ PGM-2026-001-P02  Line 4 retrofit      Execute   ● Amber  → │
│ PGM-2026-001-P03  QA lab fit-out       Charter   ● Green  → │
└──────────────────────────────────────────────────────────────┘
```

### Project Command Center layout

```
[← PGM-2026-001]  PGM-2026-001-P02 · Line 4 Retrofit   Execute   RAG: ● Amber

┌─ Budget control ─────────────────────────────────────────────┐
│ Baseline  €120k │ Approved Δ €5k │ Actual €78k │ Commit €22k │
│ EAC €108k │ Variance +€17k │ [Lock baseline] [Add change]    │
└──────────────────────────────────────────────────────────────┘

┌─ Schedule ─────────────┐  ┌─ Checklist (G3 Execute) ─────────┐
│ Progress 62%           │  │ ☑ Baseline locked               │
│ [Open Gantt]           │  │ ☐ POs tagged where required       │
└────────────────────────┘  │ ☐ Monthly EAC review due          │
                            └──────────────────────────────────┘

┌─ Linked procurement (Phase 1) ─────────────────────────────────┐
│ OPP-2026-003  CNC spindle sourcing                             │
│   QUO-2026-007  Vendor A  €12k  ● signed  → committed         │
│   QUO-2026-008  Vendor B  €11k  received                       │
│ PO-2026-0012 €12k (from QUO-2026-007)  approved                │
│ [+ New opportunity]  [Create PO from signed quote]             │
└──────────────────────────────────────────────────────────────┘
```

### Create project wizard — Budget step

```
Baseline budget *     [ 120000 ]  Currency [ EUR ▼ ]
Contingency           [ 10 ] %
Funding type          ( ) OPEX  ( ) CAPEX  (•) Mixed

☑ I confirm this baseline will be locked at Gate G2
  (Only admin can unlock after lock)
```

### Procurement — Opportunity & quotations

```
Project *             [ PGM-2026-001-P02 · Line 4 Retrofit ▼ ]
Opportunity           OPP-2026-003 (auto)
Title *               [ CNC spindle replacement ]

Quotations:
  QUO-2026-007  Vendor A  ref: VQ-8842  €12,000  [Mark signed]
  QUO-2026-008  Vendor B  ref: Q-2026-19 €11,400  received
[+ Add quotation]

When signed → adds €12k to project committed · [Create PO from QUO-2026-007]
```

---

## 11. Success metrics

| Metric | Target (6 months post Phase 1) |
|--------|--------------------------------|
| Projects with locked baseline | > 70% of active projects |
| Opportunities / POs with `projectId` | > 50% of procurement value |
| Signed quotations tracked per project | > 40% of committed spend |
| Portfolio PDF exports / month | Track adoption |
| Support tickets “budget doesn’t match spend” | Decrease |

---

## 12. Out of scope (for now)

- Full **earned value management** (BCWS/BCWP) — unless customer demands  
- Replacing **Enterprise** with project-level COA  
- Real-time **double-entry accounting**  
- Merging **backend FastAPI projects** with frontend store in Phase 1  
- Mandatory project on every module action  

---

## 13. Decision log

| # | Question | Decision |
|---|----------|----------|
| D1 | Program parent + project numbers? | ✅ **Full program entity**; `PGM-YYYY-NNN` / `{program}-P{NN}`; one program → many projects |
| D2 | Baseline unlock? | ✅ **Admin only** (`admin` / `superadmin`) |
| D3 | Default monitoring cadence? | ✅ **Monthly** default; **weekly** when risks active (escalation levels 1–2) |
| D4 | Procurement in Phase 1? | ✅ **Yes** — `projectId` on PO + **frontload**: `OPP-…` → `QUO-…` → **signed** → committed + PO |
| D5 | Management Hub layout? | ✅ **Keep flat grid**; action bar CTAs only |
| D6 | Playbook language? | ✅ **English first** |

---

## 14. Recommended next step

**Phase 1 is approved** per decisions D1–D2, D4–D6. Confirm or override **D3** (monitoring cadence) if monthly default is not right.

Implementation order:

1. `programStore` + numbering helpers + cloud sync key `programs`  
2. `projectStore` extension + baseline lock (admin-only unlock) + legacy migration  
3. `procurementStore` — opportunities, quotations, `projectId` on PO, committed roll-up  
4. Program Command Center + create program wizard  
5. Project Command Center + create project wizard + linked procurement panel  
6. Procurement UI — opportunity / quotation flows + sign → committed + PO from quote  
7. Portfolio grouped by program + committed column  
8. Playbook panel (EN) + Management Hub flat grid + action bar CTAs  

---

## Related docs

- [WORKSPACE_CLOUD_SYNC.md](./WORKSPACE_CLOUD_SYNC.md) — snapshot keys  
- [GO_LIVE_GUIDE.md](./GO_LIVE_GUIDE.md) — deployment (if present)  
- Portfolio PDF export — `ProjectManagement.jsx` + `pmPdfExport.js`  
