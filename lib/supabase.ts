import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, Inspection, InventoryItem } from '@/types';

const SUPABASE_URL = 'https://jtgfugikzitbxxjjfdfn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__ynRWcMXVbNcN0pjiHnrbA_4qz1jO5-';

// Persist the Supabase session in AsyncStorage so the owner stays logged in
// across app restarts and doesn't have to sign in every time.
// Realtime is disabled — CampCheck doesn't use live subscriptions, and the
// WebSocket connection can crash React Native during cold-start.
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

// ─── Auth ────────────────────────────────────────────────────────────────────
// Single-owner app: we use a fixed internal email so Supabase never sends
// any confirmation or rate-limit email. The user only ever sets/enters a password.
const OWNER_EMAIL = 'owner@campcheck.local';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Create the owner account (first launch). No email confirmation involved. */
export async function signUp(
  password: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email: OWNER_EMAIL, password });
  if (error) {
    // If the account already exists, fall through to sign-in
    if (error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists')) {
      return signIn(password);
    }
    return { error: error.message };
  }
  if (data.user) await _migrateToUid(data.user.id, 'main');
  return { error: null };
}

/** Sign in with the owner password. */
export async function signIn(
  password: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

async function _getUid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** On first sign-up, copy old email/main row into the new UID row so data isn't lost. */
async function _migrateToUid(uid: string, email: string): Promise<void> {
  for (const legacyId of [email, 'main']) {
    try {
      const { data } = await supabase
        .from('campcheck_sync')
        .select('data')
        .eq('id', legacyId)
        .single();
      if (data?.data) {
        await supabase.from('campcheck_sync').upsert({
          id: uid,
          data: data.data,
          updated_at: new Date().toISOString(),
        });
        return;
      }
    } catch { /* ignore */ }
  }
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function pushToCloud(payload: SyncPayload): Promise<void> {
  try {
    const uid = await _getUid();
    if (!uid) return; // not signed in yet
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
