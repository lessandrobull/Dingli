import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnkkrybmujzxnsvnpill.supabase.co'
const supabaseAnonKey = 'sb_publishable_aa_hhuqHJnJ-svRYUG3ddw_XtFGVP7O'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)