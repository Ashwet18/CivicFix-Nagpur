import { useState } from 'react';
import styles from './Complaints.module.css';

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_COMPLAINTS = [
  { id: 'CF-042', category: 'Pothole',       area: 'Sitabuldi',    status: 'In Progress', assignedTo: 'PWD',          date: '2026-10-22', description: 'Large pothole near Sitabuldi market causing traffic issues.' },
  { id: 'CF-041', category: 'Garbage',       area: 'Civil Lines',  status: 'Submitted',   assignedTo: 'Unassigned',   date: '2026-10-22', description: 'Overflowing dustbin at Civil Lines bus stop.' },
  { id: 'CF-040', category: 'Street Light',  area: 'Wardha Road',  status: 'Resolved',    assignedTo: 'Electricity',  date: '2026-10-18', description: 'Street light not working for 2 weeks on Wardha Road.' },
  { id: 'CF-039', category: 'Water Leak',    area: 'Dharampeth',   status: 'In Progress', assignedTo: 'Water Board',  date: '2026-10-20', description: 'Water pipe leak near Dharampeth colony gate.' },
  { id: 'CF-038', category: 'Pothole',       area: 'Itwari',       status: 'Submitted',   assignedTo: 'Unassigned',   date: '2026-10-21', description: 'Multiple potholes on the road near Itwari station.' },
  { id: 'CF-037', category: 'Sewage',        area: 'Gandhibagh',   status: 'Submitted',   assignedTo: 'Unassigned',   date: '2026-10-19', description: 'Sewage overflow on main road in Gandhibagh area.' },
  { id: 'CF-036', category: 'Street Light',  area: 'Sadar',        status: 'Resolved',    assignedTo: 'Electricity',  date: '2026-10-15', description: 'Multiple lights not working near Sadar market.' },
];

const STATUS_COLORS = {
  'Submitted':   { bg: '#E3F2FD', color: '#1565C0' },
  'In Progress': { bg: '#FFF8E1', color: '#F57F17' },
  'Resolved':    { bg: '#E8F5E9', color: '#2E7D32' },
};

const ALL_STATUSES = ['All', 'Submitted', 'In Progress', 'Resolved'];

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Submitted'];
  return (
    <span className={styles.badge} style={{ backgroundColor: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Complaints() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const visible = SAMPLE_COMPLAINTS.filter((c) => {
    const matchStatus = filter === 'All' || c.status === filter;
    const matchSearch =
      search === '' ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by ID, category, or area…"
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search complaints"
        />
        <div className={styles.filters}>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${filter === s ? styles.active : ''}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Area</th>
                <th>Description</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>No complaints match your filter.</td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.idCell}>{row.id}</td>
                    <td>{row.category}</td>
                    <td>{row.area}</td>
                    <td className={styles.descCell}>{row.description}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td className={row.assignedTo === 'Unassigned' ? styles.unassigned : ''}>
                      {row.assignedTo}
                    </td>
                    <td className={styles.dateCell}>{row.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.mockNote}>⚠ Sample data — backend connection coming in Stage 4</p>
      </div>
    </div>
  );
}
