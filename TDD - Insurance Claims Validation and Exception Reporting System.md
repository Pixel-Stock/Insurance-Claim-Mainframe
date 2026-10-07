# Technical Design Document

**Insurance Claims Validation and Exception Reporting System**

Version 1.0 | 7 October 2026 | Prepared by Mrugesh Mangesh Kulkarni (PRN 12415181, CS-SE-B, Roll No. 66), Vishwakarma Institute of Technology, Pune | Course: Mainframe Systems (COBOL and JCL batch processing)

## 1. Purpose and scope

This document specifies how the system described in the PRD is built: the batch core (JCL, COBOL, data sets), the bridge that connects it to the web, the React application, and the test and build plan. Requirement IDs (FR, AC) and rule IDs (R001 to R054) refer to the PRD.

Five principles shape every decision below.

1. **The core decides, the bridge translates, the interface explains.** Only COBOL evaluates rules. The bridge never second-guesses a result.
2. **The same DD names on every backend.** COBOL programs refer to files by DD name only. JCL binds those names on z/OS. Environment variables bind them on the local runner. The source does not change.
3. **Table-driven rules.** Rule identity, class, weight, CARC and text live in one table. Code decides whether a rule fires, never how much it counts.
4. **Money is never floating point.** COBOL uses fixed decimal. The bridge and the UI use integer minor units (paise).
5. **Every run is observable.** Each run leaves its input, outputs, return codes and job log behind, and every number on screen can be traced to records.

## 2. Architecture

```
  Browser: React single-page app
       |  HTTPS, JSON
       v
  Bridge API (Node.js, Express)  <------>  Workflow store (SQLite)
       |
       |  Execution adapter: submit(job), status(id), spool(id), fetch(dsn)
       |
       +--> ZosAdapter    --> Zowe CLI / z/OSMF --> JES2 --> JCL + COBOL on z/OS
       |
       +--> LocalAdapter  --> GnuCOBOL binaries and shell steps, same DD names
```

Inside the batch core:

```
  CLAIMS.INPUT (QSAM, FB 120, detail records + trailer)
        |
   STEP020 VALIDATE  (CLMVAL and called subprograms)
        |   reads:   POLICY, MEMBER, PROVIDER, HISTORY (VSAM KSDS)
        |            PROCREF, DXREF, PAIRREF, PLANEXC (loaded into tables)
        |            SYSIN parameters
        |   updates: HISTORY (add), POLICY (utilised amount)
        |
        +--> PASSED   (QSAM, claims with disposition Passed)
        +--> EXCEPT   (QSAM, one record per claim not Passed)
        +--> HITS     (QSAM, one record per fired rule)
        +--> CTLTOT   (QSAM, control totals and parameter echo)
                |
   STEP030 SORTEXC  order EXCEPT by severity, then amount
   STEP040 REPORT   (CLMRPT)  --> SYSOUT: Batch Summary Report, Exception Detail Listing
   STEP050 ARCHIVE  copy print image to a generation data group
```

The bridge imports EXCEPT, HITS, CTLTOT and PASSED into SQLite after the job ends. From that point the web application works only from SQLite and never touches the mainframe except to read job logs.

## 3. Technology choices

| Layer | Choice | Reason |
| --- | --- | --- |
| Batch language | COBOL at the COBOL 85 level, fixed format | Course requirement. Compiles on Enterprise COBOL and GnuCOBOL |
| Job control | JCL with IF/THEN/ELSE step logic; IDCAMS, SORT, IEFBR14, IEBGENER | The standard batch toolset |
| Master data | VSAM KSDS | Keyed random access, as in production claims systems; no DB2 setup |
| Local COBOL toolchain | GnuCOBOL 3.2 with the IBM dialect option | Free, supports indexed files and packed decimal |
| z/OS access | Zowe CLI over z/OSMF | Official open-source route to submit jobs, read spool and move data sets |
| Bridge | Node.js 20, Express, zod, multer, better-sqlite3, jsonwebtoken | One language with the UI; shared types; synchronous SQLite suits a single-user demo |
| Workflow store | SQLite, one file | No server to install; transactional bulk import |
| Frontend | React 18, TypeScript, Vite, React Router | Typed components across eight screens |
| Data and tables | TanStack Query, TanStack Table, TanStack Virtual | Caching and polling; dense sortable tables; virtualised rows |
| Styling | CSS Modules over CSS custom property tokens | Tokens are defined in the Design Philosophy |
| Icons | Lucide React | Consistent stroke icons; no emoji |
| PDF export | Print stylesheet rendered through headless Chromium (Playwright) | One layout serves screen, print and PDF |
| Tests | Vitest, Testing Library, Playwright, axe-core, golden-file comparison | Covers unit, component, end to end, accessibility and COBOL output |

## 4. Batch core design

### 4.1 Job stream and return codes

Job CLMVAL01 runs these steps. A one-time job CLMSETUP defines the VSAM clusters with IDCAMS and loads them from sequential seed files.

| Step | Name | Program | Purpose | Runs when |
| --- | --- | --- | --- | --- |
| 005 | BACKUP | IDCAMS | REPRO policy and history masters to backup data sets so a run can be repeated | Always |
| 010 | CLEAN | IEFBR14 | Delete previous output data sets | Always |
| 020 | VALIDATE | CLMVAL | Validate, score, write outputs, update masters | Always |
| 030 | SORTEXC | SORT | Order exceptions by severity descending, then billed amount descending | VALIDATE RC below 12 |
| 040 | REPORT | CLMRPT | Print the summary and the exception listing | VALIDATE RC below 12 |
| 050 | ARCHIVE | IEBGENER | Copy the print image to a generation data group | REPORT RC below 8 |

| RC | Meaning | Set by |
| --- | --- | --- |
| 0000 | Every claim Passed, run reconciled | CLMVAL |
| 0004 | Exceptions present, run reconciled | CLMVAL |
| 0008 | Trailer count or amount does not match what was read. Outputs are complete but unreconciled | CLMVAL |
| 0012 | A reference file or parameter card is missing or invalid. Outputs are not usable | CLMVAL |
| 0016 | Fatal input or output error, or an internal logic error | Any program |

### 4.2 Data sets

All names are prefixed with the user high-level qualifier, for example USER01.CLMVAL.

| DD | Data set | Organisation | Format | Key | Use |
| --- | --- | --- | --- | --- | --- |
| CLMIN | CLAIMS.INPUT | QSAM | FB, 120 | none | Input claims and trailer |
| POLMST | POLICY.KSDS | VSAM KSDS | 60 | Policy number, 10 | Eligibility, sum insured. Updated |
| MEMMST | MEMBER.KSDS | VSAM KSDS | 60 | Member ID, 12 | Date of birth, gender, policy link |
| PRVMST | PROVIDER.KSDS | VSAM KSDS | 60 | Provider ID, 10 | Provider status |
| HISTORY | HISTORY.KSDS | VSAM KSDS | 80 | Member, service date, procedure, provider: 35 | Duplicate and frequency checks. Updated |
| PROCREF | REF.PROC | QSAM | FB, 100 | Sorted by procedure code | Loaded into a table |
| DXREF | REF.DX | QSAM | FB, 60 | Sorted by diagnosis code | Loaded into a table |
| PAIRREF | REF.PAIRS | QSAM | FB, 20 | Sorted by pair | Loaded into a table |
| PLANEXC | REF.PLANEXC | QSAM | FB, 20 | Sorted by plan, procedure | Loaded into a table |
| SYSIN | In-stream | Cards | 80 | none | Run parameters |
| CLMPASS | PASSED | QSAM | FB, 120 | none | Claims with disposition Passed |
| CLMEXC | EXCEPT | QSAM | FB, 100 | none | One record per claim not Passed |
| CLMHIT | HITS | QSAM | FB, 100 | none | One record per fired rule, including warnings |
| CTLTOT | CTLTOT | QSAM | FB, 80 | none | Control totals and parameter echo |
| RPTOUT | SYSOUT | Print | FBA, 133 | none | Reports |

Reference tables are small and read many times, so they are loaded once into WORKING-STORAGE tables with OCCURS and ASCENDING KEY and searched with SEARCH ALL. The four masters are large and keyed, so they stay in VSAM and are read randomly.

HISTORY key order (member, service date, procedure, provider) lets one START and READ NEXT loop collect every prior claim for a member, which serves R050, R051 and R052 together.

### 4.3 Record layouts

**Claim record (CLMREC), 120 bytes**

| Field | Start | Len | Picture | Notes |
| --- | --- | --- | --- | --- |
| REC-TYPE | 1 | 1 | X | D detail, T trailer |
| CLM-ID | 2 | 12 | X(12) | Unique per claim |
| POLICY-NO | 14 | 10 | X(10) |  |
| MEMBER-ID | 24 | 12 | X(12) |  |
| PROVIDER-ID | 36 | 10 | X(10) |  |
| DOS-FROM | 46 | 8 | 9(8) | YYYYMMDD |
| DOS-TO | 54 | 8 | 9(8) | YYYYMMDD |
| SUBMIT-DATE | 62 | 8 | 9(8) | YYYYMMDD |
| POS-CODE | 70 | 2 | X(2) | Place of service |
| DX-PRIMARY | 72 | 7 | X(7) | ICD-10-CM, no decimal point |
| DX-SECONDARY | 79 | 7 | X(7) | Optional |
| PROC-CODE | 86 | 5 | X(5) | CPT or HCPCS shape |
| PROC-MOD | 91 | 2 | X(2) | Optional |
| UNITS | 93 | 3 | 9(3) |  |
| BILLED-AMT | 96 | 9 | 9(7)V99 | Implied decimal, whole line |
| AUTH-NO | 105 | 10 | X(10) | Blank if none |
| FILLER | 115 | 6 | X(6) |  |

Trailer record: REC-TYPE T in position 1, TRL-COUNT 9(9) in 2 to 10, TRL-AMOUNT 9(11)V99 in 11 to 23, remainder blank.

**Master and history records**

| Record | Length | Fields (start, picture) |
| --- | --- | --- |
| POLREC | 60 | POLICY-NO 1 X(10) key; PLAN-CODE 11 X(4); POL-STATUS 15 X (A active, L lapsed, S suspended, C cancelled); EFF-DATE 16 9(8); TERM-DATE 24 9(8); WAIT-DAYS 32 9(3); SUM-INSURED 35 S9(9)V99 COMP-3; UTILISED-AMT 41 S9(9)V99 COMP-3; FILLER 47 X(14) |
| MEMREC | 60 | MEMBER-ID 1 X(12) key; POLICY-NO 13 X(10); DOB 23 9(8); GENDER 31 X (M or F); RELATION 32 X(2); MEM-STATUS 34 X; FILLER 35 X(26) |
| PRVREC | 60 | PROVIDER-ID 1 X(10) key; PROV-STATUS 11 X (A active, I inactive, W watch-list, S sanctioned); PROV-TYPE 12 X(2); NETWORK-FLAG 14 X; PROV-NAME 15 X(30); FILLER 45 X(16) |
| HSTREC | 80 | MEMBER-ID 1 X(12); DOS-FROM 13 9(8); PROC-CODE 21 X(5); PROVIDER-ID 26 X(10) (these four form the 35-byte key); CLM-ID 36 X(12); BILLED-AMT 48 9(7)V99; DISP 57 X; RUN-DATE 58 9(8); FILLER 66 X(15) |

**Output records**

| Record | Length | Fields (start, picture) |
| --- | --- | --- |
| EXCREC | 100 | CLM-ID 1 X(12); MEMBER-ID 13 X(12); POLICY-NO 25 X(10); PROVIDER-ID 35 X(10); DOS-FROM 45 9(8); BILLED-AMT 53 9(7)V99; SCORE 62 9(3); DISP 65 X (M, C, X); SEV 66 9 (2, 3, 4); HIT-COUNT 67 9(2); TOP-RULE 69 X(4); RUN-ID 73 X(14); FILLER 87 X(14) |
| HITREC | 100 | CLM-ID 1 X(12); RULE-ID 13 X(4); CLASS 17 X; WEIGHT 18 9(3); CARC 21 X(3); EVIDENCE 24 X(60); RUN-ID 84 X(14); FILLER 98 X(3) |
| CTLREC | 80 | CTL-TYPE 1 X(2); CTL-KEY 3 X(4); CTL-COUNT 7 9(9); CTL-AMOUNT 16 9(11)V99; RUN-ID 29 X(14); FILLER 43 X(38). Types: RD records read, TR trailer values supplied, DS disposition totals (key P, M, C, X), RL per-rule claim count and billed amount (key is the rule ID). PM echoes a parameter card as text in positions 3 to 42 |

EXCREC carries both DISP (a letter for people) and SEV (a digit for sorting), so the SORT step needs no lookup.

The bridge keeps a single layouts.json describing every record above. It drives parsing, CSV conversion and test-data generation. A unit test asserts that field lengths in layouts.json sum to the LRECL of each record, which guards against drift from the copybooks.

### 4.4 Programs and copybooks

All file input and output lives in CLMVAL. Subprograms contain logic only and work on a shared area passed BY REFERENCE. This keeps FILE STATUS handling in one place and lets each subprogram be tested with plain fixtures.

| Program | Kind | Responsibility | Rules | Tier |
| --- | --- | --- | --- | --- |
| CLMVAL | Main | Open files, load tables, read parameters, drive the loop, look up masters, write outputs, update masters, totals, return code | None | 1 |
| CLMEDIT | Sub | Record integrity | R001-R007 | 1 |
| CLMELIG | Sub | Eligibility and timeliness | R010-R016, R020 | 1 |
| CLMBENF | Sub | Benefit and pricing | R030-R035 | 1 for R030, rest in 2 |
| CLMCLIN | Sub | Clinical consistency | R040-R045 | 2 |
| CLMDUPE | Sub | Duplicates and anomalies, from the history window | R050-R054 | 1 for R050, rest in 2 |
| CLMHIT | Sub | Record one fired rule: look up weight, add to score, raise the floor, store evidence | None | 1 |
| CLMSCOR | Sub | Cap the score, find the band, apply the floor, set the disposition | None | 1 |
| CLMDATE | Sub | Validate a date, convert to a day number, compute age | None | 1 |
| CLMRPT | Main (own step) | Print the Batch Summary Report and Exception Detail Listing | None | 1 |

In Tier 1 the five rule subprograms may be written as paragraphs inside CLMVAL and split out in Tier 2. The called interface is already shaped for that split.

Copybooks: CLMREC, POLREC, MEMREC, PRVREC, HSTREC, EXCREC, HITREC, CTLREC, REFTBLS (reference table layouts), RULETBL (rule table) and CLMWORK (shared work area).

CLMWORK holds the current claim, the matched policy, member and provider records with found flags, the history window (up to 99 prior claims for the member), the run parameters, the running score, the severity floor, a hit table of up to 32 entries (rule, class, weight, CARC, evidence), and skip flags used by the dependency map.

### 4.5 Driver logic

```
MAIN.
    PERFORM INITIALISE        open files, check FILE STATUS, read SYSIN, load REF tables
    PERFORM READ-CLAIM
    PERFORM UNTIL CLMIN-EOF
        IF REC-TYPE = 'T'
            SAVE trailer count and amount
        ELSE
            ADD 1 TO READ-COUNT
            ADD BILLED-AMT TO READ-AMOUNT
            PERFORM VALIDATE-ONE-CLAIM
        END-IF
        PERFORM READ-CLAIM
    END-PERFORM
    PERFORM FINALISE          compare totals, write CTLTOT, set RETURN-CODE, close files

VALIDATE-ONE-CLAIM.
    INITIALIZE work area (score, floor, hit table, skip flags)
    CALL 'CLMEDIT' USING CLAIM-WORK            R001-R007
    IF no integrity hit
        PERFORM LOOKUP-MASTERS                 random READ of policy, member, provider
        PERFORM LOAD-HISTORY-WINDOW            START and READ NEXT on the member prefix
        CALL 'CLMELIG' USING CLAIM-WORK        R010-R016, R020
        CALL 'CLMBENF' USING CLAIM-WORK        R030-R035
        CALL 'CLMCLIN' USING CLAIM-WORK        R040-R045
        CALL 'CLMDUPE' USING CLAIM-WORK        R050-R054
    END-IF
    CALL 'CLMSCOR' USING CLAIM-WORK            cap, band, floor, disposition
    PERFORM WRITE-OUTPUTS                      PASSED or EXCEPT, plus one HITS record per hit
    PERFORM ACCUMULATE-TOTALS                  by disposition and by rule
    IF UPDATE-ON AND disposition NOT = 'X'
        PERFORM UPDATE-MASTERS                 WRITE history; REWRITE policy utilised amount
    END-IF
```

When update mode is off (a dry run), no master is written. Claims seen earlier in the same run are held in a small in-core table and merged into each member's history window, so in-batch duplicates are still caught.

When update mode is on, only claims that are not Auto-rejected are written to history and reserved against the policy. A rejected claim that is corrected and resubmitted is therefore not flagged as a duplicate of its own earlier rejection.

### 4.6 Rule engine, dependencies and scoring

**One call records a hit.**

```
CALL 'CLMHIT' USING CLAIM-WORK RULE-ID EVIDENCE-TEXT WEIGHT-OVERRIDE
```

CLMHIT finds the rule in RULE-TABLE with SEARCH ALL, takes the weight from the table unless the override is non-zero (used only by the tiered R033), adds it to CW-SCORE, raises CW-FLOOR-SEV to the severity for the rule's class (H gives 4, C gives 3, M gives 2, W gives 1), and appends the hit with its evidence. An unknown rule ID is a programming error and sets RC 16.

**Evidence is the actual values compared**, so a reviewer never has to look the claim up again. Examples, each up to 60 characters:

```
R013  DOS 20260302 BEFORE POLICY EFF 20260401
R030  BILLED 245000.00 EXCEEDS REMAINING 180500.00
R033  UNIT 9200.00 IS 312 PCT OF ALLOWED 2950.00
R050  MATCHES CLM CL0000004417 ON 20260518
```

**Dependency map.** A failed lookup would make later rules meaningless, so some rules are skipped instead of firing noise.

| If this fires | Skip |
| --- | --- |
| Any of R001 to R007 | Every other rule |
| R010 or R011 | R012-R015, R030, R031, R041, R042 |
| R016 | R053 |
| R035 on the procedure | R032, R033, R040-R045 |
| R035 on the diagnosis only | The diagnosis checks inside R040-R042 |

R050 to R052, R054 and R034 need only claim fields and history, so they still run when a lookup fails.

**Scoring paragraph in CLMSCOR**

```cobol
       SCORE-CLAIM.
           IF CW-SCORE > 100
               MOVE 100 TO CW-SCORE
           END-IF
           EVALUATE TRUE
               WHEN CW-SCORE >= 80  MOVE 4 TO WS-BAND-SEV
               WHEN CW-SCORE >= 50  MOVE 3 TO WS-BAND-SEV
               WHEN CW-SCORE >= 20  MOVE 2 TO WS-BAND-SEV
               WHEN OTHER           MOVE 1 TO WS-BAND-SEV
           END-EVALUATE
           MOVE CW-FLOOR-SEV TO CW-FINAL-SEV
           IF WS-BAND-SEV > CW-FINAL-SEV
               MOVE WS-BAND-SEV TO CW-FINAL-SEV
           END-IF
           EVALUATE CW-FINAL-SEV
               WHEN 4  MOVE 'X' TO CW-DISP
               WHEN 3  MOVE 'C' TO CW-DISP
               WHEN 2  MOVE 'M' TO CW-DISP
               WHEN OTHER MOVE 'P' TO CW-DISP
           END-EVALUATE.
```

CW-SCORE is PIC 9(4) so that the sum can exceed 100 before the cap. The uncapped sum is kept in a second field and written to the evidence of the first hit when the cap applies, so the claim detail screen can show that the score was capped.

**Provider check digit (R005)** uses the NPI Luhn rule: double the digits in odd positions 1, 3, 5, 7 and 9, subtract 9 from any result above 9, add the unchanged digits in even positions including the check digit, add the constant 24 that stands for the 80840 prefix, and require a total divisible by 10. A REDEFINES table of ten one-digit items replaces reference modification, which keeps the logic portable.

```cobol
       CHECK-PROVIDER-LUHN.
           MOVE 24 TO WS-SUM
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 10
               MOVE WS-PD (WS-I) TO WS-DIGIT
               DIVIDE WS-I BY 2 GIVING WS-Q REMAINDER WS-R
               IF WS-R = 1 AND WS-I < 10
                   COMPUTE WS-DIGIT = WS-DIGIT * 2
                   IF WS-DIGIT > 9
                       SUBTRACT 9 FROM WS-DIGIT
                   END-IF
               END-IF
               ADD WS-DIGIT TO WS-SUM
           END-PERFORM
           DIVIDE WS-SUM BY 10 GIVING WS-Q REMAINDER WS-R
           IF WS-R NOT = 0
               PERFORM RAISE-R005
           END-IF.
```

The value 1234567893 passes this check and 1234567890 fails it, which gives two ready test cases.

**Dates.** CLMDATE validates a YYYYMMDD value (numeric, month 1 to 12, day within the month, leap years) and converts it to a day number so that elapsed-day rules (R015, R020, R052) and age (R041) become subtraction. It uses DIVIDE ... GIVING to force integer division and avoids intrinsic functions, which older compilers lack.

### 4.7 Control totals and reconciliation

CLMVAL keeps a read count and amount, a count and amount per disposition, and a claim count and billed amount per rule. At the end of the run it writes them to CTLTOT as RD, TR, DS and RL records.

Three checks decide the return code.

1. **Internal balance.** Records read equal the sum of the four disposition counts, and amounts likewise. A failure here is a logic error and sets RC 16.
2. **Trailer match.** Records read and amount read equal the trailer count and amount. A mismatch, or a missing trailer, sets RC 8 and prints both sets of figures.
3. **Exceptions present.** Any claim not Passed sets RC 4 when checks 1 and 2 pass.

The final RC is the highest value reached: 16, then 12, then 8, then 4, then 0.

CLMRPT does not trust a status flag from CLMVAL. It re-adds the DS records, compares the result with the RD and TR records, and prints IN BALANCE or OUT OF BALANCE with the differences itself. Two programs reaching the same answer independently is the point of a control total.

### 4.8 Error handling and restart

Every OPEN, READ, WRITE, REWRITE and START is followed by a FILE STATUS test.

| Status | Meaning | Handling |
| --- | --- | --- |
| 00 | Success | Continue |
| 10 | End of file | Normal end of loop |
| 23 | Record not found on a keyed READ | A business outcome, not an error: sets the not-found flag that leads to R010, R011 or R016 |
| 35 | File not found on OPEN | Reference file: RC 12. Any other file: RC 16 |
| 39 | File attribute conflict (for example record length) | RC 16 with the DD name in the message |
| Any other | Unexpected | Message, RC 16, stop |

Messages follow the mainframe convention of a program prefix, a number and a severity letter, and go to SYSOUT.

```
CLMV001I RUN CV20261007-01 STARTED, PARM FILELIM=090 HVTHR=0500000.00
CLMV012E REFERENCE FILE PROCREF OPEN FAILED, FILE STATUS 35
CLMV031W TRAILER MISMATCH, COUNT READ 9999 TRAILER 10000
CLMV090S UNKNOWN RULE ID R099 IN CLMHIT
```

SYSIN is validated before any claim is read. An unknown keyword, a non-numeric value or a value outside its range stops the run with RC 12 and names the card.

The run date comes from a RUNDATE card, not the system clock, so a run can be repeated exactly. The program never abends on purpose: it sets RETURN-CODE and ends with STOP RUN so that JCL condition logic stays in control.

**Restart.** Step BACKUP writes each master to a new generation of a generation data group. To repeat a run, a restore job copies generation 0 back over the masters and the job is resubmitted. CLEAN removes the previous outputs.

### 4.9 Job listing

Setup (CLMSETUP) defines the clusters and generation data group bases with IDCAMS, then runs the loader CLMLOAD. CLMLOAD reads text seed files and writes the VSAM masters, converting display numbers to packed decimal on the system itself, so packed fields never pass through a text transfer. The listing below is the run job. A PRINT step (045, IEBGENER) copies the print image to SYSOUT so the job log carries the report, and the print image data set SUMRPT is the RPTOUT DD of table 4.2.

```
//CLMVAL01 JOB (ACCT),'CLAIMS VALIDATION',CLASS=A,MSGCLASS=X,
//             NOTIFY=&SYSUID,REGION=0M
//         SET HLQ=USER01.CLMVAL
//*---------------------------------------------------------------
//BACKUP   EXEC PGM=IDCAMS
//SYSPRINT DD SYSOUT=*
//POLIN    DD DISP=SHR,DSN=&HLQ..POLICY.KSDS
//POLOUT   DD DSN=&HLQ..POLICY.BKUP(+1),DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(5,5)),DCB=(RECFM=FB,LRECL=60)
//HSTIN    DD DISP=SHR,DSN=&HLQ..HISTORY.KSDS
//HSTOUT   DD DSN=&HLQ..HISTORY.BKUP(+1),DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(10,10)),DCB=(RECFM=FB,LRECL=80)
//SYSIN    DD *
  REPRO INFILE(POLIN) OUTFILE(POLOUT)
  REPRO INFILE(HSTIN) OUTFILE(HSTOUT)
/*
//CLEAN    EXEC PGM=IEFBR14
//D1       DD DSN=&HLQ..PASSED,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D2       DD DSN=&HLQ..EXCEPT,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D3       DD DSN=&HLQ..EXCEPT.SORTED,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D4       DD DSN=&HLQ..HITS,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D5       DD DSN=&HLQ..CTLTOT,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D6       DD DSN=&HLQ..SUMRPT,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//*---------------------------------------------------------------
//VALIDATE EXEC PGM=CLMVAL
//STEPLIB  DD DISP=SHR,DSN=&HLQ..LOADLIB
//SYSOUT   DD SYSOUT=*
//CLMIN    DD DISP=SHR,DSN=&HLQ..CLAIMS.INPUT
//POLMST   DD DISP=SHR,DSN=&HLQ..POLICY.KSDS
//MEMMST   DD DISP=SHR,DSN=&HLQ..MEMBER.KSDS
//PRVMST   DD DISP=SHR,DSN=&HLQ..PROVIDER.KSDS
//HISTORY  DD DISP=SHR,DSN=&HLQ..HISTORY.KSDS
//PROCREF  DD DISP=SHR,DSN=&HLQ..REF.PROC
//DXREF    DD DISP=SHR,DSN=&HLQ..REF.DX
//PAIRREF  DD DISP=SHR,DSN=&HLQ..REF.PAIRS
//PLANEXC  DD DISP=SHR,DSN=&HLQ..REF.PLANEXC
//CLMPASS  DD DSN=&HLQ..PASSED,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(5,5),RLSE),DCB=(RECFM=FB,LRECL=120,BLKSIZE=0)
//CLMEXC   DD DSN=&HLQ..EXCEPT,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(2,2),RLSE),DCB=(RECFM=FB,LRECL=100,BLKSIZE=0)
//CLMHIT   DD DSN=&HLQ..HITS,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(5,5),RLSE),DCB=(RECFM=FB,LRECL=100,BLKSIZE=0)
//CTLTOT   DD DSN=&HLQ..CTLTOT,DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(1,1),RLSE),DCB=(RECFM=FB,LRECL=80,BLKSIZE=0)
//SYSIN    DD *
RUNID=CV20261007-01
RUNDATE=20261007
FILELIM=090
HVTHR=0500000.00
FREQWIN=030
UPDATE=Y
/*
//CHK1     IF (VALIDATE.RC LT 12) THEN
//SORTEXC  EXEC PGM=SORT
//SYSOUT   DD SYSOUT=*
//SORTIN   DD DISP=SHR,DSN=&HLQ..EXCEPT
//SORTOUT  DD DSN=&HLQ..EXCEPT.SORTED,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(2,2),RLSE),DCB=(RECFM=FB,LRECL=100,BLKSIZE=0)
//SYSIN    DD *
  SORT FIELDS=(66,1,ZD,D,53,9,ZD,D)
/*
//REPORT   EXEC PGM=CLMRPT
//STEPLIB  DD DISP=SHR,DSN=&HLQ..LOADLIB
//SYSOUT   DD SYSOUT=*
//CTLTOT   DD DISP=SHR,DSN=&HLQ..CTLTOT
//CLMEXC   DD DISP=SHR,DSN=&HLQ..EXCEPT.SORTED
//CLMHIT   DD DISP=SHR,DSN=&HLQ..HITS
//RPTOUT   DD DSN=&HLQ..SUMRPT,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(1,1),RLSE),DCB=(RECFM=FBA,LRECL=133,BLKSIZE=0)
//         ENDIF
//CHK2     IF (REPORT.RC LT 8) THEN
//PRINT    EXEC PGM=IEBGENER
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD DISP=SHR,DSN=&HLQ..SUMRPT
//SYSUT2   DD SYSOUT=*
//ARCHIVE  EXEC PGM=IEBGENER
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD DISP=SHR,DSN=&HLQ..SUMRPT
//SYSUT2   DD DSN=&HLQ..SUMRPT.ARCH(+1),DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(1,1),RLSE),DCB=(RECFM=FBA,LRECL=133,BLKSIZE=0)
//         ENDIF
```

The bridge generates the SYSIN cards from the validated run parameters and submits the finished JCL, so no parameter text from a user reaches the job unchecked.

## 5. Portability and the local runner

**Portable COBOL rules.** These keep one source set compiling on Enterprise COBOL and GnuCOBOL.

- Fixed format, columns 8 to 72, COBOL 85 level. No vendor extensions, no object-oriented features.
- ASSIGN TO uses a bare DD name, for example ASSIGN TO CLMIN. No paths in source.
- Every file has a FILE STATUS item.
- Display numerics for sequential files. COMP-3 only in the VSAM masters, where both compilers use the same packed layout.
- No intrinsic functions, no reference modification in shared logic. REDEFINES tables and CLMDATE replace them.

**Build.** On z/OS, compile and link with the IBM-supplied procedure IGYWCL, one job per program, writing load modules to LOADLIB. Locally:

```
cobc -x -std=ibm -I copy -o bin/clmval \
     src/clmval.cbl src/clmedit.cbl src/clmelig.cbl src/clmbenf.cbl \
     src/clmclin.cbl src/clmdupe.cbl src/clmhit.cbl src/clmscor.cbl src/clmdate.cbl
cobc -x -std=ibm -I copy -o bin/clmrpt src/clmrpt.cbl
```

**Local runner.** GnuCOBOL resolves ASSIGN TO CLMIN through the environment variable DD\_CLMIN. The runner sets one variable per DD name, pointing into a per-run folder, then performs the same steps as the JCL.

| JCL step | Local action |
| --- | --- |
| BACKUP | Copy the master files to the run folder |
| CLEAN | Remove previous outputs |
| VALIDATE | Run bin/clmval with the DD\_ variables and SYSIN card file |
| SORTEXC | Fixed-width sort on bytes 66 and 53 to 61, descending |
| REPORT | Run bin/clmrpt |
| PRINT, ARCHIVE | Copy the print image into the run folder |

The runner writes a job log in JES style and states its nature in the first line, so nobody mistakes it for z/OS output. The header of the web application shows the same fact at all times.

```
LOCAL RUNNER  RUN CV20261007-01  BACKEND local-gnucobol  (not z/OS)
10:14:02  CLMVAL01  BACKUP    RC=0000
10:14:02  CLMVAL01  CLEAN     RC=0000
10:14:09  CLMVAL01  VALIDATE  RC=0004
10:14:09  CLMVAL01  SORTEXC   RC=0000
10:14:10  CLMVAL01  REPORT    RC=0000
10:14:10  CLMVAL01  ENDED     MAXCC=0004
```

**Hercules.** The MVS 3.8j systems that run on Hercules ship an older COBOL compiler that predates COBOL 85, so the source above does not compile there unchanged. If the submission needs JES evidence and z/OS access has not returned, run a reduced Tier 1 build on Hercules for screenshots of the JCL, job log and SYSOUT, ported to the older dialect (no END-IF, EVALUATE or inline PERFORM). The web application stays on the local runner for the live demo.

## 6. Bridge design

### 6.1 Modules

| Module | Role |
| --- | --- |
| routes | HTTP handlers. Validate input with zod, check permission, call a service |
| services | Batch, job, import, report, queue and audit logic |
| adapters | ZosAdapter and LocalAdapter behind one interface |
| parsers | Fixed-width readers and writers generated from layouts.json |
| db | SQLite access, migrations, bulk import in one transaction |
| auth | Demo sign-in, signed tokens, the permission table |

### 6.2 Batch lifecycle

```
CREATED -> VALIDATED -> SUBMITTED -> RUNNING -> ENDED -> IMPORTED -> COMPLETE
                    \________________________________________/
                                  any step may move the batch to FAILED
```

VALIDATED means the file passed shape checks at upload. ENDED means the job finished and the return code is known. IMPORTED means results are in SQLite. If import fails, the batch moves to FAILED, the job outputs stay on disk, and an import-retry endpoint reprocesses them. Every transition writes an audit entry.

### 6.3 Execution adapter

```ts
interface ExecutionAdapter {
  mode(): 'zos' | 'local';
  stageInputs(run: RunContext): Promise<void>;
  submit(run: RunContext): Promise<{ jobId: string }>;
  status(jobId: string): Promise<{ state: 'INPUT' | 'ACTIVE' | 'OUTPUT'; rc?: string; steps: StepResult[] }>;
  spool(jobId: string): Promise<SpoolFile[]>;
  fetchOutputs(run: RunContext): Promise<OutputSet>;
}
```

ZosAdapter wraps Zowe CLI commands, started with execFile and an argument array, never a shell string. Job IDs are checked against a strict pattern before use.

```
zowe zos-files upload file-to-data-set claims.dat USER01.CLMVAL.CLAIMS.INPUT
zowe zos-jobs submit local-file clmval01.jcl --rfj
zowe zos-jobs view job-status-by-jobid JOB04127 --rfj
zowe zos-jobs list spool-files-by-jobid JOB04127 --rfj
zowe zos-jobs view spool-file-by-id JOB04127 4
zowe zos-files download data-set USER01.CLMVAL.EXCEPT.SORTED --file out/except.dat
```

LocalAdapter runs the steps in the table in section 5 and produces the same status and spool shapes, so routes and the UI cannot tell the backends apart except through mode().

The raw SYSOUT does not carry the JES job number, which JES assigns after submission and the program cannot see. The bridge stamps the job ID into the header when it renders the report for screen, print and PDF.

### 6.4 API

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| POST | /api/auth/login | Public | Demo sign-in with a chosen role; returns a signed token |
| GET | /api/me | Any | Current user, role, backend mode |
| POST | /api/batches | Operator | Upload claim file and parameters; shape checks; returns batch |
| POST | /api/batches/:id/submit | Operator | Stage inputs and submit the job |
| GET | /api/batches | Any | List batches |
| GET | /api/batches/:id | Any | Batch detail, parameters, state, return code |
| GET | /api/batches/:id/summary | Any | Control totals, dispositions, rule hits, reconciliation, ageing |
| GET | /api/jobs/:id | Any | Job state, steps and return codes |
| GET | /api/jobs/:id/log | Any | Spool files: JESMSGLG, JESJCL, JESYSMSG, SYSOUT |
| GET | /api/claims | Any | Paged and filtered claim list |
| GET | /api/claims/:id | Any | Claim detail, master records, hits, score build-up, actions |
| POST | /api/claims/:id/actions | Adjuster, Supervisor | Perform a workflow action |
| GET | /api/reports/:batchId/summary | Any | Print image as text and JSON |
| GET | /api/reports/:batchId/summary.pdf | Any | PDF render |
| GET | /api/queue/export | Any | CSV of the filtered queue |
| GET | /api/audit | Supervisor, Auditor, Adjuster (own entries) | Paged audit entries |
| GET | /api/rules | Any | Rule catalog |
| GET | /api/reference/:table | Any | Reference table contents |

Errors share one shape: code, message and optional detail. The UI shows the message as written, so messages are specific.

### 6.5 Workflow store

```sql
CREATE TABLE batches (
  id INTEGER PRIMARY KEY, run_id TEXT UNIQUE, filename TEXT, uploaded_by TEXT,
  record_count INTEGER, params_json TEXT, state TEXT, job_id TEXT, rc INTEGER,
  backend TEXT, created_at TEXT, ended_at TEXT, summary_json TEXT);

CREATE TABLE claims (
  id INTEGER PRIMARY KEY, batch_id INTEGER REFERENCES batches(id),
  claim_id TEXT, member_id TEXT, policy_no TEXT, provider_id TEXT,
  dos_from TEXT, billed_minor INTEGER, score INTEGER,
  disposition TEXT CHECK (disposition IN ('P','M','C','X')),
  hit_count INTEGER, top_rule TEXT,
  queue TEXT CHECK (queue IN ('MANUAL','CRITICAL','NONE')),
  status TEXT, assignee TEXT, entered_at TEXT, due_at TEXT, raw TEXT);
CREATE INDEX ix_claims_batch ON claims(batch_id, disposition, status);

CREATE TABLE claim_hits (
  claim_pk INTEGER REFERENCES claims(id), seq INTEGER, rule_id TEXT,
  class TEXT, weight INTEGER, carc TEXT, evidence TEXT);

CREATE TABLE claim_actions (
  id INTEGER PRIMARY KEY, claim_pk INTEGER, actor TEXT, role TEXT,
  action TEXT, from_status TEXT, to_status TEXT, note TEXT, at TEXT);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY, at TEXT, actor TEXT, role TEXT, action TEXT,
  entity TEXT, entity_id TEXT, detail_json TEXT, prev_hash TEXT, hash TEXT);
```

Billed amounts are stored as integer paise. The raw 120-byte record is kept with each claim. Policies, members and providers are mirrored into SQLite from the seed files for display on the claim detail screen only. The batch never reads SQLite.

**Workflow.** A claim in the Manual review or Critical disposition enters with queue MANUAL or CRITICAL and status NEW. Auto-rejected claims enter with queue NONE and status CLOSED\_REJECTED. Passed claims have queue NONE and status PASSED.

| Action | From status | Roles | To status | Note |
| --- | --- | --- | --- | --- |
| Assign to me | NEW | Adjuster (Manual review), Supervisor | ASSIGNED | No |
| Reassign | NEW, ASSIGNED | Supervisor | ASSIGNED | Yes |
| Approve to adjudication | ASSIGNED | Adjuster (Manual review), Supervisor | APPROVED | Yes |
| Confirm rejection | ASSIGNED | Adjuster (Manual review), Supervisor | REJECT\_CONFIRMED | Yes |
| Request information | ASSIGNED | Adjuster (Manual review), Supervisor | INFO\_REQUESTED | Yes |
| Mark information received | INFO\_REQUESTED | Same | ASSIGNED | No |
| Escalate | ASSIGNED | Adjuster, Manual review claims only | NEW, queue CRITICAL | Yes |
| Return to review | NEW, ASSIGNED, queue CRITICAL | Supervisor | NEW, queue MANUAL | Yes |

The original disposition from the batch never changes. The queue and status record what people decided.

## 7. Frontend design

### 7.1 Routes

| Route | Screen | Roles |
| --- | --- | --- |
| /login | Sign in | Public |
| /batches | Batches and upload | All; upload for Operator |
| /batches/:id | Job monitor and log viewer | All |
| /summary/:batchId | Summary dashboard | All |
| /queue | Exception queue, list and detail side by side | All; actions by role |
| /claims/:id | Claim detail, full page | All |
| /reports/:batchId | Print report view | All |
| /audit | Audit log | Supervisor, Auditor, Adjuster (own entries) |
| /rules | Rule catalog and reference data | All |

### 7.2 State and data

- **Server state** lives in TanStack Query, with one query key per resource. A running job is polled every 2 seconds and polling stops when the job reaches OUTPUT.
- **View state lives in the URL.** Filters, sort, page and the selected claim are search parameters, so every view can be linked and the back button behaves.
- **Local state** is limited to dialogs and form fields.
- **Workflow actions wait for the server.** There are no optimistic updates, so the screen and the audit trail never disagree.

### 7.3 Permissions in the interface

The interface hides what a role cannot do. The server enforces it. Both read the same table.

```ts
export type Capability =
  | 'batch.submit' | 'claim.work.manual' | 'claim.work.critical'
  | 'claim.reassign' | 'audit.read.all' | 'audit.read.own';

const GRANTS: Record<Role, Capability[]> = {
  operator:   ['batch.submit'],
  adjuster:   ['claim.work.manual', 'audit.read.own'],
  supervisor: ['claim.work.manual', 'claim.work.critical', 'claim.reassign', 'audit.read.all'],
  auditor:    ['audit.read.all'],
};

export const can = (role: Role, cap: Capability) => GRANTS[role].includes(cap);
```

### 7.4 Components

| Component | Purpose |
| --- | --- |
| DataTable | Virtualised, sortable, sticky header, tabular numerals, keyboard row navigation, selection kept in the URL |
| DispositionTag | Shape, word and colour together. Colour is never the only signal |
| ScoreBar | Zero to 100 axis with band thresholds, one segment per fired rule, floor annotation |
| StepRuler | Job steps in order with return code and elapsed time |
| ControlStrip | Records read, the four dispositions, their sum, trailer match and balance state in one line |
| PrintPage | The 132-column report rendered in a monospace face, paginated with a repeated header |
| FilterBar | Disposition, rule, status, assignee, age bucket and text search |
| ActionDialog | Role-aware actions with a note field and a minimum length |
| EmptyState, ErrorNotice | Plain statements of what happened and what can be done |

### 7.5 Performance, print and failure

- The queue fetches pages of 200 rows and renders only the visible rows, which keeps 10,000 exceptions responsive. Filtering and sorting run on the server.
- The initial bundle stays under 250 KB gzipped. Screens load on demand by route. The claim detail for the selected row is prefetched.
- Print uses a dedicated stylesheet: A4 landscape, 12 mm margins, no interface chrome, page breaks every 60 lines.
- A failed request shows the server's message verbatim with the request ID. A lost connection to the bridge shows a banner and retries with backoff. The screen never goes blank.

## 8. Security

- Four demo accounts, one per role. No passwords are stored. A signed token (HS256, 8 hour expiry) travels in an HttpOnly, SameSite Strict cookie. The signing secret comes from the environment.
- The permission table exists on the server and every route checks it. Hiding a button is a convenience, never a control.
- Uploads: 10 MB limit, text only, every line length checked, files stored under generated names in a per-run folder. A client-supplied file name is never used in a path.
- External commands run through execFile with argument arrays. Job IDs and data set names are checked against strict patterns first.
- SQL uses prepared statements only. Evidence text is rendered as text, never as markup.
- All data is synthetic, and the README says so.
- The audit log has no update or delete route. Tier 3 adds a hash chain so removal or change is detectable.
- A real deployment would put z/OS behind RACF-authenticated z/OS Connect and take identity from the enterprise identity provider. That is outside this project.

## 9. Test strategy

| Layer | What is tested | Tooling |
| --- | --- | --- |
| COBOL rules | Two fixtures per rule, one that must fire and one that must not, run through the full pipeline and compared with expected hits by claim ID | Local runner, comparison script |
| Golden run | A 10,000-claim batch compared with expected EXCEPT, HITS and CTLTOT files | Generator, diff |
| Control paths | Trailer count off by one (RC 8), deleted reference file (RC 12), malformed SYSIN card (RC 12), input with only a trailer | Local runner |
| Determinism | Two runs on restored masters give identical outputs | diff |
| Bridge | Every endpoint against every role; upload rejection cases; import transaction | Vitest, supertest |
| Components | ScoreBar segment widths, DispositionTag semantics, ControlStrip states | Vitest, Testing Library |
| End to end | Operator uploads and runs; adjuster approves; supervisor resolves Critical; auditor reads; a keyboard-only path | Playwright |
| Accessibility | Automated scan of every screen, plus a manual contrast check of the colour tokens | axe-core |

**Synthetic data generator.** A seeded generator (fixed seed, so output is repeatable) creates 1,200 policies across four plan codes, 2,000 members, 150 providers (including 5 on the watch-list, 3 sanctioned and 4 inactive), 60 procedures, 120 diagnoses, 12 procedure pairs and 40 plan exclusions. It then builds the default 10,000-claim batch: clean claims constructed so that no rule fires, and defective claims with each of the 32 rules injected into at least five claims. It also builds the compound cases from the PRD scoring table (claims B and C) and writes expected.json with the rule IDs, score and disposition for every claim.

## 10. Build order

Estimates assume a developer already comfortable with COBOL and React. Cut tiers, not tests.

| Block | Work | Done when | Time |
| --- | --- | --- | --- |
| 1 | Repository, layouts.json, copybooks, generator (masters, references, claims, expected.json), CLMLOAD | Generated data loads and counts match | 2 h |
| 2 | CLMVAL with Tier 1 rules, CLMHIT, CLMSCOR, CLMDATE, CTLTOT | Golden comparison passes for Tier 1 rules | 3 h |
| 3 | CLMRPT, JCL, local runner, return codes | A run prints a balanced summary; the RC 8 test passes | 2 h |
| 4 | Bridge: auth, upload, run, import, claims and queue endpoints | A scripted walkthrough works end to end | 2.5 h |
| 5 | Interface: tokens, shell, Batches, Summary, Queue, Claim detail | Operator and adjuster flows work | 4 h |
| 6 | Remaining rules, job monitor, all roles, audit log, exports | Full rule golden comparison passes | 4 h |
| 7 | z/OS adapter, dark theme, README and screenshots | Submission package ready | 2 h |

Blocks 1 to 5 deliver Tier 1, about 13.5 hours. If time runs out, stop after block 5 with a working demonstration rather than starting block 6 half-finished.

## 11. Repository layout

```
claims-validation/
  cobol/
    copy/        CLMREC.cpy POLREC.cpy ... CLMWORK.cpy RULETBL.cpy
    src/         clmval.cbl clmedit.cbl clmelig.cbl clmbenf.cbl clmclin.cbl
                 clmdupe.cbl clmhit.cbl clmscor.cbl clmdate.cbl clmrpt.cbl clmload.cbl
    jcl/         clmsetup.jcl clmval01.jcl clmrstr.jcl compile.jcl
  rules/         rules.csv   (source of RULETBL.cpy, rules.json and the PRD rule table)
  shared/        layouts.json  types.ts
  tools/         gen-data.ts  make-ruletbl.ts  run-local.ts
  bridge/        src/ (routes services adapters parsers db auth)  tests/
  web/           src/ (app features components lib styles)  tests/
  tests/         cobol/  golden/  e2e/
  docs/          PRD  TDD  Design Philosophy
  README.md
```

## 12. Open technical issues

1. **GnuCOBOL indexed files.** Confirm with cobc --info that the installed build has an indexed file handler. If it does not, install a build with Berkeley DB or VBISAM support.
2. **z/OS prerequisites.** When access returns, confirm a Zowe profile, that z/OSMF is reachable, and that the user ID can define VSAM clusters and generation data group bases.
3. **Hercules dialect.** A port to the older compiler is a separate, reduced build. Decide only if z/OS access does not return.
4. **History window cap.** The window holds 99 prior claims per member. A member with more history is truncated and the evidence says so. This is acceptable for the demonstration data.
5. **PDF rendering.** Headless Chromium needs the Playwright browser download. The fallback is the browser's own print to PDF using the same print stylesheet.
6. **CARC mapping.** The reason code numbers are the nearest standard codes and need confirming against the current X12 list before any use outside the course.
