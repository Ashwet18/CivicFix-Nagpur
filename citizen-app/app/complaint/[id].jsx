/**
 * app/complaint/[id].jsx
 * Stage 4 — Complaint Detail screen
 *
 * Reads complaint id from the URL param, looks it up in ComplaintsContext,
 * and renders full details: metadata, photo, location, status timeline,
 * and resolution info.
 */
import {
  View, Text, StyleSheet, ScrollView,
  Image, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useComplaints, STATUS } from '../../context/complaints';
import Colors from '../../constants/colors';

// ── Status styling ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  [STATUS.SUBMITTED]:   { bg: '#E3F2FD', text: '#1565C0', dot: '#1565C0' },
  [STATUS.IN_PROGRESS]: { bg: '#FFF8E1', text: '#F57F17', dot: '#F57F17' },
  [STATUS.RESOLVED]:    { bg: '#E8F5E9', text: '#2E7D32', dot: '#2E7D32' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status, large = false }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE[STATUS.SUBMITTED];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }, large && styles.badgeLarge]}>
      <Text style={[styles.badgeText, { color: s.text }, large && styles.badgeTextLarge]}>
        {status}
      </Text>
    </View>
  );
}

function DetailRow({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailValueMono]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TimelineItem({ entry, isLast }) {
  const s = STATUS_STYLE[entry.status] || STATUS_STYLE[STATUS.SUBMITTED];
  return (
    <View style={styles.timelineItem}>
      {/* Dot + line */}
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: s.dot }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      {/* Content */}
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <StatusBadge status={entry.status} />
          <Text style={styles.timelineDate}>{entry.date}</Text>
        </View>
        {!!entry.note && (
          <Text style={styles.timelineNote}>{entry.note}</Text>
        )}
      </View>
    </View>
  );
}

// ── Not found state ───────────────────────────────────────────────────────────
function NotFound({ id, onBack }) {
  return (
    <View style={styles.notFound}>
      <Text style={styles.notFoundIcon}>🔍</Text>
      <Text style={styles.notFoundTitle}>Complaint Not Found</Text>
      <Text style={styles.notFoundText}>
        No complaint with ID "{id}" exists in this session.
      </Text>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityRole="button">
        <Text style={styles.backBtnText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams();
  const { getById } = useComplaints();
  const router = useRouter();
  const complaint = getById(id);

  if (!complaint) {
    return (
      <SafeAreaView style={styles.container}>
        <NotFound id={id} onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  const {
    isSample, categoryIcon, categoryLabel, title, description,
    status, date, assignedTo, location, photoUri,
    timeline, resolutionNote, resolutionPhotoUri,
  } = complaint;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header card ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerIcon}>{categoryIcon}</Text>
            <View style={styles.headerMeta}>
              <Text style={styles.headerId}>{complaint.id}</Text>
              <Text style={styles.headerCategory}>{categoryLabel}</Text>
            </View>
            <StatusBadge status={status} large />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
          {!isSample && (
            <View style={styles.sessionTag}>
              <Text style={styles.sessionTagText}>✦ Submitted this session (demo mode)</Text>
            </View>
          )}
          {isSample && (
            <View style={styles.sampleTag}>
              <Text style={styles.sampleTagText}>📋 Sample data for demonstration</Text>
            </View>
          )}
        </View>

        {/* ── Details ── */}
        <Section title="Details">
          <View style={styles.detailCard}>
            <DetailRow label="Date Submitted" value={date} />
            <DetailRow label="Assigned To"    value={assignedTo ?? 'Not yet assigned'} />
            {location && (
              <DetailRow
                label="Location"
                value={`${location.latitude}, ${location.longitude}`}
                mono
              />
            )}
          </View>
        </Section>

        {/* ── Description ── */}
        <Section title="Description">
          <View style={styles.descCard}>
            <Text style={styles.descText}>{description}</Text>
          </View>
        </Section>

        {/* ── Photo evidence ── */}
        <Section title="Photo Evidence">
          {photoUri ? (
            <View style={styles.photoCard}>
              <Image
                source={{ uri: photoUri }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel="Complaint photo evidence"
              />
              <Text style={styles.photoNote}>
                📎 Stored locally only — not uploaded to server (Stage 5)
              </Text>
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>🖼️</Text>
              <Text style={styles.placeholderText}>No photo attached to this complaint.</Text>
            </View>
          )}
        </Section>

        {/* ── Status timeline ── */}
        <Section title="Status History">
          <View style={styles.timelineCard}>
            {timeline.map((entry, i) => (
              <TimelineItem
                key={`${entry.status}-${entry.date}-${i}`}
                entry={entry}
                isLast={i === timeline.length - 1}
              />
            ))}
          </View>
        </Section>

        {/* ── Resolution ── */}
        {status === STATUS.RESOLVED && (
          <Section title="Resolution">
            <View style={styles.resolutionCard}>
              <Text style={styles.resolutionLabel}>Resolution Notes</Text>
              <Text style={styles.resolutionText}>
                {resolutionNote ?? 'No resolution notes recorded.'}
              </Text>
              <Text style={styles.resolutionLabel} style={{ marginTop: 14 }}>
                Resolution Photo
              </Text>
              {resolutionPhotoUri ? (
                <Image
                  source={{ uri: resolutionPhotoUri }}
                  style={styles.photo}
                  resizeMode="cover"
                  accessibilityLabel="Resolution photo"
                />
              ) : (
                <View style={styles.placeholderCard}>
                  <Text style={styles.placeholderIcon}>📷</Text>
                  <Text style={styles.placeholderText}>
                    Resolution photo not available.
                  </Text>
                </View>
              )}
            </View>
          </Section>
        )}

        {/* ── Bottom spacer ── */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { padding: 16, paddingBottom: 40 },

  // Header card
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 12,
  },
  headerIcon:     { fontSize: 32 },
  headerMeta:     { flex: 1 },
  headerId:       { fontSize: 13, fontWeight: '700', color: Colors.primary, fontFamily: 'monospace' },
  headerCategory: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  headerTitle:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, lineHeight: 24 },

  sessionTag: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  sessionTagText: { fontSize: 11, color: Colors.accent, fontWeight: '700' },
  sampleTag: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  sampleTagText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  // Badge
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeLarge: { paddingHorizontal: 12, paddingVertical: 5 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  badgeTextLarge:{ fontSize: 13, fontWeight: '700' },

  // Section
  section:      { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700',
    color: Colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8,
  },

  // Detail rows
  detailCard: {
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  detailLabel:     { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flex: 1 },
  detailValue:     { fontSize: 13, color: Colors.textPrimary, flex: 2, textAlign: 'right' },
  detailValueMono: { fontFamily: 'monospace', fontSize: 12 },

  // Description
  descCard: {
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  descText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },

  // Photo
  photoCard: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  photo:      { width: '100%', height: 200 },
  photoNote:  { backgroundColor: '#FFF8E1', padding: 10, fontSize: 11, color: '#795548' },

  // Placeholder
  placeholderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12, padding: 24,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  placeholderIcon: { fontSize: 32, marginBottom: 8 },
  placeholderText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Timeline
  timelineCard: {
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  timelineItem:    { flexDirection: 'row', gap: 12 },
  timelineLeft:    { alignItems: 'center', width: 16 },
  timelineDot:     { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  timelineLine:    { flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  timelineDate:    { fontSize: 11, color: Colors.textMuted },
  timelineNote:    { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // Resolution
  resolutionCard: {
    backgroundColor: Colors.successLight, borderRadius: 12,
    padding: 16,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  resolutionLabel: { fontSize: 12, fontWeight: '700', color: Colors.success, marginBottom: 6 },
  resolutionText:  { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },

  // Not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  notFoundIcon:  { fontSize: 48, marginBottom: 16 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  notFoundText:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  backBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
