import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import ImportBookingModal from '@/components/ImportBookingModal';
import { getRecoveryKey, restoreFromKey } from '@/lib/supabase';
import type { Booking } from '@/types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

type Filter = 'today' | 'upcoming' | 'all' | 'active' | 'pending' | 'past';

const FILTER_LABELS: Record<Filter, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  all: 'All',
  active: 'Active Rentals',
  pending: 'Pending Inspection',
  past: 'Completed Bookings',
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings } = useBookings();
  const [filter, setFilter] = useState<Filter>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [restoreInput, setRestoreInput] = useState('');
  const [restoring, setRestoring] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getRecoveryKey().then(setRecoveryKey);
  }, []);

  const handleCopyKey = () => {
    Clipboard.setString(recoveryKey);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Your recovery key has been copied to the clipboard.');
  };

  const handleRestore = async () => {
    if (!restoreInput.trim()) return;
    setRestoring(true);
    const payload = await restoreFromKey(restoreInput.trim());
    setRestoring(false);
    if (payload) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Restored!', 'Your data has been restored. Restart the app to see all your bookings.', [
        { text: 'OK', onPress: () => setSettingsVisible(false) },
      ]);
      setRecoveryKey(restoreInput.trim().toUpperCase());
      setRestoreInput('');
    } else {
      Alert.alert('Not Found', 'No data found for that key. Check the code and try again.');
    }
  };

  const today = todayISO();
  const todayBookings = bookings.filter(b => b.checkIn === today);
  const upcomingBookings = bookings.filter(b => b.checkIn > today);
  const activeBookings = bookings.filter(b => b.checkIn <= today && b.checkOut >= today);
  const pendingBookings = bookings.filter(b => b.inspectionStatus !== 'completed');
  const pastBookings = bookings.filter(b => b.checkOut < today).sort((a, b) => b.checkOut.localeCompare(a.checkOut));
  // 'all' only shows current + upcoming (not past) so the list stays clean
  const currentBookings = bookings.filter(b => b.checkOut >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const filtered: Booking[] =
    filter === 'today' ? todayBookings :
    filter === 'upcoming' ? upcomingBookings :
    filter === 'active' ? activeBookings :
    filter === 'pending' ? pendingBookings :
    filter === 'past' ? pastBookings :
    currentBookings;

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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setImportVisible(true); }}
              style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Ionicons name="scan-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/booking/form'); }}
              style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setSettingsVisible(true); }}
              style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </Pressable>
          </View>
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
          {(['today', 'upcoming', 'all', 'past'] as Filter[]).map(f => (
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
              {f === 'past' && pastBookings.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{pastBookings.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <ImportBookingModal visible={importVisible} onClose={() => setImportVisible(false)} />

      {/* Settings / Recovery Key Sheet */}
      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={[styles.settingsSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.settingsHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Settings</Text>
            <Pressable onPress={() => setSettingsVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.settingsBody} showsVerticalScrollIndicator={false}>
            {/* Recovery key */}
            <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingsCardHeader}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
                <Text style={[styles.settingsCardTitle, { color: colors.foreground }]}>Your Recovery Key</Text>
              </View>
              <Text style={[styles.settingsCardSub, { color: colors.mutedForeground }]}>
                Write this down or save it somewhere safe. If you lose or replace your phone, entering this key restores all your bookings and photos.
              </Text>

              <Pressable
                onPress={handleCopyKey}
                style={[styles.keyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={[styles.keyText, { color: colors.primary }]}>{recoveryKey || '…'}</Text>
                <Ionicons name="copy-outline" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Text style={[styles.keyHint, { color: colors.mutedForeground }]}>Tap to copy</Text>
            </View>

            {/* Restore from key */}
            <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingsCardHeader}>
                <Ionicons name="cloud-download-outline" size={20} color={colors.accent} />
                <Text style={[styles.settingsCardTitle, { color: colors.foreground }]}>Restore on New Device</Text>
              </View>
              <Text style={[styles.settingsCardSub, { color: colors.mutedForeground }]}>
                Got a new phone? Enter your recovery key from your old device to pull all your data back.
              </Text>
              <TextInput
                style={[styles.restoreInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                value={restoreInput}
                onChangeText={setRestoreInput}
                placeholder="e.g. CAMP-7X2K"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Pressable
                onPress={handleRestore}
                disabled={restoring || !restoreInput.trim()}
                style={[styles.restoreBtn, { backgroundColor: restoring || !restoreInput.trim() ? colors.muted : colors.accent }]}
              >
                <Text style={[styles.restoreBtnText, { color: restoring || !restoreInput.trim() ? colors.mutedForeground : '#fff' }]}>
                  {restoring ? 'Restoring…' : 'Restore Data'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
              filter === 'past' ? 'No past bookings yet' :
              'No bookings'
            }
            subtitle={
              filter === 'pending' ? 'Every booking has been inspected' :
              filter === 'past' ? 'Completed bookings will appear here' :
              'Tap + to add a new booking'
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
  // Settings sheet
  settingsSheet: { flex: 1, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  settingsBody: { padding: 16, gap: 16, paddingBottom: 60 },
  settingsCard: { borderRadius: 16, padding: 16, gap: 10 },
  settingsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsCardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  settingsCardSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  keyBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  keyText: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  keyHint: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -4 },
  restoreInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 18, fontFamily: 'Inter_600SemiBold', letterSpacing: 2, textAlign: 'center',
  },
  restoreBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  restoreBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
