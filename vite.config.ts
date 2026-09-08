import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const appVersion =
  process.env.VITE_APP_VERSION ||
  process.env.COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  String(Date.now())

export default defineConfig(({ mode }) => {
  // loadEnv con prefijo '' lee también las variables SIN prefijo VITE_ de
  // .env.local (Vite solo expone las VITE_* al cliente, no a este archivo).
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [
    react(),
    {
      name: 'falconext-version-file',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({
            version: appVersion,
            builtAt: new Date().toISOString(),
          }),
        })
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5184,
    host: '0.0.0.0',
    open: 'http://localhost:5184/login',
    strictPort: true,
    // '.vendify.pe' permite cualquier subdominio de reseller white-label
    // (ej. losandes.vendify.pe) apuntado a 127.0.0.1 en /etc/hosts.
    allowedHosts: ['localhost', '.vendify.pe'],
    // Dev apuntando a la API de PRODUCCIÓN: el backend en prod bloquea los
    // orígenes localhost (main.ts -> `!isProduction && isLocalDevelopmentOrigin`),
    // así que el navegador recibía un 500 sin cabeceras CORS ("Network Error").
    // Proxyeando /api desde el propio dev server la petición sale del servidor
    // (sin cabecera Origin) y el backend la acepta como si fuera curl/Postman.
    // Se activa solo si defines DEV_API_PROXY_TARGET en .env.local.
    proxy: env.DEV_API_PROXY_TARGET
      ? {
          '/api': {
            target: env.DEV_API_PROXY_TARGET,
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                // Sin Origin el CORS del backend responde `callback(null, true)`.
                proxyReq.removeHeader('origin')
              })
            },
          },
        }
      : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['@monaco-editor/react'],
  },
  }
})
