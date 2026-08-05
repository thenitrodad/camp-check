import React, { useState } from 'react';
import {
  Alert, Modal, Pressable, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { InventoryItem, ItemStatus } from '@/types';

interface Props {
  item: InventoryItem;
  onStatusChange: (status: ItemStatus) => void;
  onEdit: (name: string, quantity: number) => void;
  onDelete: () => void;
}

const STATUSES: { value: ItemStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'present', label: 'Present', icon: 'checkmark-circle' },
  { value: 'missing', label: 'Missing', icon: 'close-circle' },
  { value: 'damaged', label: 'Damaged', icon: 'warning' },
];

export default function InventoryItemRow({ item, onStatusChange, onEdit, onDelete }: Props) {
  const colors = useColors();
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(String(item.quantity));

  const statusColors: Record<ItemStatus, string> = {
    present: colors.success,
    missing: colors.destructive,
    damaged: colors.warning,
  };

  const handleSave = () => {
    const qty = parseInt(editQty, 10);
    if (!editName.trim()) return;
    onEdit(editName.trim(), isNaN(qty) || qty < 1 ? 1 : qty);
    setEditVisible(false);
  };

  const handleDeletePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Item', `Remove "${item.name}" from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const openEdit = () => {
    setEditName(item.name);
    setEditQty(String(item.quantity));
    setEditVisible(true);
  };

  return (
    <>
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
          {item.quantity > 1 && (
            <Text style={[styles.quantity, { color: colors.mutedForeground }]}>Qty: {item.quantity}</Text>
          )}
          <View style={styles.actions}>
            <Pressable onPress={openEdit} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            </Pressable>
            <Pressable onPress={handleDeletePress} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        </View>

        <View style={styles.statusButtons}>
          {STATUSES.map(s => {
            const isActive = item.status === s.value;
            const color = statusColors[s.value];
            return (
              <Pressable
                key={s.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onStatusChange(s.value);
                }}
                style={[
                  styles.statusBtn,
                  {
                    backgroundColor: isActive ? color + '20' : colors.muted,
                    borderColor: isActive ? color : 'transparent',
                  },
                ]}
              >
                <Ionicons name={s.icon} size={16} color={isActive ? color : colors.mutedForeground} />
                <Text style={[styles.statusLabel, { color: isActive ? color : colors.mutedForeground }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Edit Modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Item</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Item Name</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Item name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              value={editQty}
              onChangeText={setEditQty}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setEditVisible(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  quantity: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
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
