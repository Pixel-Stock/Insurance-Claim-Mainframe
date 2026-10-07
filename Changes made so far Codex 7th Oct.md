# Changes made so far — Codex — 7th Oct 2026

## What was requested

1. Fix the startup failures from `run.bat`.
2. Add a batch containing roughly 10,000 people's data and show useful information for it.
3. Give the four demo roles different practical permissions and restrictions.
4. Replace every `Coming soon...` screen with working functionality.
5. Keep a clear written record of work completed and remaining.

## Completed

### Startup and dependencies

- Fixed the bridge API route that used `await` outside an `async` function.
- Added the missing `react-router-dom` dependency.
- Added CSS-module declarations so TypeScript understands `.module.css` files.
- Removed an unused import that prevented the web build.
- Corrected bridge TypeScript configuration and database wrapper typing so the full `npm run build` command passes.

### 10K test dataset and batch

- Updated `tools/gen-data.ts` to generate exactly:
  - 5,000 policy records
  - 10,000 member records
  - 150 provider records
  - 10,000 claim records
  - 75 deliberately defective claims for validation demonstrations
- Regenerated `data/batches/TEST10K.dat`, `TEST10K.csv`, master data, reference data, and expected defect data.
- Added **Add 10K demo batch** on the Batches screen. Operators and supervisors can add it to the workflow and then run it.
- Completed a validation run during verification. It processed 10,000 records, returned code 0004 (expected because there are exceptions), and reconciled **in balance**.
- Added useful dataset figures to the Batches screen: member count, claim count, planned defects, and policies.

### Four role profiles

The permissions are enforced by the bridge API as well as reflected in the screen navigation.

| Role | Key abilities | Restrictions |
| --- | --- | --- |
| Batch Operator | Adds and submits batches; views reports | Cannot open/change claims, view audit history, or view rules |
| Claims Adjuster | Reviews and resolves manual-review claims; views their own audit events | Cannot submit batches, work critical claims, reassign work, view all audit events, or view rules |
| Claims Supervisor | Submits batches; works manual and critical claims; reassigns work; sees reports, rules, and all audit events | Rule editing and source-file editing are deliberately unavailable in this demo |
| Audit Reviewer | Read-only access to batches, queues, reports, rules, and all audit events | Cannot add/run batches or change claims |

- Added a **Role guide** screen that explains the advantages and boundaries of every role, highlights the signed-in role, and lists its capabilities.
- The login screen now shows a short explanation for the selected role.

### Completed application screens

- **Batches**: 10K demo-batch creation, submission, status, metrics, and summary navigation.
- **Exception Queue**: manual and critical queues, score/amount/rule details, and available claim actions.
- **Reports**: select a completed batch and see reconciliation, disposition totals, top rules, and return code.
- **Audit Log**: role-scoped audit history with actors, actions, details, and integrity-hash prefix.
- **Rules & Reference**: read-only validation-rule catalogue.
- **Role guide**: four roles, their practical benefits, and their limitations.

### Audit and workflow improvements

- Batch creation/submission and claim decisions now generate audit records.
- Audit records contain an SHA-256 integrity hash linked to the prior record.
- Claim actions are checked against the role and queue: an adjuster cannot act on a critical claim; an auditor cannot make decisions.
- Fixed transactional imports so imported claim hits use the correct claim IDs.

## Verification completed

- `npm run gen-data` succeeded and reported 10,000 members and 10,000 claims.
- `npm run build` succeeded for both the React web app and the bridge API.
- The 10K batch was run successfully and the reconciliation report showed 10,000 records in balance.
- API permission checks were confirmed:
  - Supervisor received critical-queue records.
  - Auditor received audit history.
  - Operator was correctly denied rule-catalogue access.

## How to run

1. Close any earlier development-server terminal with `Ctrl+C`.
2. Run `run.bat` from the `ESE Project` folder.
3. Open `http://localhost:5173`.
4. Sign in as **operator** or **supervisor**.
5. Open **Batches**, select **Add 10K demo batch**, and press **Run**.
6. After processing completes, use **Reports** and **Exception Queue**.

## Remaining / intentionally out of scope

- The validation runner uses the local mock validator when a compiled GNU COBOL binary is unavailable. The output format and batch workflow are real for this project, but it is not executing on z/OS.
- Batch-file upload exists in the API but the interface currently focuses on the requested generated 10K demonstration batch rather than a file-picker form.
- Rule editing is deliberately not available; Rules & Reference is a safe read-only catalogue.
- Authentication is demo role selection, not production account/password authentication.
- `npm audit` may still report third-party dependency warnings. Those warnings were not force-fixed because such upgrades can introduce breaking changes and are separate from the application startup/functionality fixes.

## Notes from verification

- A failed batch record may be visible from the first internal import test performed while correcting transaction persistence. The later 10K batch completed successfully and is the one to use for the queue and reports.
- The generated data is synthetic and suitable for an academic demonstration only.
