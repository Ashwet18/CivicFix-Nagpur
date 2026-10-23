import { useLocation } from 'react-router-dom';
import styles from './Topbar.module.css';

const PAGE_TITLES = {
  '/dashboard':   'Dashboard',
  '/complaints':  'Complaints',
  '/departments': 'Departments',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'CivicFix Admin';

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>
      <div className={styles.right}>
        {/* Placeholder admin identity — will be replaced with real auth in Stage 4 */}
        <div className={styles.adminBadge}>
          <span className={styles.adminAvatar}>👤</span>
          <div className={styles.adminInfo}>
            <span className={styles.adminName}>Admin</span>
            <span className={styles.adminRole}>NMC Officer</span>
          </div>
        </div>
      </div>
    </header>
  );
}
