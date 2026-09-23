import { createStorageKey, loadCss, saveCss } from './storage';
import { applyCss, probeStyleApplication, removeCss } from './styles';

export const ROOT_ID = 'css-overrides-bookmarklet-root';
const OPEN_EDITOR_EVENT = 'css-overrides-bookmarklet:open-editor';
const BLOCKED_STYLE_STATUS = 'No se pudieron aplicar las reglas CSS.';
const MIN_EDITOR_WIDTH = 320;

export interface BookmarkletRuntime {
  document: Document;
  location: Pick<Location, 'host'>;
  storage: Storage;
}

const editorStyles = `
  :host { all: initial; }
  .panel { box-sizing: border-box; position: fixed; z-index: 2147483647; top: 0; right: 0; display: flex; flex-direction: column; width: min(36rem, 100vw); height: 100vh; height: 100dvh; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 0; background: #fff; color: #0f172a; box-shadow: 0 .5rem 2rem #0003; font: 14px/1.4 system-ui, sans-serif; }
  [data-resize-handle] { position: absolute; top: 0; bottom: 0; left: -.25rem; width: .5rem; cursor: ew-resize; touch-action: none; }
  h2 { margin: 0; padding-right: 2.5rem; }
  textarea { box-sizing: border-box; display: block; flex: 1; width: 100%; min-height: 0; margin: .75rem 0; padding: .5rem; border: 1px solid #94a3b8; border-radius: .25rem; color: #0f172a; background: #fff; font: 13px/1.4 ui-monospace, monospace; resize: none; }
  button { padding: .45rem .7rem; border: 1px solid #64748b; border-radius: .25rem; background: #f8fafc; color: #0f172a; cursor: pointer; }
  .toggle { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; }
  .toggle input { margin: 0; }
  [data-close] { position: absolute; top: .75rem; right: .75rem; width: 2rem; height: 2rem; padding: 0; border: 0; background: transparent; font: 24px/1 system-ui, sans-serif; }
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
  let isEnabled = true;
  let editorWidth: number | undefined;

  const clearContent = (): void => {
    while (shadow.lastChild && shadow.lastChild !== style) shadow.lastChild.remove();
  };

  const renderIndicator = (): void => {
    clearContent();
    const indicator = pageDocument.createElement('button');
    indicator.type = 'button';
    indicator.dataset.indicator = 'true';
    indicator.textContent = isEnabled ? 'CSS activo' : 'CSS inactivo';
    indicator.setAttribute('aria-label', isEnabled ? 'Editar CSS activo' : 'Editar CSS inactivo');
    indicator.addEventListener('click', () => renderEditor());
    shadow.append(indicator);
  };

  const renderEditor = (status = ''): void => {
    clearContent();
    const panel = pageDocument.createElement('section');
    panel.className = 'panel';
    panel.dataset.editor = 'true';
    const viewportWidth = pageDocument.defaultView?.innerWidth;
    if (editorWidth !== undefined && viewportWidth) {
      editorWidth = Math.min(editorWidth, viewportWidth);
      panel.style.width = `${editorWidth}px`;
    }
    const resizeHandle = pageDocument.createElement('div');
    resizeHandle.dataset.resizeHandle = 'true';
    resizeHandle.setAttribute('aria-hidden', 'true');
    resizeHandle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      resizeHandle.setPointerCapture(event.pointerId);
    });
    resizeHandle.addEventListener('pointermove', (event) => {
      if (!resizeHandle.hasPointerCapture(event.pointerId)) return;
      const width = pageDocument.defaultView?.innerWidth;
      if (!width) return;
      editorWidth = Math.min(width, Math.max(MIN_EDITOR_WIDTH, width - event.clientX));
      panel.style.width = `${editorWidth}px`;
    });
    const heading = pageDocument.createElement('h2');
    heading.textContent = 'Sobrescrituras CSS';
    const textarea = pageDocument.createElement('textarea');
    textarea.value = currentCss;
    textarea.setAttribute('aria-label', 'Reglas CSS');
    const statusNode = pageDocument.createElement('p');
    statusNode.dataset.status = 'true';
    statusNode.textContent = status;
    const toggleLabel = pageDocument.createElement('label');
    toggleLabel.className = 'toggle';
    const toggle = pageDocument.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = isEnabled;
    toggle.dataset.enabledToggle = 'true';
    const toggleText = pageDocument.createElement('span');
    toggleText.textContent = 'Aplicar reglas';
    toggleLabel.append(toggle, toggleText);
    const save = pageDocument.createElement('button');
    save.type = 'button';
    save.dataset.save = 'true';
    save.textContent = isEnabled ? 'Guardar y aplicar' : 'Guardar';
    const close = pageDocument.createElement('button');
    close.type = 'button';
    close.dataset.close = 'true';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar editor');

    toggle.addEventListener('change', () => {
      isEnabled = toggle.checked;
      save.textContent = isEnabled ? 'Guardar y aplicar' : 'Guardar';
      statusNode.textContent = '';
      if (!isEnabled) {
        removeCss(pageDocument);
        return;
      }
      if (currentCss.trim()) {
        applyCss(pageDocument, currentCss);
        if (probeStyleApplication(pageDocument, host) === 'blocked') {
          statusNode.textContent = BLOCKED_STYLE_STATUS;
        }
      }
    });
    save.addEventListener('click', () => {
      const css = textarea.value;
      if (!css.trim()) {
        statusNode.textContent = 'Introduce alguna regla CSS.';
        return;
      }
      currentCss = css;
      if (isEnabled) applyCss(pageDocument, css);
      else removeCss(pageDocument);
      const saved = saveCss(storage, key, css);
      if (!saved.ok) {
        statusNode.textContent = saved.error ?? 'No se pudieron guardar las reglas.';
        return;
      }
      if (isEnabled && probeStyleApplication(pageDocument, host) === 'blocked') {
        statusNode.textContent = BLOCKED_STYLE_STATUS;
        return;
      }
      renderIndicator();
    });
    close.addEventListener('click', () => {
      if (currentCss.trim()) renderIndicator();
      else clearContent();
    });

    panel.append(resizeHandle, heading, textarea, statusNode, toggleLabel, save, close);
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
