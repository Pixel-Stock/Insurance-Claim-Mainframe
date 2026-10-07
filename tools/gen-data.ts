#!/usr/bin/env tsx
/**
 * Synthetic data generator for Insurance Claims Validation System
 * Generates realistic test data: policies, members, providers, reference tables, claims
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Seeded random for reproducible output
class SeededRandom {
  private seed: number;
  
  constructor(seed: number = 42) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

const rng = new SeededRandom(42);

// Helper functions
function padLeft(value: string | number, length: number, char: string = ' '): string {
  return String(value).padStart(length, char);
}

function padRight(value: string | number, length: number, char: string = ' '): string {
  return String(value).padEnd(length, char);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = padLeft(date.getMonth() + 1, 2, '0');
  const day = padLeft(date.getDate(), 2, '0');
  return `${year}${month}${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function calculateAge(dob: Date, asOf: Date): number {
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// NPI Luhn check digit calculator
function calculateNPICheckDigit(base: string): string {
  const prefix = '80840'; // NPI prefix
  const digits = (prefix + base).split('').map(Number);
  let sum = 24; // Constant for NPI
  
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 0 && i < digits.length - 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

function generateNPI(sequence: number): string {
  const base = padLeft(sequence, 9, '0');
  const checkDigit = calculateNPICheckDigit(base);
  return base + checkDigit;
}

// Master data generators
const planCodes = ['GLD1', 'SLV1', 'BRZ1', 'PLT1'];
const providerTypes = ['PH', 'HS', 'CL', 'LB', 'RD'];
const relations = ['SE', 'SP', 'CH', 'PA'];
const posValues = ['11', '21', '22', '23', '81'];

// Indian first names
const firstNames = [
  'Rajesh', 'Priya', 'Amit', 'Sunita', 'Vijay', 'Anjali', 'Suresh', 'Kavita',
  'Ramesh', 'Deepa', 'Anil', 'Meena', 'Sanjay', 'Pooja', 'Rakesh', 'Neeta',
  'Ashok', 'Rekha', 'Manoj', 'Seema', 'Ravi', 'Nisha', 'Prakash', 'Usha',
  'Vinod', 'Lalita', 'Dinesh', 'Asha', 'Mahesh', 'Geeta', 'Ajay', 'Suman'
];

// Indian last names
const lastNames = [
  'Kumar', 'Sharma', 'Singh', 'Patel', 'Gupta', 'Reddy', 'Iyer', 'Joshi',
  'Mehta', 'Nair', 'Rao', 'Pillai', 'Das', 'Dutta', 'Bose', 'Ghosh',
  'Kulkarni', 'Desai', 'Kapoor', 'Malhotra', 'Agarwal', 'Banerjee', 'Menon', 'Varma'
];

// Hospital/clinic names
const providerNames = [
  'City General Hospital', 'Metro Medical Center', 'Apollo Clinic', 'Max Healthcare',
  'Fortis Hospital', 'Medanta Lab', 'Sunrise Diagnostic', 'Care Hospital',
  'Manipal Clinic', 'Lilavati Hospital', 'Ruby Hall Clinic', 'Kokilaben Hospital',
  'Jupiter Hospital', 'Narayana Health', 'Columbia Asia', 'Cloudnine Hospital'
];

// CPT-like procedure codes with metadata
const procedures = [
  { code: '99213', auth: false, allowed: 95000, maxUnits: 1, ageMin: 0, ageMax: 120, gender: 'B', pos: ['11', '22'], dxCats: ['J', 'R', 'I', 'E', 'M'] },
  { code: '99214', auth: false, allowed: 145000, maxUnits: 1, ageMin: 0, ageMax: 120, gender: 'B', pos: ['11', '22'], dxCats: ['J', 'R', 'I', 'E', 'M', 'K'] },
  { code: '99285', auth: false, allowed: 295000, maxUnits: 1, ageMin: 0, ageMax: 120, gender: 'B', pos: ['23'], dxCats: ['S', 'T', 'R', 'J'] },
  { code: '70450', auth: true, allowed: 385000, maxUnits: 1, ageMin: 5, ageMax: 120, gender: 'B', pos: ['22', '11'], dxCats: ['S', 'G', 'R'] },
  { code: '71020', auth: false, allowed: 125000, maxUnits: 1, ageMin: 0, ageMax: 120, gender: 'B', pos: ['21', '22'], dxCats: ['J', 'R', 'C'] },
  { code: '80053', auth: false, allowed: 145000, maxUnits: 1, ageMin: 0, ageMax: 120, gender: 'B', pos: ['81'], dxCats: ['E', 'I', 'N', 'K'] },
  { code: '85025', auth: false, allowed: 75000, maxUnits: 1, ageMin: 0, ageMax: 120, gender: 'B', pos: ['81'], dxCats: ['D', 'C', 'I'] },
  { code: '93000', auth: false, allowed: 95000, maxUnits: 1, ageMin: 10, ageMax: 120, gender: 'B', pos: ['11', '22'], dxCats: ['I', 'R'] },
  { code: '45378', auth: true, allowed: 785000, maxUnits: 1, ageMin: 40, ageMax: 120, gender: 'B', pos: ['22', '21'], dxCats: ['K', 'C'] },
  { code: '59400', auth: true, allowed: 1250000, maxUnits: 1, ageMin: 15, ageMax: 50, gender: 'F', pos: ['21'], dxCats: ['O', 'Z'] },
  { code: '27447', auth: true, allowed: 2950000, maxUnits: 1, ageMin: 50, ageMax: 120, gender: 'B', pos: ['21', '22'], dxCats: ['M', 'S'] },
  { code: '66984', auth: true, allowed: 1150000, maxUnits: 1, ageMin: 40, ageMax: 120, gender: 'B', pos: ['22', '21'], dxCats: ['H'] },
];

// ICD-10 diagnosis codes with metadata
const diagnoses = [
  { code: 'J069', gender: 'B', ageMin: 0, ageMax: 120 }, // Upper respiratory infection
  { code: 'J189', gender: 'B', ageMin: 0, ageMax: 120 }, // Pneumonia
  { code: 'I10', gender: 'B', ageMin: 18, ageMax: 120 }, // Hypertension
  { code: 'E119', gender: 'B', ageMin: 10, ageMax: 120 }, // Type 2 diabetes
  { code: 'M545', gender: 'B', ageMin: 18, ageMax: 120 }, // Low back pain
  { code: 'R51', gender: 'B', ageMin: 0, ageMax: 120 }, // Headache
  { code: 'K219', gender: 'B', ageMin: 10, ageMax: 120 }, // GERD
  { code: 'O80', gender: 'F', ageMin: 15, ageMax: 50 }, // Normal delivery
  { code: 'S52501A', gender: 'B', ageMin: 5, ageMax: 120 }, // Fracture
  { code: 'M170', gender: 'B', ageMin: 50, ageMax: 120 }, // Osteoarthritis knee
  { code: 'H2611', gender: 'B', ageMin: 40, ageMax: 120 }, // Cataract
  { code: 'D649', gender: 'B', ageMin: 0, ageMax: 120 }, // Anemia
];

// Non-billable pairs (procedure combinations that shouldn't be billed together)
const nonBillablePairs = [
  ['99213', '99214'], // Different E&M levels same day
  ['71020', '70450'], // Chest and head imaging same day (arbitrary rule)
];

// Plan exclusions (plan + procedure)
const planExclusions = [
  ['BRZ1', '66984'], // Bronze plan excludes cataract surgery
  ['BRZ1', '27447'], // Bronze plan excludes knee replacement
];

interface Policy {
  policyNo: string;
  planCode: string;
  status: string;
  effDate: string;
  termDate: string;
  waitDays: number;
  sumInsured: number;
  utilisedAmt: number;
}

interface Member {
  memberId: string;
  policyNo: string;
  dob: string;
  gender: string;
  relation: string;
  status: string;
}

interface Provider {
  providerId: string;
  status: string;
  type: string;
  network: string;
  name: string;
}

interface Procedure {
  code: string;
  allowed: number;
  maxUnits: number;
  authReq: string;
  ageMin: number;
  ageMax: number;
  gender: string;
  posList: string;
  dxList: string;
}

interface Diagnosis {
  code: string;
  gender: string;
  ageMin: number;
  ageMax: number;
}

// Generate policies
function generatePolicies(count: number): Policy[] {
  const policies: Policy[] = [];
  const baseDate = new Date(2024, 0, 1);
  
  for (let i = 0; i < count; i++) {
    const policyNo = `POL${padLeft(i + 1, 7, '0')}`;
    const planCode = rng.pick(planCodes);
    
    // Most active, some lapsed/suspended/cancelled
    let status = 'A';
    const statusRoll = rng.nextInt(1, 100);
    if (statusRoll <= 3) status = 'L';
    else if (statusRoll <= 5) status = 'S';
    else if (statusRoll <= 7) status = 'C';
    
    const effDate = addDays(baseDate, rng.nextInt(-730, -365));
    const termDate = addMonths(effDate, rng.nextInt(12, 60));
    
    const waitDays = rng.pick([0, 0, 0, 30, 60, 90]);
    
    // Sum insured based on plan
    let sumInsured = 300000000; // 3M in paise
    if (planCode === 'GLD1') sumInsured = 1000000000; // 10M
    if (planCode === 'SLV1') sumInsured = 500000000; // 5M
    if (planCode === 'BRZ1') sumInsured = 200000000; // 2M
    if (planCode === 'PLT1') sumInsured = 2000000000; // 20M
    
    // Some utilization
    const utilPct = rng.nextInt(0, 30) / 100;
    const utilisedAmt = Math.floor(sumInsured * utilPct);
    
    policies.push({
      policyNo,
      planCode,
      status,
      effDate: formatDate(effDate),
      termDate: formatDate(termDate),
      waitDays,
      sumInsured,
      utilisedAmt,
    });
  }
  
  return policies;
}

// Generate members
function generateMembers(policies: Policy[], membersPerPolicy: number): Member[] {
  const members: Member[] = [];
  let memberSeq = 0;
  
  for (const policy of policies) {
    const memberCount = membersPerPolicy;
    
    for (let i = 0; i < memberCount; i++) {
      memberSeq++;
      const memberId = `MEM${padLeft(memberSeq, 9, '0')}`;
      
      let relation = 'SE';
      if (i === 1) relation = 'SP';
      else if (i > 1) relation = 'CH';
      
      // Age based on relation
      let ageYears = rng.nextInt(25, 65);
      if (relation === 'SP') ageYears = rng.nextInt(25, 65);
      else if (relation === 'CH') ageYears = rng.nextInt(0, 25);
      
      const dob = addDays(new Date(2024, 0, 1), -ageYears * 365 - rng.nextInt(0, 364));
      
      const gender = rng.nextInt(0, 1) === 0 ? 'M' : 'F';
      
      const status = policy.status === 'A' ? 'A' : 'I';
      
      members.push({
        memberId,
        policyNo: policy.policyNo,
        dob: formatDate(dob),
        gender,
        relation,
        status,
      });
    }
  }
  
  return members;
}

// Generate providers
function generateProviders(count: number): Provider[] {
  const providers: Provider[] = [];
  
  for (let i = 0; i < count; i++) {
    const providerId = generateNPI(i + 1);
    
    // Most active, some inactive, watch-list, sanctioned
    let status = 'A';
    const statusRoll = rng.nextInt(1, 100);
    if (statusRoll <= 3) status = 'I';
    else if (statusRoll <= 6) status = 'W';
    else if (statusRoll <= 8) status = 'S';
    
    const type = rng.pick(providerTypes);
    const network = rng.nextInt(1, 100) <= 85 ? 'Y' : 'N';
    
    const baseName = rng.pick(providerNames);
    const suffix = i > 15 ? ` ${rng.pick(['North', 'South', 'East', 'West', 'Central'])}` : '';
    const name = (baseName + suffix).substring(0, 30);
    
    providers.push({
      providerId,
      status,
      type,
      network,
      name,
    });
  }
  
  return providers;
}

// Write fixed-width record
function writePolicyRecord(policy: Policy): string {
  const sumPacked = policy.sumInsured.toString().padStart(11, '0');
  const utilPacked = policy.utilisedAmt.toString().padStart(11, '0');
  
  return (
    padRight(policy.policyNo, 10) +
    padRight(policy.planCode, 4) +
    policy.status +
    policy.effDate +
    policy.termDate +
    padLeft(policy.waitDays, 3, '0') +
    sumPacked +
    utilPacked +
    padRight('', 14)
  );
}

function writeMemberRecord(member: Member): string {
  return (
    padRight(member.memberId, 12) +
    padRight(member.policyNo, 10) +
    member.dob +
    member.gender +
    padRight(member.relation, 2) +
    member.status +
    padRight('', 26)
  );
}

function writeProviderRecord(provider: Provider): string {
  return (
    padRight(provider.providerId, 10) +
    provider.status +
    padRight(provider.type, 2) +
    provider.network +
    padRight(provider.name, 30) +
    padRight('', 16)
  );
}

// Write reference tables
function writeProcedureReference(): string[] {
  return procedures.map(proc => {
    const posList = proc.pos.join(',');
    const dxList = proc.dxCats.join(',');
    return (
      padRight(proc.code, 5) +
      padLeft(proc.allowed, 9, '0') +
      padLeft(proc.maxUnits, 3, '0') +
      (proc.auth ? 'Y' : 'N') +
      padLeft(proc.ageMin, 3, '0') +
      padLeft(proc.ageMax, 3, '0') +
      proc.gender +
      padRight(posList, 20) +
      padRight(dxList, 50) +
      padRight('', 6)
    );
  });
}

function writeDiagnosisReference(): string[] {
  return diagnoses.map(dx => (
    padRight(dx.code, 7) +
    dx.gender +
    padLeft(dx.ageMin, 3, '0') +
    padLeft(dx.ageMax, 3, '0') +
    padRight('', 47)
  ));
}

function writePairReference(): string[] {
  return nonBillablePairs.map(pair => (
    padRight(pair[0], 5) +
    padRight(pair[1], 5) +
    padRight('', 10)
  ));
}

function writePlanExclusionReference(): string[] {
  return planExclusions.map(excl => (
    padRight(excl[0], 4) +
    padRight(excl[1], 5) +
    padRight('', 11)
  ));
}

// Generate test claim batch
interface ClaimDefect {
  rules: string[];
  description: string;
}

function generateClaimBatch(
  policies: Policy[],
  members: Member[],
  providers: Provider[],
  count: number
): { claims: string[]; expected: Record<string, ClaimDefect> } {
  
  const claims: string[] = [];
  const expected: Record<string, ClaimDefect> = {};
  const runDate = new Date(2026, 9, 7); // Oct 7, 2026
  
  // Active policies and members only for clean claims
  const activePolicies = policies.filter(p => p.status === 'A');
  const activeMembers = members.filter(m => m.status === 'A');
  const activeProviders = providers.filter(p => p.status === 'A');
  
  let claimSeq = 0;
  
  // Helper to create a claim record
  function createClaim(params: {
    recType?: string;
    clmId?: string;
    policy?: Policy;
    member?: Member;
    provider?: Provider;
    dosFrom?: Date;
    dosTo?: Date;
    submitDate?: Date;
    pos?: string;
    dxPrimary?: string;
    dxSecondary?: string;
    procCode?: string;
    procMod?: string;
    units?: number;
    billedAmt?: number;
    authNo?: string;
  }): string {
    const p = params;
    return (
      (p.recType || 'D') +
      padRight(p.clmId || '', 12) +
      padRight(p.policy?.policyNo || '', 10) +
      padRight(p.member?.memberId || '', 12) +
      padRight(p.provider?.providerId || '', 10) +
      (p.dosFrom ? formatDate(p.dosFrom) : '00000000') +
      (p.dosTo ? formatDate(p.dosTo) : '00000000') +
      (p.submitDate ? formatDate(p.submitDate) : '00000000') +
      padRight(p.pos || '', 2) +
      padRight(p.dxPrimary || '', 7) +
      padRight(p.dxSecondary || '', 7) +
      padRight(p.procCode || '', 5) +
      padRight(p.procMod || '', 2) +
      padLeft(String(p.units || 0), 3, '0') +
      padLeft(String(p.billedAmt || 0), 9, '0') +
      padRight(p.authNo || '', 10) +
      padRight('', 6)
    );
  }
  
  // Reserve records for deliberate validation defects, then fill the rest with clean claims.
  const tier1Rules = ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007',
                      'R010', 'R011', 'R012', 'R013', 'R014', 'R020', 'R030', 'R050'];
  const cleanCount = count - tier1Rules.length * 5;
  
  for (let i = 0; i < cleanCount; i++) {
    claimSeq++;
    const clmId = `CL${padLeft(claimSeq, 10, '0')}`;
    
    const policy = rng.pick(activePolicies);
    const memberCandidates = activeMembers.filter(m => m.policyNo === policy.policyNo);
    const member = rng.pick(memberCandidates);
    const provider = rng.pick(activeProviders);
    
    const procedure = rng.pick(procedures);
    const diagnosis = rng.pick(diagnoses.filter(d => procedure.dxCats.includes(d.code[0])));
    
    const dosFrom = addDays(runDate, -rng.nextInt(5, 60));
    const dosTo = dosFrom;
    const submitDate = addDays(dosFrom, rng.nextInt(1, 15));
    
    const pos = rng.pick(procedure.pos);
    const units = 1;
    const billedAmt = Math.floor(procedure.allowed * rng.nextInt(80, 120) / 100);
    const authNo = procedure.auth ? `AUTH${padLeft(rng.nextInt(1, 9999), 6, '0')}` : '';
    
    claims.push(createClaim({
      clmId,
      policy,
      member,
      provider,
      dosFrom,
      dosTo,
      submitDate,
      pos,
      dxPrimary: diagnosis.code,
      procCode: procedure.code,
      units,
      billedAmt,
      authNo,
    }));
  }
  
  // Generate defective claims for each rule (at least 5 per rule for Tier 1)
  for (const rule of tier1Rules) {
    for (let i = 0; i < 5; i++) {
      claimSeq++;
      const clmId = `CL${padLeft(claimSeq, 10, '0')}`;
      
      const policy = rng.pick(activePolicies);
      const memberCandidates = activeMembers.filter(m => m.policyNo === policy.policyNo);
      const member = rng.pick(memberCandidates);
      const provider = rng.pick(activeProviders);
      
      const procedure = rng.pick(procedures);
      const diagnosis = rng.pick(diagnoses);
      
      const dosFrom = addDays(runDate, -rng.nextInt(5, 60));
      const dosTo = dosFrom;
      const submitDate = addDays(dosFrom, rng.nextInt(1, 15));
      
      const pos = rng.pick(procedure.pos);
      const units = 1;
      const billedAmt = procedure.allowed;
      const authNo = procedure.auth ? `AUTH${padLeft(rng.nextInt(1, 9999), 6, '0')}` : '';
      
      let defectiveClaim = '';
      const defect: ClaimDefect = { rules: [rule], description: '' };
      
      switch (rule) {
        case 'R001': // Blank mandatory field
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: '', // Blank
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Blank primary diagnosis';
          break;
          
        case 'R002': // Invalid date
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom: new Date(2026, 1, 30), // Feb 30
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Invalid service date';
          break;
          
        case 'R003': // Invalid DX format
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: '12345', // Not ICD-10
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Invalid diagnosis format';
          break;
          
        case 'R004': // Invalid procedure format
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: 'ABCDE', // Invalid
            units,
            billedAmt,
          });
          defect.description = 'Invalid procedure format';
          break;
          
        case 'R005': // Invalid NPI
          const badProvider = { ...provider, providerId: '1234567890' }; // Bad check digit
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider: badProvider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Invalid NPI check digit';
          break;
          
        case 'R006': // Zero amount
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt: 0,
          });
          defect.description = 'Zero billed amount';
          break;
          
        case 'R007': // Date logic error
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom: addDays(runDate, 10), // Future
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Service date after run date';
          break;
          
        case 'R010': // Policy not found
          const badPolicy = { ...policy, policyNo: 'POL9999999' };
          defectiveClaim = createClaim({
            clmId,
            policy: badPolicy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Policy not found';
          break;
          
        case 'R011': // Member not found
          const badMember = { ...member, memberId: 'MEM999999999' };
          defectiveClaim = createClaim({
            clmId,
            policy,
            member: badMember,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Member not found';
          break;
          
        case 'R012': // Lapsed policy
          const lapsedPolicy = policies.find(p => p.status === 'L') || policy;
          defectiveClaim = createClaim({
            clmId,
            policy: lapsedPolicy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Policy lapsed';
          break;
          
        case 'R013': // Before effective date
          const earlyDos = addDays(new Date(policy.effDate.substring(0, 4) + '-' + 
                                             policy.effDate.substring(4, 6) + '-' + 
                                             policy.effDate.substring(6, 8)), -30);
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom: earlyDos,
            dosTo: earlyDos,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Service before policy effective';
          break;
          
        case 'R014': // After termination
          const lateDos = addDays(new Date(policy.termDate.substring(0, 4) + '-' + 
                                            policy.termDate.substring(4, 6) + '-' + 
                                            policy.termDate.substring(6, 8)), 30);
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom: lateDos,
            dosTo: lateDos,
            submitDate: addDays(lateDos, 5),
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Service after termination';
          break;
          
        case 'R020': // Filing limit exceeded
          const oldDos = addDays(runDate, -120);
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom: oldDos,
            dosTo: oldDos,
            submitDate: runDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
          defect.description = 'Filing limit exceeded';
          break;
          
        case 'R030': // Exceeds sum insured
          const highAmount = policy.sumInsured - policy.utilisedAmt + 100000; // Over by 1000
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt: highAmount,
          });
          defect.description = 'Exceeds remaining sum insured';
          break;
          
        case 'R050': // Exact duplicate (same claim earlier in batch)
          if (claims.length > 0) {
            defectiveClaim = claims[claims.length - 1]; // Duplicate previous
            defect.description = 'Exact duplicate in batch';
          } else {
            defectiveClaim = createClaim({
              clmId,
              policy,
              member,
              provider,
              dosFrom,
              dosTo,
              submitDate,
              pos,
              dxPrimary: diagnosis.code,
              procCode: procedure.code,
              units,
              billedAmt,
            });
          }
          break;
          
        default:
          defectiveClaim = createClaim({
            clmId,
            policy,
            member,
            provider,
            dosFrom,
            dosTo,
            submitDate,
            pos,
            dxPrimary: diagnosis.code,
            procCode: procedure.code,
            units,
            billedAmt,
          });
      }
      
      claims.push(defectiveClaim);
      expected[clmId] = defect;
    }
  }
  
  return { claims, expected };
}

// Main
async function main() {
  console.log('Insurance Claims Validation - Synthetic Data Generator');
  console.log('=======================================================\n');
  
  const dataDir = path.join(__dirname, '..', 'data');
  const mastersDir = path.join(dataDir, 'masters');
  const referenceDir = path.join(dataDir, 'reference');
  const batchesDir = path.join(dataDir, 'batches');
  
  // Create directories
  for (const dir of [dataDir, mastersDir, referenceDir, batchesDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  console.log('Generating master data...');
  
  // Generate policies
  console.log('  - 5,000 policies');
  const policies = generatePolicies(5000);
  const policyLines = policies.map(writePolicyRecord);
  fs.writeFileSync(path.join(mastersDir, 'POLICY.dat'), policyLines.join('\n'));
  
  // Generate members
  console.log('  - 10,000 members');
  const members = generateMembers(policies, 2);
  const memberLines = members.map(writeMemberRecord);
  fs.writeFileSync(path.join(mastersDir, 'MEMBER.dat'), memberLines.join('\n'));
  
  // Generate providers
  console.log('  - 150 providers');
  const providers = generateProviders(150);
  const providerLines = providers.map(writeProviderRecord);
  fs.writeFileSync(path.join(mastersDir, 'PROVIDER.dat'), providerLines.join('\n'));
  
  console.log('\nGenerating reference tables...');
  
  // Procedure reference
  console.log('  - 12 procedures');
  const procLines = writeProcedureReference();
  fs.writeFileSync(path.join(referenceDir, 'PROC.dat'), procLines.join('\n'));
  
  // Diagnosis reference
  console.log('  - 12 diagnoses');
  const dxLines = writeDiagnosisReference();
  fs.writeFileSync(path.join(referenceDir, 'DX.dat'), dxLines.join('\n'));
  
  // Pair reference
  console.log('  - 2 non-billable pairs');
  const pairLines = writePairReference();
  fs.writeFileSync(path.join(referenceDir, 'PAIRS.dat'), pairLines.join('\n'));
  
  // Plan exclusions
  console.log('  - 2 plan exclusions');
  const exclLines = writePlanExclusionReference();
  fs.writeFileSync(path.join(referenceDir, 'PLANEXC.dat'), exclLines.join('\n'));
  
  console.log('\nGenerating claim batch...');
  console.log('  - 10,000 claims');
  
  const { claims, expected } = generateClaimBatch(policies, members, providers, 10000);
  
  // Add trailer
  const totalCount = claims.length;
  const totalAmount = claims.reduce((sum, claim) => {
    const amtStr = claim.substring(95, 104);
    return sum + parseInt(amtStr, 10);
  }, 0);
  
  const trailer = (
    'T' +
    padLeft(totalCount, 9, '0') +
    padLeft(totalAmount, 13, '0') +
    padRight('', 97)
  );
  
  claims.push(trailer);
  
  fs.writeFileSync(path.join(batchesDir, 'TEST10K.dat'), claims.join('\n'));
  fs.writeFileSync(path.join(batchesDir, 'expected.json'), JSON.stringify(expected, null, 2));
  
  // Create CSV version
  console.log('  - CSV version');
  const csvHeader = 'REC_TYPE,CLM_ID,POLICY_NO,MEMBER_ID,PROVIDER_ID,DOS_FROM,DOS_TO,SUBMIT_DATE,POS_CODE,DX_PRIMARY,DX_SECONDARY,PROC_CODE,PROC_MOD,UNITS,BILLED_AMT,AUTH_NO';
  const csvLines = [csvHeader];
  
  for (const claim of claims) {
    if (claim[0] === 'T') continue; // Skip trailer for CSV
    
    const fields = [
      claim.substring(0, 1),
      claim.substring(1, 13).trim(),
      claim.substring(13, 23).trim(),
      claim.substring(23, 35).trim(),
      claim.substring(35, 45).trim(),
      claim.substring(45, 53),
      claim.substring(53, 61),
      claim.substring(61, 69),
      claim.substring(69, 71).trim(),
      claim.substring(71, 78).trim(),
      claim.substring(78, 85).trim(),
      claim.substring(85, 90).trim(),
      claim.substring(90, 92).trim(),
      claim.substring(92, 95),
      claim.substring(95, 104),
      claim.substring(104, 114).trim(),
    ];
    
    csvLines.push(fields.join(','));
  }
  
  fs.writeFileSync(path.join(batchesDir, 'TEST10K.csv'), csvLines.join('\n'));
  
  // Summary statistics
  console.log('\n=======================================================');
  console.log('Generation Complete\n');
  console.log('Master Data:');
  console.log(`  Policies:  ${policies.length}`);
  console.log(`  Members:   ${members.length}`);
  console.log(`  Providers: ${providers.length}`);
  console.log('\nReference Tables:');
  console.log(`  Procedures:  ${procedures.length}`);
  console.log(`  Diagnoses:   ${diagnoses.length}`);
  console.log(`  Pairs:       ${nonBillablePairs.length}`);
  console.log(`  Exclusions:  ${planExclusions.length}`);
  console.log('\nClaim Batch:');
  console.log(`  Total claims: ${totalCount}`);
  console.log(`  Defects:      ${Object.keys(expected).length}`);
  console.log(`  Total amount: ₹${(totalAmount / 100).toFixed(2)}`);
  console.log('\nOutput:');
  console.log(`  ${mastersDir}/`);
  console.log(`  ${referenceDir}/`);
  console.log(`  ${batchesDir}/TEST10K.dat`);
  console.log(`  ${batchesDir}/TEST10K.csv`);
  console.log(`  ${batchesDir}/expected.json`);
  console.log('\n✓ Ready for COBOL processing');
}

main().catch(console.error);
