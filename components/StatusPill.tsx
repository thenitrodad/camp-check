import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { InspectionStatus, PropaneStatus, TankStatus } from '@/types';

type Colors = ReturnType<typeof useColors>;

function getWaterConfig(status: TankStatus, colors: Colors) {
  switch (status) {
    case 'full': return { label: 'Filled', bg: colors.success, icon: 'water' as const };
    case 'half': return { label: '50%', bg: colors.info, icon: 'water' as const };
    case 'low': return { label: 'Low', bg: colors.warning, icon: 'water-outline' as const };
    case 'empty': return { label: 'Empty', bg: colors.destructive, icon: 'water-outline' as const };
  }
}

function getPropaneConfig(status: PropaneStatus, colors: Colors) {
  switch (status) {
    case 'full': return { label: 'Full', bg: colors.success, icon: 'flame' as const };
    case 'half': return { label: '50%', bg: colors.info, icon: 'flame' as const };
    case 'low': return { label: 'Low', bg: colors.warning, icon: 'flame-outline' as const };
    case 'empty': return { label: 'Empty', bg: colors.destructive, icon: 'flame-outline' as const };
  }
}

function getInspectionConfig(status: InspectionStatus, colors: Colors) {
  switch (status) {
    case 'completed': return { label: 'Inspected', bg: colors.success, icon: 'checkmark-circle' as const };
    case 'in_progress': return { label: 'In Progress', bg: colors.warning, icon: 'time' as const };
    case 'not_started': return { label: 'Pending', bg: colors.mutedForeground, icon: 'ellipse-outline' as const };
  }
}

interface WaterPillProps { status: TankStatus }
interface PropanePillProps { status: PropaneStatus }
interface InspectionPillProps { status: InspectionStatus }

function Pill({ label, bg, icon }: { label: string; bg: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={11} color="#fff" />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function WaterPill({ status }: WaterPillProps) {
  const colors = useColors();
  const config = getWaterConfig(status, colors);
  return <Pill {...config} />;
}

export function PropanePill({ status }: PropanePillProps) {
  const colors = useColors();
  const config = getPropaneConfig(status, colors);
  return <Pill {...config} />;
}

export function InspectionPill({ status }: InspectionPillProps) {
  const colors = useColors();
  const config = getInspectionConfig(status, colors);
  return <Pill {...config} />;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
