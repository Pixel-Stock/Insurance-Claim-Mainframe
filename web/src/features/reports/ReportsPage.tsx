import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatAmount, DISPOSITION_LABELS } from '@shared/types';
import styles from '../workflow/Workflow.module.css';

export default function ReportsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: batches = [], isLoading } = useQuery({ queryKey: ['batches'], queryFn: api.batches.list });
  const completed = batches.filter((batch: any) => batch.state === 'COMPLETE');
  const currentId = selectedId ?? completed[0]?.id;
  const { data: summary, error } = useQuery({ queryKey: ['summary', currentId], queryFn: () => api.summary.get(currentId!), enabled: !!currentId });
  return <div className={styles.page}>
    <div className={styles.titleRow}><div><h1 className={styles.title}>Reports</h1><p className={styles.subtitle}>Completed batch reconciliation and validation outcomes.</p></div></div>
    {isLoading ? <div className={styles.card}>Loading batches…</div> : completed.length === 0 ? <div className={styles.empty}>No completed batches yet. An operator or supervisor can add and run the 10K demo batch.</div> : <>
      <div className={styles.toolbar}><strong>Select completed batch</strong><select value={currentId} onChange={event => setSelectedId(Number(event.target.value))}>{completed.map((batch: any) => <option key={batch.id} value={batch.id}>{batch.run_id} · {batch.record_count.toLocaleString()} claims</option>)}</select></div>
      {error ? <div className={styles.notice}>{(error as Error).message}</div> : summary && <>
        <div className={styles.grid}><div className={styles.metric}><span className={styles.metricLabel}>Records processed</span><span className={styles.metricValue}>{summary.reconciliation.readCount.toLocaleString()}</span></div><div className={styles.metric}><span className={styles.metricLabel}>Return code</span><span className={styles.metricValue}>{String(summary.rc).padStart(4, '0')}</span></div><div className={styles.metric}><span className={styles.metricLabel}>Reconciliation</span><span className={styles.metricValue}>{summary.reconciliation.inBalance ? 'In balance' : 'Needs review'}</span></div><div className={styles.metric}><span className={styles.metricLabel}>Run date</span><span className={styles.metricValue}>{summary.runDate}</span></div></div>
        <div className={styles.card}><h2 className={styles.sectionTitle}>Disposition report</h2><table className={styles.table}><thead><tr><th>Disposition</th><th>Claims</th><th>Share</th><th>Billed amount</th></tr></thead><tbody>{summary.dispositions.map((item: any) => <tr key={item.disposition}><td>{DISPOSITION_LABELS[item.disposition as keyof typeof DISPOSITION_LABELS]}</td><td>{item.count.toLocaleString()}</td><td>{item.percentage.toFixed(1)}%</td><td>{formatAmount(item.amount)}</td></tr>)}</tbody></table></div>
        <div className={styles.card}><h2 className={styles.sectionTitle}>Top validation rules</h2>{summary.topRules.length ? <table className={styles.table}><thead><tr><th>Rule</th><th>Claims</th><th>Billed amount</th></tr></thead><tbody>{summary.topRules.map((rule: any) => <tr key={rule.ruleId}><td className="mono">{rule.ruleId}</td><td>{rule.count.toLocaleString()}</td><td>{formatAmount(rule.amount)}</td></tr>)}</tbody></table> : <p>No rule hits were recorded.</p>}</div>
      </>}
    </>}
  </div>;
}
