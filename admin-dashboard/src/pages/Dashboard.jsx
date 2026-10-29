import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllIssues, STATUS_LABELS } from '../services/issues';
import styles from './Dashboard.module.css';

const STAT_CARDS = [
  { status: null, label: 'Total Complaints', color: '#E3F2FD', text: '#1565C0', icon: '📋' },
  { status: 'reported', label: 'Reported', color: '#E3F2FD', text: '#1565C0', icon: '📨' },
  { status: 'acknowledged', label: 'Acknowledged', color: '#EDE7F6', text: '#5E35B1', icon: '👀' },
  { status: 'in_progress', label: 'In Progress', color: '#FFF8E1', text: '#F57F17', icon: '⚙️' },
  { status: 'resolved', label: 'Resolved', color: '#E8F5E9', text: '#2E7D32', icon: '✅' },
  { status: 'rejected', label: 'Rejected', color: '#FFEBEE', text: '#C62828', icon: '⛔' },
];

const STATUS_COLORS = {
  reported: { bg: '#E3F2FD', color: '#1565C0' },
  acknowledged: { bg: '#EDE7F6', color: '#5E35B1' },
  in_progress: { bg: '#FFF8E1', color: '#F57F17' },
  resolved: { bg: '#E8F5E9', color: '#2E7D32' },
  rejected: { bg: '#FFEBEE', color: '#C62828' },
};

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
  const colors = STATUS_COLORS[status] || { bg: '#F5F5F5', color: '#555' };
  return (
    <span className={styles.badge} style={{ backgroundColor: colors.bg, color: colors.color }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function Dashboard() {
  const [issues, setIssues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const activeController = useRef(null);

  async function loadDashboard() {
    if (activeController.current) return;
    const controller = new AbortController();
    const currentRequestId = ++requestId.current;
    activeController.current = controller;
    setLoading(issues === null);
    setRefreshing(issues !== null);
    setError('');

    try {
      const allIssues = await fetchAllIssues({ signal: controller.signal });
      if (currentRequestId === requestId.current) setIssues(allIssues);
    } catch (requestError) {
      if (requestError.name !== 'AbortError' && currentRequestId === requestId.current) {
        setError(requestError.message || 'Unable to load dashboard data.');
      }
    } finally {
      if (currentRequestId === requestId.current) {
        activeController.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadDashboard();
    return () => {
      requestId.current += 1;
      activeController.current?.abort();
      activeController.current = null;
    };
  }, []);

  const counts = (issues || []).reduce((result, issue) => {
    result[issue.status] = (result[issue.status] || 0) + 1;
    return result;
  }, {});
  const recent = (issues || []).slice(0, 5);

  return (
    <div className={styles.page}>
      <div className={styles.dashboardToolbar}>
        <p className={styles.dataNote}>
          Statistics use the complete issue list returned across all backend pages.
        </p>
        <button type="button" onClick={() => void loadDashboard()} disabled={loading || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && issues !== null && (
        <div className={styles.error} role="alert">
          Showing previously loaded data.{' '}
          {error}
          <button type="button" onClick={() => void loadDashboard()}>Retry</button>
        </div>
      )}

      {loading && issues === null ? (
        <p className={styles.state} role="status">Loading dashboard…</p>
      ) : issues === null ? (
        <div className={styles.state} role="alert">
          {error || 'Dashboard data is unavailable.'}
          <button type="button" onClick={() => void loadDashboard()}>Retry</button>
        </div>
      ) : (
        <>
          <section>
            <h2 className={styles.sectionTitle}>Overview ({issues.length} issues loaded)</h2>
            <div className={styles.statsGrid}>
              {STAT_CARDS.map((card) => (
                <StatCard
                  key={card.label}
                  {...card}
                  value={card.status ? counts[card.status] || 0 : issues.length}
                />
              ))}
            </div>
          </section>

          <section className={styles.tableSection}>
            <h2 className={styles.sectionTitle}>Recent Complaints</h2>
            {recent.length === 0 ? (
              <p className={styles.state}>No complaints have been reported yet.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((issue) => (
                      <tr key={issue.id}>
                        <td className={styles.idCell}>#{issue.id}</td>
                        <td>{issue.category || 'Not provided'}</td>
                        <td>{issue.title || 'Not provided'}</td>
                        <td><StatusBadge status={issue.status} /></td>
                        <td>
                          {issue.latitude == null && issue.longitude == null
                            ? 'Not provided'
                            : `${issue.latitude ?? '—'}, ${issue.longitude ?? '—'}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link className={styles.complaintsLink} to="/complaints">View all complaints</Link>
          </section>
        </>
      )}
    </div>
  );
}
