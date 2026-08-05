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

// ─── Owner Email ─────────────────────────────────────────────────────────────
// The owner's email is used as the Supabase row ID.
// New phone → install app → enter email → data restored automatically.

const EMAIL_KEY = '@campcheck_owner_email';
let _email: string | null = null;

/** Returns the stored email, or null if not set yet. */
export async function getOwnerEmail(): Promise<string | null> {
  if (_email) return _email;
  const stored = await AsyncStorage.getItem(EMAIL_KEY);
  if (stored) { _email = stored; return _email; }
  return null;
}

/** Save the owner's email and use it as the sync row going forward. */
export async function setOwnerEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await AsyncStorage.setItem(EMAIL_KEY, normalized);
  _email = normalized;

  // Migrate old data from legacy 'main' row if this is a first-time setup
  await _migrateFromLegacyRow(normalized);
}

/** Switch to a different email (restore on new phone). Returns the payload if found. */
export async function switchToEmail(email: string): Promise<SyncPayload | null> {
  const normalized = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', normalized)
      .single();
    if (error || !data) return null;
    await AsyncStorage.setItem(EMAIL_KEY, normalized);
    _email = normalized;
    return data.data as SyncPayload;
  } catch {
    return null;
  }
}

async function _migrateFromLegacyRow(newId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', 'main')
      .single();
    if (data?.data) {
      await supabase
        .from('campcheck_sync')
        .upsert({ id: newId, data: data.data, updated_at: new Date().toISOString() });
    }
  } catch { /* ignore */ }
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function pushToCloud(payload: SyncPayload): Promise<void> {
  try {
    const email = await getOwnerEmail();
    if (!email) return; // don't sync until email is set
    const { error } = await supabase
      .from('campcheck_sync')
      .upsert({ id: email, data: payload, updated_at: payload.updatedAt });
    if (error) console.log('[Supabase] push error:', error.message);
  } catch {
    console.log('[Supabase] push failed (offline?)');
  }
}

export async function pullFromCloud(): Promise<SyncPayload | null> {
  try {
    const email = await getOwnerEmail();
    if (!email) return null;
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', email)
      .single();
    if (!error && data) return data.data as SyncPayload;
    return null;
  } catch {
    console.log('[Supabase] pull failed (offline?)');
    return null;
  }
}
