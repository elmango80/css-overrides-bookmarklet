<div align="center">

# CSS Overrides Bookmarklet

Un bookmarklet autocontenido para guardar, aplicar y desactivar reglas CSS personalizadas en cualquier sitio web.

[Características](#características) · [Instalación](#instalación) · [Uso](#uso) · [Desarrollo](#desarrollo)

</div>

## Características

- Guarda las reglas CSS en `localStorage`, separadas por `location.host`.
- Comparte la misma configuración entre todas las rutas del mismo host.
- Aplica las reglas sin instalar extensiones ni cargar scripts externos.
- Aísla el editor de los estilos de la página mediante Shadow DOM.
- Permite activar o desactivar temporalmente el override.
- Muestra el estado actual mediante los indicadores `CSS activo` y `CSS inactivo`.
- Incluye un editor de altura completa y ancho redimensionable.
- Evita duplicar la interfaz y el elemento `<style>` al ejecutar el bookmarklet varias veces.
- Intenta detectar bloqueos de inyección de estilos provocados por políticas CSP.

## Instalación

### Requisitos

- Node.js 22 o superior.
- pnpm 12.3.4.

### Generar el archivo de marcadores

```bash
git clone https://github.com/elmango80/css-overrides-bookmarklet.git
cd css-overrides-bookmarklet
pnpm install
pnpm build
```

El build genera el archivo importable:

```text
dist/css-overrides-bookmarks.html
```

### Importar el bookmarklet

1. Abre el administrador de marcadores de tu navegador.
2. Selecciona la opción para importar marcadores desde un archivo HTML.
3. Importa `dist/css-overrides-bookmarks.html`.
4. Busca el marcador **CSS Overrides** en los marcadores importados.

> [!NOTE]
> El directorio `dist/` no se incluye en el repositorio. Ejecuta `pnpm build` para generar el archivo antes de importarlo.

## Uso

1. Abre la página que quieres personalizar.
2. Ejecuta el marcador **CSS Overrides**.
3. Introduce las reglas CSS en el editor.
4. Mantén activado **Aplicar reglas** y pulsa **Guardar y aplicar**.

Cuando existen reglas guardadas, las siguientes ejecuciones del bookmarklet las aplican directamente y muestran el indicador `CSS activo`. Pulsa el indicador para volver a abrir el editor.

### Activar y desactivar reglas

- Al desactivar **Aplicar reglas**, el CSS inyectado se retira inmediatamente.
- Con el override desactivado, el botón cambia a **Guardar**: las reglas se conservan, pero no se aplican.
- Al volver a activar el toggle, se aplican las reglas actuales, ya sean cargadas desde `localStorage` o guardadas durante la sesión.
- El estado del toggle no persiste después de recargar la página; las reglas guardadas sí persisten.

### Redimensionar y cerrar el editor

- Arrastra el borde izquierdo para cambiar el ancho del editor.
- El ancho se conserva mientras la instancia del bookmarklet siga activa.
- Pulsa la `×` para cerrar el editor sin retirar las reglas aplicadas.
- Recargar la página elimina los estilos inyectados. Vuelve a ejecutar el bookmarklet para recuperarlos desde `localStorage`.

## Almacenamiento y alcance

Las reglas se guardan con una clave basada exclusivamente en `location.host`:

```text
css-overrides-bookmarklet:v1:<host>
```

Esto significa que:

- `/account`, `/settings` y cualquier otra ruta del mismo host comparten reglas.
- Los parámetros de consulta y fragmentos no crean configuraciones diferentes.
- Los subdominios y puertos distintos mantienen configuraciones separadas.

## Seguridad y limitaciones

- El bookmarklet es autocontenido y no realiza peticiones de red por iniciativa propia.
- Las reglas permanecen en el `localStorage` del origen actual.
- El CSS introducido puede realizar peticiones si incluye `url(...)` o `@import`.
- Una política CSP restrictiva puede bloquear la ejecución del bookmarklet o la inyección de estilos.
- La detección de bloqueo CSP es best-effort; no valida la sintaxis completa del CSS.
- Si `localStorage` no está disponible, las reglas pueden aplicarse durante la sesión, pero no persistirse.

## Desarrollo

Instala las dependencias y los navegadores utilizados por las pruebas:

```bash
pnpm install
pnpm exec playwright install chromium firefox webkit
```

Comandos disponibles:

| Comando | Descripción |
| --- | --- |
| `pnpm build` | Genera el bookmarklet importable en `dist/`. |
| `pnpm typecheck` | Comprueba los tipos con TypeScript. |
| `pnpm test` | Ejecuta el build y las pruebas unitarias. |
| `pnpm test:browser` | Ejecuta las pruebas en Chromium, Firefox y WebKit. |
| `pnpm test:all` | Ejecuta typecheck, pruebas unitarias y pruebas de navegador. |
| `pnpm check` | Ejecuta todas las verificaciones y regenera el build. |

## Arquitectura

El proyecto usa TypeScript y APIs nativas del navegador, sin frameworks de interfaz:

- `src/bookmarklet.ts`: coordina el editor, el indicador y el estado de la sesión.
- `src/storage.ts`: genera la clave por host y gestiona la persistencia.
- `src/styles.ts`: aplica, retira y verifica los estilos inyectados.
- `src/index.ts`: punto de entrada del bookmarklet.
- `scripts/build.ts`: empaqueta el runtime con esbuild y genera el archivo HTML importable.
- `tests/`: pruebas unitarias y pruebas en navegadores reales con Vitest y Playwright.

```text
src/          Runtime del bookmarklet
scripts/      Generador del archivo importable
tests/        Pruebas unitarias y de navegador
dist/         Artefactos generados localmente
```

## Compatibilidad

El build apunta como mínimo a:

- Chrome 109.
- Firefox 115.
- Safari 16.4.

Edge actual también es compatible al compartir el motor Chromium.
