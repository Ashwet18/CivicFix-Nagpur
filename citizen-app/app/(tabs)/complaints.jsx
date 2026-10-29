/**
 * app/(tabs)/complaints.jsx
 * Community Complaints screen
 *
 * Displays community issues from ComplaintsContext, with local status filters.
 */
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useComplaints, STATUS } from '../../context/complaints';
import Colors from '../../constants/colors';

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS = [
  'All',
  STATUS.REPORTED,
  STATUS.ACKNOWLEDGED,
  STATUS.IN_PROGRESS,
  STATUS.RESOLVED,
  STATUS.REJECTED,
];

const STATUS_STYLE = {
  [STATUS.REPORTED]:    { bg: '#E3F2FD', text: '#1565C0' },
  [STATUS.ACKNOWLEDGED]: { bg: '#EDE7F6', text: '#5E35B1' },
  [STATUS.IN_PROGRESS]: { bg: '#FFF8E1', text: '#F57F17' },
  [STATUS.RESOLVED]:    { bg: '#E8F5E9', text: '#2E7D32' },
  [STATUS.REJECTED]:    { bg: '#FFEBEE', text: '#C62828' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE[STATUS.REPORTED];
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
  const location = item.location
    ? `${item.location.latitude ?? '—'}, ${item.location.longitude ?? '—'}`
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View complaint ${item.id}: ${item.title}`}
      activeOpacity={0.75}
    >
      {/* Top row: category icon + id + badge */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.cardIcon}>{item.categoryIcon ?? '📌'}</Text>
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
        {!!location && <Text style={styles.cardLocation}>📍 {location}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ filter, loading, error, onRetry }) {
  return (
    <View style={styles.emptyState}>
      {loading ? (
        <>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.emptySubtitle}>Loading community complaints…</Text>
        </>
      ) : error ? (
        <>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Could not load complaints</Text>
          <Text style={styles.emptySubtitle}>{error.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No complaints found</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'All'
              ? 'There are no community reports yet.\nTap "Report" to get started.'
              : `No community complaints with status "${filter}".`}
          </Text>
        </>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ComplaintsScreen() {
  const router = useRouter();
  const {
    complaints,
    loading,
    refreshing,
    error,
    refreshComplaints,
  } = useComplaints();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? complaints
    : complaints.filter((c) => c.status === activeFilter);

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary counts */}
      <Text style={styles.screenTitle}>Community Complaints</Text>
      <Text style={styles.communityDescription}>
        Showing community-wide reports; the API does not filter reports by user.
      </Text>
      <View style={styles.summaryRow}>
        {[
          STATUS.REPORTED,
          STATUS.ACKNOWLEDGED,
          STATUS.IN_PROGRESS,
          STATUS.RESOLVED,
          STATUS.REJECTED,
        ].map((s) => {
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

      {!!error && complaints.length > 0 && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText}>
            Could not refresh complaints. The displayed community data may be outdated. {error.message}
          </Text>
          <TouchableOpacity
            style={styles.retryLink}
            onPress={() => refreshComplaints().catch(() => {})}
            accessibilityRole="button"
          >
            <Text style={styles.retryLinkText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshComplaints().catch(() => {})}
            colors={[Colors.primary]}
          />
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ComplaintCard
            item={item}
            onPress={() => router.push(`/complaint/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            filter={activeFilter}
            loading={loading}
            error={complaints.length === 0 ? error : null}
            onRetry={() => refreshComplaints().catch(() => {})}
          />
        }
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
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  communityDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Summary strip
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  summaryCard: {
    flex: 1, flexBasis: '28%', minWidth: 72, borderRadius: 10,
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

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { fontSize: 12, color: '#C62828', flex: 1, marginRight: 8 },

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

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, marginTop: 40,
  },
  emptyIcon:     { fontSize: 52, marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  retryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  retryLink: { padding: 4 },
  retryLinkText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
});
