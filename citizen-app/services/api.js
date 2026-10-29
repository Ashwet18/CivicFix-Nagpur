function getConfiguredBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Create citizen-app/.env.local from ' +
        '.env.example and set it to your reachable API URL (Android emulator: ' +
        'http://10.0.2.2:8000), then restart Expo.'
    );
  }

  const baseUrl = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/i.test(baseUrl)) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL must be an absolute HTTP or HTTPS URL, for example ' +
        'http://10.0.2.2:8000.'
    );
  }

  return baseUrl;
}

export class ApiError extends Error {
  constructor(message, { kind, status = null, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

function formatValidationDetails(details) {
  if (!Array.isArray(details)) return null;

  const safeDetails = details.map((item) => ({
    loc: Array.isArray(item?.loc) ? item.loc : [],
    msg: typeof item?.msg === 'string' ? item.msg : 'Invalid value',
    type: typeof item?.type === 'string' ? item.type : undefined,
  }));
  const message = safeDetails
    .map(({ loc, msg }) => {
      const field = loc.filter((part) => part !== 'body').join('.');
      return field ? `${field}: ${msg}` : msg;
    })
    .join('; ');

  return { message, details: safeDetails };
}

async function readResponse(response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    if (!response.ok) return null;
    throw new ApiError('The API returned an invalid JSON response.', {
      kind: 'response',
      status: response.status,
    });
  }
}

export async function apiRequest(path, { method = 'GET', query, body } = {}) {
  const baseUrl = getConfiguredBaseUrl();
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      'Could not connect to the CivicFix API. Check that the backend is running, ' +
        'the configured URL is reachable from this device, and the network allows the connection.',
      { kind: 'network' }
    );
  }

  const data = await readResponse(response);
  if (!response.ok) {
    const detail = data?.detail;
    const validation = formatValidationDetails(detail);
    const message =
      validation?.message ||
      (typeof detail === 'string' && detail) ||
      (typeof detail?.message === 'string' && detail.message) ||
      `The API request failed with HTTP ${response.status}.`;

    throw new ApiError(message, {
      kind: 'http',
      status: response.status,
      details: validation?.details ?? detail ?? null,
    });
  }

  return data;
}
