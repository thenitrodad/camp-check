import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

// The API server URL — uses EXPO_PUBLIC_DOMAIN in dev (set by the run script),
// or EXPO_PUBLIC_API_URL if overridden for production.
function getApiUrl() {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return 'http://localhost:8080';
}

interface ParsedBooking {
  guestName: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  platform: string;
  notes: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

function isoToDisplay(iso: string) {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

export default function ImportBookingModal({ visible, onClose }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedBooking | null>(null);

  const pickAndParse = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to import a screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    setLoading(true);
    try {
      const resp = await fetch(`${getApiUrl()}/api/parse-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: result.assets[0].base64 }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Server error ${resp.status}`);
      }

      const data = await resp.json() as ParsedBooking;
      setParsed(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Could not read screenshot', msg + '\n\nTry a clearer screenshot with the booking details visible.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setParsed(null);
    // Navigate to the booking form with pre-filled params
    router.push({
      pathname: '/booking/form',
      params: {
        prefillName: parsed.guestName,
        prefillCheckIn: isoToDisplay(parsed.checkIn),
        prefillCheckOut: isoToDisplay(parsed.checkOut),
        prefillNotes: [
          parsed.platform ? `Platform: ${parsed.platform}` : '',
          parsed.amount ? `Amount: $${parsed.amount}` : '',
          parsed.notes,
        ].filter(Boolean).join(' | '),
      },
    });
  };

  const handleClose = () => {
    setParsed(null);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>

          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.foreground }]}>Import from Screenshot</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Pick a booking confirmation screenshot from Outdoorsy, RVshare, or any rental app
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Reading screenshot…</Text>
            </View>
          ) : parsed ? (
            <View style={styles.resultBox}>
              <View style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {[
                  { label: 'Guest', value: parsed.guestName },
                  { label: 'Check-in', value: isoToDisplay(parsed.checkIn) },
                  { label: 'Check-out', value: isoToDisplay(parsed.checkOut) },
                  { label: 'Platform', value: parsed.platform },
                  { label: 'Amount', value: parsed.amount ? `$${parsed.amount}` : '' },
                  { label: 'Notes', value: parsed.notes },
                ].filter(r => r.value).map(row => (
                  <View key={row.label} style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[styles.resultValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Review and confirm — you can edit anything in the form
              </Text>

              <Pressable
                onPress={handleConfirm}
                style={[styles.btn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.btnText}>Use These Details</Text>
              </Pressable>

              <Pressable onPress={pickAndParse} style={styles.retryBtn}>
                <Text style={[styles.retryText, { color: colors.mutedForeground }]}>Try a different screenshot</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickAndParse}
              style={({ pressed }) => [
                styles.pickBtn,
                { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.pickIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="image-outline" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.pickTitle, { color: colors.foreground }]}>Choose Screenshot</Text>
              <Text style={[styles.pickSub, { color: colors.mutedForeground }]}>
                AI will read the guest name, dates, and amount automatically
              </Text>
            </Pressable>
          )}

          <Pressable onPress={handleClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12, gap: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  resultBox: { gap: 12 },
  resultCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  resultRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  resultLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', width: 68, paddingTop: 1 },
  resultValue: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  hintText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  retryBtn: { alignItems: 'center', paddingVertical: 4 },
  retryText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  pickBtn: {
    borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 10,
  },
  pickIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  pickTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  pickSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
  cancelBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
