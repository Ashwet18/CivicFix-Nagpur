const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');

const appRoot = path.resolve(__dirname, '..');
const originalJsLoader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (
    filename.startsWith(`${appRoot}${path.sep}`) &&
    !filename.includes(`${path.sep}node_modules${path.sep}`)
  ) {
    const source = fs.readFileSync(filename, 'utf8');
    const { code } = babel.transformSync(source, {
      babelrc: false,
      configFile: false,
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    module._compile(code, filename);
    return;
  }
  originalJsLoader(module, filename);
};

const { ApiError } = require('../services/api.js');
const {
  buildIssuePayload,
  createIssue,
  listIssues,
  mapIssue,
} = require('../services/issues.js');

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8000';

test.after(() => {
  globalThis.fetch = originalFetch;
  require.extensions['.js'] = originalJsLoader;
  if (originalBaseUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
  }
});

function issue(status = 'reported', overrides = {}) {
  return {
    id: 17,
    title: 'Pothole on Main Road',
    description: 'Large pothole beside the bus stop.',
    status,
    category: 'road_damage',
    severity: null,
    latitude: 21.1458,
    longitude: 79.0882,
    image_url: null,
    created_at: '2026-10-29T10:00:00',
    updated_at: '2026-10-29T10:00:00',
    ...overrides,
  };
}

function mockResponse(payload, { status = 200, ok = true } = {}) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(payload),
  };
}

test('maps all backend statuses to the same citizen-facing labels', () => {
  const statuses = [
    ['reported', 'Reported'],
    ['acknowledged', 'Acknowledged'],
    ['in_progress', 'In Progress'],
    ['resolved', 'Resolved'],
    ['rejected', 'Rejected'],
  ];

  for (const [backendStatus, label] of statuses) {
    assert.equal(mapIssue(issue(backendStatus)).status, label);
  }
});

test('rejects unknown statuses and malformed timestamps', () => {
  assert.throws(() => mapIssue(issue('assigned')), /unknown status/);
  assert.throws(
    () => mapIssue(issue('reported', { created_at: 'not-a-date' })),
    /invalid response shape/
  );
});

test('builds a backend issue payload without treating a local photo as uploaded', () => {
  const payload = buildIssuePayload({
    category: 'road_damage',
    title: 'Pothole on Main Road',
    description: 'Large pothole beside the bus stop.',
    location: { latitude: 21.1458, longitude: 79.0882 },
    photoUri: 'file:///local/photo.jpg',
  });

  assert.deepEqual(payload, {
    title: 'Pothole on Main Road',
    description: 'Large pothole beside the bus stop.',
    category: 'road_damage',
    latitude: 21.1458,
    longitude: 79.0882,
  });
});

test('lists issues with validated pagination and mapped data', async () => {
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return mockResponse({
      items: [issue()],
      total: 1,
      skip: 0,
      limit: 20,
    });
  };

  const result = await listIssues({ skip: 0, limit: 20 });
  assert.equal(requestedUrl.pathname, '/api/v1/issues');
  assert.equal(requestedUrl.searchParams.get('skip'), '0');
  assert.equal(requestedUrl.searchParams.get('limit'), '20');
  assert.equal(result.items[0].status, 'Reported');
  assert.equal(result.items[0].category, 'road_damage');
  assert.equal(result.items[0].categoryLabel, 'Road Damage');
});

test('rejects inconsistent pagination metadata', async () => {
  globalThis.fetch = async () =>
    mockResponse({
      items: [issue()],
      total: 1,
      skip: 1,
      limit: 20,
    });

  await assert.rejects(
    listIssues({ skip: 0, limit: 20 }),
    /inconsistent issue list pagination/
  );
});

test('rejects malformed JSON from a successful API response', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '{invalid json',
  });

  await assert.rejects(
    listIssues(),
    (error) => error instanceof ApiError && error.kind === 'response'
  );
});

test('posts the supported issue fields and maps the created issue', async () => {
  let requestBody;
  let requestMethod;
  globalThis.fetch = async (_url, options) => {
    requestMethod = options.method;
    requestBody = JSON.parse(options.body);
    return mockResponse(issue(), { status: 201 });
  };

  const created = await createIssue({
    category: 'road_damage',
    title: 'Pothole on Main Road',
    description: 'Large pothole beside the bus stop.',
    photoUri: 'file:///local/photo.jpg',
  });

  assert.equal(requestMethod, 'POST');
  assert.equal(requestBody.category, 'road_damage');
  assert.equal('photoUri' in requestBody, false);
  assert.equal(created.id, '17');
  assert.equal(created.status, 'Reported');
});

test('reports backend validation errors and network failures explicitly', async () => {
  globalThis.fetch = async () =>
    mockResponse(
      { detail: [{ loc: ['body', 'title'], msg: 'Too short', type: 'value_error' }] },
      { status: 422, ok: false }
    );

  await assert.rejects(
    listIssues(),
    (error) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.message === 'title: Too short'
  );

  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  await assert.rejects(
    listIssues(),
    (error) => error instanceof ApiError && error.kind === 'network'
  );
});
