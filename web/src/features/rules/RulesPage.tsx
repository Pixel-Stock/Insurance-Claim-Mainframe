import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import styles from '../workflow/Workflow.module.css';

export default function RulesPage() {
  const { data: rules = [], isLoading, error } = useQuery({ queryKey: ['rules'], queryFn: api.rules.list });
  return <div className={styles.page}><div className={styles.titleRow}><div><h1 className={styles.title}>Rules & Reference</h1><p className={styles.subtitle}>Read-only validation rule catalogue used by the batch processor.</p></div></div>
    {isLoading ? <div className={styles.card}>Loading rules…</div> : error ? <div className={styles.notice}>{(error as Error).message}</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Rule</th><th>Category</th><th>Description</th><th>Class</th><th>Weight</th><th>CARC</th><th>Explanation</th></tr></thead><tbody>{rules.map((rule: any) => <tr key={rule.id}><td className="mono">{rule.id}</td><td>{rule.category}</td><td>{rule.description}</td><td>{rule.class}</td><td>{rule.weight}</td><td>{rule.carc}</td><td>{rule.explanation}</td></tr>)}</tbody></table></div>}
  </div>;
}
