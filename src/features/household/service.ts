import { requireSupabase, supabase } from '@/lib/supabase';
import { syncEngine } from '@/sync/engine';
import { normalizeDisplayName } from './membership';
import { enqueueLocalKitchenForPush, replaceLocalKitchen } from './localKitchen';
import { saveHouseholdState } from './state';
import type { HouseholdState } from '@/types';

interface HouseholdRpcResult {
  household_id: string;
  member_id: string;
  display_name: string;
  join_token: string;
  action: string;
}

async function ensureAnonymousSession(): Promise<void> {
  const client = requireSupabase();
  const { data, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message);
  }
  if (data.session) return;

  const { error } = await client.auth.signInAnonymously();
  if (error) {
    throw new Error(
      error.message.includes('Anonymous sign-ins are disabled')
        ? 'Anonimna prijava nije uključena na serveru.'
        : error.message
    );
  }
}

function parseRpcResult(data: unknown): HouseholdRpcResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Server nije vratio podatke o porodici.');
  }
  const row = data as Record<string, unknown>;
  const householdId = String(row.household_id ?? '');
  const memberId = String(row.member_id ?? '');
  const displayName = String(row.display_name ?? '');
  const joinToken = String(row.join_token ?? '');
  if (!householdId || !memberId || !joinToken || !displayName) {
    throw new Error('Server nije vratio podatke o porodici.');
  }
  return {
    household_id: householdId,
    member_id: memberId,
    display_name: displayName,
    join_token: joinToken,
    action: String(row.action ?? ''),
  };
}

function mapRpcError(message: string): Error {
  if (message.includes('Name required')) return new Error('Unesi ime.');
  if (message.includes('Invalid token')) return new Error('QR kod nije važeći.');
  if (message.includes('Not authenticated')) {
    return new Error('Nije uspela prijava. Pokušaj ponovo.');
  }
  return new Error(message);
}

async function persistRpcResult(result: HouseholdRpcResult): Promise<HouseholdState> {
  return saveHouseholdState({
    householdId: result.household_id,
    memberId: result.member_id,
    displayName: result.display_name,
    joinToken: result.join_token,
  });
}

export async function createHousehold(name: string): Promise<HouseholdState> {
  if (!supabase) {
    throw new Error('Supabase nije podešen. Porodica zahteva vezu sa serverom.');
  }

  const displayName = normalizeDisplayName(name);
  if (!displayName) {
    throw new Error('Unesi ime.');
  }

  await ensureAnonymousSession();
  const { data, error } = await requireSupabase().rpc('create_household', {
    p_name: displayName,
  });
  if (error) throw mapRpcError(error.message);

  const state = await persistRpcResult(parseRpcResult(data));

  await enqueueLocalKitchenForPush();
  await syncEngine.sync();
  return state;
}

export async function joinHousehold(token: string, name: string): Promise<HouseholdState> {
  if (!supabase) {
    throw new Error('Supabase nije podešen. Porodica zahteva vezu sa serverom.');
  }

  const displayName = normalizeDisplayName(name);
  if (!displayName) {
    throw new Error('Unesi ime.');
  }

  await ensureAnonymousSession();
  const { data, error } = await requireSupabase().rpc('join_household', {
    p_token: token,
    p_name: displayName,
  });
  if (error) throw mapRpcError(error.message);

  const state = await persistRpcResult(parseRpcResult(data));
  await replaceLocalKitchen();
  await syncEngine.pull();
  return state;
}
