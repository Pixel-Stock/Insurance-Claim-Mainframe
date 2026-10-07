import { ROLE_PROFILES, can, GRANTS, type Role } from '@shared/types';
import { useAuth } from '../../lib/auth-context';
import styles from '../workflow/Workflow.module.css';

const roles: Role[] = ['operator', 'adjuster', 'supervisor', 'auditor'];
export default function RoleAccessPage() {
  const { user } = useAuth();
  return <div className={styles.page}><div className={styles.titleRow}><div><h1 className={styles.title}>Role guide</h1><p className={styles.subtitle}>Each demo role has intentionally different operational authority.</p></div></div>
    <div className={styles.grid}>{roles.map(role => { const profile = ROLE_PROFILES[role]; return <section key={role} className={`${styles.card} ${user?.role === role ? styles.selected : ''}`}><h2 className={styles.sectionTitle}>{profile.label}{user?.role === role ? ' · current role' : ''}</h2><p className={styles.subtitle}>{profile.summary}</p><h3 className={`${styles.sectionTitle} ${styles.allowed}`}>What this role can do</h3><ul className={styles.list}>{profile.perks.map(perk => <li key={perk}>{perk}</li>)}</ul><h3 className={`${styles.sectionTitle} ${styles.restriction}`}>Boundaries</h3><ul className={styles.list}>{profile.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul><p className="mono">Capabilities: {GRANTS[role].join(', ')}</p></section>; })}</div>
    {user && <div className={styles.notice}>Current role: <strong>{ROLE_PROFILES[user.role].label}</strong>. Batch submission: {can(user.role, 'batch.submit') ? 'allowed' : 'not allowed'}.</div>}
  </div>;
}
