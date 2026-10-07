import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatAmount, DISPOSITION_LABELS } from '@shared/types';
import styles from './SummaryPage.module.css';

export default function SummaryPage() {
  const { batchId } = useParams<{ batchId: string }>();
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', batchId],
    queryFn: () => api.summary.get(parseInt(batchId!)),
    enabled: !!batchId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!summary) return <div>No data</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Batch Summary Report</h1>
      
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Run ID:</span>
          <span className="mono">{summary.runId}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Run Date:</span>
          <span>{summary.runDate}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Return Code:</span>
          <span className="mono">{String(summary.rc).padStart(4, '0')}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Backend:</span>
          <span className="mono">{summary.backend}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Dispositions</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Disposition</th>
              <th>Claims</th>
              <th>Percentage</th>
              <th>Billed Amount</th>
            </tr>
          </thead>
          <tbody>
            {summary.dispositions.map((disp: any) => (
              <tr key={disp.disposition}>
                <td>{DISPOSITION_LABELS[disp.disposition as keyof typeof DISPOSITION_LABELS]}</td>
                <td className="tabular">{disp.count.toLocaleString()}</td>
                <td className="tabular">{disp.percentage.toFixed(1)}%</td>
                <td className="tabular">{formatAmount(disp.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Reconciliation</h2>
        <div className={styles.reconciliation}>
          <div className={styles.reconItem}>
            <span className={styles.reconLabel}>Status:</span>
            <span className={summary.reconciliation.inBalance ? styles.balanced : styles.unbalanced}>
              {summary.reconciliation.inBalance ? 'IN BALANCE' : 'OUT OF BALANCE'}
            </span>
          </div>
          <div className={styles.reconItem}>
            <span className={styles.reconLabel}>Records Read:</span>
            <span className="tabular">{summary.reconciliation.readCount.toLocaleString()}</span>
          </div>
          <div className={styles.reconItem}>
            <span className={styles.reconLabel}>Trailer Count:</span>
            <span className="tabular">{summary.reconciliation.trailerCount.toLocaleString()}</span>
          </div>
          <div className={styles.reconItem}>
            <span className={styles.reconLabel}>Count Difference:</span>
            <span className="tabular">{summary.reconciliation.countDiff}</span>
          </div>
        </div>
      </div>

      {summary.topRules.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Top Rule Hits</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Claims</th>
                <th>Billed Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.topRules.slice(0, 10).map((rule: any) => (
                <tr key={rule.ruleId}>
                  <td className="mono">{rule.ruleId}</td>
                  <td className="tabular">{rule.count.toLocaleString()}</td>
                  <td className="tabular">{formatAmount(rule.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
