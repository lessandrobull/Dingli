import { supabase } from './supabaseClient';
import { salvarNoIndexedDB, obterDoIndexedDB, STORES } from './services/offlineStorage';

export const dataService = {
  // --- Autenticação ---
  onAuthChange: (callback) => {
    return supabase.auth.onAuthStateChanged(callback);
  },

  signInAnonymously: async () => {
    return await supabase.auth.signInAnonymously();
  },

  // --- Sentenças e Tópicos ---
  getTopicsByLevel: async (nivel, idiomaOrigem, idiomaEstudo) => {
    const colTopicOrigem = `topic_${idiomaOrigem}`;
    const cacheKey = `${nivel.toUpperCase()}_${idiomaOrigem}_${idiomaEstudo}`;

    try {
      const resposta = await supabase
        .from('sentences')
        .select(`id, ${colTopicOrigem}`)
        .eq('level', nivel.toUpperCase())
        .not(idiomaEstudo, 'is', null)
        .order('id', { ascending: true });

      if (resposta && resposta.data && resposta.data.length > 0) {
        await salvarNoIndexedDB(STORES.TOPICS, cacheKey, resposta.data);
        return resposta;
      }
      throw new Error("Sem dados na nuvem");
    } catch (err) {
      console.warn("[dataService] Rede indisponível para tópicos. Consultando cache local offline...");
      const dadosLocais = await obterDoIndexedDB(STORES.TOPICS, cacheKey);
      if (dadosLocais) {
        return { data: dadosLocais, error: null };
      }
      return { data: null, error: err };
    }
  },

  getSentencesByTopic: async (nivel, idiomaEstudo, colTopicOrigem, nomeTopico) => {
    const cacheKey = `${nivel.toUpperCase()}_${idiomaEstudo}_${nomeTopico}`;

    try {
      const resposta = await supabase
        .from('sentences')
        .select('*')
        .eq('level', nivel.toUpperCase())
        .eq(colTopicOrigem, nomeTopico)
        .not(idiomaEstudo, 'is', null)
        .order('id', { ascending: true });

      if (resposta && resposta.data && resposta.data.length > 0) {
        await salvarNoIndexedDB(STORES.SENTENCES, cacheKey, resposta.data);
        return resposta;
      }
      throw new Error("Sem dados na nuvem");
    } catch (err) {
      console.warn(`[dataService] Rede indisponível para '${nomeTopico}'. Consultando cache local offline...`);
      const dadosLocais = await obterDoIndexedDB(STORES.SENTENCES, cacheKey);
      if (dadosLocais) {
        return { data: dadosLocais, error: null };
      }
      return { data: null, error: err };
    }
  },

  getInspirationalQuotes: async () => {
    try {
      return await supabase
        .from('sentences')
        .select('inspirational')
        .not('inspirational', 'is', null);
    } catch (err) {
      return { data: [], error: err };
    }
  },

  // --- Progresso do Utilizador ---
  getUserProgress: async (userId, idiomaEstudo) => {
    try {
      return await supabase
        .from('user_progress')
        .select('maestria')
        .eq('user_id', userId)
        .eq('idioma', idiomaEstudo)
        .maybeSingle();
    } catch (err) {
      return { data: null, error: err };
    }
  },

  saveUserProgress: async (userId, idiomaEstudo, maestria) => {
    try {
      return await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          maestria: maestria,
          idioma: idiomaEstudo,
          updated_at: new Date()
        }, { onConflict: 'user_id,idioma' });
    } catch (err) {
      console.warn("[dataService] Falha ao sincronizar progresso na nuvem. Mantido no storage local:", err);
      return { data: null, error: err };
    }
  }
};
