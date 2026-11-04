import { categoriaParecida, type DefItemMenu } from '@/components/tienda/navTienda';

type DefAutopartes = DefItemMenu & { busqueda: string };

const enc = encodeURIComponent;

/**
 * Accesos rápidos de la barra oscura del header (y de "Navegación" en el pie).
 * `busqueda` es el término que se usa sin destino elegido cuando no hay una
 * categoría parecida ("Tienda de Llantas" → busca "Llanta").
 */
const BASE: DefAutopartes[] = [
  { textoKey: 'autopartesMenu1Text', accionKey: 'autopartesMenu1Action', textoPorDefecto: 'Tienda de Llantas', busqueda: 'Llanta' },
  { textoKey: 'autopartesMenu2Text', accionKey: 'autopartesMenu2Action', textoPorDefecto: 'Fluidos y Lubricantes', busqueda: 'Lubricante' },
  { textoKey: 'autopartesMenu3Text', accionKey: 'autopartesMenu3Action', textoPorDefecto: 'Baterías', busqueda: 'Batería' },
  { textoKey: 'autopartesMenu4Text', accionKey: 'autopartesMenu4Action', textoPorDefecto: 'Herramientas', busqueda: 'Herramienta' },
  { textoKey: 'autopartesMenu5Text', accionKey: 'autopartesMenu5Action', textoPorDefecto: 'Camiones', busqueda: 'Camión' },
  { textoKey: 'autopartesMenu6Text', accionKey: 'autopartesMenu6Action', textoPorDefecto: 'Motocicletas', busqueda: 'Moto' },
  { textoKey: 'autopartesMenu7Text', accionKey: 'autopartesMenu7Action', textoPorDefecto: 'Zona Eléctrica', busqueda: 'Eléctrico' },
];

/** Definiciones para el panel ("Personalizar tienda"). */
export const AUTOPARTES_MENU: DefItemMenu[] = BASE.map(({ busqueda: _b, ...d }) => d);

/**
 * Definiciones para pintar el menú: sin destino elegido, el botón va a la
 * categoría parecida a su texto (o al término base) y, si no hay, busca ese texto.
 */
export function menuAutopartes(diseno: any, categorias: any[] | undefined): DefItemMenu[] {
  return BASE.map(({ busqueda, ...d }) => {
    const texto = String(diseno?.[d.textoKey] ?? '').trim();
    const termino = texto || busqueda;
    const categoria = categoriaParecida(termino, categorias);
    return { ...d, rutaPorDefecto: categoria ? `/catalogo?category=${enc(categoria)}` : `/catalogo?search=${enc(termino)}` };
  });
}
