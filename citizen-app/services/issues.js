import { apiRequest } from './api';

const ISSUE_PATH = '/api/v1/issues';

const CATEGORY_DETAILS = {
  road_damage: { label: 'Road Damage', icon: '🚧' },
  garbage: { label: 'Garbage', icon: '🗑️' },
  water_supply: { label: 'Water Supply', icon: '💧' },
  drainage: { label: 'Drainage', icon: '🌊' },
  streetlight: { label: 'Streetlight', icon: '💡' },
  electricity: { label: 'Electricity', icon: '⚡' },
  sanitation: { label: 'Sanitation', icon: '🚻' },
  public_safety: { label: 'Public Safety', icon: '⚠️' },
  other: { label: 'Other', icon: '📌' },
};

const CATEGORY_ALIASES = {
  pothole: 'road_damage',
  road: 'road_damage',
  roads: 'road_damage',
  water: 'water_supply',
  street_light: 'streetlight',
  lights: 'streetlight',
  waste: 'garbage',
  trash: 'garbage',
  sewer: 'drainage',
  drain: 'drainage',
  safety: 'public_safety',
};

const STATUS_LABELS = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const VALID_STATUSES = new Set(Object.keys(STATUS_LABELS));

export class IssueInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IssueInputError';
  }
}

function getOptionalString(value, name, maxLength) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new IssueInputError(`${name} must be text.`);
  }

  const normalized = value.trim();
  if (Array.from(normalized).length > maxLength) {
    throw new IssueInputError(`${name} must be no more than ${maxLength} characters.`);
  }
  return normalized || undefined;
}

function getRequiredString(value, name, minimumLength, maximumLength) {
  const normalized = getOptionalString(value, name, maximumLength);
  if (!normalized || Array.from(normalized).length < minimumLength) {
    throw new IssueInputError(
      `${name} must be between ${minimumLength} and ${maximumLength} characters.`
    );
  }
  return normalized;
}

function getCoordinate(value, name, minimum, maximum) {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new IssueInputError(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

export function buildIssuePayload(input = {}) {
  const title = getRequiredString(input.title, 'Title', 5, 150);
  const description = getRequiredString(input.description, 'Description', 10, 5000);

  const payload = { title, description };
  const category = getOptionalString(input.category, 'Category', 100);
  const latitude = getCoordinate(
    input.location?.latitude ?? input.latitude,
    'Latitude',
    -90,
    90
  );
  const longitude = getCoordinate(
    input.location?.longitude ?? input.longitude,
    'Longitude',
    -180,
    180
  );

  if (category) payload.category = category;
  if (latitude !== undefined) payload.latitude = latitude;
  if (longitude !== undefined) payload.longitude = longitude;

  const imageUrl = getOptionalString(input.image_url, 'Image URL', 500);
  if (imageUrl) {
    if (!/^https?:\/\/\S+$/i.test(imageUrl)) {
      throw new IssueInputError(
        'Image URL must be an HTTP or HTTPS URL. Local photo files cannot be uploaded.'
      );
    }
    payload.image_url = imageUrl;
  }

  return payload;
}

function requireIssueRecord(issue) {
  if (
    !issue ||
    !Number.isSafeInteger(issue.id) ||
    issue.id <= 0 ||
    typeof issue.title !== 'string' ||
    typeof issue.description !== 'string' ||
    typeof issue.status !== 'string' ||
    typeof issue.created_at !== 'string' ||
    !Number.isFinite(Date.parse(issue.created_at)) ||
    typeof issue.updated_at !== 'string' ||
    !Number.isFinite(Date.parse(issue.updated_at))
  ) {
    throw new TypeError('The API returned an issue with an invalid response shape.');
  }

  if (!VALID_STATUSES.has(issue.status.trim().toLowerCase())) {
    throw new TypeError('The API returned an issue with an unknown status.');
  }

  if (
    issue.category !== null &&
    issue.category !== undefined &&
    typeof issue.category !== 'string'
  ) {
    throw new TypeError('The API returned an issue with an invalid category.');
  }
  if (
    issue.severity !== null &&
    issue.severity !== undefined &&
    typeof issue.severity !== 'string'
  ) {
    throw new TypeError('The API returned an issue with an invalid severity.');
  }
  if (
    issue.image_url !== null &&
    issue.image_url !== undefined &&
    typeof issue.image_url !== 'string'
  ) {
    throw new TypeError('The API returned an issue with an invalid image URL.');
  }
  if (
    issue.latitude !== null &&
    issue.latitude !== undefined &&
    (typeof issue.latitude !== 'number' ||
      !Number.isFinite(issue.latitude) ||
      issue.latitude < -90 ||
      issue.latitude > 90)
  ) {
    throw new TypeError('The API returned an issue with an invalid latitude.');
  }
  if (
    issue.longitude !== null &&
    issue.longitude !== undefined &&
    (typeof issue.longitude !== 'number' ||
      !Number.isFinite(issue.longitude) ||
      issue.longitude < -180 ||
      issue.longitude > 180)
  ) {
    throw new TypeError('The API returned an issue with an invalid longitude.');
  }
  return issue;
}

export function mapIssue(issueRecord) {
  const issue = requireIssueRecord(issueRecord);
  const category = typeof issue.category === 'string' ? issue.category : null;
  const categoryKey = category?.trim().toLowerCase();
  const normalizedCategory = categoryKey
    ? CATEGORY_ALIASES[categoryKey] ?? categoryKey
    : null;
  const categoryDetails = normalizedCategory
    ? CATEGORY_DETAILS[normalizedCategory]
    : null;
  const backendStatus = issue.status;
  const normalizedStatus = backendStatus.trim().toLowerCase();
  const imageUrl =
    typeof issue.image_url === 'string' && issue.image_url
      ? issue.image_url
      : null;
  const location =
    (issue.latitude !== null && issue.latitude !== undefined) ||
    (issue.longitude !== null && issue.longitude !== undefined)
      ? {
          latitude: issue.latitude ?? null,
          longitude: issue.longitude ?? null,
        }
      : null;

  return {
    id: String(issue.id),
    issueId: issue.id,
    category: categoryDetails ? normalizedCategory : category,
    categoryLabel: categoryDetails?.label ?? category ?? 'Uncategorized',
    categoryIcon: categoryDetails?.icon ?? null,
    title: issue.title,
    description: issue.description,
    status: STATUS_LABELS[normalizedStatus] ?? backendStatus,
    backendStatus,
    date: issue.created_at.slice(0, 10),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    location,
    image_url: imageUrl,
    photoUri: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null,
    severity: issue.severity ?? null,
  };
}

function validateListOptions(options) {
  const query = {};
  if (options.skip !== undefined) {
    if (!Number.isInteger(options.skip) || options.skip < 0) {
      throw new IssueInputError('skip must be a non-negative integer.');
    }
    query.skip = options.skip;
  }
  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) {
      throw new IssueInputError('limit must be an integer between 1 and 100.');
    }
    query.limit = options.limit;
  }

  ['status', 'category'].forEach((key) => {
    const value = options[key];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string') {
        throw new IssueInputError(`${key} must be text.`);
      }
      const normalized = value.trim();
      if (normalized) query[key] = normalized;
    }
  });
  return query;
}

export async function listIssues(options = {}) {
  const response = await apiRequest(ISSUE_PATH, {
    query: validateListOptions(options),
  });
  if (!response || !Array.isArray(response.items)) {
    throw new TypeError('The API returned an invalid issue list response.');
  }
  if (
    !Number.isInteger(response.total) ||
    response.total < 0 ||
    !Number.isInteger(response.skip) ||
    response.skip < 0 ||
    !Number.isInteger(response.limit) ||
    response.limit < 1 ||
    response.limit > 100
  ) {
    throw new TypeError('The API returned invalid issue list pagination metadata.');
  }
  if (
    response.skip !== (options.skip ?? 0) ||
    (options.limit !== undefined && response.limit !== options.limit) ||
    response.items.length > response.limit ||
    response.skip + response.items.length > response.total
  ) {
    throw new TypeError('The API returned inconsistent issue list pagination metadata.');
  }

  return {
    items: response.items.map(mapIssue),
    total: response.total,
    skip: response.skip,
    limit: response.limit,
  };
}

function normalizeIssueId(issueId) {
  const numericId =
    typeof issueId === 'string' && /^\d+$/.test(issueId)
      ? Number(issueId)
      : issueId;
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new IssueInputError('Issue ID must be a positive integer.');
  }
  return numericId;
}

export async function getIssue(issueId) {
  const numericId = normalizeIssueId(issueId);
  const issue = await apiRequest(`${ISSUE_PATH}/${numericId}`);
  return mapIssue(issue);
}

export async function createIssue(input) {
  const payload = buildIssuePayload(input);
  const issue = await apiRequest(ISSUE_PATH, {
    method: 'POST',
    body: payload,
  });
  return mapIssue(issue);
}
