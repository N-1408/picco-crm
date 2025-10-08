import { getSupabase } from './supabaseClient.js';
import { hashPassword } from '../utils/password.js';

const supabase = getSupabase();

export async function ensureSuperAdmin() {
  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('username', 'Admin')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const passwordHash = await hashPassword('Picco0000');
    const { error: insertError } = await supabase.from('admins').insert({
      username: 'Admin',
      password_hash: passwordHash
    });
    if (insertError) {
      throw insertError;
    }
  }
}
