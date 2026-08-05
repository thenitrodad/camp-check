import React, { useCallback, useState } from 'react';
import {
  Alert, Image, Linking, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useBookings } from '@/context/BookingsContext';
import { InspectionPill, PropanePill, WaterPill } from '@/components/StatusPill';
import type { TankStatus, PropaneStatus, InspectionStatus, PhotoType } from '@/types';

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={infoStyles.row}>
      <View style={[infoStyles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={infoStyles.content}>
        <Text style={[infoStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  label: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 15, fontFamily: 'Inter_500Medium', marginTop: 1 },
});

// ─── Status picker types ──────────────────────────────────────────────────────
type PickerField = 'freshWater' | 'propane' | 'inspection' | null;

interface PickerOption {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

function usePickerOptions(field: PickerField, colors: ReturnType<typeof useColors>): PickerOption[] {
  if (field === 'freshWater') {
    return [
      { value: 'full',  label: 'Full',  icon: 'water',         color: colors.success },
      { value: 'half',  label: '50%',   icon: 'water',         color: colors.info },
      { value: 'low',   label: 'Low',   icon: 'water-outline', color: colors.warning },
      { value: 'empty', label: 'Empty', icon: 'water-outline', color: colors.destructive },
    ];
  }
  if (field === 'propane') {
    return [
      { value: 'full',  label: 'Full',  icon: 'flame',         color: colors.success },
      { value: 'half',  label: '50%',   icon: 'flame',         color: colors.info },
      { value: 'low',   label: 'Low',   icon: 'flame-outline', color: colors.warning },
      { value: 'empty', label: 'Empty', icon: 'flame-outline', color: colors.destructive },
    ];
  }
  if (field === 'inspection') {
    return [
      { value: 'not_started', label: 'Pending',     icon: 'ellipse-outline',  color: colors.mutedForeground },
      { value: 'in_progress', label: 'In Progress', icon: 'time',             color: colors.warning },
      { value: 'completed',   label: 'Inspected',   icon: 'checkmark-circle', color: colors.success },
    ];
  }
  return [];
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { getBooking, inspectionProgress, updateBookingAddress, updateBooking, deleteBooking, addBookingPhoto, removeBookingPhoto } = useBookings();
  const booking = getBooking(id);

  const [addressModal, setAddressModal] = useState(false);
  const [draftAddress, setDraftAddress] = useState('');
  const [pickerField, setPickerField] = useState<PickerField>(null);
  const [photoTab, setPhotoTab] = useState<PhotoType>('before');
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const progress = inspectionProgress(id);

  const pickerOptions = usePickerOptions(pickerField, colors);

  const currentPickerValue = (() => {
    if (!booking) return '';
    if (pickerField === 'freshWater') return booking.freshWaterStatus;
    if (pickerField === 'propane') return booking.propaneStatus;
    if (pickerField === 'inspection') return booking.inspectionStatus;
    return '';
  })();

  const pickerTitle = pickerField === 'freshWater'
    ? 'Fresh Water Level'
    : pickerField === 'propane'
    ? 'Propane Level'
    : 'Inspection Status';

  // ── Photo handlers ──────────────────────────────────────────────────────────
  const handleAddPhoto = useCallback(async (type: PhotoType) => {
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach damage photos.');
      return;
    }
    Alert.alert(
      `Add ${type === 'before' ? 'Before' : 'After'} Photo`,
      'Choose source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const res = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85, allowsEditing: true });
            if (!res.canceled) {
              addBookingPhoto(id, { uri: res.assets[0].uri, type, takenAt: new Date().toISOString() });
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85, allowsEditing: true });
            if (!res.canceled) {
              addBookingPhoto(id, { uri: res.assets[0].uri, type, takenAt: new Date().toISOString() });
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [id, addBookingPhoto]);

  const handleDeletePhoto = useCallback((photoId: string) => {
    Alert.alert('Delete Photo', 'Remove this photo from the booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          removeBookingPhoto(id, photoId);
        },
      },
    ]);
  }, [id, removeBookingPhoto]);

  const openPicker = useCallback((field: PickerField) => {
    Haptics.selectionAsync();
    setPickerField(field);
  }, []);

  const selectPickerOption = useCallback((value: string) => {
    if (!pickerField) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pickerField === 'freshWater') {
      updateBooking(id, { freshWaterStatus: value as TankStatus });
    } else if (pickerField === 'propane') {
      updateBooking(id, { propaneStatus: value as PropaneStatus });
    } else if (pickerField === 'inspection') {
      updateBooking(id, { inspectionStatus: value as InspectionStatus });
    }
    setPickerField(null);
  }, [pickerField, id, updateBooking]);

  const handleInspection = useCallback(() => {
    Haptics.selectionAsync();
    router.push(`/inspection/${id}`);
  }, [id]);

  const handleNavigate = useCallback(() => {
    if (!booking) return;
    Haptics.selectionAsync();
    const destination = booking.deliveryAddress?.trim() || `${booking.campground} Lot ${booking.lotNumber}`;
    const q = encodeURIComponent(destination);
    const url = Platform.OS === 'ios' ? `maps:?q=${q}` : `https://maps.google.com/?q=${q}`;
    Linking.openURL(url).catch(() => Alert.alert('Navigate to', destination));
  }, [booking]);

  const handleUploadVideo = useCallback(async () => {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'videos', allowsEditing: false, videoMaxDuration: 300 });
    if (!result.canceled) Alert.alert('Video Uploaded', 'Walkaround video saved to booking record.');
  }, []);

  const handleGenerateReport = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Report Generated', `Inspection report for ${booking?.guestName} has been created.`);
  }, [booking]);

  const handleEdit = useCallback(() => {
    Haptics.selectionAsync();
    router.push(`/booking/form?id=${id}`);
  }, [id]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Booking',
      `Remove ${booking?.guestName}'s booking? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteBooking(id);
            router.replace('/(tabs)');
          },
        },
      ]
    );
  }, [booking, id, deleteBooking]);

  const openAddressModal = () => {
    setDraftAddress(booking?.deliveryAddress ?? '');
    setAddressModal(true);
  };

  const saveAddress = () => {
    updateBookingAddress(id, draftAddress.trim());
    setAddressModal(false);
  };

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>Booking not found</Text>
      </View>
    );
  }

  const guestStr = [
    `${booking.adults} Adult${booking.adults !== 1 ? 's' : ''}`,
    booking.children > 0 ? `${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : null,
  ].filter(Boolean).join(', ');

  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={[colors.primary, colors.navyDark ?? '#0F2340']} style={styles.hero}>
          <View style={[styles.heroAvatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.heroAvatarText}>
              {booking.guestName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heroName}>{booking.guestName}</Text>
          <Text style={styles.heroSub}>
            {booking.campground}{booking.lotNumber ? `  ·  Lot ${booking.lotNumber}` : ''}
          </Text>
          <Text style={styles.heroRv}>{booking.rvName}</Text>
          <View style={styles.heroBadges}>
            <InspectionPill status={booking.inspectionStatus} />
          </View>

          {/* Edit / Delete */}
          <View style={styles.heroActions}>
            <Pressable onPress={handleEdit} style={[styles.heroActionBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="pencil-outline" size={16} color="#fff" />
              <Text style={styles.heroActionText}>Edit</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={[styles.heroActionBtn, { backgroundColor: 'rgba(255,100,100,0.25)' }]}>
              <Ionicons name="trash-outline" size={16} color="#ffaaaa" />
              <Text style={[styles.heroActionText, { color: '#ffaaaa' }]}>Delete</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={[styles.quickActions, { backgroundColor: colors.card }]}>
          {[
            { icon: 'clipboard-outline' as const, label: 'Inspect', onPress: handleInspection, color: colors.accent },
            { icon: 'navigate-outline' as const, label: 'Navigate', onPress: handleNavigate, color: colors.primary },
            { icon: 'videocam-outline' as const, label: 'Video', onPress: handleUploadVideo, color: colors.info },
            { icon: 'document-text-outline' as const, label: 'Report', onPress: handleGenerateReport, color: colors.warning },
          ].map((a, i) => (
            <Pressable key={i} onPress={a.onPress} style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.quickIcon, { backgroundColor: a.color + '15' }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Address</Text>
            <Pressable onPress={openAddressModal} style={[styles.editChip, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="pencil-outline" size={14} color={colors.primary} />
              <Text style={[styles.editChipText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          </View>
          {booking.deliveryAddress?.trim() ? (
            <Pressable onPress={handleNavigate} style={[styles.addressRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={2}>
                {booking.deliveryAddress}
              </Text>
              <View style={[styles.navBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="navigate" size={14} color="#fff" />
                <Text style={styles.navBadgeText}>Go</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={openAddressModal} style={[styles.addressEmpty, { borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
              <Text style={[styles.addressEmptyText, { color: colors.mutedForeground }]}>Tap to add delivery address</Text>
            </Pressable>
          )}
        </View>

        {/* Inspection Progress */}
        {booking.inspectionStatus !== 'not_started' && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Inspection Progress</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, {
                backgroundColor: booking.inspectionStatus === 'completed' ? colors.success : colors.warning,
                width: `${Math.round(progress * 100)}%` as `${number}%`,
              }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {Math.round(progress * 100)}% complete
            </Text>
            <Pressable onPress={handleInspection} style={[styles.inspectBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="clipboard-outline" size={16} color="#fff" />
              <Text style={styles.inspectBtnText}>
                {booking.inspectionStatus === 'completed' ? 'View Inspection' : 'Continue Inspection'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Booking Details */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Guest Information</Text>
          <InfoRow icon="person-outline" label="Guest" value={booking.guestName} />
          {!!booking.phone && <InfoRow icon="call-outline" label="Phone" value={booking.phone} />}
          {!!booking.email && <InfoRow icon="mail-outline" label="Email" value={booking.email} />}
          <InfoRow icon="people-outline" label="Guests" value={guestStr} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="location-outline" label="Campground" value={booking.campground} />
          {!!booking.lotNumber && <InfoRow icon="grid-outline" label="Lot Number" value={`Lot ${booking.lotNumber}`} />}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="log-in-outline" label="Check-in" value={`${booking.checkIn} at ${booking.checkInTime}`} />
          <InfoRow icon="log-out-outline" label="Check-out" value={`${booking.checkOut} at ${booking.checkOutTime}`} />
          <InfoRow icon="moon-outline" label="Duration" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="car-outline" label="RV" value={booking.rvName} />
        </View>

        {/* Vehicle Status */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vehicle Status</Text>
            <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>Tap to update</Text>
          </View>
          <View style={styles.statusGrid}>

            {/* Fresh Water */}
            <Pressable
              onPress={() => openPicker('freshWater')}
              style={({ pressed }) => [styles.statusCard, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.statusIconWrap, { backgroundColor: colors.info + '20' }]}>
                <Ionicons name="water" size={20} color={colors.info} />
              </View>
              <Text style={[styles.statusCardLabel, { color: colors.mutedForeground }]}>Fresh Water</Text>
              <WaterPill status={booking.freshWaterStatus} />
              <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            </Pressable>

            {/* Propane */}
            <Pressable
              onPress={() => openPicker('propane')}
              style={({ pressed }) => [styles.statusCard, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.statusIconWrap, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="flame" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.statusCardLabel, { color: colors.mutedForeground }]}>Propane</Text>
              <PropanePill status={booking.propaneStatus} />
              <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            </Pressable>

            {/* Inspection */}
            <Pressable
              onPress={() => openPicker('inspection')}
              style={({ pressed }) => [styles.statusCard, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.statusIconWrap, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="clipboard" size={20} color={colors.accent} />
              </View>
              <Text style={[styles.statusCardLabel, { color: colors.mutedForeground }]}>Inspection</Text>
              <InspectionPill status={booking.inspectionStatus} />
              <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            </Pressable>

          </View>
        </View>

        {/* Damage Photos */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Damage Photos</Text>
            <View style={[styles.photoTabRow, { backgroundColor: colors.muted }]}>
              {(['before', 'after'] as PhotoType[]).map(t => (
                <Pressable
                  key={t}
                  onPress={() => setPhotoTab(t)}
                  style={[styles.photoTabBtn, photoTab === t && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.photoTabText, { color: photoTab === t ? '#fff' : colors.mutedForeground }]}>
                    {t === 'before' ? 'Before' : 'After'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Photo grid */}
          <View style={styles.photoGrid}>
            {(booking.photos ?? []).filter(p => p.type === photoTab).map(photo => (
              <Pressable
                key={photo.id}
                onPress={() => setViewPhoto(photo.uri)}
                onLongPress={() => handleDeletePhoto(photo.id)}
                style={styles.photoThumb}
              >
                <Image source={{ uri: photo.uri }} style={styles.photoThumbImg} />
                <View style={styles.photoDeleteHint}>
                  <Ionicons name="trash-outline" size={10} color="rgba(255,255,255,0.7)" />
                </View>
              </Pressable>
            ))}

            {/* Add button */}
            <Pressable
              onPress={() => handleAddPhoto(photoTab)}
              style={[styles.photoAddBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <Ionicons name="camera-outline" size={24} color={colors.mutedForeground} />
              <Text style={[styles.photoAddText, { color: colors.mutedForeground }]}>
                Add {photoTab === 'before' ? 'Before' : 'After'}
              </Text>
            </Pressable>
          </View>

          {(booking.photos ?? []).filter(p => p.type === photoTab).length === 0 && (
            <Text style={[styles.photoEmptyHint, { color: colors.mutedForeground }]}>
              {photoTab === 'before'
                ? 'Take photos before the rental starts to document condition.'
                : 'Take photos after return to compare against before photos.'}
            </Text>
          )}
        </View>

        {/* Notes */}
        {!!booking.notes && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
            <Text style={[styles.notes, { color: colors.foreground }]}>{booking.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <Pressable style={styles.photoViewerOverlay} onPress={() => setViewPhoto(null)}>
          {viewPhoto && (
            <Image source={{ uri: viewPhoto }} style={styles.photoViewerImg} resizeMode="contain" />
          )}
          <Pressable style={styles.photoViewerClose} onPress={() => setViewPhoto(null)}>
            <Ionicons name="close-circle" size={32} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Address Modal */}
      <Modal visible={addressModal} transparent animationType="fade" onRequestClose={() => setAddressModal(false)}>
        <Pressable style={styles.overlayCenter} onPress={() => setAddressModal(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Delivery Address</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Enter the address where you'll deliver the RV.
            </Text>
            <TextInput
              style={[styles.addressInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              value={draftAddress} onChangeText={setDraftAddress}
              placeholder="123 Main St, City, State 12345"
              placeholderTextColor={colors.mutedForeground}
              multiline numberOfLines={3} autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setAddressModal(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveAddress} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Status Picker Modal */}
      <Modal visible={!!pickerField} transparent animationType="slide" onRequestClose={() => setPickerField(null)}>
        <Pressable style={styles.overlay} onPress={() => setPickerField(null)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{pickerTitle}</Text>
            <Text style={[styles.pickerSub, { color: colors.mutedForeground }]}>Select a new status</Text>

            <View style={styles.pickerOptions}>
              {pickerOptions.map(opt => {
                const isSelected = opt.value === currentPickerValue;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => selectPickerOption(opt.value)}
                    style={({ pressed }) => [
                      styles.pickerOption,
                      {
                        backgroundColor: isSelected ? opt.color + '18' : colors.muted,
                        borderColor: isSelected ? opt.color : colors.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.pickerOptionIcon, { backgroundColor: opt.color + '20' }]}>
                      <Ionicons name={opt.icon} size={20} color={opt.color} />
                    </View>
                    <Text style={[styles.pickerOptionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                    {isSelected && (
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Ionicons name="checkmark-circle" size={20} color={opt.color} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setPickerField(null)} style={[styles.pickerCancel, { backgroundColor: colors.muted }]}>
              <Text style={[styles.pickerCancelText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorText: { padding: 20, fontSize: 16 },
  hero: { padding: 24, alignItems: 'center', gap: 6, paddingBottom: 24 },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroAvatarText: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroName: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: 'Inter_400Regular' },
  heroRv: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 6 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
  },
  heroActionText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  quickActions: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 8, marginBottom: 12 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, gap: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  tapHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  editChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  addressText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  navBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  navBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addressEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  addressEmptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  // Status cards
  statusGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statusCard: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14 },
  statusIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusCardLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  notes: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  inspectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  inspectBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { width: '100%', borderRadius: 20, padding: 24, gap: 10 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  addressInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular', textAlignVertical: 'top', minHeight: 80 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Picker sheet
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, gap: 4 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  pickerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  pickerOptions: { gap: 10 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  pickerOptionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerOptionLabel: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  pickerCancel: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  pickerCancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Damage photos
  photoTabRow: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  photoTabBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  photoTabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  photoThumb: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoDeleteHint: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 3,
  },
  photoAddBtn: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoAddText: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  photoEmptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 4 },
  // Photo viewer
  photoViewerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoViewerImg: { width: '100%', height: '80%' },
  photoViewerClose: { position: 'absolute', top: 56, right: 20 },
});
