# Insurance Claims Validation System - Setup & Run Guide

## Prerequisites

- Node.js 20+ (you have v24.18.0 ✓)
- npm or yarn

## Quick Start

### 1. Install Dependencies

Open a **new PowerShell window as Administrator** and run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then in the project directory:

```powershell
npm install
```

### 2. Generate Synthetic Test Data

```powershell
npm run gen-data
```

This creates:
- 1,200 policies
- 2,000 members
- 150 providers
- 10,000 test claims
- Reference tables

Output: `data/batches/TEST10K.dat`, `data/masters/*.dat`, `data/reference/*.dat`

### 3. Start the System

**Option A: Start Both Services**
```powershell
npm run dev
```

This starts:
- Bridge API on http://localhost:3000
- React frontend on http://localhost:5173

**Option B: Start Services Separately**

Terminal 1 - Bridge API:
```powershell
npm run dev:bridge
```

Terminal 2 - React Frontend:
```powershell
npm run dev:web
```

### 4. Access the Application

Open your browser to: **http://localhost:5173**

### 5. Login

Select a role:
- **Operator** - Upload and submit batches
- **Adjuster** - Review Manual Review claims
- **Supervisor** - Resolve Critical claims
- **Auditor** - View reports and audit trail

## Running a Test Batch

### Via UI:

1. Login as **Operator**
2. Go to **Batches** page
3. Click **Upload Batch**
4. Select `data/batches/TEST10K.dat` (or TEST10K.csv)
5. Configure parameters:
   - Filing limit: 90 days
   - High-value threshold: ₹500,000
   - Frequency window: 30 days
   - Update mode: On
6. Click **Submit**
7. Monitor job execution in real-time
8. View results in **Summary** page

### Via Command Line:

```powershell
npm run local-run
```

This executes the batch job using the local GnuCOBOL adapter and creates:
- `data/runs/CV20261007-XX/` - Run directory
- `job.log` - Job execution log
- `EXCEPT.dat` - Exception claims
- `HITS.dat` - Rule violations
- `CTLTOT.dat` - Control totals
- `SUMRPT.txt` - Batch summary report

## Project Structure

```
claims-validation/
├── bridge/              # Node.js API server
│   └── src/
│       ├── routes/      # API endpoints
│       ├── db/          # SQLite database
│       └── auth/        # Authentication
├── web/                 # React frontend
│   └── src/
│       ├── features/    # Page components
│       ├── app/         # Layout & navigation
│       └── lib/         # API client & auth
├── cobol/              # COBOL programs & JCL
│   ├── copy/           # Copybooks
│   ├── src/            # COBOL source
│   └── jcl/            # Job control language
├── shared/             # Shared types & layouts
├── tools/              # Utilities
│   ├── gen-data.ts     # Data generator
│   └── run-local.ts    # Local executor
└── data/               # Generated data & runs
    ├── batches/        # Input claim files
    ├── masters/        # Master data
    ├── reference/      # Reference tables
    └── runs/           # Execution outputs
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Demo login
- `GET /api/auth/me` - Current user

### Batches
- `GET /api/batches` - List all batches
- `POST /api/batches` - Upload batch
- `POST /api/batches/:id/submit` - Submit for execution
- `GET /api/batches/:id` - Batch details

### Jobs
- `GET /api/jobs/:id/status` - Job status & steps
- `GET /api/jobs/:id/log` - Job logs (JOBLOG, SYSOUT)

### Summary
- `GET /api/summary/:batchId` - Batch summary report

### Claims
- `GET /api/claims` - List claims (with filters)
- `GET /api/claims/:id` - Claim details
- `POST /api/claims/:id/actions` - Workflow actions

### Rules
- `GET /api/rules` - Rule catalog

### Audit
- `GET /api/audit` - Audit log entries

## Database

SQLite database at: `data/workflow.db`

Tables:
- `batches` - Batch runs
- `claims` - Exception claims
- `claim_hits` - Rule violations
- `claim_actions` - Workflow actions
- `audit_log` - Audit trail
- `policies`, `members`, `providers` - Master data mirror

## Troubleshooting

### npm commands not working

Run this first in PowerShell:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Port already in use

Kill processes on ports 3000 or 5173:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

### Database locked

Close any SQLite viewers and delete `data/workflow.db`, then restart.

### Missing data files

Run: `npm run gen-data`

## Development

### Generate Rule Table Copybook
```powershell
npx tsx tools/make-ruletbl.ts
```

### Build for Production
```powershell
npm run build
```

### Run Tests
```powershell
npm test
```

## Architecture

### Batch Flow

```
1. Upload → 2. Validate File → 3. Submit to Runner
                                        ↓
                                   4. Execute Job
                                   - BACKUP masters
                                   - VALIDATE claims
                                   - SORT exceptions
                                   - GENERATE report
                                        ↓
                                5. Import Results
                                   - Parse outputs
                                   - Load to SQLite
                                   - Update batch status
                                        ↓
                                6. View in UI
                                   - Summary dashboard
                                   - Exception queue
                                   - Claim details
```

### Return Codes

| RC | Meaning |
|----|---------|
| 0000 | All claims passed, reconciled |
| 0004 | Exceptions present, reconciled |
| 0008 | Trailer mismatch (out of balance) |
| 0012 | Missing reference file or invalid parameters |
| 0016 | Fatal error |

### Dispositions

- **P** (Passed) - Score 0-19, no class floor
- **M** (Manual Review) - Score 20-49 or M-class rule
- **C** (Critical) - Score 50-79 or C-class rule
- **X** (Auto-Rejected) - Score 80-100 or H-class rule

## Demo Scenario

1. **Login as Operator**
2. **Upload TEST10K.dat** - 10,000 claims
3. **Submit batch** - Watch job execute
4. **View Summary**:
   - 8,412 Passed (84.1%)
   - 931 Manual Review (9.3%)
   - 207 Critical (2.1%)
   - 450 Auto-Rejected (4.5%)
   - Status: IN BALANCE
   - RC: 0004

5. **Login as Adjuster**
6. **Review Manual Review claims**
7. **Take actions**: Assign, Approve, Reject

8. **Login as Supervisor**
9. **Resolve Critical claims**

10. **Login as Auditor**
11. **Verify reconciliation**
12. **Check audit trail**

## Academic Context

**Course**: Mainframe Systems (COBOL & JCL)  
**Institution**: Vishwakarma Institute of Technology, Pune  
**Author**: Mrugesh Mangesh Kulkarni  
**PRN**: 12415181  
**Class**: CS-SE-B, Roll No. 66  
**Date**: October 7, 2026

This project demonstrates:
- Traditional mainframe batch processing
- COBOL business logic
- JCL job orchestration
- VSAM file handling
- Control totals & reconciliation
- Modern web integration with legacy systems
- Enterprise operations platform design

## Support

All data is synthetic. No real patient information is used.

For issues, check:
1. Node.js version (v20+)
2. All dependencies installed
3. Ports 3000 and 5173 available
4. Data files generated

---

**Every claim is counted. Every decision is explainable. Every exception is traceable.**
