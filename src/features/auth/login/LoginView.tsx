import { BRAND } from '@/lib/branding';
import VendifyLoginView from './VendifyLoginView';
import WhiteLabelLoginView from './WhiteLabelLoginView';

// Claves de la marca flagship Vendify (no son resellers white-label).
const FLAGSHIP_KEYS = new Set(['default', 'vendify']);

export default function LoginView() {
    const key = String(BRAND.key || '').toLowerCase();

    // Reseller con marca propia (subdominio/dominio white-label) → login config-driven.
    if (BRAND.isWhiteLabel && !FLAGSHIP_KEYS.has(key)) {
        return <WhiteLabelLoginView />;
    }

    // Flagship Vendify → login premium de la plataforma.
    return <VendifyLoginView />;
}
