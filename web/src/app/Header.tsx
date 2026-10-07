import { useAuth } from '../lib/auth-context';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.backend}>
        <span className={styles.backendLabel}>Backend:</span>
        <span className={styles.backendValue}>LOCAL-GNUCOBOL</span>
      </div>
      
      <button onClick={handleLogout} className={styles.logoutBtn}>
        Sign Out
      </button>
    </header>
  );
}
