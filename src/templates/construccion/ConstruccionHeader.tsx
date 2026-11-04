/**
 * Header de la plantilla Construcción (Hammer), compartido por Inicio,
 * Catálogo y Contacto. Navega sin recargar y sus botones de sección
 * (Categorías, Productos, Ofertas destacadas) se configuran desde
 * "Personalizar tienda".
 */
import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { EnlaceTienda, itemsDeMenu, useIrEnTienda } from '@/components/tienda/navTienda';
import { readableText } from '@/templates/shared/color';
import { CONSTRUCCION_MENU } from './menuConstruccion';

const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;

export const formatPhone = (raw: any) => {
  const value = String(raw || '').trim();
  if (!value) return value;
  const digits = value.replace(/\D/g, '');
  let national = digits;
  if (digits.length === 11 && digits.startsWith('51')) national = digits.slice(2);
  else if (digits.length === 9) national = digits;
  else return value;
  return `+51 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
};

export function HammerLogo({ storeName, subtitle = 'Herramientas y accesorios', accent = '#ffb400' }: { storeName: string; subtitle?: string; accent?: string }) {
  const label = storeName?.trim() ? storeName.trim().split(/\s+/)[0] : 'HAMMER';
  const clean = label.replace(/[^a-zA-Z0-9]/g, '') || 'HAMMER';
  const start = clean.slice(0, Math.max(2, clean.length - 3)).toUpperCase();
  const end = clean.slice(Math.max(2, clean.length - 3)).toUpperCase();

  return (
    <div className="leading-none">
      <div className="flex items-end text-[30px] font-black uppercase tracking-[0.08em] text-white md:text-[36px]">
        <span>{start}</span>
        <span style={{ color: accent }}>{end}</span>
      </div>
      <p className="mt-1 text-[13px] font-semibold tracking-wide text-white/35">{subtitle}</p>
    </div>
  );
}

/** Badge que acompaña a algunos botones del menú (se conserva aunque el dueño cambie el texto). */
const BADGES: Record<string, { texto: string; color: string }> = {
  construccionNavCategoriesAction: { texto: 'OFERTA', color: '#13a084' },
  construccionNavProductsAction: { texto: 'TOP', color: '#e93473' },
};

export interface ConstruccionHeaderProps {
  tienda: any;
  slug: string;
  diseno: any;
  accent: string;
  cartCount: number;
  onOpenCart: () => void;
  categories?: any[];
  /** Texto del selector junto al buscador (por defecto la primera categoría). */
  searchLabel?: string;
  /** Búsqueda controlada por la página (catálogo); si no, el header guarda la suya. */
  search?: string;
  setSearch?: (value: string) => void;
  favoritosCount?: number;
  onOpenFavoritos?: () => void;
  /** Último botón del menú: "Catálogo" (inicio/catálogo) o "Contacto" (página de contacto). */
  ultimoEnlace?: 'catalogo' | 'contacto';
}

export default function ConstruccionHeader({
  tienda, slug, diseno, accent, cartCount, onOpenCart, categories = [], searchLabel,
  search: searchProp, setSearch: setSearchProp, favoritosCount = 0, onOpenFavoritos, ultimoEnlace = 'catalogo',
}: ConstruccionHeaderProps) {
  const ir = useIrEnTienda(slug, diseno);
  const [searchLocal, setSearchLocal] = useState('');
  const search = searchProp ?? searchLocal;
  const setSearch = setSearchProp ?? setSearchLocal;
  const headerText = readableText(accent); // texto legible sobre la barra del color principal
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'HAMMER';
  const menu = useMemo(() => itemsDeMenu(CONSTRUCCION_MENU, { diseno, slug, categorias: categories }), [diseno, slug, categories]);
  const primeraCategoria = useMemo(() => {
    const c = (categories || [])[0];
    return String(typeof c === 'string' ? c : c?.nombre || c?.name || '').trim();
  }, [categories]);
  const base = `/tienda/${slug}`;

  return (
    <header className="relative z-20 bg-[#111111] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:px-6">
        <EnlaceTienda href={base} slug={slug} diseno={diseno} className="text-left">
          <HammerLogo storeName={storeName} subtitle={editable(diseno?.construccionLogoSubtitle, 'Herramientas y accesorios')} accent={accent} />
        </EnlaceTienda>

        <form
          className="flex min-h-[48px] flex-1 overflow-hidden rounded-md bg-white text-[13px] text-[#111] shadow-xl lg:mx-10"
          onSubmit={(event) => {
            event.preventDefault();
            const term = String(search || '').trim();
            ir(term ? `${base}/catalogo?search=${encodeURIComponent(term)}` : `${base}/catalogo`);
          }}
        >
          <button type="button" className="hidden min-w-[190px] items-center justify-between border-r border-gray-200 px-5 text-[13px] font-bold text-gray-500 md:flex">
            {searchLabel || primeraCategoria || 'Todas las categorías'}
            <Icon icon="solar:alt-arrow-down-linear" width={18} />
          </button>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={editable(diseno?.construccionSearchPlaceholder, 'Buscar...')}
            className="min-w-0 flex-1 px-5 text-[13px] font-semibold text-gray-700 outline-none"
          />
          <button type="submit" className="px-4 text-[13px] font-black sm:px-7" style={{ background: accent, color: headerText }}>
            Buscar
          </button>
        </form>

        <div className="hidden items-center gap-8 lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-white/10">
              <Icon icon="solar:phone-calling-bold" width={28} />
            </span>
            <div>
              <p className="text-[13px] font-black text-white/80">{editable(diseno?.construccionCallLabel, 'Llámanos:')}</p>
              <p className="text-[13px] font-black" style={{ color: accent }}>
                {formatPhone(tienda?.whatsappTienda || tienda?.telefono) || '(+51) 999-999-999'}
              </p>
            </div>
          </div>
          <Icon icon="solar:user-linear" width={30} className="text-white" />
        </div>
      </div>

      <div style={{ background: accent }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <EnlaceTienda
            href={`${base}/catalogo`}
            slug={slug}
            diseno={diseno}
            className="inline-flex h-12 min-w-0 flex-1 items-center gap-3 rounded-md bg-white px-4 text-[13px] font-black text-[#151515] shadow-sm sm:flex-none sm:px-5 sm:text-[14px] md:min-w-[230px]"
          >
            <Icon icon="solar:hamburger-menu-linear" width={28} />
            {editable(diseno?.construccionHeaderCategoryLabel, 'Comprar por categorías')}
          </EnlaceTienda>
          <nav className="hidden flex-1 items-center justify-center gap-8 text-[14px] font-black lg:flex" style={{ color: headerText }}>
            <EnlaceTienda href={base} slug={slug} diseno={diseno}>{editable(diseno?.construccionNavHome, 'Inicio')}</EnlaceTienda>
            <EnlaceTienda href={`${base}/catalogo`} slug={slug} diseno={diseno} className="inline-flex items-center gap-1">{editable(diseno?.construccionNavStore, 'Tienda')} <Icon icon="solar:alt-arrow-down-linear" /></EnlaceTienda>
            {menu.map((it) => {
              const badge = BADGES[it.key];
              return (
                <EnlaceTienda
                  key={it.key}
                  href={it.href!}
                  slug={slug}
                  diseno={diseno}
                  target={it.externo ? '_blank' : undefined}
                  rel={it.externo ? 'noreferrer' : undefined}
                  className={badge ? 'inline-flex items-center gap-2' : undefined}
                >
                  {it.label}
                  {badge && <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: badge.color }}>{badge.texto}</span>}
                </EnlaceTienda>
              );
            })}
            {ultimoEnlace === 'contacto'
              ? <EnlaceTienda href={`${base}/contacto`} slug={slug} diseno={diseno}>Contacto</EnlaceTienda>
              : <EnlaceTienda href={`${base}/catalogo`} slug={slug} diseno={diseno}>{editable(diseno?.construccionNavCatalog, 'Catálogo')}</EnlaceTienda>}
          </nav>
          {onOpenFavoritos && (
            <button type="button" onClick={onOpenFavoritos} className="relative inline-flex items-center" style={{ color: headerText }} title="Mis favoritos">
              <Icon icon="solar:heart-linear" width={30} />
              {favoritosCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white" style={{ background: '#ef4444' }}>{favoritosCount}</span>
              )}
            </button>
          )}
          <button type="button" onClick={onOpenCart} className="inline-flex items-center gap-2 text-[14px] font-black" style={{ color: headerText }}>
            <Icon icon="solar:cart-large-2-linear" width={34} />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-[#111]">{cartCount}</span>
            <span className="hidden sm:inline">{editable(diseno?.construccionCartLabel, 'Mi carrito')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
