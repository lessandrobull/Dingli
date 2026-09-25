import { salvarNoIndexedDB, obterDoIndexedDB, STORES } from './offlineStorage';

const SUPABASE_AUDIO_BASE = "https://lxdmfaxxxfyzbpzvniyi.supabase.co/storage/v1/object/public/audios";
const CACHE_NAME = "dingli-audios-v1";
export const VOZES_EN = ["v1", "v2", "v3", "v4", "v5", "v6"];
export const VOZES_ES = ["v1", "v2", "v3", "v4", "v5", "v6"];
export const VOZES_FR = ["v1", "v2", "v3", "v4"];
export const VOZES_IT = ["v1", "v2", "v3", "v4"];
export const VOZES_GE = ["v1", "v2", "v3", "v4"];
export const VOZES_PT = ["v1", "v2", "v3", "v4"];
export const VOZES_ZH = ["v1", "v2", "v3", "v4"];
export const VOZES_PI = VOZES_ZH;

// TABELA CENTRAL DE VERSÕES DE ÁUDIO (Cache Busting silencioso)
export const VERSOES_AUDIOS = {
  "35": 2,      // Frase 35 atualizada com dicção humana em todos os idiomas
  "fr/9_v3": 2, // Frase 9 em francês (voz v3 Charline) corrigida no Audacity
  "519": 2,     // Frase 519 (24h/24 -> vingt-quatre heures sur vingt-quatre)
  "1117": 2     // Frase 1117 (24h/24 -> vingt-quatre heures sur vingt-quatre)
};

export function montarAudioUrl(id, voz = "v1", idioma = "en") {
  const pastaIdioma = idioma === "pi" ? "zh" : idioma;
  const chaveVoz = `${pastaIdioma}/${id}_${voz}`;
  const versao = VERSOES_AUDIOS[chaveVoz] || VERSOES_AUDIOS[String(id)] || null;
  const sufixo = versao ? `?v=${versao}` : "";
  return `${SUPABASE_AUDIO_BASE}/${pastaIdioma}/${id}_${voz}.mp3${sufixo}`;
}

export async function obterAudioUrl(id, voz = "v1", idioma = "en") {
  const urlRemota = montarAudioUrl(id, voz, idioma);

  // 1. Tenta Cache Storage (PC / HTTPS)
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const resposta = await cache.match(urlRemota);
      if (resposta) {
        const blob = await resposta.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {}
  }

  // 2. Fallback IndexedDB (Celular / HTTP Local)
  try {
    const registro = await obterDoIndexedDB(STORES.AUDIOS, urlRemota);
    if (registro && registro.blob) {
      return URL.createObjectURL(registro.blob);
    }
  } catch (err) {}

  return urlRemota;
}

// ==========================================
// SUPORTE A PALAVRAS ISOLADAS (ETAPA 3 & 4)
// ==========================================
export function sanitizarPalavraAudio(palavra) {
  return (palavra || "")
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]/g, "")
    .replace(/['’]/g, "_");
}

export function montarAudioPalavraUrl(palavra, idioma = "en") {
  const pastaIdioma = idioma === "pi" ? "zh" : idioma;
  const slug = sanitizarPalavraAudio(palavra);
  return `${SUPABASE_AUDIO_BASE}/palavras/${pastaIdioma}/${encodeURIComponent(slug)}.mp3`;
}

export async function obterAudioPalavraUrl(palavra, idioma = "en") {
  const urlRemota = montarAudioPalavraUrl(palavra, idioma);

  // 1. Tenta Cache Storage (PC / HTTPS)
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const resposta = await cache.match(urlRemota);
      if (resposta) {
        const blob = await resposta.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {}
  }

  // 2. Fallback IndexedDB (Celular / HTTP Local)
  try {
    const registro = await obterDoIndexedDB(STORES.AUDIOS, urlRemota);
    if (registro && registro.blob) {
      return URL.createObjectURL(registro.blob);
    }
  } catch (err) {}

  return urlRemota;
}

export async function tocarAudioPalavra(palavra, idioma = "en") {
  try {
    const slug = sanitizarPalavraAudio(palavra);
    const url = await obterAudioPalavraUrl(palavra, idioma);
    console.log("[Dìnglì Áudio]", { palavraOriginal: palavra, slugGerado: slug, urlFinal: url });
    if (!slug) return;
    const audio = new Audio(url);
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => console.log("[Dìnglì Áudio] ✔ Reprodução iniciada:", slug))
        .catch(e => {
          console.error("[Dìnglì Áudio] ✖ Falha ao reproduzir áudio:", e.message, "URL:", url);
        });
    }
  } catch (err) {
    console.error("[Dìnglì Áudio] ✖ Erro geral:", err);
  }
}

export async function precarregarAudios(listaFrases, idioma = "en", vozes = ["v1"]) {
  if (!listaFrases || listaFrases.length === 0) return;

  const ids = listaFrases
    .map(f => (typeof f === "object" && f !== null ? f.id : f))
    .filter(id => id !== undefined && id !== null);

  if (ids.length === 0) return;

  try {
    const temCaches = ("caches" in window);
    let cache = null;
    if (temCaches) {
      try { cache = await caches.open(CACHE_NAME); } catch (e) {}
    }

    const urlsParaBaixar = [];
    for (const id of ids) {
      for (const voz of vozes) {
        urlsParaBaixar.push(montarAudioUrl(id, voz, idioma));
      }
    }

    const urlsFaltantes = [];
    for (const url of urlsParaBaixar) {
      if (cache) {
        const jaExiste = await cache.match(url);
        if (!jaExiste) urlsFaltantes.push(url);
      } else {
        const dadoLocal = await obterDoIndexedDB(STORES.AUDIOS, url);
        if (!dadoLocal) urlsFaltantes.push(url);
      }
    }

    if (urlsFaltantes.length === 0) return;

    const LIMITE_CONCORRENCIA = 4;
    for (let i = 0; i < urlsFaltantes.length; i += LIMITE_CONCORRENCIA) {
      const lote = urlsFaltantes.slice(i, i + LIMITE_CONCORRENCIA);
      await Promise.all(
        lote.map(async (url) => {
          try {
            const resp = await fetch(url, { mode: "cors" });
            if (resp.ok) {
              if (cache) {
                await cache.put(url, resp);
              } else {
                const blob = await resp.blob();
                await salvarNoIndexedDB(STORES.AUDIOS, url, { key: url, blob: blob });
              }
            }
          } catch (fetchErr) {
            console.warn(`[audioCacheService] Falha ao baixar áudio: ${url}`);
          }
        })
      );
    }
  } catch (err) {
    console.warn("[audioCacheService] Erro durante o pré-carregamento:", err);
  }
}