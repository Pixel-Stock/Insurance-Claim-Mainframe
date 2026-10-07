# Insurance Claims Validation and Exception Reporting System

A mainframe-style batch claims validation system built for academic demonstration. Features COBOL/JCL batch processing core with a modern React operational workbench.

## Architecture

```
Browser (React/TypeScript)
    ↓
Node.js/Express Bridge API
    ↓
Execution Adapter (Local GnuCOBOL or z/OS via Zowe)
    ↓
JCL → COBOL Programs → VSAM/QSAM Data
```

## Project Structure

```
claims-validation/
├── cobol/               # COBOL programs and JCL
│   ├── copy/           # Copybooks
│   ├── src/            # COBOL source programs
│   └── jcl/            # JCL job streams
├── shared/             # Shared types and layouts
│   ├── layouts.json    # Record format definitions
│   └── types.ts        # TypeScript type definitions
├── rules/              # Rule catalog
│   └── rules.csv       # 32 validation rules
├── tools/              # Utilities
│   ├── gen-data.ts     # Synthetic data generator
│   └── run-local.ts    # Local GnuCOBOL execution adapter
├── bridge/             # Node.js API server
│   └── src/
│       ├── routes/     # HTTP endpoints
│       ├── services/   # Business logic
│       ├── adapters/   # Execution backends
│       ├── parsers/    # Fixed-width record handlers
│       ├── db/         # SQLite workflow store
│       └── auth/       # Demo authentication
└── web/                # React frontend
    └── src/
        ├── app/        # Application shell
        ├── features/   # Screen components
        ├── components/ # Reusable UI components
        ├── lib/        # Utilities and API client
        └── styles/     # CSS modules and tokens
```

## Quick Start

### Easy Setup (Windows)

**Double-click `run.bat`** - This will:
1. Check Node.js installation
2. Install dependencies
3. Generate test data (if needed)
4. Start both services

### Manual Setup

#### Prerequisites

- Node.js 20+ ✓ (You have v24.18.0)
- npm or yarn

#### Installation

**Step 1: Enable PowerShell Scripts**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Step 2: Install Dependencies**
```powershell
npm install
```

**Step 3: Generate Test Data**
```powershell
npm run gen-data
```

Creates:
- 1,200 policies across 4 plan codes
- 2,000 members  
- 150 providers
- 10,000 claim test batch with defects
- VSAM master file seeds
- Reference tables

**Step 4: Start the System**
```powershell
npm run dev
```

Access at:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000

#### Login & Test

1. Open http://localhost:5173
2. Select role: **Operator** / Adjuster / Supervisor / Auditor
3. Click **Sign In**
4. Navigate to **Batches** → Upload `data/batches/TEST10K.dat`
5. Submit and monitor execution
6. View **Summary** for results

### Run Batch via CLI

```powershell
npm run local-run
```

Executes the COBOL validation job using the local GnuCOBOL adapter.

### Full Documentation

See **[SETUP.md](SETUP.md)** for complete instructions, troubleshooting, and architecture details.

## Features

### Batch Core (COBOL/JCL)

- **32 validation rules** across 6 categories
- **Scoring engine**: weights + bands + class floors
- **4 dispositions**: Passed, Manual Review, Critical, Auto-Rejected
- **Control totals**: reconciliation on every run
- **Return codes**: 0000 clean, 0004 exceptions, 0008 imbalance, 0012 config error, 0016 fatal
- **Master updates**: VSAM KSDS for policy, member, provider, history
- **Reports**: Batch Summary Report and Exception Detail Listing

### Web Application (React)

**8 Screens:**
1. **Batches** - Upload, submit, monitor runs
2. **Job Monitor** - Step status, logs (JESMSGLG, JESJCL, SYSOUT)
3. **Summary** - Dashboard with drill-down, reconciliation
4. **Exception Queue** - 60/40 list/detail, filters, virtualized table
5. **Claim Detail** - Full case file, rule trace, score breakdown
6. **Reports** - Print view, PDF export
7. **Audit Log** - Append-only action trail
8. **Rules** - Catalog and reference data

**4 Roles:**
- **Operator**: Upload batches, monitor jobs
- **Adjuster**: Work Manual Review claims
- **Supervisor**: Resolve Critical claims, reassign
- **Auditor**: Verify reconciliation and audit trail

### Bridge API

- **Authentication**: Demo JWT tokens, role-based access
- **Batch lifecycle**: Upload → validate → submit → import
- **Dual backends**: Local GnuCOBOL runner and z/OS adapter (Zowe CLI)
- **Workflow store**: SQLite with claims, actions, audit
- **Parsers**: Fixed-width record I/O from layouts.json

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Batch Core | COBOL 85, JCL, VSAM KSDS, QSAM |
| Local Runtime | GnuCOBOL 3.2+ |
| Bridge API | Node.js, Express, SQLite, Zowe CLI |
| Frontend | React 18, TypeScript, Vite |
| State | TanStack Query, React Router |
| Tables | TanStack Table, TanStack Virtual |
| Styling | CSS Modules, CSS Custom Properties |
| Icons | Lucide React |

## Design Philosophy

This is **not a generic SaaS dashboard**. The interface is designed as a:

**Modern Enterprise Operations Platform**

Visual principles:
- Navy primary, warm off-white background, controlled semantic colors
- Professional sans-serif typography with tabular numerals
- Monospace for logs, JCL, return codes, fixed-width records
- No purple gradients, no glassmorphism, no emoji
- Restrained enterprise palette
- Every color communicates system state
- Accessibility: WCAG 2.2 AA

The mainframe heritage is visible but modernized:
- Return codes clearly displayed
- Job steps with RC and timing
- DD names and dataset references
- JES-style job monitor
- But rendered in a clean, readable modern interface

## Rules Overview

| Category | Rules | Examples |
|----------|-------|----------|
| Record Integrity | R001-R007 | Blank fields, invalid dates, format checks |
| Eligibility | R010-R016, R020 | Policy/member lookup, status, filing limit |
| Benefit & Pricing | R030-R035 | Sum insured, exclusions, fee schedule |
| Clinical Consistency | R040-R045 | Dx/Px pairs, age/gender, units |
| Duplicates & Anomalies | R050-R054 | Exact/probable duplicates, frequency, provider status |

## Scoring Model

```
Score = Sum of fired rule weights (capped at 100)

Bands:
  0-19:  Passed
  20-49: Manual Review
  50-79: Critical
  80-100: Auto-Rejected

Class Floors:
  H (Hard stop) → Auto-Rejected
  C (Critical)   → At least Critical
  M (Manual)     → At least Manual Review
  W (Warning)    → No floor, adds score only

Final Disposition = max(band, floor)
```

## Return Codes

| RC | Meaning |
|----|---------|
| 0000 | Every claim Passed, reconciled |
| 0004 | Exceptions present, reconciled |
| 0008 | Trailer mismatch, unreconciled |
| 0012 | Missing reference file or invalid parameters |
| 0016 | Fatal error |

## Data

**All data is synthetic.** No real patient information is used.

- Amounts in INR (Indian Rupees)
- 10,000 claim test batch
- ICD-10-CM shaped diagnoses
- CPT/HCPCS shaped procedures
- NPI-shaped provider IDs with Luhn check digits

## Testing

```bash
npm test
```

Test coverage:
- COBOL rule golden tests
- Bridge API endpoint tests
- React component tests
- End-to-end Playwright tests
- Accessibility scans

## Building for Production

```bash
npm run build
```

Outputs:
- `dist/web/` - Frontend static files
- `dist/bridge/` - Bridge API compiled

## z/OS Execution

When z/OS access is available:

1. Configure Zowe profile
2. Upload JCL and programs to z/OS
3. Set backend to 'zos' in bridge configuration
4. Bridge uses Zowe CLI to submit jobs and retrieve outputs

The same COBOL source compiles on both Enterprise COBOL and GnuCOBOL.

## Academic Context

**Course**: Mainframe Systems (COBOL and JCL batch processing)  
**Institution**: Vishwakarma Institute of Technology, Pune  
**Author**: Mrugesh Mangesh Kulkarni (PRN 12415181, CS-SE-B, Roll No. 66)  
**Date**: October 7, 2026

This project demonstrates:
- Traditional mainframe batch processing patterns
- COBOL business logic with JCL orchestration
- VSAM KSDS keyed file access
- Control totals and reconciliation
- Return code conventions
- Modern web integration with legacy systems

## License

Academic project - All data is synthetic and for demonstration purposes only.

## Documentation

- **PRD**: Product Requirements Document - Business requirements and rules
- **TDD**: Technical Design Document - Architecture and implementation
- **Master Frontend Prompt**: Comprehensive UI/UX guidelines

---

**Every claim is counted. Every decision is explainable. Every exception is traceable.**
