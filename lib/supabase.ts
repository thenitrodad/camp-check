import { createClient } from '@supabase/supabase-js';
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

const ROW_ID = 'main';

export async function pushToCloud(payload: SyncPayload): Promise<void> {
  try {
    const { error } = await supabase
      .from('campcheck_sync')
      .upsert({ id: ROW_ID, data: payload, updated_at: payload.updatedAt });
    if (error) console.log('[Supabase] push error:', error.message);
  } catch (e) {
    console.log('[Supabase] push failed (offline?)');
  }
}

export async function pullFromCloud(): Promise<SyncPayload | null> {
  try {
    const { data, error } = await supabase
      .from('campcheck_sync')
      .select('data')
      .eq('id', ROW_ID)
      .single();
    if (error || !data) return null;
    return data.data as SyncPayload;
  } catch (e) {
    console.log('[Supabase] pull failed (offline?)');
    return null;
  }
}
