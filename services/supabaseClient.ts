import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Helper to safely get env vars in various environments (Vite, Webpack, etc.)
const getEnvVar = (key: string): string | undefined => {
  // Check import.meta.env (Vite standard)
  try {
    // @ts-ignore - access import.meta safely to avoid TS errors in non-module contexts
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // ignore
  }

  // Check process.env (Node/Webpack standard)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // ignore
  }

  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');

// Check for Secret Key (Service Role) or Publishable Key (Anon) based on user preference
// Note: Exposing the Secret Key in a client-side app allows bypassing RLS policies.
const supabaseKey = 
  getEnvVar('VITE_SUPABASE_SECRET_KEY') || 
  getEnvVar('SUPABASE_SECRET_KEY') || 
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || 
  getEnvVar('SUPABASE_PUBLISHABLE_KEY') || 
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_ANON_KEY');

// Debug connection status (will show in browser console)
console.log('Supabase Connection Init:', {
  url: supabaseUrl ? 'Found' : 'Missing',
  key: supabaseKey ? (supabaseKey.length > 10 ? 'Found (masked)' : 'Short/Invalid') : 'Missing'
});

// Initialize strictly typed client
export const supabase: SupabaseClient<Database> | null = (supabaseUrl && supabaseKey) 
  ? createClient<Database>(supabaseUrl, supabaseKey) 
  : null;
