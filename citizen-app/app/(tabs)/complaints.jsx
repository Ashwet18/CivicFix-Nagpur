/**
 * app/(tabs)/complaints.jsx
 * Stage 4 — My Complaints screen
 *
 * Displays the in-memory complaint list from ComplaintsContext.
 * Supports status filtering and navigates to the detail screen.
 */
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useComplaints, STATUS } from '../../context/complaints';
import Colors from '../../constants/colors';

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS = ['All', STATUS.SUBMITTED, STATUS.IN_PROGRESS, STATUS.RESOLVED];

const STATUS_STYLE = {
  [STATUS.SUBMITTED]:   { bg: '#E3F2FD', text: '#1565C0' },
  [STATUS.IN_PROGRESS]: { bg: '#FFF8E1', text: '#F57F17' },
  [STATUS.RESOLVED]:    { bg: '#E8F5E9', text: '#2E7D32' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE[STATUS.SUBMITTED];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
    </View>
  );
}

function FilterBar({ active, onSelect }) {
  return (
    <View style={styles.filterBar}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.filterChip, active === f && styles.filterChipActive]}
          onPress={() => onSelect(f)}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${f}`}
          accessibilityState={{ selected: active === f }}
        >
          <Text style={[styles.filterChipText, active === f && styles.filterChipTextActive]}>
            {f}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ComplaintCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, !item.isSample && styles.cardUserCreated]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View complaint ${item.id}: ${item.title}`}
      activeOpacity={0.75}
    >
      {/* Top row: category icon + id + badge */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.cardIcon}>{item.categoryIcon}</Text>
          <View>
            <Text style={styles.cardId}>{item.id}</Text>
            <Text style={styles.cardCategory}>{item.categoryLabel}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {/* Footer row */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>📅 {item.date}</Text>
        {item.location && (
          <Text style={styles.cardLocation}>
            📍 {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* User-created indicator */}
      {!item.isSample && (
        <View style={styles.userTag}>
          <Text style={styles.userTagText}>✦ Submitted this session</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ filter }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No complaints found</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'All'
          ? 'You have not submitted any complaints yet.\nTap "Report" to get started.'
          : `No complaints with status "${filter}".`}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ComplaintsScreen() {
  const router = useRouter();
  const { complaints } = useComplaints();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? complaints
    : complaints.filter((c) => c.status === activeFilter);

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary counts */}
      <View style={styles.summaryRow}>
        {[STATUS.SUBMITTED, STATUS.IN_PROGRESS, STATUS.RESOLVED].map((s) => {
          const count = complaints.filter((c) => c.status === s).length;
          const st = STATUS_STYLE[s];
          return (
            <TouchableOpacity
              key={s}
              style={[styles.summaryCard, { backgroundColor: st.bg }]}
              onPress={() => setActiveFilter(s)}
              accessibilityRole="button"
              accessibilityLabel={`${count} ${s} complaints`}
            >
              <Text style={[styles.summaryCount, { color: st.text }]}>{count}</Text>
              <Text style={[styles.summaryLabel, { color: st.text }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter bar */}
      <FilterBar active={activeFilter} onSelect={setActiveFilter} />

      {/* Mock data notice */}
      <View style={styles.mockNotice}>
        <Text style={styles.mockNoticeText}>
          ⚠ Demo data — resets on app restart. Real data connects in Stage 5.
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ComplaintCard
            item={item}
            onPress={() => router.push(`/complaint/${item.id}`)}
          />
        )}
        ListEmptyComponent={<EmptyState filter={activeFilter} />}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Summary strip
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  summaryCard: {
    flex: 1, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  summaryCount: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText:       { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  // Mock notice
  mockNotice: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  mockNoticeText: { fontSize: 11, color: '#795548' },

  // List
  listContent:      { paddingHorizontal: 16, paddingBottom: 32 },
  listContentEmpty: { flexGrow: 1 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12, padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardUserCreated: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon:     { fontSize: 26 },
  cardId:       { fontSize: 12, fontWeight: '700', color: Colors.primary, fontFamily: 'monospace' },
  cardCategory: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  cardTitle: {
    fontSize: 14, fontWeight: '600',
    color: Colors.textPrimary, lineHeight: 20, marginBottom: 10,
  },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  cardDate:     { fontSize: 11, color: Colors.textMuted },
  cardLocation: { fontSize: 11, color: Colors.textMuted },

  // Badge
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // User-created tag
  userTag: {
    marginTop: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  userTagText: { fontSize: 10, color: Colors.accent, fontWeight: '700' },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, marginTop: 40,
  },
  emptyIcon:     { fontSize: 52, marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
