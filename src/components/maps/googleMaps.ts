import { useJsApiLoader, Libraries } from '@react-google-maps/api';

// Clave pública de Google Maps (Maps JavaScript API + Geocoding). Se define en
// frontend/.env.local como VITE_GOOGLE_MAPS_API_KEY (y en Vercel para prod).
export const GOOGLE_MAPS_KEY: string = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

// Referencia estable (module-level) para que useJsApiLoader no recargue el script.
const LIBRARIES: Libraries = ['geometry'];

/** Carga única del SDK; todos los mapas comparten el mismo id y libraries. */
export function useGoogleMaps() {
    return useJsApiLoader({ id: 'gmaps-script', googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: LIBRARIES, language: 'es', region: 'PE' });
}

/** Centro y zoom por defecto: todo el Perú. */
export const PERU_CENTER = { lat: -9.19, lng: -75.0152 };
export const PERU_ZOOM = 5;

// Estilo claro: mapa recesivo (grises suaves, sin POIs) para que manden los marcadores.
export const MAP_STYLE_LIGHT: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#f3f4f6' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
];

// Estilo oscuro alineado al dark mode del panel (#0A0D14 / #111827).
export const MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#64748b' }, { weight: 1.2 }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#273449' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
];

/**
 * Geocodifica un lugar del Perú con caché en localStorage (una sola consulta
 * por destino por navegador). Devuelve null si Google no lo encuentra.
 */
export async function geocodificarLugarPe(texto: string): Promise<{ lat: number; lng: number } | null> {
    const key = `GEOCODE_PE_${texto.trim().toUpperCase()}`;
    try {
        const cached = localStorage.getItem(key);
        if (cached) return cached === 'null' ? null : JSON.parse(cached);
    } catch { /* sin storage */ }
    if (!(window as any).google?.maps?.Geocoder) return null;
    const geocoder = new google.maps.Geocoder();
    const result = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        geocoder.geocode({ address: `${texto}, Perú`, region: 'pe' }, (res, status) => {
            if (status === 'OK' && res && res[0]) {
                const loc = res[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
            } else resolve(null);
        });
    });
    try { localStorage.setItem(key, result ? JSON.stringify(result) : 'null'); } catch { /* no-op */ }
    return result;
}
