import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bnicqfvvylswycdjkvpe.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hOtEwqcRtxa-EoutQSDnOQ_pqvjY8Bd';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
