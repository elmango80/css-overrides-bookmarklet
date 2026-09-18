export const OVERRIDE_STYLE_ID = 'css-overrides-bookmarklet-rules';

export function applyCss(document: Document, css: string): HTMLStyleElement {
  const existing = document.getElementById(OVERRIDE_STYLE_ID);
  const style = existing instanceof HTMLStyleElement ? existing : document.createElement('style');

  style.id = OVERRIDE_STYLE_ID;
  style.textContent = css;

  if (!style.isConnected) {
    (document.head ?? document.documentElement).append(style);
  }

  return style;
}
