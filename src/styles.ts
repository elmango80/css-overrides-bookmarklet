export const OVERRIDE_STYLE_ID = 'css-overrides-bookmarklet-rules';
export const PROBE_STYLE_ID = 'css-overrides-bookmarklet-application-probe';

const PROBE_PROPERTY = '--css-overrides-bookmarklet-probe';
const PROBE_VALUE = 'applied';

export type StyleApplicationResult = 'applied' | 'unverified' | 'blocked';

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

/**
 * Checks style application with a rule that is independent of user CSS.
 * This is deliberately best-effort: a missing browser API is not evidence of CSP blocking.
 */
export function probeStyleApplication(document: Document, host: HTMLElement): StyleApplicationResult {
  const view = document.defaultView;
  if (!view) return 'unverified';

  const existing = document.getElementById(PROBE_STYLE_ID);
  const probe = existing instanceof HTMLStyleElement ? existing : document.createElement('style');
  probe.id = PROBE_STYLE_ID;
  probe.textContent = `#${host.id} { ${PROBE_PROPERTY}: ${PROBE_VALUE} !important; }`;
  if (!probe.isConnected) (document.head ?? document.documentElement).append(probe);

  try {
    const value = view.getComputedStyle(host).getPropertyValue(PROBE_PROPERTY).trim();
    return value === PROBE_VALUE ? 'applied' : 'blocked';
  } catch {
    return 'unverified';
  }
}

export function verifyStyleApplication(document: Document, host: HTMLElement): boolean {
  return probeStyleApplication(document, host) === 'applied';
}
