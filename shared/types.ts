// Shared types between bridge and frontend

export type Role = 'operator' | 'adjuster' | 'supervisor' | 'auditor';

export type Capability =
  | 'batch.read'
  | 'batch.submit'
  | 'claim.read'
  | 'claim.work.manual'
  | 'claim.work.critical'
  | 'claim.reassign'
  | 'report.read'
  | 'rules.read'
  | 'audit.read.all'
  | 'audit.read.own';

export type BatchState =
  | 'CREATED'
  | 'VALIDATED'
  | 'SUBMITTED'
  | 'RUNNING'
  | 'ENDED'
  | 'IMPORTED'
  | 'COMPLETE'
  | 'FAILED';

export type JobState = 'INPUT' | 'ACTIVE' | 'OUTPUT' | 'UNKNOWN';

export type Disposition = 'P' | 'M' | 'C' | 'X';

export type Queue = 'MANUAL' | 'CRITICAL' | 'NONE';

export type WorkflowStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'INFO_REQUESTED'
  | 'APPROVED'
  | 'REJECT_CONFIRMED'
  | 'PASSED'
  | 'CLOSED_REJECTED';

export type RuleClass = 'H' | 'C' | 'M' | 'W';

export type ExecutionBackend = 'zos' | 'local';

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface RunParameters {
  fileLimitDays: number;
  highValueThreshold: number;
  frequencyWindow: number;
  updateMode: boolean;
  runDate?: string;
}

export interface Batch {
  id: number;
  runId: string;
  filename: string;
  uploadedBy: string;
  recordCount: number;
  paramsJson: string;
  state: BatchState;
  jobId: string | null;
  rc: number | null;
  backend: ExecutionBackend;
  createdAt: string;
  endedAt: string | null;
  summaryJson: string | null;
}

export interface JobStep {
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'ERROR';
  rc: number | null;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface JobStatus {
  jobId: string;
  state: JobState;
  rc: number | null;
  maxcc: number | null;
  steps: JobStep[];
  startTime?: string;
  endTime?: string;
}

export interface SpoolFile {
  id: number;
  ddname: string;
  stepname: string;
  content: string;
}

export interface Claim {
  id: number;
  batchId: number;
  claimId: string;
  memberId: string;
  policyNo: string;
  providerId: string;
  dosFrom: string;
  billedMinor: number;
  score: number;
  disposition: Disposition;
  hitCount: number;
  topRule: string | null;
  queue: Queue;
  status: WorkflowStatus;
  assignee: string | null;
  enteredAt: string;
  dueAt: string | null;
  raw: string;
}

export interface ClaimHit {
  ruleId: string;
  class: RuleClass;
  weight: number;
  carc: string;
  evidence: string;
  seq: number;
}

export interface ClaimDetail extends Claim {
  hits: ClaimHit[];
  policy?: PolicyRecord;
  member?: MemberRecord;
  provider?: ProviderRecord;
  actions: ClaimAction[];
}

export interface ClaimAction {
  id: number;
  claimPk: number;
  actor: string;
  role: Role;
  action: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  note: string | null;
  at: string;
}

export interface PolicyRecord {
  policyNo: string;
  planCode: string;
  polStatus: string;
  effDate: string;
  termDate: string;
  waitDays: number;
  sumInsured: number;
  utilisedAmt: number;
}

export interface MemberRecord {
  memberId: string;
  policyNo: string;
  dob: string;
  gender: string;
  relation: string;
  memStatus: string;
}

export interface ProviderRecord {
  providerId: string;
  provStatus: string;
  provType: string;
  networkFlag: string;
  provName: string;
}

export interface Rule {
  id: string;
  category: string;
  description: string;
  class: RuleClass;
  weight: number;
  carc: string;
  explanation: string;
}

export interface DispositionSummary {
  disposition: Disposition;
  count: number;
  amount: number;
  percentage: number;
}

export interface RuleHitSummary {
  ruleId: string;
  count: number;
  amount: number;
}

export interface AgeingBucket {
  bucket: string;
  count: number;
}

export interface BatchSummary {
  runId: string;
  jobId: string | null;
  runDate: string;
  parameters: RunParameters;
  backend: ExecutionBackend;
  rc: number;
  reconciliation: {
    inBalance: boolean;
    readCount: number;
    readAmount: number;
    trailerCount: number;
    trailerAmount: number;
    countDiff: number;
    amountDiff: number;
  };
  dispositions: DispositionSummary[];
  topRules: RuleHitSummary[];
  ageing: AgeingBucket[];
}

export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  role: Role;
  action: string;
  entity: string;
  entityId: string;
  detailJson: string | null;
  prevHash: string | null;
  hash: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  detail?: string;
}

// Permission grants
export const GRANTS: Record<Role, Capability[]> = {
  operator: ['batch.read', 'batch.submit', 'report.read'],
  adjuster: ['batch.read', 'claim.read', 'claim.work.manual', 'audit.read.own'],
  supervisor: ['batch.read', 'batch.submit', 'claim.read', 'claim.work.manual', 'claim.work.critical', 'claim.reassign', 'report.read', 'rules.read', 'audit.read.all'],
  auditor: ['batch.read', 'claim.read', 'report.read', 'rules.read', 'audit.read.all'],
};

export interface RoleProfile {
  label: string;
  summary: string;
  perks: string[];
  limitations: string[];
}

export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  operator: {
    label: 'Batch Operator',
    summary: 'Owns intake and execution of claim batches.',
    perks: ['Can add and submit the 10,000-record demo batch', 'Can monitor batch progress and reports'],
    limitations: ['Cannot open or change individual claims', 'Cannot view audit history or rule configuration'],
  },
  adjuster: {
    label: 'Claims Adjuster',
    summary: 'Works everyday manual-review claims.',
    perks: ['Can review and resolve manual-queue claims', 'Can view their own action history'],
    limitations: ['Cannot submit batches or work critical claims', 'Cannot reassign work, view all audits, or edit rules'],
  },
  supervisor: {
    label: 'Claims Supervisor',
    summary: 'Controls operational exceptions and oversight.',
    perks: ['Can work manual and critical claims', 'Can reassign work, submit batches, view reports, rules, and all audit events'],
    limitations: ['Rule changes are deliberately read-only in this demo', 'Cannot alter source claim files after submission'],
  },
  auditor: {
    label: 'Audit Reviewer',
    summary: 'Independently reviews the operation without changing it.',
    perks: ['Can read batches, exception queues, reports, rules, and all audit history', 'Can inspect evidence and workflow decisions'],
    limitations: ['Read-only access: cannot submit batches or change claims', 'Cannot assign, approve, reject, or request information'],
  },
};

export function can(role: Role, capability: Capability): boolean {
  return GRANTS[role].includes(capability);
}

// Disposition labels and colors
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  P: 'Passed',
  M: 'Manual Review',
  C: 'Critical',
  X: 'Auto-Rejected',
};

export const DISPOSITION_SEVERITY: Record<Disposition, number> = {
  P: 1,
  M: 2,
  C: 3,
  X: 4,
};

// Score bands
export interface ScoreBand {
  min: number;
  max: number;
  disposition: Disposition;
  label: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { min: 0, max: 19, disposition: 'P', label: 'Passed' },
  { min: 20, max: 49, disposition: 'M', label: 'Manual Review' },
  { min: 50, max: 79, disposition: 'C', label: 'Critical' },
  { min: 80, max: 100, disposition: 'X', label: 'Auto-Rejected' },
];

// Class floors
export const CLASS_FLOORS: Record<RuleClass, number> = {
  H: 4, // Auto-rejected
  C: 3, // Critical
  M: 2, // Manual Review
  W: 1, // Warning only
};

// Format helpers
export function formatAmount(minor: number): string {
  return `₹${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  const year = yyyymmdd.substring(0, 4);
  const month = yyyymmdd.substring(4, 6);
  const day = yyyymmdd.substring(6, 8);
  return `${day}/${month}/${year}`;
}

export function parseDate(yyyymmdd: string): Date | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  const year = parseInt(yyyymmdd.substring(0, 4), 10);
  const month = parseInt(yyyymmdd.substring(4, 6), 10) - 1;
  const day = parseInt(yyyymmdd.substring(6, 8), 10);
  return new Date(year, month, day);
}
