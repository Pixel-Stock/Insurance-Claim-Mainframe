import { getDatabase, saveDatabase } from './init.js';
import type { Database as SqlJsDatabase } from 'sql.js';

// Wrapper to make sql.js feel like better-sqlite3
export class DbWrapper {
  private db: SqlJsDatabase;
  private transactionDepth = 0;
  
  constructor(db: SqlJsDatabase) {
    this.db = db;
  }
  
  prepare(sql: string) {
    const db = this.db;
    return {
      run: (...params: any[]) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        if (this.transactionDepth === 0) saveDatabase();
        return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0 };
      },
      get: (...params: any[]): any => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
      },
      all: (...params: any[]): any[] => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results: any[] = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  }
  
  exec(sql: string) {
    this.db.exec(sql);
    if (this.transactionDepth === 0) saveDatabase();
  }
  
  transaction(fn: () => void) {
    return () => {
      try {
        this.db.exec('BEGIN');
        this.transactionDepth++;
        fn();
        this.db.exec('COMMIT');
        this.transactionDepth--;
        saveDatabase();
      } catch (error) {
        this.transactionDepth = Math.max(0, this.transactionDepth - 1);
        this.db.exec('ROLLBACK');
        throw error;
      }
    };
  }
}

export async function getDb(): Promise<DbWrapper> {
  const db = await getDatabase();
  return new DbWrapper(db);
}
