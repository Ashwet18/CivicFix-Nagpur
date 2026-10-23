import styles from './Dashboard.module.css';

// ── Sample data (placeholder — replaced by API in Stage 4) ───────────────────
const STATS = [
  { label: 'Total Complaints', value: 128, color: '#E3F2FD', text: '#1565C0', icon: '📋' },
  { label: 'In Progress',      value: 47,  color: '#FFF8E1', text: '#F57F17', icon: '⚙️'  },
  { label: 'Resolved',         value: 63,  color: '#E8F5E9', text: '#2E7D32', icon: '✅'  },
  { label: 'Pending Review',   value: 18,  color: '#FCE4EC', text: '#C62828', icon: '⏳'  },
];

const RECENT_ACTIVITY = [
  { id: 'CF-042', category: 'Pothole',      area: 'Sitabuldi',    status: 'In Progress', assignedTo: 'PWD'         },
  { id: 'CF-041', category: 'Garbage',      area: 'Civil Lines',  status: 'Submitted',   assignedTo: 'Unassigned'  },
  { id: 'CF-040', category: 'Street Light', area: 'Wardha Road',  status: 'Resolved',    assignedTo: 'Electricity' },
  { id: 'CF-039', category: 'Water Leak',   area: 'Dharampeth',   status: 'In Progress', assignedTo: 'Water Board' },
  { id: 'CF-038', category: 'Pothole',      area: 'Itwari',       status: 'Submitted',   assignedTo: 'Unassigned'  },
];

const STATUS_COLORS = {
  'Submitted':   { bg: '#E3F2FD', color: '#1565C0' },
  'In Progress': { bg: '#FFF8E1', color: '#F57F17' },
  'Resolved':    { bg: '#E8F5E9', color: '#2E7D32' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, color, text, icon }) {
  return (
    <div className={styles.statCard} style={{ backgroundColor: color }}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue} style={{ color: text }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Submitted'];
  return (
    <span
      className={styles.badge}
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {status}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className={styles.page}>
      {/* Stats row */}
      <section>
        <h2 className={styles.sectionTitle}>Overview</h2>
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Recent activity table */}
      <section className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Recent Complaints</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Area</th>
                <th>Status</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ACTIVITY.map((row) => (
                <tr key={row.id}>
                  <td className={styles.idCell}>{row.id}</td>
                  <td>{row.category}</td>
                  <td>{row.area}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td className={row.assignedTo === 'Unassigned' ? styles.unassigned : ''}>
                    {row.assignedTo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.mockNote}>⚠ Sample data — backend connection coming in Stage 4</p>
      </section>
    </div>
  );
}
