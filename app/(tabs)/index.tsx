import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBookings } from '@/context/BookingsContext';
import BookingCard from '@/components/BookingCard';
import EmptyState from '@/components/EmptyState';
import type { Booking } from '@/types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

type Filter = 'today' | 'upcoming' | 'all' | 'active' | 'pending';

const FILTER_LABELS: Record<Filter, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  all: 'All',
  active: 'Active Rentals',
  pending: 'Pending Inspection',
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings } = useBookings();
  const [filter, setFilter] = useState<Filter>('today');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList>(null);

  const today = todayISO();
  const todayBookings = bookings.filter(b => b.checkIn === today);
  const upcomingBookings = bookings.filter(b => b.checkIn > today);
  const activeBookings = bookings.filter(b => b.checkIn <= today && b.checkOut >= today);
  const pendingBookings = bookings.filter(b => b.inspectionStatus !== 'completed');

  const filtered: Booking[] =
    filter === 'today' ? todayBookings :
    filter === 'upcoming' ? upcomingBookings :
    filter === 'active' ? activeBookings :
    filter === 'pending' ? pendingBookings :
    bookings;

  const stats = [
    {
      label: "Today's Check-ins",
      value: todayBookings.length,
      icon: 'today-outline' as const,
      filter: 'today' as Filter,
      color: colors.accent,
    },
    {
      label: 'Active Rentals',
      value: activeBookings.length,
      icon: 'car-outline' as const,
      filter: 'active' as Filter,
      color: '#34C759',
    },
    {
      label: 'Pending',
      value: pendingBookings.length,
      icon: 'clipboard-outline' as const,
      filter: 'pending' as Filter,
      color: colors.warning,
    },
  ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleStatPress = useCallback((f: Filter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(f);
    // Small delay so the list re-renders before we scroll
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
  }, []);

  const isCustomFilter = filter === 'active' || filter === 'pending';
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.navyDark ?? '#0F2340']}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.headerTitle}>CampCheck</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/booking/form'); }}
            style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.dateText}>{formatDate(today)}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => {
            const isActive = filter === s.filter;
            return (
              <Pressable
                key={s.filter}
                onPress={() => handleStatPress(s.filter)}
                style={({ pressed }) => [
                  styles.statCard,
                  {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: isActive ? 1.5 : 0,
                    borderColor: isActive ? 'rgba(255,255,255,0.5)' : 'transparent',
                  },
                ]}
              >
                <Ionicons name={s.icon} size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.8)'} />
                <Text style={[styles.statValue, isActive && { color: '#fff' }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                {isActive && (
                  <View style={styles.activeIndicator} />
                )}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* Filter Tabs / Active filter chip */}
      {isCustomFilter ? (
        <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="funnel" size={13} color={colors.primary} />
            <Text style={[styles.activeFilterChipText, { color: colors.primary }]}>
              {FILTER_LABELS[filter]}
            </Text>
            <Pressable onPress={() => setFilter('all')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(['today', 'upcoming', 'all'] as Filter[]).map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterTab, filter === f && { borderBottomColor: colors.accent }]}
            >
              <Text style={[
                styles.filterText,
                { color: filter === f ? colors.accent : colors.mutedForeground },
                filter === f && { fontFamily: 'Inter_600SemiBold' },
              ]}>
                {FILTER_LABELS[f]}
              </Text>
              {f === 'today' && todayBookings.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>{todayBookings.length}</Text>
                </View>
              )}
              {f === 'upcoming' && upcomingBookings.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{upcomingBookings.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Booking List */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={b => b.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={
              filter === 'today' ? 'No check-ins today' :
              filter === 'active' ? 'No active rentals' :
              filter === 'pending' ? 'All inspections complete!' :
              'No bookings'
            }
            subtitle={
              filter === 'pending'
                ? 'Every booking has been inspected'
                : 'Tap + to add a new booking'
            }
          />
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
              {filtered.length} Booking{filtered.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 6 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statCard: {
    flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'center', gap: 4,
  },
  statValue: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  activeIndicator: { width: 20, height: 3, borderRadius: 2, backgroundColor: '#fff', marginTop: 2 },
  filterRow: {
    flexDirection: 'row', borderBottomWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center',
  },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
    marginHorizontal: -16, paddingHorizontal: 16,
  },
  filterText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  activeFilterChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  list: { paddingTop: 16, paddingBottom: 120, flexGrow: 1 },
  sectionHeader: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8 },
});
