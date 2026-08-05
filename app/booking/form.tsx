import React, { useCallback, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet,
  Switch, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBookings } from '@/context/BookingsContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
  '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM',
];

// YYYY-MM-DD → MM/DD/YYYY
function isoToDisplay(iso: string) {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

// MM/DD/YYYY → YYYY-MM-DD (returns '' if invalid)
function displayToIso(s: string): string {
  const parts = s.split('/');
  if (parts.length !== 3) return '';
  const [m, d, y] = parts;
  if (y.length !== 4 || m.length < 1 || d.length < 1) return '';
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  if (isNaN(new Date(iso + 'T00:00:00').getTime())) return '';
  return iso;
}

// Auto-insert slashes while typing
function autoFormatDate(prev: string, next: string): string {
  // Strip non-digits
  const digits = next.replace(/\D/g, '').slice(0, 8);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += '/';
    out += digits[i];
  }
  return out;
}

function Stepper({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Pressable
        onPress={() => { if (value > min) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value - 1); } }}
        style={[stepStyles.btn, { backgroundColor: colors.muted, opacity: value <= min ? 0.4 : 1 }]}
      >
        <Ionicons name="remove" size={18} color={colors.foreground} />
      </Pressable>
      <Text style={[stepStyles.val, { color: colors.foreground }]}>{value}</Text>
      <Pressable
        onPress={() => { if (value < max) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value + 1); } }}
        style={[stepStyles.btn, { backgroundColor: colors.muted, opacity: value >= max ? 0.4 : 1 }]}
      >
        <Ionicons name="add" size={18} color={colors.foreground} />
      </Pressable>
    </View>
  );
}
const stepStyles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  val: { fontSize: 18, fontFamily: 'Inter_600SemiBold', minWidth: 24, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const { getBooking, addBooking, updateBooking } = useBookings();

  const existing = id ? getBooking(id) : undefined;
  const isEdit = !!existing;

  // Form state
  const [guestName, setGuestName] = useState(existing?.guestName ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [checkInDisplay, setCheckInDisplay] = useState(isoToDisplay(existing?.checkIn ?? ''));
  const [checkInTime, setCheckInTime] = useState(existing?.checkInTime ?? '3:00 PM');
  const [checkOutDisplay, setCheckOutDisplay] = useState(isoToDisplay(existing?.checkOut ?? ''));
  const [checkOutTime, setCheckOutTime] = useState(existing?.checkOutTime ?? '11:00 AM');
  const [adults, setAdults] = useState(existing?.adults ?? 2);
  const [children, setChildren] = useState(existing?.children ?? 0);
  const [isDelivery, setIsDelivery] = useState(!!(existing?.deliveryAddress));
  const [deliveryAddress, setDeliveryAddress] = useState(existing?.deliveryAddress ?? '');
  const [campground, setCampground] = useState(existing?.campground ?? '');
  const [lotNumber, setLotNumber] = useState(existing?.lotNumber ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [rvName, setRvName] = useState(existing?.rvName ?? 'Luxury Family Bunkhouse Camper');

  const [timePicker, setTimePicker] = useState<'in' | 'out' | null>(null);

  const handleSave = useCallback(() => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Please enter the guest name.');
      return;
    }
    const checkIn = displayToIso(checkInDisplay);
    const checkOut = displayToIso(checkOutDisplay);
    if (!checkIn) {
      Alert.alert('Invalid Date', 'Check-in date must be MM/DD/YYYY (e.g. 08/15/2026).');
      return;
    }
    if (!checkOut) {
      Alert.alert('Invalid Date', 'Check-out date must be MM/DD/YYYY (e.g. 08/18/2026).');
      return;
    }
    if (checkOut <= checkIn) {
      Alert.alert('Invalid Dates', 'Check-out must be after check-in.');
      return;
    }

    const data = {
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      checkIn,
      checkInTime,
      checkOut,
      checkOutTime,
      adults,
      children,
      campground: isDelivery ? 'TBD — Delivery' : (campground.trim() || 'TBD'),
      lotNumber: isDelivery ? '' : lotNumber.trim(),
      deliveryAddress: isDelivery ? deliveryAddress.trim() : '',
      notes: notes.trim(),
      rvName: rvName.trim() || 'Luxury Family Bunkhouse Camper',
      freshWaterStatus: existing?.freshWaterStatus ?? 'full',
      propaneStatus: existing?.propaneStatus ?? 'full',
    } as const;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isEdit && id) {
      updateBooking(id, data);
      router.back();
    } else {
      const newId = addBooking(data);
      router.replace(`/booking/${newId}`);
    }
  }, [guestName, phone, email, checkInDisplay, checkInTime, checkOutDisplay, checkOutTime,
      adults, children, isDelivery, deliveryAddress, campground, lotNumber, notes, rvName,
      isEdit, id, addBooking, updateBooking, existing]);

  const inputStyle = [fStyles.input, { color: colors.foreground }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>
            {isEdit ? 'Edit Booking' : 'New Booking'}
          </Text>
          <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        {/* ── Guest Info ── */}
        <SectionHeader title="Guest Info" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field label="Guest Name *" colors={colors}>
            <TextInput style={inputStyle} value={guestName} onChangeText={setGuestName}
              placeholder="Full name" placeholderTextColor={colors.mutedForeground} autoCapitalize="words" />
          </Field>
          <Field label="Phone" colors={colors}>
            <TextInput style={inputStyle} value={phone} onChangeText={setPhone}
              placeholder="(555) 000-0000" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />
          </Field>
          <Field label="Email" colors={colors}>
            <TextInput style={inputStyle} value={email} onChangeText={setEmail}
              placeholder="guest@email.com" placeholderTextColor={colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" />
          </Field>
        </View>

        {/* ── Dates & Times ── */}
        <SectionHeader title="Dates & Times" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field label="Check-in Date" colors={colors}>
            <TextInput style={inputStyle} value={checkInDisplay}
              onChangeText={t => setCheckInDisplay(autoFormatDate(checkInDisplay, t))}
              placeholder="MM/DD/YYYY" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={10} />
          </Field>
          <Field label="Check-in Time" colors={colors}>
            <Pressable onPress={() => setTimePicker('in')} style={fStyles.timePicker}>
              <Text style={[fStyles.timeValue, { color: colors.foreground }]}>{checkInTime}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
            </Pressable>
          </Field>
          <Field label="Check-out Date" colors={colors}>
            <TextInput style={inputStyle} value={checkOutDisplay}
              onChangeText={t => setCheckOutDisplay(autoFormatDate(checkOutDisplay, t))}
              placeholder="MM/DD/YYYY" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={10} />
          </Field>
          <Field label="Check-out Time" colors={colors}>
            <Pressable onPress={() => setTimePicker('out')} style={fStyles.timePicker}>
              <Text style={[fStyles.timeValue, { color: colors.foreground }]}>{checkOutTime}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
            </Pressable>
          </Field>
        </View>

        {/* ── Guests ── */}
        <SectionHeader title="Guests" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field label="Adults" colors={colors}>
            <Stepper value={adults} onChange={setAdults} min={1} />
          </Field>
          <Field label="Children" colors={colors}>
            <Stepper value={children} onChange={setChildren} />
          </Field>
        </View>

        {/* ── Location ── */}
        <SectionHeader title="Location" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field label="Delivery Booking" colors={colors}>
            <Switch
              value={isDelivery}
              onValueChange={setIsDelivery}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </Field>
          {isDelivery ? (
            <Field label="Delivery Address" colors={colors}>
              <TextInput style={[inputStyle, { flex: 1 }]} value={deliveryAddress} onChangeText={setDeliveryAddress}
                placeholder="123 Main St, City, State" placeholderTextColor={colors.mutedForeground} multiline />
            </Field>
          ) : (
            <>
              <Field label="Campground" colors={colors}>
                <TextInput style={inputStyle} value={campground} onChangeText={setCampground}
                  placeholder="Campground name" placeholderTextColor={colors.mutedForeground} />
              </Field>
              <Field label="Lot Number" colors={colors}>
                <TextInput style={inputStyle} value={lotNumber} onChangeText={setLotNumber}
                  placeholder="e.g. 42" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" />
              </Field>
            </>
          )}
        </View>

        {/* ── RV ── */}
        <SectionHeader title="RV" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field label="RV Name" colors={colors}>
            <TextInput style={inputStyle} value={rvName} onChangeText={setRvName}
              placeholder="e.g. Luxury Family Bunkhouse Camper" placeholderTextColor={colors.mutedForeground} />
          </Field>
        </View>

        {/* ── Notes ── */}
        <SectionHeader title="Notes" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TextInput
            style={[fStyles.notes, { color: colors.foreground, borderColor: 'transparent' }]}
            value={notes} onChangeText={setNotes}
            placeholder="Booking notes, special requests, pricing info…"
            placeholderTextColor={colors.mutedForeground}
            multiline numberOfLines={4} textAlignVertical="top"
          />
        </View>

        {/* Save button (bottom) */}
        <Pressable onPress={handleSave} style={[styles.bigSaveBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
          <Text style={styles.bigSaveBtnText}>{isEdit ? 'Save Changes' : 'Create Booking'}</Text>
        </Pressable>

      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={!!timePicker} transparent animationType="slide" onRequestClose={() => setTimePicker(null)}>
        <Pressable style={styles.overlay} onPress={() => setTimePicker(null)}>
          <View style={[styles.timeSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.timeSheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.timeSheetTitle, { color: colors.foreground }]}>
              {timePicker === 'in' ? 'Check-in Time' : 'Check-out Time'}
            </Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={t => t}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const selected = timePicker === 'in' ? item === checkInTime : item === checkOutTime;
                return (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (timePicker === 'in') setCheckInTime(item);
                      else setCheckOutTime(item);
                      setTimePicker(null);
                    }}
                    style={[styles.timeOption, selected && { backgroundColor: colors.primary + '15' }]}
                  >
                    <Text style={[styles.timeOptionText, { color: selected ? colors.primary : colors.foreground }]}>
                      {item}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({ label, colors, children: ch }: { label: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={[fStyles.field, { borderBottomColor: colors.border }]}>
      <Text style={[fStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={fStyles.control}>{ch}</View>
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 60 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  backText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  pageTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', flex: 2, textAlign: 'center' },
  saveBtn: { flex: 1, alignItems: 'flex-end', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionHeader: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
  },
  card: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  bigSaveBtn: {
    marginHorizontal: 16, marginTop: 28, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bigSaveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  timeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  timeSheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  timeSheetTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  timeOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10 },
  timeOptionText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
});

const fStyles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 14, fontFamily: 'Inter_500Medium', width: 130,
  },
  control: { flex: 1, alignItems: 'flex-end' },
  input: {
    fontSize: 15, fontFamily: 'Inter_400Regular',
    textAlign: 'right', flex: 1,
  },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeValue: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  notes: {
    fontSize: 15, fontFamily: 'Inter_400Regular',
    padding: 16, minHeight: 100,
  },
});
