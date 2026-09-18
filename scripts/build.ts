import { build } from 'esbuild';

type FileSystemPromises = {
  mkdir(path: URL, options: { recursive: boolean }): Promise<string | undefined>;
  writeFile(path: URL, data: string, encoding: 'utf8'): Promise<void>;
};

const loadFileSystemPromises = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<FileSystemPromises>;
const outputPath = new URL('../dist/css-overrides-bookmarks.html', import.meta.url);

export function createBookmarkHref(source: string): string {
  return `javascript:${encodeURIComponent(source)}`;
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createBookmarksHtml(href: string): string {
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>CSS Overrides Bookmarklet</TITLE>
<H1>CSS Overrides Bookmarklet</H1>
<DL><p>
  <DT><A HREF="${escapeHtmlAttribute(href)}">CSS Overrides</A>
</DL><p>
`;
}

export async function buildBookmarklet(): Promise<void> {
  const result = await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['chrome109', 'firefox115', 'safari16.4'],
  });
  const generatedSource = result.outputFiles[0]?.text;

  if (!generatedSource) {
    throw new Error('esbuild did not produce bookmarklet source');
  }

  new Function(generatedSource);

  const { mkdir, writeFile } = await loadFileSystemPromises('node:fs/promises');
  await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
  await writeFile(outputPath, createBookmarksHtml(createBookmarkHref(generatedSource)), 'utf8');
}

const processArgv = (globalThis as { process?: { argv?: string[] } }).process?.argv;
if (processArgv?.[1]?.endsWith('/scripts/build.ts')) {
  await buildBookmarklet();
}
