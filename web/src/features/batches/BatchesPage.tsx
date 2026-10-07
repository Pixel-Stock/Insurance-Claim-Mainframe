import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { can } from '@shared/types';
import { useAuth } from '../../lib/auth-context';
import styles from './BatchesPage.module.css';

export default function BatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: batches = [], isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: api.batches.list,
  });
  const maySubmit = !!user && can(user.role, 'batch.submit');
  const addDemoBatch = async () => {
    await api.batches.addDemo();
    await queryClient.invalidateQueries({ queryKey: ['batches'] });
  };
  const submitBatch = async (id: number) => {
    await api.batches.submit(id);
    await queryClient.invalidateQueries({ queryKey: ['batches'] });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className={styles.message}>{(error as Error).message}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Batches</h1><p className={styles.intro}>Manage the generated 10,000-person, 10,000-claim validation batch.</p></div>
        {maySubmit && <button className={styles.uploadBtn} onClick={addDemoBatch}>Add 10K demo batch</button>}
      </div>

      <div className={styles.infoGrid}><div><strong>10,000</strong><span>member records</span></div><div><strong>10,000</strong><span>claims in TEST10K</span></div><div><strong>75</strong><span>intentional validation defects</span></div><div><strong>5,000</strong><span>active policy records</span></div></div>

      {!maySubmit && <div className={styles.readOnly}>Your role can inspect batch information, but only an operator or supervisor can add and submit batches.</div>}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Filename</th>
              <th>Uploaded By</th>
              <th>Records</th>
              <th>State</th>
              <th>RC</th>
              <th>Backend</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches?.map((batch: any) => (
              <tr key={batch.id}>
                <td className="mono">{batch.run_id}</td>
                <td>{batch.filename}</td>
                <td>{batch.uploaded_by}</td>
                <td className="tabular">{batch.record_count.toLocaleString()}</td>
                <td>
                  <span className={`${styles.badge} ${styles[batch.state.toLowerCase()]}`}>
                    {batch.state}
                  </span>
                </td>
                <td className="mono tabular">{batch.rc !== null ? String(batch.rc).padStart(4, '0') : '—'}</td>
                <td className="mono">{batch.backend}</td>
                <td>{new Date(batch.created_at).toLocaleString()}</td>
                <td className={styles.actions}>{batch.state === 'VALIDATED' && maySubmit && <button onClick={() => submitBatch(batch.id)} className={styles.runBtn}>Run</button>}{batch.state === 'COMPLETE' && <button onClick={() => navigate(`/summary/${batch.id}`)} className={styles.viewBtn}>Summary</button>}{batch.state === 'RUNNING' || batch.state === 'SUBMITTED' ? 'Processing…' : null}</td>
              </tr>
            ))}
            {batches.length === 0 && <tr><td colSpan={9} className={styles.empty}>No batch has been added yet. {maySubmit ? 'Add the 10K demo batch to begin.' : 'Ask an operator or supervisor to add the demo batch.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
