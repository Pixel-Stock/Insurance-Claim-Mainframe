import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { can, formatAmount } from '@shared/types';
import styles from '../workflow/Workflow.module.css';

export default function QueuePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<'MANUAL' | 'CRITICAL'>('MANUAL');
  const [busyId, setBusyId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const canWork = !!user && (queue === 'CRITICAL' ? can(user.role, 'claim.work.critical') : can(user.role, 'claim.work.manual'));
  const { data: claims = [], isLoading, error } = useQuery({
    queryKey: ['claims', queue],
    queryFn: () => api.claims.list({ queue, limit: 100 }),
  });

  const act = async (id: number, action: string) => {
    setBusyId(id);
    try { await api.claims.action(id, action); await queryClient.invalidateQueries({ queryKey: ['claims'] }); }
    finally { setBusyId(null); }
  };

  return <div className={styles.page}>
    <div className={styles.titleRow}><div><h1 className={styles.title}>Exception Queue</h1><p className={styles.subtitle}>Review validation exceptions by severity and role permission.</p></div></div>
    <div className={styles.tabs}>
      <button className={`${styles.tab} ${queue === 'MANUAL' ? styles.activeTab : ''}`} onClick={() => setQueue('MANUAL')}>Manual review</button>
      {user && can(user.role, 'claim.work.critical') && <button className={`${styles.tab} ${queue === 'CRITICAL' ? styles.activeTab : ''}`} onClick={() => setQueue('CRITICAL')}>Critical</button>}
    </div>
    {!canWork && <div className={styles.notice}>This role has read-only access to this queue.</div>}
    {isLoading ? <div className={styles.card}>Loading claims…</div> : error ? <div className={styles.notice}>{(error as Error).message}</div> : claims.length === 0 ? <div className={styles.empty}>No {queue.toLowerCase()} claims are available yet. Add and run the 10K demo batch from Batches.</div> :
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Claim</th><th>Member</th><th>Amount</th><th>Score</th><th>Status</th><th>Rule</th><th>Actions</th></tr></thead><tbody>
        {claims.map((claim: any) => <tr key={claim.id}><td className="mono">{claim.claim_id}</td><td className="mono">{claim.member_id}</td><td className="tabular">{formatAmount(claim.billed_minor)}</td><td>{claim.score}</td><td><span className={`${styles.badge} ${queue === 'CRITICAL' ? styles.critical : styles.manual}`}>{claim.status}</span></td><td className="mono">{claim.top_rule || '—'}</td><td><div className={styles.actions}>
          {canWork && <><button disabled={busyId === claim.id} className={styles.secondaryButton} onClick={() => act(claim.id, 'request-info')}>Request info</button><button disabled={busyId === claim.id} className={styles.button} onClick={() => act(claim.id, 'approve')}>Approve</button><button disabled={busyId === claim.id} className={styles.dangerButton} onClick={() => act(claim.id, 'reject')}>Reject</button></>}
        </div></td></tr>)}
      </tbody></table></div>}
  </div>;
}
