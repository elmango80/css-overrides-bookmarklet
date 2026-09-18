import { describe, expect, it } from 'vitest';

import { createBookmarkHref, createBookmarksHtml } from '../scripts/build';

describe('bookmark export', () => {
  it('creates an encoded javascript URL', () => {
    const href = createBookmarkHref('(()=>{document.body.dataset.ready="yes"})()');

    expect(href).toMatch(/^javascript:/);
    expect(decodeURIComponent(href.slice('javascript:'.length))).toContain('dataset.ready');
  });

  it('creates a Netscape bookmark file', () => {
    const html = createBookmarksHtml('javascript:%28%29');

    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html).toContain('<A HREF="javascript:%28%29">CSS Overrides</A>');
  });
});
