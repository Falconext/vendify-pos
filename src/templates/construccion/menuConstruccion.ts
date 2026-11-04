/**
 * Botones del menú de la plantilla Construcción que el dueño puede editar
 * (texto y destino) desde "Personalizar tienda". Archivo liviano: lo usan la
 * plantilla y el panel (`liveEditorFields`).
 */
import type { DefItemMenu } from '@/components/tienda/navTienda';

/** Header: botones de sección (sus textos ya eran editables). */
export const CONSTRUCCION_MENU: DefItemMenu[] = [
  { textoKey: 'construccionNavCategories', accionKey: 'construccionNavCategoriesAction', textoPorDefecto: 'Categorías' },
  { textoKey: 'construccionNavProducts', accionKey: 'construccionNavProductsAction', textoPorDefecto: 'Productos' },
  { textoKey: 'construccionNavOffers', accionKey: 'construccionNavOffersAction', textoPorDefecto: 'Ofertas destacadas' },
];

/** Pie de página, columna "Información": "Novedades". */
export const CONSTRUCCION_MENU_PIE: DefItemMenu[] = [
  { textoKey: 'construccionMenu1Text', accionKey: 'construccionMenu1Action', textoPorDefecto: 'Novedades', rutaPorDefecto: '/catalogo?sort=new' },
];
