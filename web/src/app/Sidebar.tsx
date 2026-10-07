import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { can } from '@shared/types';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h1 className={styles.title}>Claims Validation</h1>
        <p className={styles.subtitle}>Insurance Operations</p>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/batches" className={({ isActive }) => 
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }>
          Batches
        </NavLink>
        {role && can(role, 'claim.read') && <NavLink to="/queue" className={({ isActive }) => 
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }>
          Exception Queue
        </NavLink>}
        {role && can(role, 'report.read') && <NavLink to="/reports" className={({ isActive }) => 
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }>
          Reports
        </NavLink>}
        {role && (can(role, 'audit.read.all') || can(role, 'audit.read.own')) && <NavLink to="/audit" className={({ isActive }) => 
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }>
          Audit Log
        </NavLink>}
        {role && can(role, 'rules.read') && <NavLink to="/rules" className={({ isActive }) => 
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }>
          Rules & Reference
        </NavLink>}
        <NavLink to="/roles" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>Role guide</NavLink>
      </nav>

      <div className={styles.user}>
        <div className={styles.userName}>{user?.username}</div>
        <div className={styles.userRole}>{user?.role}</div>
      </div>
    </aside>
  );
}
