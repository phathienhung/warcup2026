import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Subscribe to realtime changes on a table
 * @param {string} table - Table name
 * @param {string} event - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {Function} callback - Handler function
 * @returns {Function} unsubscribe function
 */
export function subscribeToTable(table, event, callback) {
  if (!supabase) {
    console.warn('[Supabase] Not configured — skipping realtime subscription');
    return () => {};
  }

  const channel = supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event, schema: 'public', table }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to a specific filter on a table
 */
export function subscribeToFilter(table, event, filter, callback) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`${table}-${filter}`)
    .on('postgres_changes', { event, schema: 'public', table, filter }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export default supabase;
