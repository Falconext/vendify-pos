import { getStoreLinkAction } from '@/components/tienda/storeLinkActions';
import { hrefDeAccion } from '@/components/tienda/navTienda';

/**
 * Ejecuta el enlace configurado de un bloque del home: las claves planas que
 * guarda "Personalizar tienda" (`<key>Type`, `<key>Value`, `<key>ProductId`,
 * `<key>Url`). Compatibilidad: si la tienda aún tiene el formato viejo
 * (`diseno[key]` como objeto `{ type, categoryName, search, productId, url }`),
 * se respeta. Sin nada configurado va a `fallback`.
 */
export function irAAccionConfigurada(
  diseno: any,
  key: string,
  slug: string,
  navigate: (to: string) => void,
  fallback = `/tienda/${slug}/catalogo`,
) {
  if (diseno?.[`${key}Type`]) {
    const href = hrefDeAccion(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), slug);
    if (!href) return;
    if (href.startsWith('/')) navigate(href);
    else window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  const legacy = diseno?.[key];
  if (!legacy || typeof legacy !== 'object') {
    navigate(fallback);
    return;
  }
  if (legacy.type === 'none') return;
  if (legacy.type === 'url' && legacy.url) {
    window.open(legacy.url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (legacy.type === 'product' && legacy.productId) {
    navigate(`/tienda/${slug}/producto/${legacy.productId}`);
    return;
  }
  if (legacy.type === 'category' && legacy.categoryName) {
    navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(legacy.categoryName)}`);
    return;
  }
  if (legacy.type === 'search' && legacy.search) {
    navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(legacy.search)}`);
    return;
  }
  navigate(fallback);
}
