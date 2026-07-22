import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!url) console.error('VITE_SUPABASE_URL missing from .env');
if (!key) console.error('VITE_SUPABASE_ANON_KEY missing from .env');

export const supabase = createClient(url, key);
