import { createClient } from '@supabase/supabase-js';
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

// ─── Recovery Key ────────────────────────────────────────────────────────────
// A short code the owner writes down once. Entering it on a new phone
// restores all their data from Supabase. Stored locally + used as the row ID.

const RECOVERY_KEY_STORAGE = '@campcheck_recovery_key';
let _recoveryKey: string | null = null;

function generateKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let key = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key; // e.g. "CAMP-7X2K"
}

/** Returns the owner's recovery key, generating one on first use. */
export async function getRecoveryKey(): Promise<string> {
  if (_recoveryKey) return _recoveryKey;

  const stored = await AsyncStorage.getItem(RECOVERY_KEY_STORAGE);
  if (stored) {
    _recoveryKey = stored;
    return _recoveryKey;
  }

  // First time: generate a new key and migrate any existing device data
  const newKey = generateKey();
  await AsyncStorage.setItem(RECOVERY_KEY_STORAGE, newKey);
  _recoveryKey = newKey;

  // Try to migrate old device-ID-based data to the new key
  await _migrateFromLegacyRow(newKey);

  return _recoveryKey;
}

/** Restore from a key the owner typed in. Returns the payload if found. */
export async function restoreFromKey(key: string): Promise<SyncPayload | null> {
  const normalized = key.trim().toUpperCase();
  try {
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', normalized)
      .single();
    if (error || !data) return null;
    // Save this key locally going forward
    await AsyncStorage.setItem(RECOVERY_KEY_STORAGE, normalized);
    _recoveryKey = normalized;
    return data.data as SyncPayload;
  } catch {
    return null;
  }
}

async function _migrateFromLegacyRow(newKey: string): Promise<void> {
  // Check old 'main' row (earliest version of the app)
  const legacyIds = ['main'];
  for (const legacyId of legacyIds) {
    try {
      const { data } = await supabase
        .from('campcheck_sync')
        .select('data')
        .eq('id', legacyId)
        .single();
      if (data?.data) {
        await supabase
          .from('campcheck_sync')
          .upsert({ id: newKey, data: data.data, updated_at: new Date().toISOString() });
        return;
      }
    } catch { /* ignore */ }
  }
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function pushToCloud(payload: SyncPayload): Promise<void> {
  try {
    const key = await getRecoveryKey();
    const { error } = await supabase
      .from('campcheck_sync')
      .upsert({ id: key, data: payload, updated_at: payload.updatedAt });
    if (error) console.log('[Supabase] push error:', error.message);
  } catch {
    console.log('[Supabase] push failed (offline?)');
  }
}

export async function pullFromCloud(): Promise<SyncPayload | null> {
  try {
    const key = await getRecoveryKey();
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', key)
      .single();
    if (!error && data) return data.data as SyncPayload;
    return null;
  } catch {
    console.log('[Supabase] pull failed (offline?)');
    return null;
  }
}
