import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

/**
 * jsdom no trae TextEncoder/TextDecoder y react-router 7 los usa al cargarse:
 * sin esto, cualquier suite que importe react-router-dom moría al requerirlo.
 */
if (typeof globalThis.TextEncoder === 'undefined') {
    (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
    (globalThis as any).TextDecoder = TextDecoder;
}

/**
 * `import.meta.env` de Vite no existe en Jest (compila a CommonJS). El
 * transformador de jest/viteEnvTransformer.cjs lo reescribe a esta variable,
 * así que acá viven los valores con los que corren las pruebas.
 */
(globalThis as any).__VITE_ENV__ = {
    ...process.env,
    // Fijos al final a propósito: MODE === 'test' es lo que evita que el store
    // de auth dispare `auth/me` al importarse en cada suite.
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false,
    BASE_URL: '/',
};
