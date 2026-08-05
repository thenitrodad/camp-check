import React, { useState } from 'react';
import {
  Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { ChecklistItem } from '@/types';

interface Props {
  item: ChecklistItem;
  onToggle: () => void;
  onPhotoCapture: (uri: string) => void;
  onNotesChange: (notes: string) => void;
}

export default function InspectionCheckItem({ item, onToggle, onPhotoCapture, onNotesChange }: Props) {
  const colors = useColors();
  const [showNotes, setShowNotes] = useState(!!item.notes);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
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

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.mainRow}>
        <Pressable onPress={handleToggle} style={styles.checkboxArea}>
          <View style={[
            styles.checkbox,
            {
              backgroundColor: item.checked ? colors.accent : 'transparent',
              borderColor: item.checked ? colors.accent : colors.border,
            },
          ]}>
            {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </Pressable>

        <Text
          style={[
            styles.label,
            {
              color: item.checked ? colors.mutedForeground : colors.foreground,
              textDecorationLine: item.checked ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {item.label}
        </Text>

        <View style={styles.actions}>
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
        </View>
      </View>

      {item.photoUri && (
        <Image source={{ uri: item.photoUri }} style={styles.photo} />
      )}

      {showNotes && (
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
  checkboxArea: {
    padding: 2,
  },
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 4,
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
