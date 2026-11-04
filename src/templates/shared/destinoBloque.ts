/**
 * Tarjetas/atajos del inicio (colecciones, familias, servicios…) con texto y
 * destino editables desde "Personalizar tienda". Igual que `itemsDeMenu`, pero
 * la categoría automática se busca por nombres propios del bloque (la tarjeta
 * "Para ella" busca la categoría "Mujer") y, si la tienda no la tiene, cae a
 * una búsqueda o al catálogo en lugar de mostrar un catálogo vacío.
 */
import { categoriaParecida, hrefDeAccion } from '@/components/tienda/navTienda';
import { getStoreLinkAction } from '@/components/tienda/storeLinkActions';
import type { LinkFieldDef, TextFieldDef } from '@/components/tienda/liveEditorFields';

export interface DefBloque {
  /** Clave del texto en `diseno`. */
  textoKey: string;
  /** Clave base del destino (`<clave>Type`, `<clave>Value`, …). */
  accionKey: string;
  textoPorDefecto: string;
  /** Categorías reales a las que puede llevar (además del texto del bloque). */
  categorias?: string[];
  /** Búsqueda si la tienda no tiene ninguna de esas categorías (si no, el catálogo). */
  busqueda?: string;
}

export interface Bloque {
  key: string;
  /** Posición del bloque en su lista original (para íconos/imágenes fijos). */
  indice: number;
  label: string;
  href: string;
  externo: boolean;
}

/** Resuelve los bloques; los que el dueño dejó "Sin enlace" no se devuelven. */
export function bloquesConDestino(defs: DefBloque[], { diseno, slug, categorias }: { diseno: any; slug: string | undefined; categorias: any[] | undefined }): Bloque[] {
  const base = `/tienda/${slug}`;
  return defs.flatMap((d, indice): Bloque[] => {
    const label = String(diseno?.[d.textoKey] ?? '').trim() || d.textoPorDefecto;
    if (diseno?.[`${d.accionKey}Type`]) {
      const action = getStoreLinkAction(diseno, d.accionKey);
      const href = hrefDeAccion(action, slug);
      return href ? [{ key: d.accionKey, indice, label, href, externo: action.type === 'url' }] : [];
    }
    const cat = [label, ...(d.categorias || [])].map((n) => categoriaParecida(n, categorias)).find(Boolean);
    const href = cat
      ? `${base}/catalogo?category=${encodeURIComponent(cat)}`
      : d.busqueda ? `${base}/catalogo?search=${encodeURIComponent(d.busqueda)}` : `${base}/catalogo`;
    return [{ key: d.accionKey, indice, label, href, externo: false }];
  });
}

/** Campos del editor para una lista de bloques: el texto (Textos) y su destino (Enlaces). */
export function camposDeBloques(defs: DefBloque[], grupo: string, nombre: string): { textFields: TextFieldDef[]; linkFields: LinkFieldDef[] } {
  return {
    textFields: defs.map((d, i) => ({ key: d.textoKey, label: `${nombre} ${i + 1}: texto`, placeholder: d.textoPorDefecto, group: grupo })),
    linkFields: defs.map((d, i) => ({
      key: d.accionKey,
      label: `${nombre} ${i + 1} (“${d.textoPorDefecto}”)`,
      group: grupo,
      defaultType: 'catalog',
      permiteAuto: true,
      textoSinEnlace: 'No se muestra en el inicio.',
    })),
  };
}
