import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBookings } from '@/context/BookingsContext';
import InventoryItemRow from '@/components/InventoryItemRow';
import type { InventoryItem, ItemStatus } from '@/types';

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    bookings, getInventory,
    updateInventoryStatus, updateInventoryItem,
    addInventoryItem, deleteInventoryItem,
    inventoryTemplate, addTemplateItem, updateTemplateItem, removeTemplateItem,
  } = useBookings();

  const [selectedId, setSelectedId] = useState(bookings[0]?.id ?? '');
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');

  // Template editor state
  const [templateVisible, setTemplateVisible] = useState(false);
  const [tplEditId, setTplEditId] = useState<string | null>(null);
  const [tplEditName, setTplEditName] = useState('');
  const [tplEditQty, setTplEditQty] = useState('1');
  const [tplAddName, setTplAddName] = useState('');
  const [tplAddQty, setTplAddQty] = useState('1');
  const [showTplAdd, setShowTplAdd] = useState(false);

  const selectedBooking = bookings.find(b => b.id === selectedId);
  const items = getInventory(selectedId);

  const counts = {
    present: items.filter(i => i.status === 'present').length,
    missing: items.filter(i => i.status === 'missing').length,
    damaged: items.filter(i => i.status === 'damaged').length,
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleAdd = () => {
    if (!newName.trim()) return;
    const qty = parseInt(newQty, 10);
    addInventoryItem(selectedId, newName.trim(), isNaN(qty) || qty < 1 ? 1 : qty);
    setNewName('');
    setNewQty('1');
    setAddVisible(false);
  };

  // Template helpers
  const openTplEdit = (item: InventoryItem) => {
    setTplEditId(item.id);
    setTplEditName(item.name);
    setTplEditQty(String(item.quantity));
  };

  const saveTplEdit = () => {
    if (!tplEditId || !tplEditName.trim()) return;
    const qty = parseInt(tplEditQty, 10);
    updateTemplateItem(tplEditId, tplEditName.trim(), isNaN(qty) || qty < 1 ? 1 : qty);
    setTplEditId(null);
  };

  const handleTplAdd = () => {
    if (!tplAddName.trim()) return;
    const qty = parseInt(tplAddQty, 10);
    addTemplateItem(tplAddName.trim(), isNaN(qty) || qty < 1 ? 1 : qty);
    setTplAddName('');
    setTplAddQty('1');
    setShowTplAdd(false);
  };

  const handleTplDelete = (item: InventoryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove from Template', `Remove "${item.name}" from your default list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeTemplateItem(item.id) },
    ]);
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
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSub}>Track included items per booking</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setTemplateVisible(true); }}
              style={[styles.iconHeaderBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Ionicons name="list-outline" size={18} color="#fff" />
              <Text style={styles.iconHeaderBtnText}>Template</Text>
            </Pressable>
            <Pressable
              onPress={() => setAddVisible(true)}
              style={[styles.iconHeaderBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.iconHeaderBtnText}>Add Item</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: colors.success + '25' }]}>
            <Text style={[styles.statNum, { color: '#fff' }]}>{counts.present}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Present</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.destructive + '25' }]}>
            <Text style={[styles.statNum, { color: '#fff' }]}>{counts.missing}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Missing</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.warning + '25' }]}>
            <Text style={[styles.statNum, { color: '#fff' }]}>{counts.damaged}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Damaged</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Booking Selector */}
      <View style={[styles.selectorSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.selectorLabel, { color: colors.mutedForeground }]}>Booking</Text>
        <FlatList
          horizontal
          data={bookings}
          keyExtractor={b => b.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bookingSelector}
          renderItem={({ item }) => {
            const isActive = item.id === selectedId;
            return (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                style={[
                  styles.bookingChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.muted,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.chipText,
                  { color: isActive ? '#fff' : colors.foreground },
                ]} numberOfLines={1}>
                  {item.guestName}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {selectedBooking && (
        <View style={[styles.bookingMeta, { borderBottomColor: colors.border }]}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {selectedBooking.campground} · Lot {selectedBooking.lotNumber}
          </Text>
          <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {selectedBooking.rvName}
          </Text>
        </View>
      )}

      {/* Inventory List */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <InventoryItemRow
            item={item}
            onStatusChange={(status: ItemStatus) =>
              updateInventoryStatus(selectedId, item.id, status)
            }
            onEdit={(name, quantity) =>
              updateInventoryItem(selectedId, item.id, name, quantity)
            }
            onDelete={() => deleteInventoryItem(selectedId, item.id)}
          />
        )}
        ListHeaderComponent={
          <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
            {items.length} Items
          </Text>
        }
        ListEmptyComponent={
          <Pressable
            onPress={() => setAddVisible(true)}
            style={[styles.emptyBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No items — tap to add one</Text>
          </Pressable>
        }
      />

      {/* ── Add Item Modal ── */}
      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setAddVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Inventory Item</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Item Name</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Kayak Paddles"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              value={newQty}
              onChangeText={setNewQty}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setAddVisible(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAdd} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Template Editor Modal ── */}
      <Modal visible={templateVisible} transparent animationType="slide" onRequestClose={() => setTemplateVisible(false)}>
        <View style={[styles.tplSheet, { backgroundColor: colors.background }]}>
          {/* Sheet header */}
          <View style={[styles.tplHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <View>
              <Text style={[styles.tplTitle, { color: colors.foreground }]}>Default Item Template</Text>
              <Text style={[styles.tplSub, { color: colors.mutedForeground }]}>
                These items appear on every new booking
              </Text>
            </View>
            <Pressable onPress={() => { setTemplateVisible(false); setTplEditId(null); setShowTplAdd(false); }}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.tplList} showsVerticalScrollIndicator={false}>
            {inventoryTemplate.map(item => (
              <View key={item.id}>
                {tplEditId === item.id ? (
                  /* Inline edit row */
                  <View style={[styles.tplEditRow, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                    <TextInput
                      style={[styles.tplEditInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, flex: 1 }]}
                      value={tplEditName}
                      onChangeText={setTplEditName}
                      placeholder="Item name"
                      placeholderTextColor={colors.mutedForeground}
                      autoFocus
                    />
                    <TextInput
                      style={[styles.tplEditInput, styles.tplQtyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                      value={tplEditQty}
                      onChangeText={setTplEditQty}
                      keyboardType="number-pad"
                      placeholder="Qty"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <Pressable onPress={saveTplEdit} style={[styles.tplSaveBtn, { backgroundColor: colors.accent }]}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => setTplEditId(null)} style={[styles.tplSaveBtn, { backgroundColor: colors.muted }]}>
                      <Ionicons name="close" size={18} color={colors.foreground} />
                    </Pressable>
                  </View>
                ) : (
                  /* Normal row */
                  <View style={[styles.tplRow, { borderBottomColor: colors.border }]}>
                    <Ionicons name="reorder-two-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                    <Text style={[styles.tplItemName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.quantity > 1 && (
                      <Text style={[styles.tplItemQty, { color: colors.mutedForeground }]}>×{item.quantity}</Text>
                    )}
                    <Pressable onPress={() => openTplEdit(item)} hitSlop={8} style={styles.tplActionBtn}>
                      <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => handleTplDelete(item)} hitSlop={8} style={styles.tplActionBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {inventoryTemplate.length === 0 && (
              <Text style={[styles.tplEmpty, { color: colors.mutedForeground }]}>
                No default items yet — add some below
              </Text>
            )}

            {/* Add to template */}
            {showTplAdd ? (
              <View style={[styles.tplEditRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
                <TextInput
                  style={[styles.tplEditInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, flex: 1 }]}
                  value={tplAddName}
                  onChangeText={setTplAddName}
                  placeholder="New item name"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                />
                <TextInput
                  style={[styles.tplEditInput, styles.tplQtyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={tplAddQty}
                  onChangeText={setTplAddQty}
                  keyboardType="number-pad"
                  placeholder="Qty"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Pressable onPress={handleTplAdd} style={[styles.tplSaveBtn, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setShowTplAdd(false)} style={[styles.tplSaveBtn, { backgroundColor: colors.muted }]}>
                  <Ionicons name="close" size={18} color={colors.foreground} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowTplAdd(true); }}
                style={[styles.tplAddBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.tplAddBtnText, { color: colors.primary }]}>Add to Template</Text>
              </Pressable>
            )}

            <View style={[styles.tplNote, { backgroundColor: colors.muted, borderRadius: 12 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.tplNoteText, { color: colors.mutedForeground }]}>
                Changes here only affect new bookings. Items already added to a booking are edited per-booking using the pencil icon.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  iconHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
  },
  iconHeaderBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  selectorSection: { paddingVertical: 12, borderBottomWidth: 1 },
  selectorLabel: {
    fontSize: 11, fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 8,
  },
  bookingSelector: { paddingHorizontal: 12, gap: 8 },
  bookingChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, maxWidth: 160 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  bookingMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  metaDot: { width: 3, height: 3, borderRadius: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  listHeader: {
    fontSize: 12, fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5, textTransform: 'uppercase', paddingVertical: 12,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 20, borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 14, justifyContent: 'center', marginTop: 12,
  },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  // Add modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: { width: '100%', borderRadius: 20, padding: 24, gap: 8 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  fieldLabel: {
    fontSize: 12, fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4,
  },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 11, fontSize: 16, fontFamily: 'Inter_400Regular',
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Template sheet
  tplSheet: { flex: 1, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  tplHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tplTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  tplSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  tplList: { padding: 16, gap: 0, paddingBottom: 60 },
  tplRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  tplItemName: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  tplItemQty: { fontSize: 13, fontFamily: 'Inter_400Regular', marginRight: 4 },
  tplActionBtn: { padding: 6 },
  tplEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1.5, padding: 8, marginVertical: 4,
  },
  tplEditInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 14, fontFamily: 'Inter_400Regular',
  },
  tplQtyInput: { width: 56 },
  tplSaveBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tplEmpty: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 20 },
  tplAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 12, marginTop: 12,
  },
  tplAddBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  tplNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, marginTop: 20,
  },
  tplNoteText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
