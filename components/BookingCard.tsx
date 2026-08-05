import React, { useCallback } from 'react';
import {
  Alert, Linking, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { InspectionPill, PropanePill, WaterPill } from '@/components/StatusPill';
import type { Booking } from '@/types';

interface Props {
  booking: Booking;
}

export default function BookingCard({ booking }: Props) {
  const colors = useColors();

  const handleOpenBooking = useCallback(() => {
    Haptics.selectionAsync();
    router.push(`/booking/${booking.id}`);
  }, [booking.id]);

  const handleStartInspection = useCallback(() => {
    Haptics.selectionAsync();
    router.push(`/inspection/${booking.id}`);
  }, [booking.id]);

  const handleNavigate = useCallback(() => {
    Haptics.selectionAsync();
    const query = encodeURIComponent(`${booking.campground} ${booking.lotNumber}`);
    const url = Platform.OS === 'ios'
      ? `maps:?q=${query}`
      : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Navigation', `${booking.campground}, Lot ${booking.lotNumber}`)
    );
  }, [booking.campground, booking.lotNumber]);

  const initials = booking.guestName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const guestCountText = [
    booking.adults > 0 ? `${booking.adults} Adult${booking.adults !== 1 ? 's' : ''}` : null,
    booking.children > 0 ? `${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <Pressable
      onPress={handleOpenBooking}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
        {/* Header gradient */}
        <LinearGradient
          colors={[colors.primary, colors.navyDark ?? '#0F2340']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.guestName} numberOfLines={1}>{booking.guestName}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>{booking.campground}  ·  Lot {booking.lotNumber}</Text>
            </View>
          </View>

          <View style={[styles.checkInBadge, { backgroundColor: colors.accent }]}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.checkInText}>{booking.checkInTime}</Text>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={styles.body}>
          {/* Guest count */}
          <View style={styles.guestCountRow}>
            <Ionicons name="people-outline" size={15} color={colors.mutedForeground} />
            <Text style={[styles.guestCountText, { color: colors.foreground }]}>{guestCountText}</Text>
          </View>

          {/* Status pills */}
          <View style={styles.pillsRow}>
            <View style={styles.pillGroup}>
              <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>Water</Text>
              <WaterPill status={booking.freshWaterStatus} />
            </View>
            <View style={styles.pillGroup}>
              <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>Propane</Text>
              <PropanePill status={booking.propaneStatus} />
            </View>
            <View style={styles.pillGroup}>
              <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>Inspection</Text>
              <InspectionPill status={booking.inspectionStatus} />
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleOpenBooking}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Open Booking</Text>
            </Pressable>

            <Pressable
              onPress={handleNavigate}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Ionicons name="navigate-outline" size={20} color={colors.primary} />
            </Pressable>

            <Pressable
              onPress={handleStartInspection}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: colors.accent + '20', opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  headerContent: {
    flex: 1,
  },
  guestName: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  checkInText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  guestCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestCountText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pillGroup: {
    gap: 4,
  },
  pillLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginHorizontal: -16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
