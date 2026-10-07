import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import styles from '../workflow/Workflow.module.css';

export default function AuditPage() {
  const { data: entries = [], isLoading, error } = useQuery({ queryKey: ['audit'], queryFn: api.audit.list });
  return <div className={styles.page}><div className={styles.titleRow}><div><h1 className={styles.title}>Audit Log</h1><p className={styles.subtitle}>Every batch and claim decision is recorded with an integrity hash.</p></div></div>
    {isLoading ? <div className={styles.card}>Loading audit events…</div> : error ? <div className={styles.notice}>{(error as Error).message}</div> : entries.length === 0 ? <div className={styles.empty}>No actions have been recorded yet.</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Entity</th><th>Details</th><th>Hash</th></tr></thead><tbody>{entries.map((entry: any) => <tr key={entry.id}><td>{new Date(entry.at).toLocaleString()}</td><td>{entry.actor}</td><td>{entry.role}</td><td>{entry.action}</td><td>{entry.entity} #{entry.entity_id}</td><td>{entry.detail_json || '—'}</td><td className="mono">{entry.hash?.slice(0, 12)}…</td></tr>)}</tbody></table></div>}
  </div>;
}
