// Shared types between bridge and frontend
// Permission grants
export const GRANTS = {
    operator: ['batch.read', 'batch.submit', 'report.read'],
    adjuster: ['batch.read', 'claim.read', 'claim.work.manual', 'audit.read.own'],
    supervisor: ['batch.read', 'batch.submit', 'claim.read', 'claim.work.manual', 'claim.work.critical', 'claim.reassign', 'report.read', 'rules.read', 'audit.read.all'],
    auditor: ['batch.read', 'claim.read', 'report.read', 'rules.read', 'audit.read.all'],
};
export const ROLE_PROFILES = {
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
export function can(role, capability) {
    return GRANTS[role].includes(capability);
}
// Disposition labels and colors
export const DISPOSITION_LABELS = {
    P: 'Passed',
    M: 'Manual Review',
    C: 'Critical',
    X: 'Auto-Rejected',
};
export const DISPOSITION_SEVERITY = {
    P: 1,
    M: 2,
    C: 3,
    X: 4,
};
export const SCORE_BANDS = [
    { min: 0, max: 19, disposition: 'P', label: 'Passed' },
    { min: 20, max: 49, disposition: 'M', label: 'Manual Review' },
    { min: 50, max: 79, disposition: 'C', label: 'Critical' },
    { min: 80, max: 100, disposition: 'X', label: 'Auto-Rejected' },
];
// Class floors
export const CLASS_FLOORS = {
    H: 4, // Auto-rejected
    C: 3, // Critical
    M: 2, // Manual Review
    W: 1, // Warning only
};
// Format helpers
export function formatAmount(minor) {
    return `₹${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
export function formatDate(yyyymmdd) {
    if (!yyyymmdd || yyyymmdd.length !== 8)
        return yyyymmdd;
    const year = yyyymmdd.substring(0, 4);
    const month = yyyymmdd.substring(4, 6);
    const day = yyyymmdd.substring(6, 8);
    return `${day}/${month}/${year}`;
}
export function parseDate(yyyymmdd) {
    if (!yyyymmdd || yyyymmdd.length !== 8)
        return null;
    const year = parseInt(yyyymmdd.substring(0, 4), 10);
    const month = parseInt(yyyymmdd.substring(4, 6), 10) - 1;
    const day = parseInt(yyyymmdd.substring(6, 8), 10);
    return new Date(year, month, day);
}
