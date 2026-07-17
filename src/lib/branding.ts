export type BrandConfig = {
  key?: string;
  authBrand?: string;
  isWhiteLabel?: boolean;
  name: string;
  legalName: string;
  website: string;
  email: string;
  phone: string;
  whatsapp: string;
  logo: string;
  logoWhite: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  socials: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  dashboardUrl: string;
};

// Namespace versionado: al cambiar de marca (→ Vendify) se invalidan las
// cachés viejas de branding en localStorage automáticamente.
const LOCAL_STORAGE_KEY = 'PUBLIC_BRANDING_CONFIG_VENDIFY';

// ─── MARCA PRINCIPAL: VENDIFY ────────────────────────────────────────────────
// Marca flagship de la plataforma. Los resellers white-label sobreescriben esto
// en runtime vía /branding/public (ver bootstrapBranding en main.tsx).
const BRAND_NAME = 'Vendify';
const BRAND_PRIMARY = '#4F46E5';
const BRAND_SECONDARY = '#312E81';
const BRAND_LOGO = '/svg/vendify.svg';
// ─────────────────────────────────────────────────────────────────────────────

const staticBrands: Record<string, BrandConfig> = {
  default: {
    key: 'default',
    isWhiteLabel: true,
    name: BRAND_NAME,
    legalName: 'Vendify',
    website: 'https://vendify.pe',
    email: 'hola@vendify.pe',
    phone: '',
    whatsapp: '',
    logo: BRAND_LOGO,
    logoWhite: BRAND_LOGO,
    favicon: BRAND_LOGO,
    primaryColor: BRAND_PRIMARY,
    secondaryColor: BRAND_SECONDARY,
    socials: {},
    dashboardUrl: 'https://app.vendify.pe',
  },
};

// Los resellers white-label se resuelven en runtime por host vía el backend
// (/branding/public); ya no hay mapeo estático de hosts a marcas.
const getHostDefaultBrandKey = (): string => '';

const envDefaultBrandKey = (
  getHostDefaultBrandKey() ||
  import.meta.env.VITE_PUBLIC_BRAND ||
  'default'
).toLowerCase();
const envDefaultBrand = staticBrands[envDefaultBrandKey] || staticBrands.default;
const hostDefaultIsWhiteLabel = Boolean(getHostDefaultBrandKey()) && envDefaultBrand.isWhiteLabel;
const isPublicBrandingFetchDisabled =
  String(import.meta.env.VITE_DISABLE_PUBLIC_BRANDING_FETCH || '').toLowerCase() === 'true';

// Marcas legacy que ya no existen: si el backend/caché las devuelve (p. ej.
// un backend sin reiniciar), se ignoran y se usa la marca Vendify.
const LEGACY_BRANDS = new Set(['falconext', 'krezka']);
const esMarcaLegacy = (b: any): boolean =>
  LEGACY_BRANDS.has(String(b?.name ?? '').toLowerCase()) ||
  LEGACY_BRANDS.has(String(b?.key ?? '').toLowerCase());

const getRuntimeBranding = (): BrandConfig | null => {
  if (typeof window === 'undefined') return null;
  if (isPublicBrandingFetchDisabled) return null;

  const runtime = (window as any).__VENDIFY_PUBLIC_BRAND__;
  if (runtime && typeof runtime === 'object' && runtime.name) {
    return esMarcaLegacy(runtime) ? null : { ...envDefaultBrand, ...runtime };
  }

  const host = window.location.host;
  const hostStorageKey = `${LOCAL_STORAGE_KEY}:${host}`;
  const cached = localStorage.getItem(hostStorageKey);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed === 'object' && parsed.name) {
      if (esMarcaLegacy(parsed)) return null;
      if (hostDefaultIsWhiteLabel && !parsed.isWhiteLabel) return envDefaultBrand;
      return { ...envDefaultBrand, ...parsed };
    }
  } catch {
    return null;
  }
  return null;
};

export const BRAND: BrandConfig = getRuntimeBranding() || envDefaultBrand;

export const getBrandByKey = (key?: string | null): BrandConfig => {
  const runtime = getRuntimeBranding();
  if (runtime && key && runtime.key?.toLowerCase() === String(key).toLowerCase()) {
    return runtime;
  }
  return staticBrands[(key ?? '').toLowerCase()] || runtime || BRAND;
};

export const BRANDING_STORAGE_KEY = LOCAL_STORAGE_KEY;
