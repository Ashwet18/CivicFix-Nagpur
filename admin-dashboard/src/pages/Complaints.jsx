import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAllIssues,
  fetchIssue,
  ISSUE_STATUSES,
  STATUS_LABELS,
  updateIssueStatus,
} from '../services/issues';
import styles from './Complaints.module.css';

const PAGE_SIZE = 20;

const STATUS_COLORS = {
  Reported: { bg: '#E3F2FD', color: '#1565C0' },
  Acknowledged: { bg: '#EDE7F6', color: '#5E35B1' },
  'In Progress': { bg: '#FFF8E1', color: '#F57F17' },
  Resolved: { bg: '#E8F5E9', color: '#2E7D32' },
  Rejected: { bg: '#FFEBEE', color: '#C62828' },
};

function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleString();
}

function locationLabel(issue) {
  if (issue.latitude == null && issue.longitude == null) return 'Not provided';
  return `${issue.latitude ?? '—'}, ${issue.longitude ?? '—'}`;
}

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const colors = STATUS_COLORS[label] || { bg: '#F5F5F5', color: '#555' };
  return (
    <span className={styles.badge} style={{ backgroundColor: colors.bg, color: colors.color }}>
      {label}
    </span>
  );
}

function ComplaintDetails({ issue, loading, error, onRetry }) {
  if (loading) return <p className={styles.detailState} role="status">Loading complaint details…</p>;
  if (error) {
    return (
      <div className={styles.detailState} role="alert">
        Could not load complaint details. {error}
        <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
      </div>
    );
  }
  if (!issue) return null;

  return (
    <div className={styles.details}>
      <p><strong>Title:</strong> {issue.title || 'Not provided'}</p>
      <p><strong>Description:</strong> {issue.description || 'Not provided'}</p>
      <p><strong>Location:</strong> {locationLabel(issue)}</p>
      <p><strong>Severity:</strong> {issue.severity || 'Not provided'}</p>
      <p><strong>Created:</strong> {formatDate(issue.created_at)}</p>
      <p><strong>Last updated:</strong> {formatDate(issue.updated_at)}</p>
      {issue.image_url && (
        <p>
          <strong>Image URL:</strong>{' '}
          <a href={issue.image_url} target="_blank" rel="noreferrer">{issue.image_url}</a>
        </p>
      )}
      <p className={styles.unavailableNote}>
        Department assignment and status history are not provided by the API.
      </p>
    </div>
  );
}

export default function Complaints() {
  const [complaints, setComplaints] = useState(null);
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const requestId = useRef(0);
  const activeController = useRef(null);
  const detailController = useRef(null);

  async function loadComplaints() {
    if (activeController.current) return;

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;
    activeController.current = controller;
    setLoading(complaints === null);
    setRefreshing(complaints !== null);
    setError('');

    try {
      const issues = await fetchAllIssues({ signal: controller.signal });
      if (currentRequestId === requestId.current) setComplaints(issues);
    } catch (requestError) {
      if (requestError.name !== 'AbortError' && currentRequestId === requestId.current) {
        setError(requestError.message || 'Unable to load complaints.');
      }
    } finally {
      if (currentRequestId === requestId.current) {
        activeController.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  async function loadDetail(issueId) {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const issue = await fetchIssue(issueId, { signal: controller.signal });
      if (!controller.signal.aborted) setDetail(issue);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setDetailError(requestError.message || 'Unable to load complaint details.');
      }
    } finally {
      if (!controller.signal.aborted) {
        detailController.current = null;
        setDetailLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadComplaints();
    return () => {
      requestId.current += 1;
      activeController.current?.abort();
      activeController.current = null;
      detailController.current?.abort();
      detailController.current = null;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((complaints || []).map((issue) => issue.category).filter(Boolean))].sort(),
    [complaints]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (complaints || []).filter((issue) => {
      const matchesStatus = filter === 'All' || issue.status === filter;
      const matchesCategory = categoryFilter === 'All' || issue.category === categoryFilter;
      const searchable = [
        issue.id,
        issue.title,
        issue.description,
        issue.category,
        locationLabel(issue),
      ].join(' ').toLowerCase();
      return matchesStatus && matchesCategory && searchable.includes(normalizedSearch);
    });
  }, [complaints, filter, categoryFilter, search]);

  useEffect(() => setPage(1), [filter, categoryFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstItem = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(currentPage * PAGE_SIZE, filtered.length);

  async function handleStatusChange(issueId, status) {
    if (updatingId !== null) return;
    setUpdatingId(issueId);
    setNotice('');
    setError('');
    try {
      const updatedIssue = await updateIssueStatus(issueId, status);
      setComplaints((previous) =>
        previous?.map((issue) => issue.id === updatedIssue.id ? updatedIssue : issue) ?? previous
      );
      if (detail?.id === updatedIssue.id) setDetail(updatedIssue);
      setNotice(`Complaint #${issueId} status updated.`);
      await loadComplaints();
      if (expandedId === issueId) await loadDetail(issueId);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update complaint status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleDetails(issueId) {
    if (expandedId === issueId) {
      detailController.current?.abort();
      setExpandedId(null);
      setDetail(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }
    setExpandedId(issueId);
    await loadDetail(issueId);
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search ID, title, description, category, or coordinates"
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search complaints"
        />
        <label className={styles.filterLabel}>
          Status
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
            <option value="All">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => void loadComplaints()}
          disabled={loading || refreshing || updatingId !== null}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {notice && <p className={styles.success} role="status">{notice}</p>}
      {error && complaints !== null && (
        <p className={styles.warning} role="alert">
          Some data may be out of date.{' '}
          {error}
          <button type="button" className={styles.retryBtn} onClick={() => void loadComplaints()}>
            Retry
          </button>
        </p>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Title</th>
                <th>Location</th>
                <th>Status</th>
                <th>Department</th>
                <th>Date</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={styles.empty} role="status">Loading complaints…</td></tr>
              ) : complaints === null ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    <span role="alert">{error || 'Could not load complaints.'}</span>
                    <button type="button" className={styles.retryBtn} onClick={() => void loadComplaints()}>Retry</button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    {complaints.length === 0 ? 'No complaints have been reported yet.' : 'No complaints match these filters.'}
                  </td>
                </tr>
              ) : visible.map((issue) => (
                <Fragment key={issue.id}>
                  <tr>
                    <td className={styles.idCell}>#{issue.id}</td>
                    <td>{issue.category || 'Not provided'}</td>
                    <td>{issue.title || 'Not provided'}</td>
                    <td>{locationLabel(issue)}</td>
                    <td>
                      <div className={styles.statusControl}>
                        <StatusBadge status={issue.status} />
                        <select
                          value={issue.status}
                          onChange={(event) => void handleStatusChange(issue.id, event.target.value)}
                          disabled={loading || refreshing || updatingId !== null}
                          aria-label={`Update status for complaint ${issue.id}`}
                        >
                          {ISSUE_STATUSES.map((status) => (
                            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                          ))}
                        </select>
                        {updatingId === issue.id && <span role="status">Saving…</span>}
                      </div>
                    </td>
                    <td className={styles.unavailable}>Not provided by API</td>
                    <td className={styles.dateCell}>{formatDate(issue.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.detailsBtn}
                        onClick={() => void toggleDetails(issue.id)}
                        aria-expanded={expandedId === issue.id}
                      >
                        {expandedId === issue.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === issue.id && (
                    <tr>
                      <td colSpan={8}>
                        <ComplaintDetails
                          issue={detail?.id === issue.id ? detail : null}
                          loading={detailLoading}
                          error={detailError}
                          onRetry={() => void loadDetail(issue.id)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className={styles.pagination}>
            <span>Showing {firstItem}–{lastItem} of {filtered.length} loaded issues</span>
            <div>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                Previous
              </button>
              <span>Page {currentPage} of {pageCount}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
