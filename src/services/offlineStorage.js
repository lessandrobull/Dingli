// offlineStorage.js - Armazenamento local persistente com IndexedDB nativo
const DB_NAME = "dingli_offline_db";
const DB_VERSION = 3;
const STORES = {
  TOPICS: "topics_cache",
  SENTENCES: "sentences_cache",
  AUDIOS: "audios_cache"
};

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.TOPICS)) {
        db.createObjectStore(STORES.TOPICS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.SENTENCES)) {
        db.createObjectStore(STORES.SENTENCES, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function salvarNoIndexedDB(storeName, key, dados) {
  try {
    const db = await abrirDB();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.put({ key, dados, atualizadoEm: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[offlineStorage] Falha ao salvar em ${storeName}:`, err);
  }
}

export async function obterDoIndexedDB(storeName, key) {
  try {
    const db = await abrirDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.dados : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[offlineStorage] Falha ao consultar ${storeName}:`, err);
    return null;
  }
}

export async function listarTopicosSalvos(nivel, idiomaEstudo) {
  try {
    const db = await abrirDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SENTENCES, "readonly");
      const store = tx.objectStore(STORES.SENTENCES);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const prefixo = `${nivel.toUpperCase()}_${idiomaEstudo}_`;
        const salvos = req.result
          .filter(k => typeof k === 'string' && k.startsWith(prefixo))
          .map(k => k.replace(prefixo, ""));
        resolve(salvos);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export { STORES };
