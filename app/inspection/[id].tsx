import React, { useState } from 'react';
import {
  Alert, Pressable, SectionList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useBookings } from '@/context/BookingsContext';
import InspectionCheckItem from '@/components/InspectionCheckItem';

export default function InspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const {
    getBooking, getInspection,
    toggleChecklistItem, skipChecklistItem, updateItemPhoto, removeItemPhoto, updateItemNotes,
    completeInspection, inspectionProgress,
  } = useBookings();

  const booking = getBooking(id);
  const inspection = getInspection(id);
  const progress = inspectionProgress(id);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(inspection.sections.map(s => s.id))
  );
  const [globalNotes, setGlobalNotes] = useState(inspection.notes);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleComplete = () => {
    if (progress < 1) {
      Alert.alert(
        'Incomplete Checklist',
        `${Math.round((1 - progress) * 100)}% of items not yet checked. Complete the inspection anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete', style: 'default',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              completeInspection(id);
              Alert.alert('Inspection Complete', 'Report has been generated and saved.');
            },
          },
        ]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeInspection(id);
      Alert.alert('Inspection Complete', 'All items verified. Report has been saved.');
    }
  };

  const totalItems = inspection.sections.reduce((acc, s) => acc + s.items.filter(i => !i.skipped).length, 0);
  const checkedItems = inspection.sections.reduce((acc, s) => acc + s.items.filter(i => i.checked && !i.skipped).length, 0);

  const sectionData = inspection.sections.map(section => ({
    ...section,
    data: expandedSections.has(section.id) ? section.items : [],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Header */}
      <View style={[styles.progressHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressLabel, { color: colors.foreground }]}>
            {checkedItems} of {totalItems} items
          </Text>
          {booking && (
            <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
              {booking.guestName} · {booking.campground}
            </Text>
          )}
        </View>
        <Text style={[styles.progressPct, { color: colors.accent }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <View style={[styles.progressTrackWrap, { backgroundColor: colors.muted }]}>
        <View style={[
          styles.progressFill,
          {
            backgroundColor: progress === 1 ? colors.success : colors.accent,
            width: `${Math.round(progress * 100)}%` as `${number}%`,
          },
        ]} />
      </View>

      <SectionList
        sections={sectionData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          const activeItems = (inspection.sections.find(s => s.id === section.id)?.items ?? []).filter(i => !i.skipped);
          const sectionChecked = activeItems.filter(i => i.checked).length;
          const sectionTotal = activeItems.length;
          const isExpanded = expandedSections.has(section.id);
          const allDone = sectionTotal > 0 && sectionChecked === sectionTotal;

          return (
            <Pressable
              onPress={() => toggleSection(section.id)}
              style={[styles.sectionHeader, { backgroundColor: colors.background }]}
            >
              <View style={[
                styles.sectionIconWrap,
                { backgroundColor: allDone ? colors.success + '20' : colors.primary + '12' },
              ]}>
                <Ionicons
                  name={section.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={allDone ? colors.success : colors.primary}
                />
              </View>
              <View style={styles.sectionTitleWrap}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                  {sectionChecked}/{sectionTotal}
                </Text>
              </View>
              {allDone && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          );
        }}
        renderItem={({ item, section }) => (
          <View style={[styles.itemWrapper, { backgroundColor: colors.card }]}>
            <InspectionCheckItem
              item={item}
              onToggle={() => toggleChecklistItem(id, section.id, item.id)}
              onSkip={() => skipChecklistItem(id, section.id, item.id)}
              onPhotoCapture={uri => updateItemPhoto(id, section.id, item.id, uri)}
              onPhotoDelete={() => removeItemPhoto(id, section.id, item.id)}
              onNotesChange={notes => updateItemNotes(id, section.id, item.id, notes)}
            />
          </View>
        )}
        ListFooterComponent={
          <View style={[styles.footer, { backgroundColor: colors.card }]}>
            <Text style={[styles.footerTitle, { color: colors.foreground }]}>Inspection Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Add overall inspection notes..."
              placeholderTextColor={colors.mutedForeground}
              value={globalNotes}
              onChangeText={setGlobalNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        }
      />

      {/* Complete Button */}
      <View style={[styles.completeBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {inspection.status === 'completed' ? (
          <View style={[styles.completedBadge, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.completedText, { color: colors.success }]}>Inspection Completed</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.completeBtn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
            <Text style={styles.completeBtnText}>Complete & Sign Inspection</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  progressInfo: { gap: 2 },
  progressLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  progressSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  progressPct: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  progressTrackWrap: {
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionCount: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  itemWrapper: {
    marginHorizontal: 16,
    marginBottom: 1,
    paddingHorizontal: 16,
    borderRadius: 0,
  },
  footer: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 12,
  },
  footerTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  notesInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 90,
  },
  completeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  completedText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
