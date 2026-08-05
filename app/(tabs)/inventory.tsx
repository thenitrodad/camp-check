import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  } = useBookings();
  const [selectedId, setSelectedId] = useState(bookings[0]?.id ?? '');
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');

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
          <Pressable
            onPress={() => setAddVisible(true)}
            style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </Pressable>
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

      {/* Add Item Modal */}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  stat: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  selectorSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectorLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bookingSelector: {
    paddingHorizontal: 12,
    gap: 8,
  },
  bookingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 160,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listHeader: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingVertical: 12,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
