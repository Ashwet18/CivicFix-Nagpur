const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .trim()
  .replace(/\/+$/, '');

export const ISSUE_STATUSES = [
  'reported',
  'acknowledged',
  'in_progress',
  'resolved',
  'rejected',
];

export const STATUS_LABELS = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const PAGE_SIZE = 100;

export class IssuesApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'IssuesApiError';
    this.status = status;
  }
}

async function request(path, { signal, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new IssuesApiError(
      'Could not connect to the CivicFix API. Check the configured API URL and backend availability.'
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new IssuesApiError(
      'The CivicFix API returned an invalid response.',
      response.status
    );
  }

  if (!response.ok) {
    const detail = payload?.detail;
    const message =
      (typeof detail === 'string' && detail) ||
      (typeof detail?.message === 'string' && detail.message) ||
      `The CivicFix API request failed with HTTP ${response.status}.`;
    throw new IssuesApiError(message, response.status);
  }

  return payload;
}

function validateIssue(issue) {
  if (
    !issue ||
    !Number.isSafeInteger(issue.id) ||
    issue.id < 1 ||
    typeof issue.title !== 'string' ||
    typeof issue.description !== 'string' ||
    typeof issue.status !== 'string' ||
    !ISSUE_STATUSES.includes(issue.status.trim().toLowerCase()) ||
    typeof issue.created_at !== 'string' ||
    !Number.isFinite(Date.parse(issue.created_at)) ||
    typeof issue.updated_at !== 'string' ||
    !Number.isFinite(Date.parse(issue.updated_at))
  ) {
    throw new IssuesApiError('The CivicFix API returned an issue with invalid data.');
  }

  for (const field of ['category', 'severity', 'image_url']) {
    if (issue[field] != null && typeof issue[field] !== 'string') {
      throw new IssuesApiError(`The CivicFix API returned an invalid ${field} value.`);
    }
  }
  for (const [field, minimum, maximum] of [
    ['latitude', -90, 90],
    ['longitude', -180, 180],
  ]) {
    const value = issue[field];
    if (
      value != null &&
      (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < minimum ||
        value > maximum)
    ) {
      throw new IssuesApiError(`The CivicFix API returned an invalid ${field} value.`);
    }
  }

  return {
    ...issue,
    status: issue.status.trim().toLowerCase(),
    category: issue.category?.trim() || null,
    severity: issue.severity?.trim() || null,
    image_url: issue.image_url?.trim() || null,
  };
}

export async function fetchIssuePage({ skip = 0, limit = PAGE_SIZE, signal } = {}) {
  const query = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  const page = await request(`/api/v1/issues?${query}`, { signal });
  if (
    !page ||
    !Array.isArray(page.items) ||
    !Number.isSafeInteger(page.total) ||
    page.total < 0 ||
    page.skip !== skip ||
    page.limit !== limit ||
    page.items.length > limit ||
    skip + page.items.length > page.total
  ) {
    throw new IssuesApiError('The CivicFix API returned invalid pagination data.');
  }

  return {
    items: page.items.map(validateIssue),
    total: page.total,
    skip: page.skip,
    limit: page.limit,
  };
}

export async function fetchAllIssues({ signal } = {}) {
  const issues = [];
  let skip = 0;
  let expectedTotal = null;
  const ids = new Set();

  do {
    const page = await fetchIssuePage({ skip, limit: PAGE_SIZE, signal });
    if (expectedTotal !== null && page.total !== expectedTotal) {
      throw new IssuesApiError(
        'The issue list changed while loading. Refresh and try again.'
      );
    }
    expectedTotal = page.total;
    for (const issue of page.items) {
      if (ids.has(issue.id)) {
        throw new IssuesApiError(
          'The issue list changed while loading. Refresh and try again.'
        );
      }
      ids.add(issue.id);
      issues.push(issue);
    }
    skip += page.items.length;
    if (skip < expectedTotal && page.items.length === 0) {
      throw new IssuesApiError('The CivicFix API returned an incomplete issue list.');
    }
  } while (skip < expectedTotal);

  if (issues.length !== expectedTotal) {
    throw new IssuesApiError('The CivicFix API returned an incomplete issue list.');
  }

  return issues;
}

export async function fetchIssue(issueId, { signal } = {}) {
  if (!Number.isSafeInteger(issueId) || issueId < 1) {
    throw new IssuesApiError('Issue ID must be a positive integer.');
  }
  return validateIssue(await request(`/api/v1/issues/${issueId}`, { signal }));
}

export async function updateIssueStatus(issueId, status, { signal } = {}) {
  if (!Number.isSafeInteger(issueId) || issueId < 1) {
    throw new IssuesApiError('Issue ID must be a positive integer.');
  }
  if (!ISSUE_STATUSES.includes(status)) {
    throw new IssuesApiError('Choose a supported complaint status.');
  }
  const issue = await request(`/api/v1/issues/${issueId}/status`, {
    signal,
    method: 'PATCH',
    body: { status },
  });
  return validateIssue(issue);
}
