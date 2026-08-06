import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { getSession, signUp, signIn, signOut } from '@/lib/supabase';
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
  past: 'Past',
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, clearLocalData } = useBookings();
  const [filter, setFilter] = useState<Filter>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) {
        // already signed in
      } else {
        setAuthVisible(true);
      }
    });
  }, []);

  const handleAuth = async () => {
    setAuthError('');
    const password = authPassword;
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (authMode === 'signup' && password !== authConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    const result = authMode === 'signup'
      ? await signUp(password)
      : await signIn(password);
    setAuthLoading(false);
    if (result.error) {
      setAuthError(result.error);
    } else {
      setAuthVisible(false);
      setAuthPassword('');
      setAuthConfirm('');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'You will need to sign back in to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await clearLocalData();
          await signOut();
          setSessionEmail('');
          setSettingsVisible(false);
          setAuthMode('signin');
          setAuthVisible(true);
        },
      },
    ]);
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
            <Pressable onPress={() => setFilter('today')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
            {(['today', 'upcoming', 'past'] as Filter[]).map(f => {
              const isActive = filter === f;
              const count = f === 'today' ? todayBookings.length
                          : f === 'upcoming' ? upcomingBookings.length
                          : pastBookings.length;
              return (
                <Pressable
                  key={f}
                  onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
                  style={[
                    styles.segmentBtn,
                    isActive && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: isActive ? colors.foreground : colors.mutedForeground },
                    isActive && { fontFamily: 'Inter_600SemiBold' },
                  ]}>
                    {FILTER_LABELS[f]}
                  </Text>
                  {count > 0 && (
                    <View style={[
                      styles.segmentBadge,
                      { backgroundColor: isActive ? colors.accent : colors.border },
                    ]}>
                      <Text style={[styles.segmentBadgeText, { color: isActive ? '#fff' : colors.mutedForeground }]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <ImportBookingModal visible={importVisible} onClose={() => setImportVisible(false)} />

      {/* Auth Screen — shown until signed in */}
      <Modal visible={authVisible} transparent={false} animationType="fade">
        <View style={[styles.setupScreen, { backgroundColor: colors.primary }]}>
          <Ionicons name="shield-checkmark-outline" size={56} color="#fff" style={{ marginBottom: 8 }} />
          <Text style={styles.setupTitle}>CampCheck</Text>
          <Text style={styles.setupSub}>
            {authMode === 'signup'
              ? 'Set a password to protect your data.'
              : 'Enter your password to continue.'}
          </Text>

          {/* Mode toggle */}
          <View style={styles.authToggle}>
            {(['signup', 'signin'] as const).map(m => (
              <Pressable
                key={m}
                onPress={() => { setAuthMode(m); setAuthError(''); }}
                style={[styles.authToggleBtn, authMode === m && styles.authToggleBtnActive]}
              >
                <Text style={[styles.authToggleText, authMode === m && styles.authToggleTextActive]}>
                  {m === 'signup' ? 'First Time Setup' : 'Sign In'}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={[styles.setupInput, { backgroundColor: '#fff', color: colors.primary }]}
            value={authPassword}
            onChangeText={setAuthPassword}
            placeholder="Password (6+ characters)"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
          {authMode === 'signup' && (
            <TextInput
              style={[styles.setupInput, { backgroundColor: '#fff', color: colors.primary }]}
              value={authConfirm}
              onChangeText={setAuthConfirm}
              placeholder="Confirm Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          )}

          {authError ? (
            <Text style={styles.authError}>{authError}</Text>
          ) : null}

          <Pressable
            onPress={handleAuth}
            disabled={authLoading}
            style={[styles.setupBtn, { backgroundColor: authLoading ? 'rgba(255,255,255,0.3)' : '#fff' }]}
          >
            <Text style={[styles.setupBtnText, { color: colors.primary }]}>
              {authLoading ? 'Please wait…' : authMode === 'signup' ? 'Set Password' : 'Sign In'}
            </Text>
          </Pressable>

          {authMode === 'signup' && (
            <Text style={styles.authHint}>
              On a new phone, switch to Sign In and enter your password — your data comes back automatically.
            </Text>
          )}
        </View>
      </Modal>

      {/* Settings Sheet */}
      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={[styles.settingsSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.settingsHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Settings</Text>
            <Pressable onPress={() => setSettingsVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.settingsBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingsCardHeader}>
                <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.settingsCardTitle, { color: colors.foreground }]}>Account</Text>
              </View>
              <View style={[styles.emailDisplay, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.emailText, { color: colors.foreground }]}>Password protected</Text>
              </View>
              <Text style={[styles.settingsCardSub, { color: colors.mutedForeground }]}>
                On a new phone, install CampCheck, tap Sign In, and enter your password — your data comes back automatically.
              </Text>
              <Pressable onPress={handleSignOut} style={[styles.signOutBtn, { borderColor: colors.destructive }]}>
                <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
                <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
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
    borderBottomWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center',
  },
  segmentWrap: {
    flexDirection: 'row', borderRadius: 12, padding: 3, width: '100%',
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, gap: 5, borderRadius: 10,
  },
  segmentText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  segmentBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  segmentBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  activeFilterChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  list: { paddingTop: 16, paddingBottom: 120, flexGrow: 1 },
  sectionHeader: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8 },
  // Auth screen
  setupScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  setupTitle: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.5 },
  setupSub: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  authToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 3, width: '100%', marginBottom: 4,
  },
  authToggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 18, alignItems: 'center' },
  authToggleBtnActive: { backgroundColor: '#fff' },
  authToggleText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  authToggleTextActive: { color: '#1E3A5F', fontFamily: 'Inter_600SemiBold' },
  setupInput: {
    width: '100%', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: 'Inter_400Regular',
  },
  setupBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  setupBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  authError: { color: '#fca5a5', fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  authHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
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
  emailDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  emailText: { fontSize: 15, fontFamily: 'Inter_500Medium', flex: 1 },
  restoreInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center',
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5,
  },
  signOutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
