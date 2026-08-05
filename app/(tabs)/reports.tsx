import React from 'react';
import {
  Alert,
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

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, inspections, inspectionProgress } = useBookings();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const completedBookings = bookings.filter(b => b.inspectionStatus === 'completed');
  const inProgressBookings = bookings.filter(b => b.inspectionStatus === 'in_progress');
  const pendingBookings = bookings.filter(b => b.inspectionStatus === 'not_started');

  const handleGenerateReport = (bookingId: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Report Generated',
      `Inspection report for ${name} has been generated and is ready to share.`,
      [{ text: 'Done', style: 'default' }]
    );
  };

  const summaryStats = [
    { label: 'Total Bookings', value: bookings.length, icon: 'calendar' as const, color: colors.primary },
    { label: 'Inspected', value: completedBookings.length, icon: 'checkmark-circle' as const, color: colors.success },
    { label: 'In Progress', value: inProgressBookings.length, icon: 'time' as const, color: colors.warning },
    { label: 'Pending', value: pendingBookings.length, icon: 'alert-circle' as const, color: colors.destructive },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.navyDark ?? '#0F2340']}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>Inspection summaries & records</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Grid */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Season Overview</Text>
        <View style={styles.statsGrid}>
          {summaryStats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* All Bookings Reports */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>All Inspections</Text>
        {bookings.map(booking => {
          const progress = inspectionProgress(booking.id);
          const total = 24; // approx total items
          const done = Math.round(progress * total);

          return (
            <View key={booking.id} style={[styles.reportCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
              <View style={styles.reportTop}>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportName, { color: colors.foreground }]}>{booking.guestName}</Text>
                  <View style={styles.reportMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.reportMetaText, { color: colors.mutedForeground }]}>
                      {booking.campground} · Lot {booking.lotNumber}
                    </Text>
                  </View>
                  <Text style={[styles.reportDate, { color: colors.mutedForeground }]}>
                    Check-in: {booking.checkIn}
                  </Text>
                </View>
                <InspectionPill status={booking.inspectionStatus} />
              </View>

              {/* Progress Bar */}
              {booking.inspectionStatus !== 'not_started' && (
                <View style={styles.progressSection}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                    <View style={[
                      styles.progressFill,
                      {
                        backgroundColor: booking.inspectionStatus === 'completed' ? colors.success : colors.warning,
                        width: `${Math.round(progress * 100)}%` as `${number}%`,
                      },
                    ]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                    {booking.inspectionStatus === 'completed' ? 'All items checked' : `${Math.round(progress * 100)}% complete`}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.reportActions}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); router.push(`/inspection/${booking.id}`); }}
                  style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="clipboard-outline" size={15} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>View</Text>
                </Pressable>

                {booking.inspectionStatus === 'completed' && (
                  <Pressable
                    onPress={() => handleGenerateReport(booking.id, booking.guestName)}
                    style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
                  >
                    <Ionicons name="share-outline" size={15} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success }]}>Export PDF</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  scroll: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  reportCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  reportTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  reportInfo: {
    flex: 1,
    gap: 3,
  },
  reportName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  reportDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
