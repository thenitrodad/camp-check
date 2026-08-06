import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, Inspection, InventoryItem } from '@/types';

const SUPABASE_URL = 'https://jtgfugikzitbxxjjfdfn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__ynRWcMXVbNcN0pjiHnrbA_4qz1jO5-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 0 },
  },
});

export interface SyncPayload {
  bookings: Booking[];
  inspections: Record<string, Inspection>;
  inventory: Record<string, InventoryItem[]>;
  updatedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Single-owner app — sign in anonymously on first launch, persist forever.
// No login screen, no email, no password. The session lives in AsyncStorage.

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Call once on app start. Signs in anonymously if no session exists. */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  await supabase.auth.signInAnonymously();
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

async function _getUid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function pushToCloud(payload: SyncPayload): Promise<void> {
  try {
    const uid = await _getUid();
    if (!uid) return;
    const { error } = await supabase
      .from('campcheck_sync')
      .upsert({ id: uid, data: payload, updated_at: payload.updatedAt });
    if (error) console.log('[Supabase] push error:', error.message);
  } catch {
    console.log('[Supabase] push failed (offline?)');
  }
}

export async function pullFromCloud(): Promise<SyncPayload | null> {
  try {
    const uid = await _getUid();
    if (!uid) return null;
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', uid)
      .single();
    if (!error && data) return data.data as SyncPayload;
    return null;
  } catch {
    console.log('[Supabase] pull failed (offline?)');
    return null;
  }
}
