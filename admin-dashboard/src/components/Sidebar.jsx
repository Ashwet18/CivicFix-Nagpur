import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '📊' },
  { to: '/complaints',  label: 'Complaints',  icon: '📋' },
  { to: '/departments', label: 'Departments', icon: '🏢' },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.brandIcon}>🏙️</span>
        <div>
          <div className={styles.brandName}>CivicFix</div>
          <div className={styles.brandSub}>Nagpur Admin</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <span className={styles.footerVersion}>CivicFix Admin</span>
      </div>
    </aside>
  );
}
