import React, { useState } from 'react';
import {
  Alert, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { ChecklistItem } from '@/types';

interface Props {
  item: ChecklistItem;
  onToggle: () => void;
  onSkip: () => void;
  onPhotoCapture: (uri: string) => void;
  onPhotoDelete: () => void;
  onNotesChange: (notes: string) => void;
}

export default function InspectionCheckItem({ item, onToggle, onSkip, onPhotoCapture, onPhotoDelete, onNotesChange }: Props) {
  const colors = useColors();
  const [showNotes, setShowNotes] = useState(!!item.notes);

  const handleToggle = () => {
    if (item.skipped) return; // can't check a skipped item
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const handlePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      onPhotoCapture(result.assets[0].uri);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert('Remove Photo', 'Delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPhotoDelete(); },
      },
    ]);
  };

  const isSkipped = item.skipped;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.mainRow}>
        {/* Checkbox */}
        <Pressable onPress={handleToggle} style={styles.checkboxArea} disabled={isSkipped}>
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isSkipped ? colors.muted : item.checked ? colors.accent : 'transparent',
              borderColor: isSkipped ? colors.border : item.checked ? colors.accent : colors.border,
            },
          ]}>
            {isSkipped
              ? <Ionicons name="remove" size={14} color={colors.mutedForeground} />
              : item.checked && <Ionicons name="checkmark" size={14} color="#fff" />
            }
          </View>
        </Pressable>

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: isSkipped ? colors.mutedForeground : item.checked ? colors.mutedForeground : colors.foreground,
              textDecorationLine: item.checked && !isSkipped ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {item.label}
          {isSkipped && <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular' }}> · N/A</Text>}
        </Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!isSkipped && (
            <>
              <Pressable onPress={() => setShowNotes(v => !v)} style={styles.actionBtn}>
                <Ionicons
                  name={showNotes ? 'chatbubble' : 'chatbubble-outline'}
                  size={18}
                  color={showNotes ? colors.primary : colors.mutedForeground}
                />
              </Pressable>
              <Pressable onPress={handlePhoto} style={styles.actionBtn}>
                <Ionicons
                  name={item.photoUri ? 'camera' : 'camera-outline'}
                  size={18}
                  color={item.photoUri ? colors.accent : colors.mutedForeground}
                />
              </Pressable>
            </>
          )}
          {/* Skip / Unskip */}
          <Pressable onPress={handleSkip} style={styles.actionBtn} hitSlop={6}>
            <Ionicons
              name={isSkipped ? 'refresh-outline' : 'close-circle-outline'}
              size={18}
              color={isSkipped ? colors.accent : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      {/* Photo */}
      {item.photoUri && !isSkipped && (
        <View style={styles.photoWrap}>
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
          <Pressable onPress={handleDeletePhoto} style={[styles.deletePhotoBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Notes */}
      {showNotes && !isSkipped && (
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Add notes..."
          placeholderTextColor={colors.mutedForeground}
          value={item.notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxArea: { padding: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 4 },
  photoWrap: { position: 'relative' },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 4,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
