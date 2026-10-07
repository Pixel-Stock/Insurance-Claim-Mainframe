import { createHash } from 'crypto';
import type { Role } from '@shared/types.js';
import type { DbWrapper } from './helpers.js';

export function appendAudit(
  db: DbWrapper,
  entry: { actor: string; role: Role; action: string; entity: string; entityId: string; detail?: unknown }
): void {
  const previous = db.prepare('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1').get() as { hash?: string } | null;
  const at = new Date().toISOString();
  const detailJson = entry.detail ? JSON.stringify(entry.detail) : null;
  const hash = createHash('sha256')
    .update([previous?.hash || '', at, entry.actor, entry.action, entry.entity, entry.entityId, detailJson || ''].join('|'))
    .digest('hex');

  db.prepare(`
    INSERT INTO audit_log (at, actor, role, action, entity, entity_id, detail_json, prev_hash, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(at, entry.actor, entry.role, entry.action, entry.entity, entry.entityId, detailJson, previous?.hash || null, hash);
}
