# Product Requirements Document

**Insurance Claims Validation and Exception Reporting System**

Version 1.0 | 7 October 2026 | Prepared by Mrugesh Mangesh Kulkarni (PRN 12415181, CS-SE-B, Roll No. 66), Vishwakarma Institute of Technology, Pune | Course: Mainframe Systems (COBOL and JCL batch processing)

## 1. Summary

This system validates batches of health insurance claims before they reach adjudication. A COBOL program, run as a JCL batch job, reads a claim file and checks every claim against 32 business rules. Each claim receives a risk score and lands in one of four outcomes: Passed, Manual review, Critical, or Auto-rejected. The job writes exception files, control totals and a printed Batch Summary Report, and ends with a return code that tells the operator whether the run was clean, carried exceptions, or failed to reconcile.

A React web application sits on top of the batch core. It lets four roles (operator, adjuster, supervisor, auditor) submit batches, monitor jobs, work the exception queue, read the summary report and inspect an audit trail. The mainframe core is the single source of truth for every validation decision. The web tier never re-implements a rule: it submits work, reads results, and records what people did with them.

## 2. Problem and context

Insurers receive health claims in bulk from hospitals and providers. A claim paid in error, such as one filed against a lapsed policy, a duplicate, or an amount above the sum insured, is costly to recover. A valid claim stopped by mistake delays payment and strains provider relationships. Mainframe batch validation has long been the answer because volumes are high, the logic is stable, and control matters more than latency: every record counted, every rupee reconciled.

A batch-only approach leaves two gaps that this project closes:

- Exceptions land in print files and flat datasets. The people working them cannot easily see why a claim was stopped, which rules fired, or what value triggered each one.
- Nobody can see at a glance whether a run was complete and in balance, or what the exception backlog looks like by age and severity.

The project keeps what batch does well (determinism, control totals, return codes) and adds a workbench for the people who act on the output.

## 3. Goals and non-goals

**Goals**

1. Validate every claim in a batch against a documented rule set and explain each decision with rule IDs and the actual values that triggered them.
2. Place every claim in exactly one of four outcomes through a transparent scoring model.
3. Prove reconciliation on every run: records and billed amounts in equal records and amounts out, and both agree with the trailer record supplied with the input.
4. Give each role a view built for its work, with permissions enforced on the server.
5. Run end to end on a laptop without z/OS, and run the same COBOL and JCL on z/OS when access is available.

**Non-goals**

- Adjudication and payment calculation (co-pay, deductible, payout).
- Online claim entry (CICS) and real-time validation.
- Real patient data. All data is synthetic.
- Production identity management. Roles are simulated; RACF integration is out of scope.
- Machine-learning scoring. Every decision is rule-based and explainable.

## 4. Users and roles

| Role | Who they are | Job to be done | Lands on |
| --- | --- | --- | --- |
| Operator | Batch operations staff | Get a clean file in, submit the job, confirm it ended well | Batches |
| Adjuster | Claims examiner | Clear Manual review claims quickly and defensibly | Exception queue, assigned to me |
| Supervisor | Senior adjuster or team lead | Resolve Critical claims, balance workload, watch ageing | Exception queue, Critical and unassigned |
| Auditor | Internal audit or compliance | Verify that runs reconcile and that overrides are justified | Summary dashboard |

**Permissions**

| Capability | Operator | Adjuster | Supervisor | Auditor |
| --- | --- | --- | --- | --- |
| Upload and submit a batch, set run parameters | Yes | No | No | No |
| View job monitor and job log | Yes | Read | Read | Read |
| View summary dashboard and reports, export | Yes | Yes | Yes | Yes |
| View exception queue and claim detail | Read | Yes | Yes | Read |
| Work Manual review claims | No | Yes | Yes | No |
| Work Critical claims | No | Read | Yes | No |
| Reassign claims | No | No | Yes | No |
| View audit log | No | Own actions | All | All |
| View rule catalog and reference data | Yes | Yes | Yes | Yes |

Auto-rejected claims are closed by the system for every role. A rejected claim is corrected by the provider and resubmitted as a new claim in a later batch.

## 5. Scope tiers

The deadline is short and the project is solo, so scope is tiered. Each tier is a complete, demonstrable system; later tiers add depth.

| Tier | Includes | Outcome |
| --- | --- | --- |
| 1. Core | Rules R001-R007, R010-R014, R020, R030, R050; scoring and four dispositions; control totals and return codes; Batch Summary Report; local runner; web screens for batches, summary, exception queue and claim detail; two roles (operator, adjuster) | A working end-to-end demo |
| 2. Complete | All 32 rules; job monitor with log viewer; all four roles and actions; audit log; Exception Detail Listing; CSV and PDF export; z/OS adapter | The full specification |
| 3. Polish | Dark theme; tamper-evident audit chain; live job updates; resolution feedback file to the next batch cycle | Extra depth |

## 6. End-to-end process

1. The operator uploads a claim file (fixed-width or CSV) and sets run parameters.
2. The bridge checks file shape, converts to 120-byte fixed records, verifies the trailer, and submits the JCL.
3. The validation step evaluates each claim and writes passed claims, exception claims, rule-hit detail and control totals. A sort step then orders exceptions by severity and amount.
4. The report step prints the Batch Summary Report and Exception Detail Listing to SYSOUT.
5. The bridge imports results into the workflow store and marks the batch complete with its return code.
6. Adjusters and supervisors work the queue. Every action is recorded.
7. Auditors check reconciliation and the audit trail. Anyone can print the summary.

## 7. Functional requirements

| ID | Requirement |
| --- | --- |
| **Batch intake** |  |
| FR-01 | Accept a claim file as fixed-width (120-byte records) or CSV with the same field order. The bridge converts CSV to fixed-width. |
| FR-02 | Reject a file at upload if any line has the wrong length or the file exceeds 50,000 records. Report offending line numbers. |
| FR-03 | Require a trailer record carrying detail record count and total billed amount, and verify it against what was read. |
| FR-04 | Let the operator set run parameters within limits: filing limit days (30 to 365, default 90), high-value threshold (default 500,000.00), frequency window in days (default 30), and update mode (commit to history, or dry run). |
| FR-05 | Assign every run an ID (CV, yyyymmdd, sequence) and keep its input, outputs and logs for later viewing. |
| **Validation** |  |
| FR-06 | Evaluate all 32 rules per claim in a fixed order, skipping rules whose inputs are unavailable because of an earlier failure (dependency map in the TDD). |
| FR-07 | Record each fired rule with ID, class, weight, nearest X12 CARC and an evidence string showing the actual values compared. |
| FR-08 | Look up policy, member, provider and history by key. Load reference tables once per run. |
| FR-09 | Reserve the billed amount of each non-rejected claim against the policy's utilised amount during the run, so later claims see the reduced balance. |
| FR-10 | Detect duplicates against history and within the same batch. |
| **Scoring** |  |
| FR-11 | Score equals the sum of fired rule weights, capped at 100. |
| FR-12 | Final disposition is the highest of the score band and the rule-class floor. |
| FR-13 | Every claim leaves with exactly one disposition. Passed claims may carry warnings. |
| **Exception handling** |  |
| FR-14 | Manual review and Critical claims enter the queue with status New and a due date (3 business days and 1 business day, configurable). |
| FR-15 | Adjuster actions: assign to me, approve to adjudication, confirm rejection, request information, escalate. |
| FR-16 | Supervisor actions: all adjuster actions, plus resolve Critical, reassign, and return to review. |
| FR-17 | Auto-rejected claims are closed by the system. Reason codes stay retrievable. There is no override. |
| FR-18 | Approve, confirm rejection and escalate require a note of at least 10 characters. Every action is written to the audit log with before and after status. |
| FR-19 | Ageing buckets (0-1, 2-3, 4-7, 8+ days) are computed from queue entry. |
| **Reporting** |  |
| FR-20 | Produce the Batch Summary Report (print image, 132 columns): run header, disposition counts and amounts, reconciliation, top rule hits, return code. |
| FR-21 | Produce the Exception Detail Listing, sorted by severity then amount, one line per claim with its reason codes. |
| FR-22 | The on-screen summary shows the same figures as the print report. Every figure opens the claims behind it. |
| FR-23 | Export the print report as PDF and the exception queue as CSV. |
| **Web application** |  |
| FR-24 | Role-based navigation and route protection. The server enforces every permission. |
| FR-25 | Eight screens: Batches, Job monitor, Summary, Exception queue, Claim detail, Reports, Audit log, Rules and reference data. |
| FR-26 | The job monitor shows step status, return code per step, elapsed time and the job log (JESMSGLG, JESJCL, SYSOUT). |
| FR-27 | Claim detail shows claim fields, matched master records, the rule trace and the score build-up. |
| FR-28 | The execution backend is always visible in the header: z/OS via z/OSMF, or Local GnuCOBOL runner. |
| **Audit** |  |
| FR-29 | Append-only audit log of sign-ins, uploads, submissions, job completions, queue actions and exports. |
| FR-30 | Each audit entry stores the hash of the previous entry so tampering is detectable (Tier 3). |

## 8. Rule catalog

The rules follow common payer claim-edit practice: HIPAA X12 837 claim edits, NCCI-style procedure-pair edits, medically-unlikely-edit style unit limits, and the shapes of ICD-10-CM, CPT/HCPCS and NPI identifiers. Weights and thresholds are this project's own parameters, not a regulatory standard.

Class: **H** hard stop (forces Auto-rejected), **C** critical (forces at least Critical), **M** manual review (forces at least Manual review), **W** warning (adds score, no floor). CARC is the nearest standard X12 Claim Adjustment Reason Code and should be confirmed against the current code list before external use. A dash marks an internal rule with no standard equivalent.

| ID | Check | Class | Weight | CARC |
| --- | --- | --- | --- | --- |
| **Record integrity** |  |  |  |  |
| R001 | A mandatory field is blank: claim ID, policy number, member ID, provider ID, service dates, submit date, primary diagnosis, procedure code, billed amount | H | 100 | 16 |
| R002 | A date is non-numeric or not a valid calendar date (month, day, leap year) | H | 100 | 16 |
| R003 | A diagnosis code is not ICD-10-CM shaped: letter, digit, alphanumeric, then up to four alphanumerics, no decimal point, 3 to 7 characters | H | 100 | 16 |
| R004 | Procedure code is neither 5 digits (CPT shape) nor a letter plus 4 digits (HCPCS Level II shape) | H | 100 | 181 |
| R005 | Provider ID is not 10 digits or fails the NPI Luhn check digit | H | 100 | 16 |
| R006 | Billed amount is non-numeric or zero, or units are zero | H | 100 | 16 |
| R007 | Date logic broken: service-from after service-to, submit date before service-from, or service-from after the run date | H | 100 | 16 |
| **Eligibility** |  |  |  |  |
| R010 | Policy number is not on the policy master | H | 100 | 31 |
| R011 | Member is not on the member master, or the member's policy differs from the claim's policy | H | 100 | 31 |
| R012 | Policy status is lapsed, suspended or cancelled | H | 100 | 27 |
| R013 | Service-from is before the policy effective date | H | 100 | 26 |
| R014 | Service-from is after the policy termination date | H | 100 | 27 |
| R015 | Service-from falls inside the policy's initial waiting period | M | 40 | 96 |
| R016 | Provider is not on the provider master, or is marked inactive | H | 100 | 16 |
| **Timeliness** |  |  |  |  |
| R020 | Submit date is more than FILELIM days after service-to (default 90) | H | 100 | 29 |
| **Benefit and pricing** |  |  |  |  |
| R030 | Billed amount exceeds the remaining sum insured (sum insured, less utilised, less amounts reserved earlier in this run) | C | 60 | 119 |
| R031 | Procedure is excluded under the policy's plan code | H | 100 | 96 |
| R032 | Procedure requires pre-authorisation and no authorisation number was supplied | M | 45 | 197 |
| R033 | Billed amount per unit exceeds the fee-schedule allowed amount: over 150% up to 300% adds 25; over 300% adds 55 | M | 25 or 55 | 45 |
| R034 | Billed amount is at or above the high-value threshold (default 500,000.00) | M | 20 | - |
| R035 | Diagnosis or procedure code is well formed but absent from the reference table | M | 30 | 16 |
| **Clinical consistency** |  |  |  |  |
| R040 | Primary diagnosis category (first three characters) is not in the procedure's permitted list | M | 35 | 11 |
| R041 | Member age on the service date is outside the permitted range for the procedure or diagnosis | M | 30 | 6, 9 |
| R042 | Member gender conflicts with the procedure's or diagnosis's gender restriction | M | 40 | 7, 10 |
| R043 | Place of service is not in the procedure's permitted list | M | 30 | 5 |
| R044 | Units exceed the procedure's maximum units per day | M | 30 | 151 |
| R045 | Procedure forms a non-billable pair with another procedure for the same member and service date | M | 35 | 236 |
| **Duplicates and anomalies** |  |  |  |  |
| R050 | Exact duplicate: same member, provider, service-from, procedure and billed amount on history or earlier in this batch | H | 100 | 18 |
| R051 | Probable duplicate: same member, service-from and procedure, with a different provider or amount | C | 55 | 18 |
| R052 | More than 3 history claims for the member within FREQWIN days before service-from (default 30) | M | 25 | - |
| R053 | Provider status is watch-list or sanctioned | C | 70 | - |
| R054 | Billed amount is an exact multiple of 10,000 and at least 50,000 | W | 10 | - |

## 9. Scoring and disposition

**Score** is the sum of the weights of all fired rules, capped at 100.

**Bands:** 0 to 19 Passed, 20 to 49 Manual review, 50 to 79 Critical, 80 to 100 Auto-rejected.

**Class floors:** any H rule forces Auto-rejected. Any C rule forces at least Critical. Any M rule forces at least Manual review.

**Final disposition** is the more severe of the band and the floor. Severity order: Passed (1), Manual review (2), Critical (3), Auto-rejected (4).

| Claim | Rules fired | Score | Band | Class floor | Final |
| --- | --- | --- | --- | --- | --- |
| A | R033 at 150-300% (25) | 25 | Manual review | Manual review | Manual review |
| B | R032 (45), R034 (20) | 65 | Critical | Manual review | Critical |
| C | R030 (60), R051 (55) | 100, capped from 115 | Auto-rejected | Critical | Auto-rejected |
| D | R013 (100) | 100 | Auto-rejected | Auto-rejected | Auto-rejected |
| E | R054 (10) | 10 | Passed | None | Passed with warning |

Claim B shows why both mechanisms exist: no single rule is critical, yet two review-level findings together warrant a supervisor. Claim C shows a claim rejected by accumulated score with no hard-stop rule.

## 10. Data

**Inputs**

- Claim file: sequential, fixed block, 120 bytes. Detail records plus one trailer record.
- Policy master, member master, provider master: VSAM KSDS, read by key.
- Claim history: VSAM KSDS keyed by member, service date, procedure and provider, used for duplicate and frequency checks.
- Reference tables: procedures (allowed amount, maximum units, authorisation flag, gender and age limits, permitted places and diagnosis categories), diagnoses, procedure pairs, plan exclusions.
- Run parameters from SYSIN control cards.

**Outputs**

- Passed claims, exception claims (one record per claim that is not Passed), rule hits (one record per fired rule), control totals, and the print reports.
- Updated history and policy utilised amounts when update mode is on.

All sample data is synthetic and amounts are in INR, held as unsigned display fields with two implied decimals.

## 11. Reports

The Batch Summary Report is the primary output. It prints on a 132-column line printer layout and is rendered identically on screen. Figures below are illustrative.

```
CLAIMS VALIDATION                  BATCH SUMMARY REPORT                  PAGE    1
RUN CV20261007-01   JOB CLMVAL01 JOB04127   RUN DATE 2026-10-07   RETURN CODE 0004
PARM  FILELIM=090  HVTHR=0500000.00  FREQWIN=030  UPDATE=Y
--------------------------------------------------------------------------------
DISPOSITION           CLAIMS      PCT          BILLED AMOUNT
PASSED                 8,412    84.1%         412,880,115.00
MANUAL REVIEW            931     9.3%          63,104,220.50
CRITICAL                 207     2.1%          41,775,900.00
AUTO-REJECTED            450     4.5%          18,226,310.75
--------------------------------------------------------------------------------
TOTAL PROCESSED       10,000   100.0%         535,986,546.25
TRAILER CONTROL       10,000                  535,986,546.25
RECONCILIATION        IN BALANCE      COUNT DIFF 0      AMOUNT DIFF 0.00
--------------------------------------------------------------------------------
TOP RULE HITS                                  CLAIMS
R033  Billed above fee schedule                   602
R032  Pre-authorisation missing                    388
R050  Exact duplicate                              318
R034  High-value claim                             144
R030  Exceeds remaining sum insured                 84
```

The Exception Detail Listing follows the summary: one line per exception claim, ordered by severity then billed amount, showing claim ID, member, provider, billed amount, score, disposition and the list of rule IDs.

## 12. Non-functional requirements

- **Correctness:** every claim in the golden test set produces exactly the expected rule hits and disposition.
- **Reconciliation:** counts and amounts balance on every run. An imbalance is never hidden: the report prints OUT OF BALANCE with the difference and the job ends with return code 8.
- **Determinism:** the same input, parameters and reference data produce byte-identical output files.
- **Performance:** a 10,000-claim batch completes, including import, in under 60 seconds on the local runner. The queue renders 10,000 rows in under 1.5 seconds and responds to interaction in under 200 ms.
- **Usability:** a new adjuster can find the cause of a stop and record a decision on a claim in under two minutes. Core flows work by keyboard alone.
- **Accessibility:** WCAG 2.2 AA. State is never conveyed by colour alone.
- **Security and privacy:** synthetic data only, server-side permission checks, no secrets in the repository.
- **Portability:** COBOL source is written to compile on both Enterprise COBOL and GnuCOBOL.
- **Maintainability:** rule identity, class, weight and text live in one table that generates the COBOL copybook, the web catalog and this document's rule list.

## 13. Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-01 | A 10,000-claim synthetic batch completes and the summary report reads IN BALANCE. |
| AC-02 | On the golden set, every injected defect is caught by its expected rule, and no rule fires on the clean claims. |
| AC-03 | A claim with only R013 is Auto-rejected. A claim with only R032 and R034 is Critical. |
| AC-04 | Changing the trailer count by one ends the job with return code 8 and the UI shows OUT OF BALANCE with the difference. |
| AC-05 | A missing reference file ends the job with return code 12 and the job monitor shows a readable cause. |
| AC-06 | An adjuster opens a claim, reads the rule trace, approves it with a note, and the audit log shows the action. |
| AC-07 | An adjuster cannot resolve a Critical claim or read others' audit entries, through the UI or by calling the API directly. |
| AC-08 | Re-running the same input and parameters on restored master files gives identical output files. |
| AC-09 | Every figure on the summary opens a claim list whose total matches the figure. |
| AC-10 | A keyboard-only user completes the review flow, and an automated accessibility scan reports no serious violations. |

## 14. Decisions, assumptions and risks

**Decisions taken on the author's behalf**

| Topic | Decision | Reason |
| --- | --- | --- |
| Data stores | QSAM for claim files and outputs; VSAM KSDS for policy, member, provider and history; small reference tables loaded into storage; no DB2 | Keyed random access fits masters; no DB2 setup; works on z/OS, GnuCOBOL and older emulated MVS |
| Web-to-mainframe link | Node bridge with two interchangeable adapters: z/OS (Zowe) and local runner | Works with or without a z/OS login; the UI and COBOL do not change |
| Frontend | React with TypeScript | Component reuse across eight screens; strong typing for record shapes |
| Rule basis | Public standards and common payer edits, scaled to 32 rules | Defensible without access to a proprietary rulebook |
| Identity | Simulated roles | Real authentication is not the subject of the course |

**Assumptions:** one claim line per record; one currency; one run at a time; reference tables are small enough to hold in storage.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| z/OS access is not restored | No live JCL execution on the real system | Local runner for the demo; run on Hercules or z/OS later for JES evidence |
| Hercules compiler predates COBOL 85 | Source does not compile unchanged | Treat Hercules as an evidence run for a reduced Tier 1 build, ported to the older dialect |
| One-day deadline | Incomplete system | Tiered scope; Tier 1 is a finished demo on its own |
| Rules are challenged as arbitrary | Credibility | Cite the standards, keep weights in one visible table, show evidence on every hit |
| Scope creep | Time lost | Freeze scope once Tier 1 runs end to end |

## 15. Glossary

- **CARC:** Claim Adjustment Reason Code, the X12 code set used to explain adjustments and denials.
- **DD, DSN:** JCL data definition name and data set name.
- **JCL:** Job Control Language, the instructions that run a batch job.
- **KSDS:** VSAM key-sequenced data set, read by key.
- **QSAM:** queued sequential access method, used for flat files.
- **RC:** return code, a number a job step sets to report how it ended.
- **SYSOUT:** the job's printed output held by the spooler.
- **Trailer:** the final record of a file, carrying the count and total the sender expects.
- **Hard stop:** a rule whose failure alone rejects the claim.
- **Sum insured:** the maximum benefit a policy will pay in its term.
