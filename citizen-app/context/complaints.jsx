/**
 * context/complaints.jsx
 *
 * ⚠️  DEVELOPMENT MOCK — NOT REAL DATA
 *
 * In-memory complaint store for UI demonstration.
 * Data resets when the app is closed/refreshed.
 *
 * HOW TO REPLACE IN STAGE 5 (backend integration):
 * 1. Replace SAMPLE_COMPLAINTS with an API fetch: GET /complaints
 * 2. Replace addComplaint() body with POST /complaints
 * 3. Replace getById() with GET /complaints/:id
 * 4. Add real loading/error states wired to network calls.
 * All consumers (complaints list, detail screen, report screen) will
 * automatically use the real implementation — no other changes needed.
 */

import { createContext, useContext, useState, useCallback } from 'react';

// ── Status constants ──────────────────────────────────────────────────────────
export const STATUS = {
  SUBMITTED:   'Submitted',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
};

// ── Sample pre-seeded complaints (clearly labelled as sample data) ────────────
const SAMPLE_COMPLAINTS = [
  {
    id: 'CF-001',
    isSample: true,          // flag distinguishes sample from user-created
    category: 'pothole',
    categoryLabel: 'Pothole',
    categoryIcon: '🚧',
    title: 'Large pothole near Sitabuldi Market',
    description:
      'A large pothole has developed near the main entrance of Sitabuldi Market. It is causing vehicles to swerve and poses a danger to two-wheelers. The pothole has been there for at least three weeks.',
    status: STATUS.IN_PROGRESS,
    date: '2026-10-20',
    location: { latitude: 21.1458, longitude: 79.0882 },
    photoUri: null,
    timeline: [
      { status: STATUS.SUBMITTED,   date: '2026-10-20', note: 'Complaint registered.' },
      { status: STATUS.IN_PROGRESS, date: '2026-10-21', note: 'Assigned to PWD for inspection.' },
    ],
    assignedTo: 'Public Works Department',
    resolutionNote: null,
    resolutionPhotoUri: null,
  },
  {
    id: 'CF-002',
    isSample: true,
    category: 'garbage',
    categoryLabel: 'Garbage',
    categoryIcon: '🗑️',
    title: 'Overflowing dustbin at Civil Lines bus stop',
    description:
      'The municipal dustbin near Civil Lines bus stop has been overflowing for two days. Garbage is spilling onto the footpath and causing an unhygienic environment.',
    status: STATUS.SUBMITTED,
    date: '2026-10-22',
    location: { latitude: 21.1539, longitude: 79.0946 },
    photoUri: null,
    timeline: [
      { status: STATUS.SUBMITTED, date: '2026-10-22', note: 'Complaint registered.' },
    ],
    assignedTo: null,
    resolutionNote: null,
    resolutionPhotoUri: null,
  },
  {
    id: 'CF-003',
    isSample: true,
    category: 'streetlight',
    categoryLabel: 'Damaged Streetlight',
    categoryIcon: '💡',
    title: 'Street light not working on Wardha Road',
    description:
      'Three consecutive street lights on Wardha Road near Shankar Nagar are non-functional. The area becomes very dark after sunset and is a safety concern.',
    status: STATUS.RESOLVED,
    date: '2026-10-18',
    location: { latitude: 21.1217, longitude: 79.0746 },
    photoUri: null,
    timeline: [
      { status: STATUS.SUBMITTED,   date: '2026-10-18', note: 'Complaint registered.' },
      { status: STATUS.IN_PROGRESS, date: '2026-10-19', note: 'Assigned to MSEDCL for repair.' },
      { status: STATUS.RESOLVED,    date: '2026-10-21', note: 'All three lights repaired and functional.' },
    ],
    assignedTo: 'MSEDCL',
    resolutionNote: 'Three faulty bulbs replaced. Wiring also checked and repaired.',
    resolutionPhotoUri: null,
  },
  {
    id: 'CF-004',
    isSample: true,
    category: 'water',
    categoryLabel: 'Water Leakage',
    categoryIcon: '💧',
    title: 'Water pipe leak near Dharampeth colony gate',
    description:
      'A water main pipe is visibly leaking near the Dharampeth colony main gate. Water has been flowing continuously for over 24 hours, causing waterlogging on the road.',
    status: STATUS.IN_PROGRESS,
    date: '2026-10-21',
    location: { latitude: 21.1371, longitude: 79.0694 },
    photoUri: null,
    timeline: [
      { status: STATUS.SUBMITTED,   date: '2026-10-21', note: 'Complaint registered.' },
      { status: STATUS.IN_PROGRESS, date: '2026-10-22', note: 'NMC Water Supply team dispatched.' },
    ],
    assignedTo: 'NMC Water Supply',
    resolutionNote: null,
    resolutionPhotoUri: null,
  },
];

// ── ID generator for user-created complaints ──────────────────────────────────
let _counter = SAMPLE_COMPLAINTS.length + 1;
function nextId() {
  return `CF-${String(_counter++).padStart(3, '0')}`;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ComplaintsContext = createContext(null);

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState(SAMPLE_COMPLAINTS);

  /**
   * Add a user-submitted complaint (called from Report screen).
   * TODO Stage 5: replace body with → POST /complaints, then append returned record.
   *
   * @param {{ category:string, categoryLabel:string, categoryIcon:string,
   *            title:string, description:string,
   *            photoUri:string|null, location:object|null }} data
   * @returns {string} the new complaint's ID
   */
  const addComplaint = useCallback((data) => {
    const id = nextId();
    const now = new Date().toISOString().slice(0, 10);
    const newComplaint = {
      id,
      isSample: false,
      category:      data.category,
      categoryLabel: data.categoryLabel,
      categoryIcon:  data.categoryIcon,
      title:         data.title,
      description:   data.description,
      status:        STATUS.SUBMITTED,
      date:          now,
      location:      data.location ?? null,
      photoUri:      data.photoUri  ?? null,
      timeline: [
        { status: STATUS.SUBMITTED, date: now, note: 'Complaint submitted via app (demo mode).' },
      ],
      assignedTo:         null,
      resolutionNote:     null,
      resolutionPhotoUri: null,
    };
    // Prepend so new complaints appear first
    setComplaints((prev) => [newComplaint, ...prev]);
    return id;
  }, []);

  /**
   * Find a complaint by ID.
   * @param {string} id
   * @returns {object|undefined}
   */
  const getById = useCallback(
    (id) => complaints.find((c) => c.id === id),
    [complaints]
  );

  return (
    <ComplaintsContext.Provider value={{ complaints, addComplaint, getById }}>
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintsContext);
  if (!ctx) throw new Error('useComplaints must be used inside <ComplaintsProvider>');
  return ctx;
}
