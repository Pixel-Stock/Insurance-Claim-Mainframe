# COBOL Batch Core

This directory contains the COBOL programs for the Insurance Claims Validation System.

## Architecture

```
CLMVAL (Main) → CLMEDIT → Record Integrity (R001-R007)
              → CLMELIG → Eligibility (R010-R016, R020)
              → CLMBENF → Benefit & Pricing (R030-R035)
              → CLMCLIN → Clinical Consistency (R040-R045)
              → CLMDUPE → Duplicates (R050-R054)
              → CLMHIT  → Record fired rule
              → CLMSCOR → Calculate final disposition
              → CLMDATE → Date validation utility
```

## Programs

### Main Programs
- **CLMVAL** - Main validation driver
  - Opens all files
  - Loads reference tables (PROC, DX, PAIRS, PLANEXC)
  - Reads SYSIN parameters
  - Drives claim loop
  - Calls validation subprograms
  - Writes outputs (PASSED, EXCEPT, HITS, CTLTOT)
  - Updates masters (POLICY, HISTORY)
  - Sets return code

- **CLMRPT** - Report generator
  - Reads CTLTOT, EXCEPT, HITS
  - Prints Batch Summary Report
  - Prints Exception Detail Listing
  - Re-validates reconciliation

- **CLMLOAD** - Master data loader
  - Reads text seed files
  - Writes VSAM masters
  - Converts display to packed decimal

### Validation Subprograms (Tier 1)

- **CLMEDIT** - Record Integrity (R001-R007)
  - Blank field check
  - Date validation via CLMDATE
  - Diagnosis format (ICD-10-CM shape)
  - Procedure format (CPT/HCPCS shape)
  - Provider NPI Luhn check
  - Amount/units validation
  - Date logic

- **CLMELIG** - Eligibility (R010-R016, R020)
  - Policy lookup
  - Member lookup  
  - Policy status check
  - Effective/termination date checks
  - Waiting period check
  - Provider lookup
  - Filing limit check

- **CLMBENF** - Benefit & Pricing (R030-R035)
  - Sum insured check
  - Plan exclusion lookup
  - Pre-authorization check
  - Fee schedule comparison
  - High-value threshold
  - Code in reference table

- **CLMDUPE** - Duplicates (R050-R054)
  - Exact duplicate (history + batch)
  - Probable duplicate
  - High frequency
  - Provider status
  - Round amount pattern

### Utility Subprograms

- **CLMHIT** - Record Rule Hit
  - Look up rule in RULE-TABLE
  - Get weight, class, CARC
  - Add weight to score
  - Raise severity floor
  - Store evidence string

- **CLMSCOR** - Scoring & Disposition
  - Cap score at 100
  - Determine band (0-19, 20-49, 50-79, 80-100)
  - Apply class floor (H→4, C→3, M→2, W→1)
  - Set final disposition (P, M, C, X)

- **CLMDATE** - Date Validation
  - Validate YYYYMMDD format
  - Check month 1-12
  - Check day within month
  - Handle leap years
  - Convert to day number for age/elapsed calculations

## Copybooks

Located in `copy/`:
- **CLMREC.cpy** - 120-byte claim input
- **TRLREC.cpy** - Trailer record
- **POLREC.cpy** - Policy master (60 bytes)
- **MEMREC.cpy** - Member master (60 bytes)
- **PRVREC.cpy** - Provider master (60 bytes)
- **HSTREC.cpy** - History record (80 bytes)
- **EXCREC.cpy** - Exception output (100 bytes)
- **HITREC.cpy** - Hit output (100 bytes)
- **CTLREC.cpy** - Control total (80 bytes)
- **REFTBLS.cpy** - In-memory reference tables
- **RULETBL.cpy** - 32 validation rules
- **CLMWORK.cpy** - Shared work area

## Build

### GnuCOBOL (Local)
```bash
cobc -x -std=ibm -I copy -o bin/clmval \
     src/clmval.cbl src/clmedit.cbl src/clmelig.cbl \
     src/clmbenf.cbl src/clmdupe.cbl src/clmhit.cbl \
     src/clmscor.cbl src/clmdate.cbl

cobc -x -std=ibm -I copy -o bin/clmrpt src/clmrpt.cbl
cobc -x -std=ibm -I copy -o bin/clmload src/clmload.cbl
```

### z/OS
Use IGYWCL procedure, one job per program.

## Data Sets

### Input
- **CLMIN** - Claim file (FB 120)
- **SYSIN** - Parameters (RUNID, RUNDATE, FILELIM, HVTHR, FREQWIN, UPDATE)

### Masters (VSAM KSDS)
- **POLMST** - Policy master
- **MEMMST** - Member master
- **PRVMST** - Provider master
- **HISTORY** - Claim history (updated)

### Reference (Sequential)
- **PROCREF** - Procedure reference (FB 100)
- **DXREF** - Diagnosis reference (FB 60)
- **PAIRREF** - Non-billable pairs (FB 20)
- **PLANEXC** - Plan exclusions (FB 20)

### Output
- **CLMPASS** - Passed claims (FB 120)
- **CLMEXC** - Exception claims (FB 100)
- **CLMHIT** - Rule hits (FB 100)
- **CTLTOT** - Control totals (FB 80)
- **RPTOUT** - Print image (FBA 133)

## Return Codes

| RC | Meaning |
|----|---------|
| 0000 | All claims passed, reconciled |
| 0004 | Exceptions present, reconciled |
| 0008 | Trailer mismatch, unreconciled |
| 0012 | Reference file or parameter error |
| 0016 | Fatal error |

## Tier 1 vs Tier 2

**Tier 1** (Core demo): Rules R001-R007, R010-R014, R020, R030, R050

**Tier 2** (Complete): All 32 rules

The validation subprograms can initially be coded as paragraphs within CLMVAL and later split into separate programs without changing the CALL interface.

## Portable COBOL Rules

1. Fixed format, columns 8-72
2. COBOL 85 level
3. ASSIGN TO uses DD name only (no paths)
4. FILE STATUS on every file
5. Display numerics for sequential files
6. COMP-3 only in VSAM masters
7. No intrinsic functions in shared logic
8. No reference modification in portable code
9. REDEFINES and tables for string manipulation

## Execution

The programs are driven by JCL on z/OS or by the local runner script (`tools/run-local.ts`) which:
1. Sets DD_ environment variables for each file
2. Runs CLMVAL
3. Runs SORT on exceptions
4. Runs CLMRPT
5. Captures return codes and logs

The Node.js bridge imports the outputs into SQLite for the web application.

## Implementation Status

**Completed:**
- All copybooks
- CLMDATE utility
- Data structures and layouts

**In Progress:**
- Main CLMVAL program
- Validation subprograms
- Report program

The bridge API and frontend are being prioritized to demonstrate the end-to-end architecture. The COBOL validation logic follows the specifications in the TDD and can be completed as executable COBOL or as reference documentation with the business logic implemented in the bridge layer for demonstration purposes.
