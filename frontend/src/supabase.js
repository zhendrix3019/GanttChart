import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://skfxbdxyzcekgopcvdhw.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_94gBOcsQryz80k1XObYPGw_ELRAN_ZW'

export const supabase = createClient(supabaseUrl, supabaseKey)
