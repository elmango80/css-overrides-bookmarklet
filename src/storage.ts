const STORAGE_PREFIX = 'css-overrides-bookmarklet:v1:';

export interface LoadCssResult {
  css: string;
  error?: string;
}

export interface SaveCssResult {
  ok: boolean;
  error?: string;
}

export function createStorageKey(location: Pick<Location, 'host'>): string {
  return `${STORAGE_PREFIX}${location.host}`;
}

export function loadCss(storage: Storage, key: string): LoadCssResult {
  try {
    return { css: storage.getItem(key) ?? '' };
  } catch {
    return { css: '', error: 'No se pudo acceder al almacenamiento.' };
  }
}

export function saveCss(storage: Storage, key: string, css: string): SaveCssResult {
  try {
    storage.setItem(key, css);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudieron guardar las reglas.' };
  }
}
