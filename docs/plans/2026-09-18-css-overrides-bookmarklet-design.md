# Diseño de CSS Overrides Bookmarklet

## Objetivo

Crear un bookmarklet autocontenido que permita guardar y aplicar reglas CSS temporales a una página concreta. Las reglas se asociarán al origen y la ruta de la página, sin tener en cuenta los parámetros de consulta ni el fragmento de la URL.

El proyecto será independiente y estará ubicado en `/Users/n857521/code/elmango80/css-overrides-bookmarklet`.

## Alcance funcional

Al ejecutar el bookmarklet:

- Se construirá un identificador a partir de `location.origin + location.pathname`.
- Se buscarán reglas CSS guardadas para ese identificador en `localStorage`.
- Si existen reglas, se aplicarán inmediatamente y se mostrará un indicador visual con el texto `CSS activo`.
- Si no existen reglas, se abrirá un editor para introducirlas.
- El botón `Guardar y aplicar` almacenará las reglas y las aplicará en la página actual.
- Al pulsar el indicador se abrirá el editor con las reglas existentes.
- Si el bookmarklet ya está activo, una nueva ejecución no duplicará estilos, elementos ni listeners; abrirá o enfocará el editor existente.
- Recargar la página eliminará los estilos inyectados, pero conservará las reglas almacenadas.
- No habrá un control para desactivar temporalmente la sobrescritura en la primera versión. La restauración se realizará recargando la página.

## Interfaz

La herramienta tendrá dos estados visuales:

### Editor

El editor incluirá:

- Un área de texto para CSS libre.
- Un botón `Guardar y aplicar`.
- Un botón `Cerrar` que no modificará los estilos aplicados.
- Un área de estado para mostrar errores o confirmaciones.

No se permitirá guardar contenido vacío.

### Indicador

Cuando las reglas estén aplicadas, se mostrará un indicador fijo y discreto con el texto `CSS activo`. Será un botón y abrirá el editor al pulsarlo.

El indicador y el editor tendrán nombres accesibles básicos. Las pruebas automatizadas específicas de navegación por teclado y cierre con `Escape` quedan fuera del alcance inicial.

## Arquitectura

La solución no utilizará React ni ningún otro framework de interfaz. Estará implementada con TypeScript y APIs nativas del navegador.

### Punto de entrada

Una función autoejecutable coordinará:

- La detección de una instancia activa.
- La obtención de reglas guardadas.
- La aplicación de estilos.
- La creación o apertura de la interfaz.

### Almacenamiento

Un adaptador sobre `localStorage` será responsable de:

- Construir una clave versionada para el origen y la ruta actuales.
- Leer las reglas guardadas.
- Guardar cambios.
- Informar de errores de disponibilidad o cuota.

Debido al modelo de seguridad del navegador, el almacenamiento permanecerá aislado por origen.

### Gestor de estilos

El gestor de estilos:

- Creará un único elemento `style` identificado mediante un nombre prefijado.
- Sustituirá su contenido cuando se actualicen las reglas.
- Evitará inyecciones duplicadas.
- Intentará detectar si una política CSP impide aplicar el CSS.

### Interfaz aislada

El editor y el indicador se alojarán en un Shadow DOM. Esto evitará que los estilos de la página deformen la herramienta y que las reglas introducidas afecten accidentalmente a su interfaz.

### Estado activo

La instancia activa quedará identificada en el documento. Las ejecuciones posteriores reutilizarán esa instancia en vez de crear otra.

## Seguridad y privacidad

- El bookmarklet será autocontenido.
- No cargará scripts externos.
- No realizará peticiones de red por iniciativa propia.
- No enviará reglas ni contenido de la página fuera del navegador.
- El CSS escrito por el usuario podrá cargar recursos si contiene construcciones como `url(...)` o `@import`.
- Los identificadores de la herramienta estarán prefijados para minimizar colisiones con la aplicación inspeccionada.

## Compatibilidad

La primera versión será compatible con versiones actuales de:

- Chrome.
- Edge.
- Firefox.
- Safari.

No se utilizarán React, módulos cargados en tiempo de ejecución, imports dinámicos ni APIs experimentales. Las páginas con políticas CSP restrictivas podrán bloquear la ejecución del bookmarklet o la inyección de estilos; la herramienta mostrará un aviso cuando sea posible detectarlo.

## Proyecto y herramientas

El proyecto utilizará:

- pnpm para la gestión de dependencias y scripts.
- TypeScript para el código fuente.
- Vitest para pruebas unitarias y de DOM.
- Vitest Browser Mode con Playwright como proveedor para pruebas en navegadores reales.
- Git como repositorio independiente.

Estructura prevista:

```text
css-overrides-bookmarklet/
├── docs/plans/
├── src/
│   └── bookmarklet.ts
├── tests/
│   ├── bookmarklet.test.ts
│   └── bookmarklet.browser.test.ts
├── scripts/
│   └── build.ts
├── dist/
│   └── css-overrides-bookmarks.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vitest.config.ts
```

## Construcción y distribución

El comando de construcción generará `dist/css-overrides-bookmarks.html`.

La salida usará el formato Netscape Bookmark File compatible con la importación de marcadores de los navegadores:

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL>
  <DT><A HREF="javascript:...">CSS Overrides</A></DT>
</DL>
```

El generador:

- Transpilará el TypeScript a JavaScript compatible.
- Eliminará comentarios cuando corresponda.
- Construirá una URL que empiece por `javascript:`.
- Codificará y escapará el contenido para insertarlo de forma segura en el atributo `HREF`.
- Generará el archivo HTML importable.
- Comprobará que el JavaScript generado se pueda analizar antes de escribir la salida.

## Gestión de errores

- Si `localStorage` no está disponible, las reglas podrán aplicarse durante la sesión, pero el editor indicará que no se han podido guardar.
- No se guardará CSS vacío.
- El CSS se entregará al parser nativo del navegador; las reglas inválidas podrán ser ignoradas parcial o totalmente por el navegador.
- Si se detecta un bloqueo por CSP, el editor mostrará un aviso.
- Una ejecución repetida no duplicará la instancia.

## Estrategia de pruebas

### Pruebas unitarias y de DOM

Se comprobará:

- La construcción de la clave a partir del origen y la ruta.
- La exclusión de parámetros de consulta y fragmentos.
- La lectura y escritura en `localStorage`.
- La generación y actualización del elemento `style`.
- La prevención de instancias duplicadas.
- La generación y el escape correcto del HTML de marcadores.

### Pruebas en navegador

Vitest Browser Mode comprobará en Chromium, Firefox y WebKit:

- Sin reglas guardadas aparece el editor.
- Guardar almacena y aplica el CSS.
- Con reglas guardadas, el CSS se aplica directamente.
- El indicador `CSS activo` aparece y abre el editor.
- Actualizar las reglas sustituye el CSS anterior.
- Recargar elimina la sobrescritura activa.
- Volver a ejecutar el marcador después de recargar recupera las reglas.
- La interfaz permanece aislada mediante Shadow DOM.

## Criterios de aceptación

La primera versión se considerará terminada cuando:

- El archivo HTML generado pueda importarse como marcador.
- El bookmarklet aplique reglas diferentes por origen y ruta.
- Los parámetros de consulta y fragmentos no alteren la selección de reglas.
- Sin configuración previa se abra el editor.
- Guardar persista y aplique las reglas.
- Con configuración previa las reglas se apliquen directamente.
- El indicador visual muestre que la sobrescritura está activa y permita editarla.
- Recargar la página elimine los estilos inyectados.
- Las pruebas definidas superen su ejecución en Chromium, Firefox y WebKit.
