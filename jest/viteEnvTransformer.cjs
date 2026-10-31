/**
 * Transformador de Jest que entiende `import.meta.env` de Vite.
 *
 * El código de la app lee la configuración con `import.meta.env.VITE_*`, que es
 * sintaxis de módulo ESM. Jest compila a CommonJS, así que al parsear cualquier
 * archivo que la use tiraba "Cannot use 'import.meta' outside a module" y la
 * suite entera ni arrancaba —no fallaba una prueba: no corría ninguna—. Pasaba
 * en todo lo que importa el store de auth.
 *
 * Se reescribe a `globalThis.__VITE_ENV__` antes de pasárselo a ts-jest; ese
 * objeto lo define src/setupTests.ts. Solo afecta a las pruebas: el build de
 * Vite sigue viendo `import.meta.env` tal cual.
 */
const { createTransformer } = require('ts-jest').default;

const tsJest = createTransformer({ tsconfig: 'tsconfig.json' });

const VITE_ENV = /import\.meta\.env/g;
const reescribir = (src) =>
  typeof src === 'string' && src.includes('import.meta.env')
    ? src.replace(VITE_ENV, 'globalThis.__VITE_ENV__')
    : src;

module.exports = {
  ...tsJest,
  process(src, filename, options) {
    return tsJest.process(reescribir(src), filename, options);
  },
  processAsync(src, filename, options) {
    return tsJest.processAsync(reescribir(src), filename, options);
  },
  getCacheKey(src, filename, options) {
    // La clave tiene que salir del texto ya reescrito: si no, un cambio en la
    // reescritura se serviría desde caché con el resultado viejo.
    return tsJest.getCacheKey
      ? tsJest.getCacheKey(reescribir(src), filename, options)
      : undefined;
  },
};
