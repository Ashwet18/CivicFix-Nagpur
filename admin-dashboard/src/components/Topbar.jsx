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
        <div className={styles.adminBadge}>
          <span className={styles.adminAvatar}>👤</span>
          <div className={styles.adminInfo}>
            <span className={styles.adminName}>Admin Dashboard</span>
            <span className={styles.adminRole}>Authentication unavailable</span>
          </div>
        </div>
      </div>
    </header>
  );
}
