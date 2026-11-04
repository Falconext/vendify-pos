import type { DefItemMenu } from '@/components/tienda/navTienda';

export type MegaMenuModa = 'women' | 'men' | 'accessories' | 'style';

type DefModa = DefItemMenu & { mega?: MegaMenuModa };

const enc = encodeURIComponent;

/** Menú principal de Moda (header, menú móvil y flechas de la barra de promo). */
const BASE: DefModa[] = [
  { textoKey: 'modaMenu1Text', accionKey: 'modaMenu1Action', textoPorDefecto: 'Nuevos ingresos', rutaPorDefecto: '/catalogo?sort=new' },
  { textoKey: 'modaMenu2Text', accionKey: 'modaMenu2Action', textoPorDefecto: 'Más vendidos' },
  { textoKey: 'modaMenu3Text', accionKey: 'modaMenu3Action', textoPorDefecto: 'Mujer', mega: 'women' },
  { textoKey: 'modaMenu4Text', accionKey: 'modaMenu4Action', textoPorDefecto: 'Hombre', mega: 'men' },
  { textoKey: 'modaMenu5Text', accionKey: 'modaMenu5Action', textoPorDefecto: 'Accesorios', mega: 'accessories' },
  { textoKey: 'modaMenu6Text', accionKey: 'modaMenu6Action', textoPorDefecto: 'Estilo', mega: 'style' },
  { textoKey: 'modaMenu7Text', accionKey: 'modaMenu7Action', textoPorDefecto: 'Ofertas' },
];

/** Definiciones para el panel ("Personalizar tienda"). */
export const MODA_MENU: DefItemMenu[] = BASE.map(({ mega: _m, ...d }) => d);

/** Submenú desplegable de cada botón (por su clave de destino). */
export const MEGA_MODA: Record<string, MegaMenuModa | undefined> = Object.fromEntries(BASE.map((d) => [d.accionKey, d.mega]));

/**
 * Definiciones para pintar el menú. Sin destino elegido: categoría de nombre
 * parecido; si no hay, "Nuevos ingresos" ordena por novedades y el resto busca su texto.
 */
export function menuModa(diseno: any): DefItemMenu[] {
  return BASE.map(({ mega: _m, ...d }) => {
    if (d.rutaPorDefecto) return d;
    const texto = String(diseno?.[d.textoKey] ?? '').trim() || d.textoPorDefecto;
    return { ...d, rutaPorDefecto: `/catalogo?search=${enc(texto)}` };
  });
}
