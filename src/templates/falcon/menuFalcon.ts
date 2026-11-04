/**
 * Botones del menú de la plantilla Falcon que el dueño puede editar (texto y
 * destino) desde "Personalizar tienda". Archivo liviano: lo usan la plantilla
 * y el panel (`liveEditorFields`).
 */
import type { DefItemMenu } from '@/components/tienda/navTienda';

/** Header: "Ofertas" (su texto ya era editable con `falconNavOffers`). */
export const FALCON_MENU_OFERTAS: DefItemMenu[] = [
  { textoKey: 'falconNavOffers', accionKey: 'falconNavOffersAction', textoPorDefecto: 'Ofertas' },
];
/** Pie de página, columna "Enlaces" (Inicio, Nosotros y Tienda son fijos). */
export const FALCON_MENU_PIE: DefItemMenu[] = [
  { textoKey: 'falconMenu1Text', accionKey: 'falconMenu1Action', textoPorDefecto: 'Ofertas' },
  { textoKey: 'falconMenu2Text', accionKey: 'falconMenu2Action', textoPorDefecto: 'Novedades', rutaPorDefecto: '/catalogo?sort=new' },
];
/** Pie de página, columna "Atención al cliente". */
export const FALCON_MENU_ATENCION: DefItemMenu[] = [
  { textoKey: 'falconMenu3Text', accionKey: 'falconMenu3Action', textoPorDefecto: 'Mi cuenta', rutaPorDefecto: '/seguimiento' },
  { textoKey: 'falconMenu4Text', accionKey: 'falconMenu4Action', textoPorDefecto: 'Rastrea tu pedido', rutaPorDefecto: '/seguimiento' },
  { textoKey: 'falconMenu5Text', accionKey: 'falconMenu5Action', textoPorDefecto: 'Productos' },
  { textoKey: 'falconMenu6Text', accionKey: 'falconMenu6Action', textoPorDefecto: 'Servicio al cliente', rutaPorDefecto: '/contacto' },
  { textoKey: 'falconMenu7Text', accionKey: 'falconMenu7Action', textoPorDefecto: 'Cambios/Devoluciones', rutaPorDefecto: '/contacto' },
  { textoKey: 'falconMenu8Text', accionKey: 'falconMenu8Action', textoPorDefecto: 'Preguntas frecuentes', rutaPorDefecto: '/contacto' },
];
