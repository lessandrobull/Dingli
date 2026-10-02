import { salvarNoIndexedDB, obterDoIndexedDB, removerDoIndexedDB, STORES } from './offlineStorage';

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
  const p = (palavra || "").trim().toLowerCase().replace(/ß/g, "ss");
  const semPontuacao = p
    .replace(/[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]/g, "")
    .replace(/['’]/g, "_");

  if (!semPontuacao) return "";

  const nfd = semPontuacao.normalize("NFD");
  const mapaDiacriticos = {
    "\u0300": "grave",
    "\u0301": "acute",
    "\u0302": "circ",
    "\u0303": "tilde",
    "\u0308": "uml",
    "\u0327": "ced",
    "\u0304": "macron",
    "\u030c": "caron"
  };

  const baseChars = [];
  const marcas = [];
  let ultimoCharBase = "";

  for (let i = 0; i < nfd.length; i++) {
    const char = nfd[i];
    if (mapaDiacriticos[char]) {
      marcas.push(`${ultimoCharBase || ""}_${mapaDiacriticos[char]}`);
    } else {
      if (!/[\u0300-\u036f]/.test(char)) {
        baseChars.push(char);
        ultimoCharBase = char;
      }
    }
  }

  const slugBase = baseChars.join("").replace(/[^a-zA-Z0-9_-]/g, "");
  if (marcas.length > 0) {
    return `${slugBase}_${marcas.join("_")}`;
  }
  return slugBase;
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
    if (!slug) return;
    const url = await obterAudioPalavraUrl(palavra, idioma);
    console.log("[Dìnglì Áudio]", { palavraOriginal: palavra, slugGerado: slug, urlFinal: url });

    const dispararFallbackTTS = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(palavra);
        const LANG_MAP = {
          pi: 'zh-CN', zh: 'zh-CN', pt: 'pt-BR', ge: 'de-DE',
          it: 'it-IT', fr: 'fr-FR', es: 'es-ES', en: 'en-US'
        };
        u.lang = LANG_MAP[idioma] || 'en-US';
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    };

    const audio = new Audio(url);
    let fallbackAcionado = false;

    audio.onerror = () => {
      if (!fallbackAcionado) {
        fallbackAcionado = true;
        dispararFallbackTTS();
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => console.log("[Dìnglì Áudio] ✔ Reprodução iniciada:", slug))
        .catch((e) => {
          if (e.name === "AbortError") return;
          if (!fallbackAcionado) {
            fallbackAcionado = true;
            dispararFallbackTTS();
          }
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

export function obterVozesPorIdioma(idioma) {
  const map = {
    zh: VOZES_ZH,
    pi: VOZES_PI,
    pt: VOZES_PT,
    ge: VOZES_GE,
    it: VOZES_IT,
    fr: VOZES_FR,
    es: VOZES_ES,
    en: VOZES_EN
  };
  return map[idioma] || VOZES_EN;
}

export async function expurgarAudiosDeIds(ids, idioma = "en") {
  if (!ids || ids.length === 0) return;
  const vozes = obterVozesPorIdioma(idioma);
  const temCaches = ("caches" in window);
  let cache = null;
  if (temCaches) {
    try { cache = await caches.open(CACHE_NAME); } catch (e) {}
  }

  for (const id of ids) {
    for (const voz of vozes) {
      const url = montarAudioUrl(id, voz, idioma);
      if (cache) {
        try {
          await cache.delete(url);
          await cache.delete(url, { ignoreSearch: true });
        } catch (e) {}
      }
      try {
        await removerDoIndexedDB(STORES.AUDIOS, url);
      } catch (e) {}
    }
  }
}

export async function baixarNovosAudiosComProgresso(ids, idioma = "en", onProgresso = null, vozesCustom = null) {
  if (!ids || ids.length === 0) {
    if (onProgresso) onProgresso({ concluidos: 0, total: 0, percentual: 100 });
    return;
  }

  const vozes = vozesCustom || obterVozesPorIdioma(idioma);
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

  const total = urlsParaBaixar.length;
  let concluidos = 0;

  if (total === 0) {
    if (onProgresso) onProgresso({ concluidos: 0, total: 0, percentual: 100 });
    return;
  }

  const LIMITE_CONCORRENCIA = 4;
  for (let i = 0; i < urlsParaBaixar.length; i += LIMITE_CONCORRENCIA) {
    const lote = urlsParaBaixar.slice(i, i + LIMITE_CONCORRENCIA);
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
          console.warn(`[audioCacheService] Falha ao baixar áudio na atualização: ${url}`);
        } finally {
          concluidos++;
          if (onProgresso) {
            const percentual = Math.round((concluidos / total) * 100);
            onProgresso({ concluidos, total, percentual });
          }
        }
      })
    );
  }
}

// ==========================================
// PRÉ-CARREGAMENTO E REPRODUÇÃO CONTROLADA DE PALAVRAS
// ==========================================
export async function precarregarPalavras(palavras, idioma = "en") {
  if (!palavras || !Array.isArray(palavras) || palavras.length === 0) return;
  const pastaIdioma = idioma === "pi" ? "zh" : idioma;
  const unicas = Array.from(new Set(
    palavras.map(p => sanitizarPalavraAudio(p)).filter(Boolean)
  ));
  if (unicas.length === 0) return;

  const temCaches = ("caches" in window);
  let cache = null;
  if (temCaches) {
    try { cache = await caches.open(CACHE_NAME); } catch (e) {}
  }

  const LIMITE = 4;
  for (let i = 0; i < unicas.length; i += LIMITE) {
    const lote = unicas.slice(i, i + LIMITE);
    await Promise.all(lote.map(async (slug) => {
      const url = `${SUPABASE_AUDIO_BASE}/palavras/${pastaIdioma}/${encodeURIComponent(slug)}.mp3`;
      try {
        if (cache) {
          const jaExiste = await cache.match(url);
          if (!jaExiste) {
            const resp = await fetch(url, { mode: "cors" });
            if (resp.ok) await cache.put(url, resp);
          }
        } else {
          const reg = await obterDoIndexedDB(STORES.AUDIOS, url);
          if (!reg) {
            const resp = await fetch(url, { mode: "cors" });
            if (resp.ok) {
              const blob = await resp.blob();
              await salvarNoIndexedDB(STORES.AUDIOS, url, { key: url, blob });
            }
          }
        }
      } catch (e) {}
    }));
  }
}

export function tocarAudioPalavraComControle(palavra, idioma = "en") {
  let audioInstance = null;
  let abortado = false;

  const promessa = new Promise((resolve) => {
    const slug = sanitizarPalavraAudio(palavra);
    if (!slug) {
      resolve({ duracao: 0.4, cancelado: false });
      return;
    }

    obterAudioPalavraUrl(palavra, idioma).then((url) => {
      if (abortado) {
        resolve({ duracao: 0, cancelado: true });
        return;
      }

      const audio = new Audio(url);
      audioInstance = audio;
      let inicio = 0;
      let resolvido = false;

      const finalizar = (dur) => {
        if (resolvido) return;
        resolvido = true;
        resolve({ duracao: dur, cancelado: false });
      };

      const dispararFallbackTTS = () => {
        if (abortado || resolvido) return;
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(palavra);
          const LANG_MAP = {
            pi: 'zh-CN', zh: 'zh-CN', pt: 'pt-BR', ge: 'de-DE',
            it: 'it-IT', fr: 'fr-FR', es: 'es-ES', en: 'en-US'
          };
          u.lang = LANG_MAP[idioma] || 'en-US';
          u.rate = 0.85;
          const t0 = Date.now();
          u.onend = () => {
            const dur = Math.max(0.4, (Date.now() - t0) / 1000);
            finalizar(dur);
          };
          u.onerror = () => {
            finalizar(0.4);
          };
          window.speechSynthesis.speak(u);
        } else {
          finalizar(0.4);
        }
      };

      audio.onplay = () => {
        inicio = Date.now();
      };

      audio.onended = () => {
        const dur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)
          ? audio.duration
          : (inicio ? (Date.now() - inicio) / 1000 : 0.4);
        finalizar(dur);
      };

      audio.onerror = () => {
        dispararFallbackTTS();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name === "AbortError" || abortado) {
            if (!resolvido) {
              resolvido = true;
              resolve({ duracao: 0, cancelado: true });
            }
            return;
          }
          dispararFallbackTTS();
        });
      }
    }).catch(() => {
      resolve({ duracao: 0.4, cancelado: false });
    });
  });

  const abortar = () => {
    abortado = true;
    if (audioInstance) {
      try {
        audioInstance.pause();
        audioInstance.src = "";
      } catch (e) {}
      audioInstance = null;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  };

  return { promessa, abortar };
}

export function tocarAudioPalavraMetronomo(palavra, idioma = "en", onSomComecou = null) {
  let audioInstance = null;
  let cancelado = false;
  let disparado = false;

  const dispararInicio = () => {
    if (disparado || cancelado) return;
    disparado = true;
    if (onSomComecou) {
      onSomComecou();
      onSomComecou = null;
    }
  };

  // Trava de segurança: se o navegador demorar mais de 350ms para decodificar, dispara o visual
  const timerSeguranca = setTimeout(() => {
    dispararInicio();
  }, 900);

  const promessa = new Promise(async (resolve) => {
    const slug = sanitizarPalavraAudio(palavra);
    if (!slug) {
      clearTimeout(timerSeguranca);
      dispararInicio();
      resolve({ cancelado: false });
      return;
    }

    try {
      const url = await obterAudioPalavraUrl(palavra, idioma);
      if (cancelado) {
        clearTimeout(timerSeguranca);
        resolve({ cancelado: true });
        return;
      }

      const audio = new Audio(url);
      audioInstance = audio;

      audio.onplaying = () => {
        clearTimeout(timerSeguranca);
        dispararInicio();
      };

      audio.onerror = () => {
        clearTimeout(timerSeguranca);
        if (cancelado) return;
        dispararInicio();
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(palavra);
          const LANG_MAP = {
            pi: 'zh-CN', zh: 'zh-CN', pt: 'pt-BR', ge: 'de-DE',
            it: 'it-IT', fr: 'fr-FR', es: 'es-ES', en: 'en-US'
          };
          u.lang = LANG_MAP[idioma] || 'en-US';
          u.rate = 0.85;
          window.speechSynthesis.speak(u);
        }
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch((e) => {
          if (e.name === "AbortError" || cancelado) return;
          audio.onerror();
        });
      }

      resolve({ audio, cancelado: false });
    } catch (err) {
      clearTimeout(timerSeguranca);
      dispararInicio();
      resolve({ cancelado: false });
    }
  });

  const abortar = () => {
    cancelado = true;
    clearTimeout(timerSeguranca);
    onSomComecou = null;
    if (audioInstance) {
      try {
        audioInstance.pause();
        audioInstance.currentTime = 0;
        audioInstance.src = "";
      } catch (e) {}
      audioInstance = null;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  };

  return { promessa, abortar };
}
