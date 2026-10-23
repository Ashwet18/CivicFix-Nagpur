import styles from './Departments.module.css';

// ── Sample data ───────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  {
    id: 1,
    name: 'Public Works Department (PWD)',
    shortCode: 'PWD',
    categories: ['Pothole', 'Road Damage', 'Bridge'],
    activeComplaints: 21,
    resolved: 34,
    contact: 'pwd.nagpur@nmc.gov.in',
  },
  {
    id: 2,
    name: 'Nagpur Municipal Corporation — Sanitation',
    shortCode: 'NMC-San',
    categories: ['Garbage', 'Sewage', 'Drain Overflow'],
    activeComplaints: 14,
    resolved: 28,
    contact: 'sanitation.nagpur@nmc.gov.in',
  },
  {
    id: 3,
    name: 'Maharashtra State Electricity Distribution Co.',
    shortCode: 'Electricity',
    categories: ['Street Light', 'Power Outage'],
    activeComplaints: 8,
    resolved: 19,
    contact: 'msedcl.nagpur@mahadiscom.in',
  },
  {
    id: 4,
    name: 'Nagpur Municipal Corporation — Water Supply',
    shortCode: 'Water Board',
    categories: ['Water Leak', 'No Water Supply', 'Water Quality'],
    activeComplaints: 11,
    resolved: 15,
    contact: 'water.nagpur@nmc.gov.in',
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Departments() {
  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        Departments listed here will be used to assign complaints. Contact details
        and category mapping will be managed via the backend in Stage 4.
      </p>

      <div className={styles.grid}>
        {DEPARTMENTS.map((dept) => (
          <div key={dept.id} className={styles.card}>
            {/* Header */}
            <div className={styles.cardHeader}>
              <span className={styles.shortCode}>{dept.shortCode}</span>
            </div>

            {/* Name */}
            <h3 className={styles.deptName}>{dept.name}</h3>

            {/* Stats row */}
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: '#F57F17' }}>
                  {dept.activeComplaints}
                </span>
                <span className={styles.statLabel}>Active</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: '#2E7D32' }}>
                  {dept.resolved}
                </span>
                <span className={styles.statLabel}>Resolved</span>
              </div>
            </div>

            {/* Categories */}
            <div className={styles.categories}>
              {dept.categories.map((cat) => (
                <span key={cat} className={styles.catTag}>{cat}</span>
              ))}
            </div>

            {/* Contact */}
            <div className={styles.contact}>
              <span className={styles.contactIcon}>✉</span>
              <span className={styles.contactText}>{dept.contact}</span>
            </div>
          </div>
        ))}
      </div>

      <p className={styles.mockNote}>⚠ Sample data — department management coming in Stage 5</p>
    </div>
  );
}
