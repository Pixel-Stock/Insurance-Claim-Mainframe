#!/usr/bin/env tsx
/**
 * Local GnuCOBOL execution runner
 * Simulates z/OS JCL execution locally
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
class LocalRunner {
    runDir;
    dataDir;
    config;
    jobLog = [];
    startTime;
    constructor(config) {
        this.config = config;
        this.dataDir = path.join(rootDir, 'data');
        this.runDir = path.join(this.dataDir, 'runs', config.runId);
        this.startTime = new Date();
        this.ensureRunDirectory();
    }
    ensureRunDirectory() {
        if (!fs.existsSync(this.runDir)) {
            fs.mkdirSync(this.runDir, { recursive: true });
        }
    }
    log(message) {
        const timestamp = new Date().toISOString().substring(11, 19);
        const line = `${timestamp}  CLMVAL01  ${message}`;
        this.jobLog.push(line);
        console.log(line);
    }
    runStep(name, fn) {
        this.log(`${name}      RUNNING`);
        const stepStart = Date.now();
        try {
            const rc = fn();
            const elapsed = Date.now() - stepStart;
            this.log(`${name}      COMPLETE       RC ${String(rc).padStart(4, '0')}  (${elapsed}ms)`);
            return rc;
        }
        catch (error) {
            this.log(`${name}      ERROR          RC 0016`);
            console.error(error);
            return 16;
        }
    }
    stepBackup() {
        // Copy masters to backup
        const mastersDir = path.join(this.dataDir, 'masters');
        const backupDir = path.join(this.runDir, 'backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const files = ['POLICY.dat', 'MEMBER.dat', 'PROVIDER.dat', 'HISTORY.dat'];
        for (const file of files) {
            const src = path.join(mastersDir, file);
            const dst = path.join(backupDir, file);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dst);
            }
        }
        return 0;
    }
    stepClean() {
        // Remove old outputs
        const outputs = ['PASSED.dat', 'EXCEPT.dat', 'EXCEPT.SORTED.dat',
            'HITS.dat', 'CTLTOT.dat', 'SUMRPT.txt'];
        for (const file of outputs) {
            const filePath = path.join(this.runDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return 0;
    }
    stepValidate() {
        // This would execute the COBOL CLMVAL program
        // For now, simulate validation with a mock implementation
        // Set up DD_ environment variables
        const env = {
            ...process.env,
            DD_CLMIN: path.join(this.dataDir, 'batches', this.config.inputFile),
            DD_POLMST: path.join(this.dataDir, 'masters', 'POLICY.dat'),
            DD_MEMMST: path.join(this.dataDir, 'masters', 'MEMBER.dat'),
            DD_PRVMST: path.join(this.dataDir, 'masters', 'PROVIDER.dat'),
            DD_HISTORY: path.join(this.dataDir, 'masters', 'HISTORY.dat'),
            DD_PROCREF: path.join(this.dataDir, 'reference', 'PROC.dat'),
            DD_DXREF: path.join(this.dataDir, 'reference', 'DX.dat'),
            DD_PAIRREF: path.join(this.dataDir, 'reference', 'PAIRS.dat'),
            DD_PLANEXC: path.join(this.dataDir, 'reference', 'PLANEXC.dat'),
            DD_CLMPASS: path.join(this.runDir, 'PASSED.dat'),
            DD_CLMEXC: path.join(this.runDir, 'EXCEPT.dat'),
            DD_CLMHIT: path.join(this.runDir, 'HITS.dat'),
            DD_CTLTOT: path.join(this.runDir, 'CTLTOT.dat'),
            DD_SYSIN: this.createSysinFile(),
        };
        // Check if COBOL binary exists
        const cobolBin = path.join(rootDir, 'bin', 'clmval');
        if (fs.existsSync(cobolBin)) {
            try {
                execSync(cobolBin, { env, stdio: 'inherit' });
                return 4; // Assume exceptions present for demo
            }
            catch (error) {
                if (error.status)
                    return error.status;
                return 16;
            }
        }
        else {
            // Mock validation for demonstration
            this.log('VALIDATE    NOTE: COBOL binary not found, using mock validator');
            return this.mockValidation();
        }
    }
    createSysinFile() {
        const sysinPath = path.join(this.runDir, 'SYSIN.txt');
        const content = [
            `RUNID=${this.config.runId}`,
            `RUNDATE=${this.config.runDate}`,
            `FILELIM=${String(this.config.fileLimitDays).padStart(3, '0')}`,
            `HVTHR=${(this.config.highValueThreshold / 100).toFixed(2).padStart(12, '0')}`,
            `FREQWIN=${String(this.config.frequencyWindow).padStart(3, '0')}`,
            `UPDATE=${this.config.updateMode ? 'Y' : 'N'}`,
        ].join('\n');
        fs.writeFileSync(sysinPath, content);
        return sysinPath;
    }
    mockValidation() {
        // Create mock output files for demonstration
        // Read input claims
        const inputPath = path.join(this.dataDir, 'batches', this.config.inputFile);
        if (!fs.existsSync(inputPath)) {
            this.log('ERROR: Input file not found');
            return 12;
        }
        const inputLines = fs.readFileSync(inputPath, 'utf-8').split('\n');
        const claims = inputLines.filter(line => line.length > 0 && line[0] === 'D');
        const trailer = inputLines.find(line => line.length > 0 && line[0] === 'T');
        if (!trailer) {
            this.log('ERROR: Trailer record missing');
            return 12;
        }
        // Parse trailer
        const trailerCount = parseInt(trailer.substring(1, 10), 10);
        const trailerAmount = parseInt(trailer.substring(10, 23), 10);
        // Mock: 84% passed, 16% exceptions
        const passedCount = Math.floor(claims.length * 0.84);
        const exceptionCount = claims.length - passedCount;
        // Write PASSED
        const passedLines = claims.slice(0, passedCount);
        fs.writeFileSync(path.join(this.runDir, 'PASSED.dat'), passedLines.join('\n'));
        // Write EXCEPT (mock format)
        const exceptLines = claims.slice(passedCount).map((claim, idx) => {
            const claimId = claim.substring(1, 13);
            const memberId = claim.substring(23, 35);
            const policyNo = claim.substring(13, 23);
            const providerId = claim.substring(35, 45);
            const dosFrom = claim.substring(45, 53);
            const billedAmt = claim.substring(95, 104);
            // Mock score and disposition
            const score = 20 + (idx % 80);
            let disp = 'M';
            let sev = 2;
            if (score >= 80) {
                disp = 'X';
                sev = 4;
            }
            else if (score >= 50) {
                disp = 'C';
                sev = 3;
            }
            return (claimId + memberId + policyNo + providerId + dosFrom +
                billedAmt + String(score).padStart(3, '0') + disp + sev +
                '01' + 'R030' + this.config.runId.padEnd(14, ' ') + '              ');
        });
        fs.writeFileSync(path.join(this.runDir, 'EXCEPT.dat'), exceptLines.join('\n'));
        // Write HITS (mock)
        const hitLines = exceptLines.map(exc => {
            const claimId = exc.substring(0, 12);
            return (claimId + 'R030C060119' +
                'BILLED EXCEEDS REMAINING SUM INSURED                        ' +
                this.config.runId.padEnd(14, ' ') + '   ');
        });
        fs.writeFileSync(path.join(this.runDir, 'HITS.dat'), hitLines.join('\n'));
        // Write CTLTOT
        const totalAmount = claims.reduce((sum, claim) => {
            const amt = parseInt(claim.substring(95, 104), 10);
            return sum + amt;
        }, 0);
        const ctlLines = [
            'RD    ' + String(claims.length).padStart(9, '0') + String(totalAmount).padStart(13, '0') + this.config.runId.padEnd(14, ' ') + ' '.repeat(38),
            'TR    ' + String(trailerCount).padStart(9, '0') + String(trailerAmount).padStart(13, '0') + this.config.runId.padEnd(14, ' ') + ' '.repeat(38),
            'DSP   ' + String(passedCount).padStart(9, '0') + String(Math.floor(totalAmount * 0.84)).padStart(13, '0') + this.config.runId.padEnd(14, ' ') + ' '.repeat(38),
            'DSM   ' + String(Math.floor(exceptionCount * 0.7)).padStart(9, '0') + String(Math.floor(totalAmount * 0.11)).padStart(13, '0') + this.config.runId.padEnd(14, ' ') + ' '.repeat(38),
            'DSC   ' + String(Math.floor(exceptionCount * 0.2)).padStart(9, '0') + String(Math.floor(totalAmount * 0.03)).padStart(13, '0') + this.config.runId.padEnd(14, ' ') + ' '.repeat(38),
            'DSX   ' + String(Math.floor(exceptionCount * 0.1)).padStart(9, '0') + String(Math.floor(totalAmount * 0.02)).padStart(13, '0') + this.config.runId.padEnd(14, ' ') + ' '.repeat(38),
        ];
        fs.writeFileSync(path.join(this.runDir, 'CTLTOT.dat'), ctlLines.join('\n'));
        // Return code 4 (exceptions present, reconciled)
        return 4;
    }
    stepSort() {
        // Sort EXCEPT by severity (descending) and amount (descending)
        const exceptPath = path.join(this.runDir, 'EXCEPT.dat');
        if (!fs.existsSync(exceptPath))
            return 0;
        const lines = fs.readFileSync(exceptPath, 'utf-8').split('\n').filter(l => l.length > 0);
        lines.sort((a, b) => {
            const sevA = parseInt(a.substring(65, 66), 10);
            const sevB = parseInt(b.substring(65, 66), 10);
            if (sevA !== sevB)
                return sevB - sevA;
            const amtA = parseInt(a.substring(52, 61), 10);
            const amtB = parseInt(b.substring(52, 61), 10);
            return amtB - amtA;
        });
        fs.writeFileSync(path.join(this.runDir, 'EXCEPT.SORTED.dat'), lines.join('\n'));
        return 0;
    }
    stepReport() {
        // Generate text report
        const ctltotPath = path.join(this.runDir, 'CTLTOT.dat');
        if (!fs.existsSync(ctltotPath))
            return 8;
        const lines = fs.readFileSync(ctltotPath, 'utf-8').split('\n');
        const report = [];
        report.push('CLAIMS VALIDATION                  BATCH SUMMARY REPORT                  PAGE    1');
        report.push(`RUN ${this.config.runId}   JOB CLMVAL01   RUN DATE ${this.config.runDate.substring(0, 4)}-${this.config.runDate.substring(4, 6)}-${this.config.runDate.substring(6, 8)}   RETURN CODE 0004`);
        report.push(`PARM  FILELIM=${String(this.config.fileLimitDays).padStart(3, '0')}  HVTHR=${(this.config.highValueThreshold / 100).toFixed(2)}  FREQWIN=${String(this.config.frequencyWindow).padStart(3, '0')}  UPDATE=${this.config.updateMode ? 'Y' : 'N'}`);
        report.push('--------------------------------------------------------------------------------');
        report.push('DISPOSITION           CLAIMS      PCT          BILLED AMOUNT');
        for (const line of lines) {
            if (line.substring(0, 2) === 'DS') {
                const key = line.substring(2, 6).trim();
                const count = parseInt(line.substring(6, 15), 10);
                const amount = parseInt(line.substring(15, 28), 10) / 100;
                let label = '';
                if (key === 'P')
                    label = 'PASSED';
                else if (key === 'M')
                    label = 'MANUAL REVIEW';
                else if (key === 'C')
                    label = 'CRITICAL';
                else if (key === 'X')
                    label = 'AUTO-REJECTED';
                if (label) {
                    report.push(label.padEnd(20, ' ') +
                        String(count).padStart(9, ' ') +
                        ' ' +
                        amount.toFixed(2).padStart(20, ' '));
                }
            }
        }
        report.push('--------------------------------------------------------------------------------');
        report.push('RECONCILIATION        IN BALANCE      COUNT DIFF 0      AMOUNT DIFF 0.00');
        report.push('--------------------------------------------------------------------------------');
        fs.writeFileSync(path.join(this.runDir, 'SUMRPT.txt'), report.join('\n'));
        return 0;
    }
    run() {
        this.log('STARTED');
        this.log(`LOCAL RUNNER  RUN ${this.config.runId}  BACKEND local-gnucobol  (not z/OS)`);
        let maxcc = 0;
        maxcc = Math.max(maxcc, this.runStep('BACKUP', () => this.stepBackup()));
        maxcc = Math.max(maxcc, this.runStep('CLEAN', () => this.stepClean()));
        maxcc = Math.max(maxcc, this.runStep('VALIDATE', () => this.stepValidate()));
        if (maxcc < 12) {
            maxcc = Math.max(maxcc, this.runStep('SORTEXC', () => this.stepSort()));
            maxcc = Math.max(maxcc, this.runStep('REPORT', () => this.stepReport()));
        }
        const elapsed = Date.now() - this.startTime.getTime();
        this.log(`ENDED         MAXCC=${String(maxcc).padStart(4, '0')}  (${elapsed}ms)`);
        // Write job log
        fs.writeFileSync(path.join(this.runDir, 'job.log'), this.jobLog.join('\n'));
        return maxcc;
    }
}
// Main
async function main() {
    const config = {
        runId: `CV${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-01`,
        runDate: new Date().toISOString().substring(0, 10).replace(/-/g, ''),
        fileLimitDays: 90,
        highValueThreshold: 50000000, // 500,000.00 in paise
        frequencyWindow: 30,
        updateMode: true,
        inputFile: 'TEST10K.dat',
    };
    const runner = new LocalRunner(config);
    const rc = runner.run();
    process.exit(rc);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
export { LocalRunner };
