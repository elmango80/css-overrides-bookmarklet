import { createStorageKey, loadCss, saveCss } from './storage';
import { applyCss, probeStyleApplication } from './styles';

export const ROOT_ID = 'css-overrides-bookmarklet-root';
const OPEN_EDITOR_EVENT = 'css-overrides-bookmarklet:open-editor';
const BLOCKED_STYLE_STATUS = 'No se pudieron aplicar las reglas CSS.';

export interface BookmarkletRuntime {
  document: Document;
  location: Pick<Location, 'origin' | 'pathname'>;
  storage: Storage;
}

const editorStyles = `
  :host { all: initial; }
  .panel { position: fixed; z-index: 2147483647; top: 1rem; right: 1rem; width: min(28rem, calc(100vw - 2rem)); padding: 1rem; border: 1px solid #cbd5e1; border-radius: .5rem; background: #fff; color: #0f172a; box-shadow: 0 .5rem 2rem #0003; font: 14px/1.4 system-ui, sans-serif; }
  textarea { box-sizing: border-box; display: block; width: 100%; min-height: 12rem; margin: .75rem 0; padding: .5rem; border: 1px solid #94a3b8; border-radius: .25rem; color: #0f172a; background: #fff; font: 13px/1.4 ui-monospace, monospace; resize: vertical; }
  button { padding: .45rem .7rem; border: 1px solid #64748b; border-radius: .25rem; background: #f8fafc; color: #0f172a; cursor: pointer; }
  button + button { margin-left: .5rem; }
  [data-indicator] { position: fixed; z-index: 2147483647; right: 1rem; bottom: 1rem; padding: .5rem .75rem; border: 1px solid #64748b; border-radius: 999px; background: #fff; color: #0f172a; box-shadow: 0 .25rem 1rem #0003; font: 14px/1.2 system-ui, sans-serif; cursor: pointer; }
  [data-status] { min-height: 1.4em; color: #b91c1c; }
`;

export function runBookmarklet(runtime?: Partial<BookmarkletRuntime>): void {
  const pageDocument = runtime?.document ?? window.document;
  const pageLocation = runtime?.location ?? window.location;
  const storage = runtime?.storage ?? window.localStorage;
  const existing = pageDocument.getElementById(ROOT_ID);

  if (existing) {
    existing.dispatchEvent(new Event(OPEN_EDITOR_EVENT));
    return;
  }

  const host = pageDocument.createElement('div');
  host.id = ROOT_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = pageDocument.createElement('style');
  style.textContent = editorStyles;
  shadow.append(style);
  (pageDocument.body ?? pageDocument.documentElement).append(host);

  const key = createStorageKey(pageLocation);
  const loaded = loadCss(storage, key);
  let currentCss = loaded.css;

  const clearContent = (): void => {
    while (shadow.lastChild && shadow.lastChild !== style) shadow.lastChild.remove();
  };

  const renderIndicator = (): void => {
    clearContent();
    const indicator = pageDocument.createElement('button');
    indicator.type = 'button';
    indicator.dataset.indicator = 'true';
    indicator.textContent = 'CSS activo';
    indicator.setAttribute('aria-label', 'Editar CSS activo');
    indicator.addEventListener('click', () => renderEditor());
    shadow.append(indicator);
  };

  const renderEditor = (status = ''): void => {
    clearContent();
    const panel = pageDocument.createElement('section');
    panel.className = 'panel';
    panel.dataset.editor = 'true';
    const heading = pageDocument.createElement('h2');
    heading.textContent = 'Sobrescrituras CSS';
    const textarea = pageDocument.createElement('textarea');
    textarea.value = currentCss;
    textarea.setAttribute('aria-label', 'Reglas CSS');
    const statusNode = pageDocument.createElement('p');
    statusNode.dataset.status = 'true';
    statusNode.textContent = status;
    const save = pageDocument.createElement('button');
    save.type = 'button';
    save.dataset.save = 'true';
    save.textContent = 'Guardar y aplicar';
    const close = pageDocument.createElement('button');
    close.type = 'button';
    close.dataset.close = 'true';
    close.textContent = 'Cerrar';

    save.addEventListener('click', () => {
      const css = textarea.value;
      if (!css.trim()) {
        statusNode.textContent = 'Introduce alguna regla CSS.';
        return;
      }
      currentCss = css;
      applyCss(pageDocument, css);
      const saved = saveCss(storage, key, css);
      if (!saved.ok) {
        statusNode.textContent = saved.error ?? 'No se pudieron guardar las reglas.';
        return;
      }
      if (probeStyleApplication(pageDocument, host) === 'blocked') {
        statusNode.textContent = BLOCKED_STYLE_STATUS;
        return;
      }
      renderIndicator();
    });
    close.addEventListener('click', () => {
      if (currentCss.trim()) renderIndicator();
      else clearContent();
    });

    panel.append(heading, textarea, statusNode, save, close);
    shadow.append(panel);
  };

  host.addEventListener(OPEN_EDITOR_EVENT, () => renderEditor());

  if (currentCss.trim()) {
    applyCss(pageDocument, currentCss);
    if (probeStyleApplication(pageDocument, host) === 'blocked') {
      renderEditor(BLOCKED_STYLE_STATUS);
    } else {
      renderIndicator();
    }
  } else {
    renderEditor(loaded.error ?? '');
  }
}
