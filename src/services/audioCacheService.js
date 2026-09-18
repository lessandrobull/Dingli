const SUPABASE_AUDIO_BASE = "https://lxdmfaxxxfyzbpzvniyi.supabase.co/storage/v1/object/public/audios";
const CACHE_NAME = "dingli-audios-v1";
export const VOZES_EN = ["v1", "v2", "v3", "v4", "v5", "v6"];
export const VOZES_ES = ["v1", "v2", "v3", "v4", "v5", "v6"];

/**
 * Monta a URL pública exata do arquivo no Supabase
 */
export function montarAudioUrl(id, voz = "v1", idioma = "en") {
  return `${SUPABASE_AUDIO_BASE}/${idioma}/${id}_${voz}.mp3`;
}

/**
 * Obtém a URL para reprodução imediata.
 * Se estiver no Cache Storage local, retorna um Blob URL (0ms).
 * Se ainda não foi cacheado, retorna a URL remota diretamente.
 */
export async function obterAudioUrl(id, voz = "v1", idioma = "en") {
  const urlRemota = montarAudioUrl(id, voz, idioma);

  if (!("caches" in window)) {
    return urlRemota;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const resposta = await cache.match(urlRemota);

    if (resposta) {
      const blob = await resposta.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn("[audioCacheService] Falha ao consultar cache local:", err);
  }

  return urlRemota;
}

/**
 * Baixa e armazena em cache todos os áudios de um lote de frases.
 * Executa em lotes concorrentes para não saturar a rede.
 * 
 * @param {Array} listaFrases - Array de objetos contendo { id } ou array de IDs numéricos.
 * @param {string} idioma - 'en' (padrão)
 * @param {Array} vozes - lista de vozes a pré-carregar (padrão: ['v1'])
 */
export async function precarregarAudios(listaFrases, idioma = "en", vozes = ["v1"]) {
  if (!("caches" in window) || !listaFrases || listaFrases.length === 0) return;

  const ids = listaFrases
    .map(f => (typeof f === "object" && f !== null ? f.id : f))
    .filter(id => id !== undefined && id !== null);

  if (ids.length === 0) return;

  try {
    const cache = await caches.open(CACHE_NAME);

    // Monta a lista de URLs que precisam ser baixadas
    const urlsParaBaixar = [];
    for (const id of ids) {
      for (const voz of vozes) {
        const url = montarAudioUrl(id, voz, idioma);
        urlsParaBaixar.push(url);
      }
    }

    // Filtra apenas o que ainda NÃO está no cache
    const urlsFaltantes = [];
    for (const url of urlsParaBaixar) {
      const jaExiste = await cache.match(url);
      if (!jaExiste) {
        urlsFaltantes.push(url);
      }
    }

    if (urlsFaltantes.length === 0) {
      return;
    }

    // Baixa em blocos de 6 requisições simultâneas
    const LIMITE_CONCORRENCIA = 6;
    for (let i = 0; i < urlsFaltantes.length; i += LIMITE_CONCORRENCIA) {
      const lote = urlsFaltantes.slice(i, i + LIMITE_CONCORRENCIA);
      await Promise.all(
        lote.map(async (url) => {
          try {
            const resp = await fetch(url, { mode: "cors" });
            if (resp.ok) {
              await cache.put(url, resp);
            }
          } catch (fetchErr) {
            console.warn(`[audioCacheService] Falha ao baixar áudio: ${url}`, fetchErr);
          }
        })
      );
    }
  } catch (err) {
    console.warn("[audioCacheService] Erro durante o pré-carregamento:", err);
  }
}
