import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
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
import { InspectionPill } from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toIso(d: Date) {
  return d.toISOString().split('T')[0];
}

// Build the grid for a full month (always 6 rows × 7 cols)
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

type ViewMode = 'week' | 'month';

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings } = useBookings();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(toIso(today));
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [monthOffset, setMonthOffset] = useState(0);

  // Week view
  const weekStart = addDays(today, weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month view
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthYear = monthDate.getFullYear();
  const monthIdx = monthDate.getMonth();
  const monthGrid = buildMonthGrid(monthYear, monthIdx);

  const dayBookings = bookings.filter(b => b.checkIn === selectedDate);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const hasBooking = (dateIso: string) => bookings.some(b =>
    b.checkIn <= dateIso && b.checkOut >= dateIso
  );

  const selectDate = (iso: string) => {
    Haptics.selectionAsync();
    setSelectedDate(iso);
  };

  const switchMode = (mode: ViewMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(mode);
    // Sync month offset when switching to month view
    if (mode === 'month') {
      const sel = new Date(selectedDate + 'T00:00:00');
      const diffMonths = (sel.getFullYear() - today.getFullYear()) * 12 + (sel.getMonth() - today.getMonth());
      setMonthOffset(diffMonths);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.navyDark ?? '#0F2340']}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Schedule</Text>
            <Text style={styles.headerSub}>
              {viewMode === 'week'
                ? `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()}`
                : `${MONTHS[monthIdx]} ${monthYear}`
              }
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {/* Week / Month toggle */}
            <View style={[styles.toggleWrap, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              {(['week', 'month'] as ViewMode[]).map(m => (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  style={[
                    styles.toggleBtn,
                    viewMode === m && { backgroundColor: 'rgba(255,255,255,0.25)' },
                  ]}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: viewMode === m ? '#fff' : 'rgba(255,255,255,0.6)' },
                    viewMode === m && { fontFamily: 'Inter_600SemiBold' },
                  ]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/booking/form'); }}
              style={[styles.newBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* ── Week view strip ── */}
        {viewMode === 'week' && (
          <View style={styles.weekNav}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => w - 1); }}
              style={styles.weekNavBtn}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calStrip}>
              {weekDays.map(d => {
                const iso = toIso(d);
                const isSelected = iso === selectedDate;
                const isToday = iso === toIso(today);
                const hasBkg = hasBooking(iso);
                return (
                  <Pressable
                    key={iso}
                    onPress={() => selectDate(iso)}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: colors.accent },
                      !isSelected && isToday && { backgroundColor: 'rgba(255,255,255,0.1)' },
                    ]}
                  >
                    <Text style={[styles.dayName, { color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
                      {DAYS_SHORT[d.getDay()]}
                    </Text>
                    <Text style={[styles.dayNum, { color: isSelected ? '#fff' : 'rgba(255,255,255,0.9)' }]}>
                      {d.getDate()}
                    </Text>
                    {hasBkg && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : colors.accent }]} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => w + 1); }}
              style={styles.weekNavBtn}
            >
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* ── Month view grid ── */}
        {viewMode === 'month' && (
          <View style={styles.monthWrap}>
            {/* Month navigation */}
            <View style={styles.monthNav}>
              <Pressable onPress={() => { Haptics.selectionAsync(); setMonthOffset(m => m - 1); }} style={styles.weekNavBtn}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>
              <View style={styles.dayLetterRow}>
                {DAYS_LETTER.map((l, i) => (
                  <Text key={i} style={styles.dayLetter}>{l}</Text>
                ))}
              </View>
              <Pressable onPress={() => { Haptics.selectionAsync(); setMonthOffset(m => m + 1); }} style={styles.weekNavBtn}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Grid rows */}
            {monthGrid.map((row, ri) => (
              <View key={ri} style={styles.monthRow}>
                {/* spacer for prev/next arrows alignment */}
                <View style={{ width: 32 }} />
                {row.map((d, ci) => {
                  if (!d) return <View key={ci} style={styles.monthCell} />;
                  const iso = toIso(d);
                  const isSelected = iso === selectedDate;
                  const isToday = iso === toIso(today);
                  const hasBkg = hasBooking(iso);
                  return (
                    <Pressable
                      key={ci}
                      onPress={() => selectDate(iso)}
                      style={[
                        styles.monthCell,
                        isSelected && { backgroundColor: colors.accent, borderRadius: 20 },
                        !isSelected && isToday && { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20 },
                      ]}
                    >
                      <Text style={[
                        styles.monthDayNum,
                        { color: isSelected ? '#fff' : isToday ? '#fff' : 'rgba(255,255,255,0.85)' },
                        isSelected && { fontFamily: 'Inter_700Bold' },
                      ]}>
                        {d.getDate()}
                      </Text>
                      {hasBkg && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : colors.accent, marginTop: 1 }]} />}
                    </Pressable>
                  );
                })}
                <View style={{ width: 32 }} />
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Day Bookings */}
      <FlatList
        data={dayBookings}
        keyExtractor={b => b.id}
        contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        scrollEnabled={dayBookings.length > 0}
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {dayBookings.length > 0
              ? `${dayBookings.length} Check-in${dayBookings.length !== 1 ? 's' : ''}`
              : 'No check-ins'}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No bookings this day"
            subtitle="Tap New Booking to add one, or browse another date"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push(`/booking/${item.id}`); }}
            style={({ pressed }) => [
              styles.bookingRow,
              { backgroundColor: colors.card, shadowColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={[styles.timeLine, { backgroundColor: colors.primary }]} />
            <View style={styles.bookingInfo}>
              <View style={styles.bookingTopRow}>
                <Text style={[styles.bookingName, { color: colors.foreground }]}>{item.guestName}</Text>
                <InspectionPill status={item.inspectionStatus} />
              </View>
              <View style={styles.bookingMeta}>
                <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.bookingMetaText, { color: colors.mutedForeground }]}>
                  {item.campground}{item.lotNumber ? ` · Lot ${item.lotNumber}` : ''}
                </Text>
              </View>
              <View style={styles.bookingMeta}>
                <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.bookingMetaText, { color: colors.mutedForeground }]}>
                  In {item.checkInTime} · Out {item.checkOutTime}
                </Text>
              </View>
              <View style={styles.bookingMeta}>
                <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.bookingMetaText, { color: colors.mutedForeground }]}>
                  {item.adults} Adult{item.adults !== 1 ? 's' : ''}{item.children > 0 ? ` · ${item.children} Children` : ''}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/booking/form'); }}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  toggleWrap: { flexDirection: 'row', borderRadius: 20, padding: 2, gap: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  toggleText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  newBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  // Week view
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekNavBtn: { padding: 6 },
  calStrip: { flex: 1 },
  dayCell: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 14, gap: 2, minWidth: 44,
  },
  dayName: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.3 },
  dayNum: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  // Month view
  monthWrap: { gap: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  dayLetterRow: { flex: 1, flexDirection: 'row' },
  dayLetter: {
    flex: 1, textAlign: 'center',
    color: 'rgba(255,255,255,0.5)', fontSize: 11,
    fontFamily: 'Inter_500Medium', textTransform: 'uppercase',
  },
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthCell: {
    flex: 1, alignItems: 'center', paddingVertical: 5, gap: 1,
  },
  monthDayNum: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  // Booking list
  list: { padding: 16, gap: 12, flexGrow: 1 },
  sectionLabel: {
    fontSize: 12, fontFamily: 'Inter_500Medium',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    padding: 14, gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    marginBottom: 10,
  },
  timeLine: { width: 3, height: '100%', borderRadius: 2, alignSelf: 'stretch' },
  bookingInfo: { flex: 1, gap: 4 },
  bookingTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  bookingName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bookingMetaText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute', bottom: 100, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
});
