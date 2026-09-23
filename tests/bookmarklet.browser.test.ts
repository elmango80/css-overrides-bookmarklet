import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROOT_ID, runBookmarklet } from '../src/bookmarklet';
import { createStorageKey } from '../src/storage';
import { OVERRIDE_STYLE_ID } from '../src/styles';

function shadow(): ShadowRoot {
  const root = document.getElementById(ROOT_ID)?.shadowRoot;
  if (!root) throw new Error('Shadow root not found');
  return root;
}

function cleanup(): void {
  localStorage.clear();
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(OVERRIDE_STYLE_ID)?.remove();
  document.body.replaceChildren();
}

beforeEach(cleanup);
afterEach(cleanup);

describe('CSS overrides bookmarklet', () => {
  it('opens the editor when the page has no rules', () => {
    runBookmarklet();

    expect(document.getElementById(ROOT_ID)?.shadowRoot).not.toBeNull();
    expect(shadow().querySelector('[data-editor]')).not.toBeNull();
    expect(shadow().querySelector('[data-indicator]')).toBeNull();
  });

  it('saves, applies, and indicates CSS overrides', () => {
    const target = document.createElement('div');
    target.className = 'target';
    document.body.append(target);
    runBookmarklet();

    const textarea = shadow().querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '.target { display: none !important; }';
    (shadow().querySelector('[data-save]') as HTMLButtonElement).click();

    expect(getComputedStyle(target).display).toBe('none');
    expect(localStorage.getItem(createStorageKey(window.location))).toBe(textarea.value);
    expect(shadow().querySelector('[data-indicator]')?.textContent).toContain('CSS activo');
    expect(shadow().querySelector('[data-editor]')).toBeNull();
  });

  it('applies stored rules without opening the editor', () => {
    localStorage.setItem(createStorageKey(window.location), 'body { --saved-rule: active; }');

    runBookmarklet();

    expect(getComputedStyle(document.body).getPropertyValue('--saved-rule').trim()).toBe('active');
    expect(shadow().querySelector('[data-indicator]')).not.toBeNull();
    expect(shadow().querySelector('[data-editor]')).toBeNull();
  });

  it('opens the editor from the active indicator and replaces existing CSS', () => {
    localStorage.setItem(createStorageKey(window.location), 'body { --rule: first; }');
    runBookmarklet();

    (shadow().querySelector('[data-indicator]') as HTMLButtonElement).click();
    const textarea = shadow().querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('body { --rule: first; }');
    textarea.value = 'body { --rule: second; }';
    (shadow().querySelector('[data-save]') as HTMLButtonElement).click();

    expect(getComputedStyle(document.body).getPropertyValue('--rule').trim()).toBe('second');
    expect(document.querySelectorAll(`#${OVERRIDE_STYLE_ID}`)).toHaveLength(1);
  });

  it('does not create duplicate instances and opens the existing editor', () => {
    runBookmarklet();
    runBookmarklet();

    expect(document.querySelectorAll(`#${ROOT_ID}`)).toHaveLength(1);
    expect(shadow().querySelector('[data-editor]')).not.toBeNull();
  });

  it('rejects empty and whitespace-only CSS', () => {
    runBookmarklet();
    const root = shadow();
    const textarea = root.querySelector('textarea') as HTMLTextAreaElement;
    const save = root.querySelector('[data-save]') as HTMLButtonElement;

    textarea.value = ' \n\t ';
    save.click();

    expect(root.querySelector('[data-status]')?.textContent).toBe('Introduce alguna regla CSS.');
    expect(document.getElementById(OVERRIDE_STYLE_ID)).toBeNull();
    expect(root.querySelector('[data-editor]')).not.toBeNull();
  });

  it('applies CSS but keeps the editor open when storage fails', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage;
    runBookmarklet({ document, location: window.location, storage });

    const root = shadow();
    const textarea = root.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'body { --session-rule: active; }';
    (root.querySelector('[data-save]') as HTMLButtonElement).click();

    expect(getComputedStyle(document.body).getPropertyValue('--session-rule').trim()).toBe('active');
    expect(root.querySelector('[data-status]')?.textContent).toBe('No se pudieron guardar las reglas.');
    expect(root.querySelector('[data-editor]')).not.toBeNull();
  });

  it('disables applied rules immediately and saves without applying', () => {
    const key = createStorageKey(window.location);
    localStorage.setItem(key, 'body { --toggle-rule: active; }');
    runBookmarklet();
    (shadow().querySelector('[data-indicator]') as HTMLButtonElement).click();

    const toggle = shadow().querySelector('[data-enabled-toggle]') as HTMLInputElement;
    const save = shadow().querySelector('[data-save]') as HTMLButtonElement;
    const textarea = shadow().querySelector('textarea') as HTMLTextAreaElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));

    expect(document.getElementById(OVERRIDE_STYLE_ID)).toBeNull();
    expect(getComputedStyle(document.body).getPropertyValue('--toggle-rule')).toBe('');
    expect(save.textContent).toBe('Guardar');

    textarea.value = 'body { --toggle-rule: updated; }';
    save.click();

    expect(localStorage.getItem(key)).toBe(textarea.value);
    expect(document.getElementById(OVERRIDE_STYLE_ID)).toBeNull();
    expect(shadow().querySelector('[data-indicator]')?.textContent).toBe('CSS inactivo');

    (shadow().querySelector('[data-indicator]') as HTMLButtonElement).click();
    expect((shadow().querySelector('[data-enabled-toggle]') as HTMLInputElement).checked).toBe(false);
  });

  it('reapplies saved rules immediately when re-enabled', () => {
    localStorage.setItem(createStorageKey(window.location), 'body { --toggle-rule: active; }');
    runBookmarklet();
    (shadow().querySelector('[data-indicator]') as HTMLButtonElement).click();

    const toggle = shadow().querySelector('[data-enabled-toggle]') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));

    expect(getComputedStyle(document.body).getPropertyValue('--toggle-rule').trim()).toBe('active');
    expect((shadow().querySelector('[data-save]') as HTMLButtonElement).textContent).toBe('Guardar y aplicar');
  });

  it('closes only the editor and keeps applied CSS active', () => {
    localStorage.setItem(createStorageKey(window.location), 'body { --close-rule: active; }');
    runBookmarklet();
    (shadow().querySelector('[data-indicator]') as HTMLButtonElement).click();
    (shadow().querySelector('[data-close]') as HTMLButtonElement).click();

    expect(shadow().querySelector('[data-editor]')).toBeNull();
    expect(shadow().querySelector('[data-indicator]')).not.toBeNull();
    expect(getComputedStyle(document.body).getPropertyValue('--close-rule').trim()).toBe('active');
  });

  it('persists CSS across same-origin iframe reloads without applying it automatically', async () => {
    const createFrame = async (): Promise<HTMLIFrameElement> => {
      const frame = document.createElement('iframe');
      frame.srcdoc = '<!doctype html><html><body><div class="target"></div></body></html>';
      document.body.append(frame);
      await new Promise<void>((resolve) => frame.addEventListener('load', () => resolve(), { once: true }));
      return frame;
    };

    const firstFrame = await createFrame();
    const firstDocument = firstFrame.contentDocument as Document;
    const firstWindow = firstFrame.contentWindow as Window;
    runBookmarklet({
      document: firstDocument,
      location: firstWindow.location,
      storage: firstWindow.localStorage,
    });

    const css = '.target { --reload-rule: persisted; }';
    const firstRoot = firstDocument.getElementById(ROOT_ID) as HTMLDivElement;
    const firstTextarea = firstRoot.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
    firstTextarea.value = css;
    (firstRoot?.shadowRoot?.querySelector('[data-save]') as HTMLButtonElement).click();

    expect(firstDocument.getElementById(OVERRIDE_STYLE_ID)).not.toBeNull();
    expect(firstWindow.localStorage.getItem(createStorageKey(firstWindow.location))).toBe(css);

    firstFrame.srcdoc = '<!doctype html><html><body><div class="target"></div></body></html>';
    await new Promise<void>((resolve) => firstFrame.addEventListener('load', () => resolve(), { once: true }));
    const secondDocument = firstFrame.contentDocument as Document;
    const secondWindow = firstFrame.contentWindow as Window;

    expect(secondDocument).not.toBe(firstDocument);
    expect(secondDocument.getElementById(ROOT_ID)).toBeNull();
    expect(secondDocument.getElementById(OVERRIDE_STYLE_ID)).toBeNull();
    expect(secondWindow.localStorage.getItem(createStorageKey(secondWindow.location))).toBe(css);
    expect(getComputedStyle(secondDocument.querySelector('.target') as Element).getPropertyValue('--reload-rule')).toBe('');

    runBookmarklet({
      document: secondDocument,
      location: secondWindow.location,
      storage: secondWindow.localStorage,
    });

    expect(secondDocument.getElementById(OVERRIDE_STYLE_ID)).not.toBeNull();
    expect(getComputedStyle(secondDocument.querySelector('.target') as Element).getPropertyValue('--reload-rule').trim()).toBe('persisted');
  });

  it('shares stored rules across routes on the same host', () => {
    const accountOne = new URL('https://example.test/account?tab=one#summary');
    const accountTwo = new URL('https://example.test/account?tab=two');
    const settings = new URL('https://example.test/settings');

    runBookmarklet({ document, location: accountOne, storage: localStorage });
    const textarea = shadow().querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'body { --host-rule: shared; }';
    (shadow().querySelector('[data-save]') as HTMLButtonElement).click();

    expect(createStorageKey(accountOne)).toBe(createStorageKey(accountTwo));
    expect(createStorageKey(accountOne)).toBe(createStorageKey(settings));
    expect(localStorage.getItem(createStorageKey(accountTwo))).toBe(textarea.value);
    expect(localStorage.getItem(createStorageKey(settings))).toBe(textarea.value);
  });
});
