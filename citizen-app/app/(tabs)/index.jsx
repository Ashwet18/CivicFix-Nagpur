import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

// ── Sample placeholder data ──────────────────────────────────────────────────
const RECENT_COMPLAINTS = [
  {
    id: '1',
    category: 'Pothole',
    description: 'Large pothole near Sitabuldi market',
    status: 'In Progress',
    date: '2026-10-20',
  },
  {
    id: '2',
    category: 'Garbage',
    description: 'Overflowing dustbin at Civil Lines',
    status: 'Submitted',
    date: '2026-10-22',
  },
  {
    id: '3',
    category: 'Street Light',
    description: 'Street light not working on Wardha Road',
    status: 'Resolved',
    date: '2026-10-18',
  },
];

// ── Status badge colour map ───────────────────────────────────────────────────
const STATUS_COLORS = {
  Submitted: { bg: '#E3F2FD', text: '#1565C0' },
  'In Progress': { bg: '#FFF8E1', text: '#F57F17' },
  Resolved: { bg: '#E8F5E9', text: '#2E7D32' },
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

function QuickStats() {
  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
        <Text style={styles.statNumber}>2</Text>
        <Text style={styles.statLabel}>Submitted</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#FFF8E1' }]}>
        <Text style={styles.statNumber}>1</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
        <Text style={styles.statNumber}>1</Text>
        <Text style={styles.statLabel}>Resolved</Text>
      </View>
    </View>
  );
}

function ComplaintCard({ item }) {
  const colors = STATUS_COLORS[item.status] || STATUS_COLORS['Submitted'];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={styles.cardDate}>Reported: {item.date}</Text>
    </View>
  );
}

// ── Main Home Screen ──────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
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

        {/* Quick stats */}
        <Text style={styles.sectionTitle}>My Activity</Text>
        <QuickStats />

        {/* Recent complaints list */}
        <Text style={styles.sectionTitle}>Recent Complaints</Text>
        {RECENT_COMPLAINTS.map((item) => (
          <ComplaintCard key={item.id} item={item} />
        ))}

        {/* View all link */}
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/(tabs)/complaints')}
          accessibilityRole="button"
          accessibilityLabel="View all my complaints"
        >
          <Text style={styles.viewAllText}>View All Complaints →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
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
