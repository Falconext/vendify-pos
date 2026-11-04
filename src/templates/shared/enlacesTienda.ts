/**
 * Destinos de los bloques del home (tarjetas, banners, CTAs) y categorías para
 * los menús de las páginas que no las reciben (checkout).
 *
 * `hrefDeBloque`: si el dueño eligió un destino en "Personalizar tienda", ese;
 * si no, la categoría real de nombre parecido a alguna pista ("Equipamiento" →
 * "EQUIPAMIENTO"); si tampoco, la ruta por defecto (catálogo). `null` = el
 * dueño eligió "Sin enlace".
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { categoriaParecida, hrefDeAccion, useIrEnTienda } from '@/components/tienda/navTienda';
import { getStoreLinkAction } from '@/components/tienda/storeLinkActions';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export function hrefDeBloque(
  diseno: any,
  accionKey: string,
  { slug, categorias, pistas = [], rutaPorDefecto = '/catalogo' }: { slug: string | undefined; categorias?: any[]; pistas?: string[]; rutaPorDefecto?: string },
): string | null {
  if (diseno?.[`${accionKey}Type`]) return hrefDeAccion(getStoreLinkAction(diseno, accionKey), slug);
  for (const pista of pistas) {
    const categoria = categoriaParecida(pista, categorias);
    if (categoria) return `/tienda/${slug}/catalogo?category=${encodeURIComponent(categoria)}`;
  }
  return `/tienda/${slug}${rutaPorDefecto}`;
}

/** Navega a un destino de `hrefDeBloque` desde un botón: `null` no hace nada y las URL externas abren otra pestaña. */
export function useIrADestino(slug: string | undefined, diseno?: any) {
  const ir = useIrEnTienda(slug, diseno);
  return useCallback((href: string | null) => {
    if (!href) return;
    if (href.startsWith('/')) ir(href);
    else window.open(href, '_blank', 'noopener,noreferrer');
  }, [ir]);
}

/** "Comprar calzado" → "calzado": pista de categoría a partir del texto de un botón. */
export const pistaDeBoton = (texto: string) => String(texto || '').replace(/^\s*(comprar|ver|descubre|explorar|ir a)\s+/i, '').trim();

const cacheCategorias = new Map<string, Promise<any[]>>();

/**
 * Categorías de la tienda para páginas que no las reciben por props (checkout),
 * así el menú "Automático" filtra igual en todas las páginas. Una sola petición
 * por tienda; si ya vienen por props no pide nada.
 */
export function useCategoriasTienda(slug: string | undefined, recibidas?: any[]): any[] {
  const tieneRecibidas = Array.isArray(recibidas) && recibidas.length > 0;
  const [categorias, setCategorias] = useState<any[]>([]);
  useEffect(() => {
    if (tieneRecibidas || !slug || slug === 'preview') return;
    let vivo = true;
    let pedido = cacheCategorias.get(slug);
    if (!pedido) {
      pedido = axios.get(`${BASE_URL}/public/store/${slug}/categories`)
        .then((r) => (Array.isArray(r.data?.data) ? r.data.data : []))
        .catch(() => { cacheCategorias.delete(slug); return []; });
      cacheCategorias.set(slug, pedido);
    }
    pedido.then((lista) => { if (vivo) setCategorias(lista); });
    return () => { vivo = false; };
  }, [slug, tieneRecibidas]);
  return tieneRecibidas ? (recibidas as any[]) : categorias;
}
