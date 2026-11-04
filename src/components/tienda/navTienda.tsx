/**
 * Navegación dentro de la tienda pública, igual en todas las plantillas.
 *
 * - `EnlaceTienda` es un `<a href>` de verdad (clic central, "abrir en otra
 *   pestaña" y SEO siguen funcionando) pero el clic normal cambia de página sin
 *   recargar: sin pantalla en blanco ni "0 de 0 productos" en cada clic.
 * - `useIrEnTienda` hace lo mismo desde código (botones, buscadores).
 * - Ambos respetan la vista previa: con slug `preview` avisan al editor
 *   (`preview-nav`) y con una vista previa de plantilla conservan su query.
 * - `itemsDeMenu` / `camposDeMenu` dan a cada botón del menú un texto editable
 *   y un destino elegible (categoría, búsqueda, producto, catálogo, URL u
 *   ocultarlo) desde "Personalizar tienda".
 */
import { forwardRef, useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LinkFieldDef, LinkFieldTarget, TextFieldDef } from '@/components/tienda/liveEditorFields';
import { getStoreLinkAction, type StoreLinkAction } from '@/components/tienda/storeLinkActions';

// ─── Vista previa ────────────────────────────────────────────────────────────

/** Query de la vista previa de plantilla (`previewPlantilla=…`), sin `?`. */
export function queryDeVistaPrevia(diseno?: any): string {
  const raw = diseno?.__previewQuery
    || (diseno?.__previewPlantillaId ? `previewPlantilla=${encodeURIComponent(diseno.__previewPlantillaId)}&previewOrigen=template` : '');
  return String(raw || '').replace(/^\?/, '');
}

export function conVistaPrevia(path: string, diseno?: any): string {
  const query = queryDeVistaPrevia(diseno);
  if (!query || !path.startsWith('/')) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

/** Página que el editor de vista previa (slug `preview`) sabe mostrar. */
export function paginaDeVistaPrevia(path: string): string {
  const resto = path.split('?')[0].split('/').filter(Boolean).slice(2); // quita "tienda/<slug>"
  return resto[0] || 'home';
}

const esInterna = (path: string) => path.startsWith('/tienda/');

// ─── Navegación ──────────────────────────────────────────────────────────────

/** `ir(path)`: navega dentro de la tienda sin recargar. */
export function useIrEnTienda(slug: string | undefined, diseno?: any) {
  const navigate = useNavigate();
  return useCallback((path: string) => {
    if (!esInterna(path)) {
      window.location.href = path;
      return;
    }
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: paginaDeVistaPrevia(path) }));
      return;
    }
    navigate(conVistaPrevia(path, diseno));
  }, [navigate, slug, diseno]);
}

type PropsEnlace = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  slug: string | undefined;
  diseno?: any;
};

/** `<a>` que navega dentro de la tienda sin recargar la página. */
export const EnlaceTienda = forwardRef<HTMLAnchorElement, PropsEnlace>(function EnlaceTienda(
  { href, slug, diseno, onClick, target, ...rest },
  ref,
) {
  const ir = useIrEnTienda(slug, diseno);
  const interna = esInterna(href);
  const manejar = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !interna || target === '_blank') return;
    // Ctrl/⌘/Shift/clic central: que el navegador abra otra pestaña como siempre.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    ir(href);
  };
  return <a ref={ref} href={interna ? conVistaPrevia(href, diseno) : href} target={target} onClick={manejar} {...rest} />;
});

// ─── Enlaces configurables → href ────────────────────────────────────────────

/**
 * Dirección de un enlace configurado en el editor, o `null` si no lleva a
 * ningún lado (`none` o sin dato). Las URL externas se devuelven tal cual.
 */
export function hrefDeAccion(action: StoreLinkAction, slug: string | undefined): string | null {
  const base = `/tienda/${slug}`;
  const value = String(action.value || '').trim();
  const productId = String(action.productId || '').trim();
  switch (action.type) {
    case 'none': return null;
    case 'product': return productId ? `${base}/producto/${encodeURIComponent(productId)}` : `${base}/catalogo`;
    case 'category': return value ? `${base}/catalogo?category=${encodeURIComponent(value)}` : `${base}/catalogo`;
    case 'search': return value ? `${base}/catalogo?search=${encodeURIComponent(value)}` : `${base}/catalogo`;
    case 'url': return String(action.url || '').trim() || null;
    default: return `${base}/catalogo`;
  }
}

// ─── Categorías ──────────────────────────────────────────────────────────────

/** Minúsculas, sin tildes ni espacios extra: "Envíos " ≈ "envios". */
export const normalizarNombre = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

const nombreDe = (c: any): string => String(typeof c === 'string' ? c : c?.nombre ?? '').trim();

/**
 * La categoría real de la tienda que corresponde a un texto ("Repuestos" →
 * "REPUESTOS" o "Repuesto"), para que un botón del menú filtre solo aunque el
 * dueño no lo haya configurado. Sin coincidencia clara devuelve `null`.
 */
export function categoriaParecida(texto: string, categorias: any[] | undefined): string | null {
  const t = normalizarNombre(texto);
  if (t.length < 3) return null;
  const nombres = (categorias || []).map(nombreDe).filter(Boolean);
  const exacta = nombres.find((n) => normalizarNombre(n) === t);
  if (exacta) return exacta;
  // Singular/plural: "repuesto" ↔ "repuestos", "accesorio" ↔ "accesorios".
  const raiz = (s: string) => s.replace(/(es|s)$/, '');
  const parecidas = nombres.filter((n) => raiz(normalizarNombre(n)) === raiz(t));
  return parecidas.length === 1 ? parecidas[0] : null;
}

/** Todas las categorías de un producto: la principal y las adicionales. */
export function categoriasDeProducto(p: any): string[] {
  const principal = nombreDe(p?.categoria);
  const extra = Array.isArray(p?.categoriasExtra) ? p.categoriasExtra.map(nombreDe) : [];
  return [principal, ...extra].filter(Boolean);
}

/** ¿El producto está en esa categoría (principal o adicional)? Sin tildes ni mayúsculas. */
export function productoEnCategoria(p: any, categoria: string): boolean {
  const buscada = normalizarNombre(categoria);
  return !!buscada && categoriasDeProducto(p).some((n) => normalizarNombre(n) === buscada);
}

// ─── Botones del menú configurables ──────────────────────────────────────────

export interface DefItemMenu {
  /** Clave del texto en `diseno` (ej. `motosMenu1Text`, o una existente como `modaMinimalNav1`). */
  textoKey: string;
  /** Clave base del destino (`<clave>Type`, `<clave>Value`, …). */
  accionKey: string;
  textoPorDefecto: string;
  /** Destino si el dueño no eligió ninguno y no hay categoría parecida. */
  destinoPorDefecto?: LinkFieldTarget;
  /** Ruta fija por defecto (ej. contacto) cuando el destino no se configuró. */
  rutaPorDefecto?: string;
  /**
   * Mensaje con el que abre WhatsApp por defecto (antes que `rutaPorDefecto`)
   * si la tienda tiene número: servicio técnico, envíos o garantía se
   * consultan por WhatsApp, no navegando la tienda.
   */
  whatsappTexto?: string;
}

export interface ItemMenu {
  key: string;
  label: string;
  /** `null` = el dueño lo ocultó. */
  href: string | null;
  externo: boolean;
  /** true cuando el destino es la categoría elegida en el editor o una parecida. */
  categoria: string | null;
}

/**
 * Resuelve los botones del menú: texto del editor (o el de la plantilla) y
 * destino elegido; si no hay destino elegido, la categoría real de nombre
 * parecido; si tampoco, el destino por defecto. Los ocultos (`none`) no salen.
 */
/** Solo dígitos del WhatsApp de la tienda (con 51 si viene sin código de país), o null. */
export function whatsappDeTienda(tienda: any): string | null {
  const d = String(tienda?.whatsappTienda || tienda?.whatsapp || tienda?.telefono || '').replace(/\D/g, '');
  if (d.length === 9) return `51${d}`;
  return d.length >= 10 ? d : null;
}

export function itemsDeMenu(defs: DefItemMenu[], { diseno, slug, categorias, whatsapp }: { diseno: any; slug: string | undefined; categorias: any[] | undefined; whatsapp?: string | null }): ItemMenu[] {
  return defs.flatMap((d): ItemMenu[] => {
    const label = String(diseno?.[d.textoKey] ?? '').trim() || d.textoPorDefecto;
    const configurado = !!diseno?.[`${d.accionKey}Type`];
    let action: StoreLinkAction;
    if (configurado) {
      action = getStoreLinkAction(diseno, d.accionKey);
    } else {
      const parecida = categoriaParecida(label, categorias);
      if (parecida) action = { type: 'category', value: parecida };
      else if (d.whatsappTexto && whatsapp) return [{ key: d.accionKey, label, href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(d.whatsappTexto)}`, externo: true, categoria: null }];
      else if (d.rutaPorDefecto) return [{ key: d.accionKey, label, href: `/tienda/${slug}${d.rutaPorDefecto}`, externo: false, categoria: null }];
      else action = { type: d.destinoPorDefecto || 'catalog' };
    }
    if (action.type === 'none') return [];
    const href = hrefDeAccion(action, slug);
    if (!href) return [];
    return [{
      key: d.accionKey,
      label,
      href,
      externo: action.type === 'url',
      categoria: action.type === 'category' ? String(action.value || '') || null : null,
    }];
  });
}

/** Campos del editor para los botones del menú: el texto (Textos) y su destino (Enlaces). */
export function camposDeMenu(defs: DefItemMenu[], grupo = 'Menú'): { textFields: TextFieldDef[]; linkFields: LinkFieldDef[] } {
  return {
    textFields: defs.map((d, i) => ({ key: d.textoKey, label: `Botón ${i + 1} del menú`, placeholder: d.textoPorDefecto, group: grupo })),
    linkFields: defs.map((d, i) => ({
      key: d.accionKey,
      label: `${grupo} · botón ${i + 1} (“${d.textoPorDefecto}”)`,
      group: grupo,
      defaultType: d.destinoPorDefecto || 'catalog',
      permiteAuto: true,
      textoSinEnlace: 'El botón no se muestra en el menú.',
    })),
  };
}
