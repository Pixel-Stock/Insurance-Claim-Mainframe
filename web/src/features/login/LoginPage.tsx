import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { ROLE_PROFILES, type Role } from '@shared/types';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(role);
      navigate('/batches');
    } catch (error) {
      alert('Login failed');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Insurance Claims Validation</h1>
          <p className={styles.subtitle}>Mainframe Batch Processing System</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="role" className={styles.label}>
              Select Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={styles.select}
            >
              <option value="operator">Operator</option>
              <option value="adjuster">Adjuster</option>
              <option value="supervisor">Supervisor</option>
              <option value="auditor">Auditor</option>
            </select>
            <p className={styles.roleDescription}>{ROLE_PROFILES[role as Role].summary}</p>
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Choose a role to see its specific permissions and limits after sign-in.</p>
        </div>
      </div>
    </div>
  );
}
