import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../..', 'data', 'workflow.db');

let SQL: any = null;
let db: SqlJsDatabase | null = null;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (!db) {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!SQL) {
      SQL = await initSqlJs();
    }
    
    // Try to load existing database
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  }
  return db!;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();
  
  // Batches table
  database.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      record_count INTEGER NOT NULL,
      params_json TEXT NOT NULL,
      state TEXT NOT NULL,
      job_id TEXT,
      rc INTEGER,
      backend TEXT NOT NULL,
      created_at TEXT NOT NULL,
      ended_at TEXT,
      summary_json TEXT
    )
  `);
  
  // Claims table
  database.run(`
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      claim_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      policy_no TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      dos_from TEXT NOT NULL,
      billed_minor INTEGER NOT NULL,
      score INTEGER NOT NULL,
      disposition TEXT NOT NULL,
      hit_count INTEGER NOT NULL,
      top_rule TEXT,
      queue TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT,
      entered_at TEXT NOT NULL,
      due_at TEXT,
      raw TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )
  `);
  
  database.run(`
    CREATE INDEX IF NOT EXISTS ix_claims_batch 
    ON claims(batch_id, disposition, status)
  `);
  
  // Claim hits table
  database.run(`
    CREATE TABLE IF NOT EXISTS claim_hits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_pk INTEGER NOT NULL,
      seq INTEGER NOT NULL,
      rule_id TEXT NOT NULL,
      class TEXT NOT NULL,
      weight INTEGER NOT NULL,
      carc TEXT NOT NULL,
      evidence TEXT NOT NULL,
      FOREIGN KEY (claim_pk) REFERENCES claims(id)
    )
  `);
  
  // Claim actions table
  database.run(`
    CREATE TABLE IF NOT EXISTS claim_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_pk INTEGER NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      note TEXT,
      at TEXT NOT NULL,
      FOREIGN KEY (claim_pk) REFERENCES claims(id)
    )
  `);
  
  // Audit log table
  database.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      detail_json TEXT,
      prev_hash TEXT,
      hash TEXT
    )
  `);
  
  // Policies (mirrored from seed for display)
  database.run(`
    CREATE TABLE IF NOT EXISTS policies (
      policy_no TEXT PRIMARY KEY,
      plan_code TEXT NOT NULL,
      pol_status TEXT NOT NULL,
      eff_date TEXT NOT NULL,
      term_date TEXT NOT NULL,
      wait_days INTEGER NOT NULL,
      sum_insured INTEGER NOT NULL,
      utilised_amt INTEGER NOT NULL
    )
  `);
  
  // Members
  database.run(`
    CREATE TABLE IF NOT EXISTS members (
      member_id TEXT PRIMARY KEY,
      policy_no TEXT NOT NULL,
      dob TEXT NOT NULL,
      gender TEXT NOT NULL,
      relation TEXT NOT NULL,
      mem_status TEXT NOT NULL
    )
  `);
  
  // Providers
  database.run(`
    CREATE TABLE IF NOT EXISTS providers (
      provider_id TEXT PRIMARY KEY,
      prov_status TEXT NOT NULL,
      prov_type TEXT NOT NULL,
      network_flag TEXT NOT NULL,
      prov_name TEXT NOT NULL
    )
  `);
  
  saveDatabase();
  console.log('Database initialized');
}
