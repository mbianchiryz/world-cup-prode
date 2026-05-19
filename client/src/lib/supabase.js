import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://vswemrcilltarbetmlwu.supabase.co';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || 'sb_publishable_Rv96tWoHN6FkyL44noEEfQ_OGgFm5Js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
