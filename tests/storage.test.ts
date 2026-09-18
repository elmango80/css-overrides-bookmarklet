import { describe, expect, it } from 'vitest';

import { createStorageKey, loadCss, saveCss } from '../src/storage';

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('CSS override storage', () => {
  it('uses only the origin and pathname', () => {
    expect(createStorageKey(new URL('https://example.com/account?tab=one#summary'))).toBe(
      'css-overrides-bookmarklet:v1:https://example.com/account',
    );
  });

  it('keeps separate paths isolated', () => {
    expect(createStorageKey(new URL('https://example.com/account'))).not.toBe(
      createStorageKey(new URL('https://example.com/settings')),
    );
  });

  it('round-trips CSS', () => {
    const storage = new MemoryStorage();
    const result = saveCss(storage, 'key', '.hidden { display: none; }');

    expect(result).toEqual({ ok: true });
    expect(loadCss(storage, 'key')).toEqual({ css: '.hidden { display: none; }' });
  });

  it('reports unavailable storage', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage;

    expect(loadCss(storage, 'key')).toEqual({ css: '', error: 'No se pudo acceder al almacenamiento.' });
  });
});
