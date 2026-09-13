import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxdmfaxxxfyzbpzvniyi.supabase.co';
const supabaseKey = 'sb_publishable_iPykeIMk376fBXL0b-hGjA_FkvaDcVp';

export const supabase = createClient(supabaseUrl, supabaseKey);