import { supabase } from './supabaseClient';

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
    return await supabase
      .from('sentences')
      .select(colTopicOrigem)
      .eq('level', nivel.toUpperCase())
      .not(idiomaEstudo, 'is', null)
      .order('id', { ascending: true });
  },

  getSentencesByTopic: async (nivel, idiomaEstudo, colTopicOrigem, nomeTopico) => {
    return await supabase
      .from('sentences')
      .select('*')
      .eq('level', nivel.toUpperCase())
      .eq(colTopicOrigem, nomeTopico)
      .not(idiomaEstudo, 'is', null)
      .order('id', { ascending: true });
  },

  getInspirationalQuotes: async () => {
    return await supabase
      .from('sentences')
      .select('inspirational')
      .not('inspirational', 'is', null);
  },

  // --- Progresso do Utilizador ---
  getUserProgress: async (userId, idiomaEstudo) => {
    return await supabase
      .from('user_progress')
      .select('maestria')
      .eq('user_id', userId)
      .eq('idioma', idiomaEstudo)
      .maybeSingle();
  },

  saveUserProgress: async (userId, idiomaEstudo, maestria) => {
    return await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        maestria: maestria,
        idioma: idiomaEstudo,
        updated_at: new Date()
      }, { onConflict: 'user_id,idioma' });
  }
};