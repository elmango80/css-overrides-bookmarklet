import { afterEach, describe, expect, it } from 'vitest';

import { OVERRIDE_STYLE_ID, applyCss, removeCss, verifyStyleApplication } from '../src/styles';

afterEach(() => {
  document.getElementById(OVERRIDE_STYLE_ID)?.remove();
  document.body.replaceChildren();
});

describe('CSS injection', () => {
  it('applies CSS to the current document', () => {
    const target = document.createElement('div');
    target.className = 'target';
    document.body.append(target);

    applyCss(document, '.target { display: none !important; }');

    expect(getComputedStyle(target).display).toBe('none');
  });

  it('updates one style element instead of duplicating it', () => {
    applyCss(document, '.target { color: red; }');
    applyCss(document, '.target { color: blue; }');

    expect(document.querySelectorAll(`#${OVERRIDE_STYLE_ID}`)).toHaveLength(1);
    expect(document.getElementById(OVERRIDE_STYLE_ID)?.textContent).toBe('.target { color: blue; }');
  });

  it('removes injected CSS', () => {
    applyCss(document, 'body { --removable-rule: active; }');

    removeCss(document);

    expect(document.getElementById(OVERRIDE_STYLE_ID)).toBeNull();
    expect(getComputedStyle(document.body).getPropertyValue('--removable-rule')).toBe('');
  });

  it('verifies that an injected style affected the document', () => {
    const host = document.createElement('div');
    host.id = 'css-overrides-bookmarklet-probe-target';
    document.body.append(host);

    expect(verifyStyleApplication(document, host)).toBe(true);
  });
});
