import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { scheduleAppVersionChecks } from './utils/appVersion'

// Clave inline — NO importar branding.ts aquí para evitar que BRAND se evalúe
// antes de que bootstrapBranding() resuelva el fetch y setee __VENDIFY_PUBLIC_BRAND__
const BRANDING_STORAGE_KEY = 'PUBLIC_BRANDING_CONFIG_VENDIFY'
type BrandConfig = { name?: string; favicon?: string; [key: string]: unknown }

// Marcas legacy que ya no existen (Vendify las reemplaza): se ignoran si el
// backend/caché las devuelve.
const esMarcaLegacy = (b: any): boolean =>
  ['falconext', 'krezka'].includes(String(b?.name ?? '').toLowerCase()) ||
  ['falconext', 'krezka'].includes(String(b?.key ?? '').toLowerCase())

// Los resellers white-label se resuelven en runtime por host vía el backend
// (/branding/public). No hay marcas hardcodeadas por host.
const getLocalWhiteLabelBrand = (_host: string): Partial<BrandConfig> | null => null

const inferDefaultBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001/api'
    }
    if (/^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
      return `http://${hostname}:4001/api`
    }
    // Hosts locales personalizados (ej. subdominios en /etc/hosts) usan backend local
    if (window.location.port === '5174' && hostname !== 'api.vendify.pe') {
      return 'http://localhost:4001/api'
    }
  }

  return import.meta.env.VITE_API_FALLBACK_URL || 'https://api.vendify.pe/api'
}

const applyBrandToDocument = (brand: Partial<BrandConfig>) => {
  if (typeof document === 'undefined') return
  if (brand.name) document.title = brand.name
  // Marca neutra: el favicon sale del brand resuelto (sin hardcodear dominios).
  const finalFavicon = brand.favicon
  if (!finalFavicon) return

  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (existing) {
    existing.href = finalFavicon
    return
  }

  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = finalFavicon
  document.head.appendChild(link)
}

const bootstrapBranding = async () => {
  if (typeof window === 'undefined') return
  if (String(import.meta.env.VITE_DISABLE_PUBLIC_BRANDING_FETCH || '').toLowerCase() === 'true') {
    // Marca principal Vendify. Los resellers white-label la sobreescriben en runtime.
    applyBrandToDocument({
      name: 'Vendify',
      favicon: '/svg/vendify.svg',
    })
    return
  }
  const host = window.location.host
  const hostStorageKey = `${BRANDING_STORAGE_KEY}:${host}`
  const localWhiteLabelBrand = getLocalWhiteLabelBrand(host)
  try {
    const baseUrl = inferDefaultBaseUrl()
    const resp = await fetch(`${baseUrl}/branding/public?host=${encodeURIComponent(host)}`)
    const data = await resp.json()
    let brand = data?.data || data
    if (localWhiteLabelBrand && brand && typeof brand === 'object' && !brand.isWhiteLabel) {
      brand = localWhiteLabelBrand
    }
    if (brand && typeof brand === 'object' && brand.name && !esMarcaLegacy(brand)) {
      ;(window as any).__VENDIFY_PUBLIC_BRAND__ = brand
      localStorage.setItem(hostStorageKey, JSON.stringify(brand))
      applyBrandToDocument(brand)
    }
  } catch {
    const cached = localStorage.getItem(hostStorageKey)
    if (cached) {
      try {
        const brand = JSON.parse(cached)
        if (localWhiteLabelBrand && brand && typeof brand === 'object' && !brand.isWhiteLabel) {
          throw new Error('Ignoring non white-label cache for custom host')
        }
        ;(window as any).__VENDIFY_PUBLIC_BRAND__ = brand
        applyBrandToDocument(brand)
        return
      } catch {
        // ignore malformed cache
      }
    }
    if (localWhiteLabelBrand?.name) {
      ;(window as any).__VENDIFY_PUBLIC_BRAND__ = localWhiteLabelBrand
      localStorage.setItem(hostStorageKey, JSON.stringify(localWhiteLabelBrand))
      applyBrandToDocument(localWhiteLabelBrand)
    }
  }
}

const start = async () => {
  scheduleAppVersionChecks()
  await bootstrapBranding()
  const { default: App } = await import('./App')

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
  )
}

void start()
