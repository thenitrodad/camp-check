import { createClient } from '@supabase/supabase-js';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, Inspection, InventoryItem } from '@/types';

const SUPABASE_URL = 'https://jtgfugikzitbxxjjfdfn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__ynRWcMXVbNcN0pjiHnrbA_4qz1jO5-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface SyncPayload {
  bookings: Booking[];
  inspections: Record<string, Inspection>;
  inventory: Record<string, InventoryItem[]>;
  updatedAt: string;
}

// Each device gets its own isolated row in Supabase.
// Android ID is stable across reinstalls (changes only on factory reset).
// Falls back to a UUID stored in AsyncStorage for edge cases.
const DEVICE_ID_KEY = '@campcheck_device_id';
let _rowId: string | null = null;

async function getRowId(): Promise<string> {
  if (_rowId) return _rowId;

  // Try Android device ID first (stable, no storage needed)
  const androidId = Application.getAndroidId?.();
  if (androidId) {
    _rowId = `device_${androidId}`;
    return _rowId;
  }

  // Fallback: UUID stored in AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      _rowId = stored;
      return _rowId;
    }
    // Generate a new UUID-like ID
    const newId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    _rowId = newId;
    return _rowId;
  } catch {
    _rowId = 'main'; // last resort
    return _rowId;
  }
}

export async function pushToCloud(payload: SyncPayload): Promise<void> {
  try {
    const rowId = await getRowId();
    const { error } = await supabase
      .from('campcheck_sync')
      .upsert({ id: rowId, data: payload, updated_at: payload.updatedAt });
    if (error) console.log('[Supabase] push error:', error.message);
  } catch {
    console.log('[Supabase] push failed (offline?)');
  }
}

export async function pullFromCloud(): Promise<SyncPayload | null> {
  try {
    const rowId = await getRowId();

    // Try device-specific row first
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', rowId)
      .single();

    if (!error && data) return data.data as SyncPayload;

    // Migration: if no device row yet, check the old 'main' row (owner's existing data)
    if (rowId !== 'main') {
      const { data: legacy } = await supabase
        .from('campcheck_sync')
        .select('data')
        .eq('id', 'main')
        .single();
      if (legacy?.data) {
        // Migrate: write it to this device's row going forward
        await supabase
          .from('campcheck_sync')
          .upsert({ id: rowId, data: legacy.data, updated_at: new Date().toISOString() });
        return legacy.data as SyncPayload;
      }
    }

    return null;
  } catch {
    console.log('[Supabase] pull failed (offline?)');
    return null;
  }
}
