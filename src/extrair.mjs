import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxdmfaxxxfyzbpzvniyi.supabase.co';
const supabaseKey = 'sb_publishable_iPykeIMk376fBXL0b-hGjA_FkvaDcVp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function buscar() {
    const { data, error } = await supabase
        .from('sentences')
        .select('id, fr, pt')
        .eq('level', 'A1')
        .eq('topic_pt', 'Saudações e Socialização')
        .order('id', { ascending: true });

    if (error) {
        console.error('Erro na consulta:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

buscar();