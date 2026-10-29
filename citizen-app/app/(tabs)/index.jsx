/**
 * app/(tabs)/index.jsx
 * Home screen — live community issue data
 *
 * Statistics and recent complaints are now derived from ComplaintsContext
 * instead of hardcoded values. The UI design is unchanged.
 *
 * Statistics and recent reports are loaded from the CivicFix API.
 */
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useComplaints, STATUS } from '../../context/complaints';

// ── Status badge colour map ───────────────────────────────────────────────────
const STATUS_COLORS = {
  [STATUS.REPORTED]:    { bg: '#E3F2FD', text: '#1565C0' },
  [STATUS.ACKNOWLEDGED]: { bg: '#EDE7F6', text: '#5E35B1' },
  [STATUS.IN_PROGRESS]: { bg: '#FFF8E1', text: '#F57F17' },
  [STATUS.RESOLVED]:    { bg: '#E8F5E9', text: '#2E7D32' },
  [STATUS.REJECTED]:    { bg: '#FFEBEE', text: '#C62828' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function WelcomeBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerGreeting}>Welcome, Citizen 👋</Text>
      <Text style={styles.bannerSubtitle}>
        Report civic issues in Nagpur and track their resolution.
      </Text>
    </View>
  );
}

/**
 * Shows live counts derived from ComplaintsContext.
 * @param {{ submitted:number, inProgress:number, resolved:number, rejected:number }} props
 */
function QuickStats({ reported, acknowledged, inProgress, resolved, rejected }) {
  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
        <Text style={styles.statNumber}>{reported}</Text>
        <Text style={styles.statLabel}>Reported</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#EDE7F6' }]}>
        <Text style={styles.statNumber}>{acknowledged}</Text>
        <Text style={styles.statLabel}>Acknowledged</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#FFF8E1' }]}>
        <Text style={styles.statNumber}>{inProgress}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
        <Text style={styles.statNumber}>{resolved}</Text>
        <Text style={styles.statLabel}>Resolved</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
        <Text style={styles.statNumber}>{rejected}</Text>
        <Text style={styles.statLabel}>Rejected</Text>
      </View>
    </View>
  );
}

function ComplaintCard({ item }) {
  const colors = STATUS_COLORS[item.status] || STATUS_COLORS[STATUS.REPORTED];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCategory}>
          {item.categoryIcon ? `${item.categoryIcon} ${item.categoryLabel}` : item.category}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.title || item.description}
      </Text>
      <Text style={styles.cardDate}>Reported: {item.date}</Text>
    </View>
  );
}

// ── Main Home Screen ──────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const {
    complaints,
    loading,
    refreshing,
    error,
    refreshComplaints,
  } = useComplaints();

  // ── Derive stats from live context data ─────────────────────────────────
  const reported    = complaints.filter((c) => c.status === STATUS.REPORTED).length;
  const acknowledged = complaints.filter((c) => c.status === STATUS.ACKNOWLEDGED).length;
  const inProgress  = complaints.filter((c) => c.status === STATUS.IN_PROGRESS).length;
  const resolved    = complaints.filter((c) => c.status === STATUS.RESOLVED).length;
  const rejected    = complaints.filter((c) => c.status === STATUS.REJECTED).length;

  // ── Most recent 3 complaints for the preview list ───────────────────────
  // The API returns newest-first; newly submitted reports are prepended after confirmation.
  const recentComplaints = complaints.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshComplaints().catch(() => {})}
            colors={['#1565C0']}
          />
        }
      >
        {/* Welcome banner */}
        <WelcomeBanner />

        {/* Primary action button */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/(tabs)/report')}
          accessibilityRole="button"
          accessibilityLabel="Report a civic issue"
        >
          <Text style={styles.reportButtonText}>＋  Report an Issue</Text>
        </TouchableOpacity>

        {/* Quick stats — live from context */}
        <Text style={styles.sectionTitle}>Community Activity</Text>
        <QuickStats
          reported={reported}
          acknowledged={acknowledged}
          inProgress={inProgress}
          resolved={resolved}
          rejected={rejected}
        />

        {/* Community feed notice */}
        <View style={styles.demoNotice}>
          <Text style={styles.demoNoticeText}>
            These reports and counts are community-wide; the API does not filter reports by user.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Community Complaints</Text>

        {loading && complaints.length === 0 ? (
          <View style={styles.emptyRecent}>
            <ActivityIndicator color="#1565C0" />
            <Text style={styles.emptyRecentText}>Loading community reports…</Text>
          </View>
        ) : error && complaints.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>{error.message}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refreshComplaints().catch(() => {})}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : recentComplaints.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>
              No community reports yet. Tap "Report an Issue" to get started.
            </Text>
          </View>
        ) : (
          recentComplaints.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/complaint/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View complaint ${item.id}`}
              activeOpacity={0.8}
            >
              <ComplaintCard item={item} />
            </TouchableOpacity>
          ))
        )}

        {/* View all link */}
        {!!error && complaints.length > 0 && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{error.message}</Text>
            <TouchableOpacity
              style={styles.retryLink}
              onPress={() => refreshComplaints().catch(() => {})}
              accessibilityRole="button"
            >
              <Text style={styles.retryLinkText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {complaints.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/complaints')}
            accessibilityRole="button"
            accessibilityLabel="View all community complaints"
          >
            <Text style={styles.viewAllText}>
              View All {complaints.length} Community Complaints →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles (unchanged from original design) ───────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  // Banner
  banner: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  bannerGreeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#BBDEFB',
    lineHeight: 20,
  },
  // Report button
  reportButton: {
    backgroundColor: '#FF6F00',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Section headings
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexBasis: '28%',
    minWidth: 74,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
  },
  statLabel: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  // Demo notice
  demoNotice: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 22,
  },
  demoNoticeText: {
    fontSize: 11,
    color: '#795548',
  },
  // Complaint card
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565C0',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 11,
    color: '#999',
  },
  // Empty recent
  emptyRecent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#1565C0',
  },
  retryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  retryLink: { padding: 4 },
  retryLinkText: { color: '#1565C0', fontSize: 13, fontWeight: '700' },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  inlineErrorText: { color: '#C62828', fontSize: 12, flex: 1, marginRight: 10 },
  // View all
  viewAllButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '600',
  },
});
