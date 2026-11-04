/**
 * Menús configurables y navegación sin recarga de las plantillas tones,
 * ropa-hombre, urbano, autopartes, moda, maye, apicultura y antojo.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import UrbanoHeader from '@/templates/urbano/UrbanoHeader';
import AutopartesHeader from '@/components/tienda/AutopartesHeader';
import AutopartesFooter from '@/components/tienda/AutopartesFooter';
import ModaHeader from '@/components/tienda/ModaHeader';
import ModaFooter from '@/components/tienda/ModaFooter';
import MayeHeader from '@/components/tienda/MayeHeader';
import { irAAccionConfigurada } from '@/templates/shared/accionConfigurada';
import { getLiveEditorConfig } from '@/components/tienda/liveEditorFields';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

// Los pies con `whileInView` (framer-motion) lo necesitan y jsdom no lo trae.
beforeAll(() => {
  (globalThis as any).IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} };
});

function Donde() {
  const l = useLocation();
  return <p data-testid="ruta">{l.pathname + l.search}</p>;
}

const montar = (ui: React.ReactNode) => render(
  <MemoryRouter initialEntries={['/tienda/s']}>
    <Routes><Route path="*" element={<>{ui}<Donde /></>} /></Routes>
  </MemoryRouter>,
);
const ruta = () => screen.getByTestId('ruta').textContent;
const hrefs = (container: HTMLElement) => Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));

const noop = () => {};

// ─── tones ───────────────────────────────────────────────────────────────────

// ─── ropa-hombre ─────────────────────────────────────────────────────────────

// ─── urbano ──────────────────────────────────────────────────────────────────
describe('urbano', () => {
  const header = (diseno: any, categories: any[] = []) => (
    <UrbanoHeader tienda={{}} slug="s" cp="#000" carritoSize={0} onOpenCart={noop} diseno={diseno} categories={categories} />
  );
  it('"Colecciones" va a la categoría parecida o al destino elegido', () => {
    const { unmount } = montar(header({}, ['Colección']));
    fireEvent.click(screen.getAllByText('Colecciones')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?category=Colecci%C3%B3n');
    unmount();
    montar(header({ urbanoMenu1Text: 'Drops', urbanoMenu1ActionType: 'search', urbanoMenu1ActionValue: 'drop' }));
    fireEvent.click(screen.getAllByText('Drops')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?search=drop');
  });
});

// ─── autopartes ──────────────────────────────────────────────────────────────
describe('autopartes', () => {
  const header = (diseno: any, cats: any[] = []) => (
    <AutopartesHeader tienda={{ diseno }} slug="s" cp="#c00" carritoSize={0} onOpenCart={noop} searchQuery="" setSearchQuery={noop} onSearchSubmit={noop} allCategories={cats} />
  );
  it('el desplegable "Categorías" filtra con ?category= (antes ?q=, ignorado)', () => {
    montar(header({}, [{ nombre: 'Frenos' }]));
    fireEvent.click(screen.getByText('Categorías'));
    fireEvent.click(screen.getByText('Frenos'));
    expect(ruta()).toBe('/tienda/s/catalogo?category=Frenos');
  });
  it('acceso rápido: categoría parecida; si no, busca su término', () => {
    const { unmount } = montar(header({}, [{ nombre: 'BATERIAS' }]));
    fireEvent.click(screen.getAllByText('Baterías')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?category=BATERIAS');
    unmount();
    montar(header({}, [{ nombre: 'Frenos' }]));
    fireEvent.click(screen.getAllByText('Tienda de Llantas')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?search=Llanta');
  });
  it('acceso rápido configurable y ocultable', () => {
    montar(header({ autopartesMenu1Text: 'Aros', autopartesMenu1ActionType: 'category', autopartesMenu1ActionValue: 'Aros', autopartesMenu2ActionType: 'none' }));
    expect(screen.queryByText('Fluidos y Lubricantes')).toBeNull();
    fireEvent.click(screen.getAllByText('Aros')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?category=Aros');
  });
  it('el pie ya no tiene enlaces muertos (#)', () => {
    const { container } = montar(<AutopartesFooter tienda={{ facebookUrl: 'https://fb.com/x' }} slug="s" diseno={{}} />);
    expect(hrefs(container).filter((h) => !h || h === '#')).toEqual([]);
    fireEvent.click(screen.getByText('Rastrear Tu Pedido'));
    expect(ruta()).toBe('/tienda/s/seguimiento');
  });
});

// ─── moda ────────────────────────────────────────────────────────────────────
describe('moda', () => {
  const header = (diseno: any, cats: any[] = []) => (
    <ModaHeader tienda={{}} slug="s" cp="#000" carritoSize={0} onOpenCart={noop} searchQuery="" setSearchQuery={noop} onSearchSubmit={noop} allCategories={cats} diseno={diseno} />
  );
  it('"Nuevos ingresos" → novedades; "Mujer" → categoría parecida; "Ofertas" → búsqueda', () => {
    montar(header({}, ['MUJER']));
    fireEvent.click(screen.getAllByText('Nuevos ingresos')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?sort=new');
    fireEvent.click(screen.getAllByText('Mujer')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?category=MUJER');
    fireEvent.click(screen.getAllByText('Ofertas')[0]);
    expect(ruta()).toBe('/tienda/s/catalogo?search=Ofertas');
  });
  it('"Sin enlace" oculta el botón', () => {
    montar(header({ modaMenu6ActionType: 'none' }));
    expect(screen.queryByText('Estilo')).toBeNull();
  });
  it('el pie ya no tiene enlaces muertos ni datos inventados', () => {
    const { container } = montar(<ModaFooter tiendaNombre="X" slug="s" tienda={{}} />);
    expect(hrefs(container).filter((h) => !h || h === '#')).toEqual([]);
    expect(container.textContent).not.toContain('+51 999 999 999');
    fireEvent.click(screen.getByText('Rastrea tu pedido'));
    expect(ruta()).toBe('/tienda/s/seguimiento');
  });
});

// ─── maye ────────────────────────────────────────────────────────────────────
describe('maye', () => {
  it('los accesos rápidos elegidos van primero aunque la tienda tenga categorías', () => {
    const { container } = montar(
      <MayeHeader tienda={{}} slug="s" cp="#000" carritoSize={0} onOpenCart={noop} searchQuery="" setSearchQuery={noop} onSearchSubmit={noop}
        allCategories={['Monitores', 'Laptops', 'Mouse']} diseno={{ mayeQuickLink1: 'Mouse' }} />,
    );
    const textos = Array.from(container.querySelectorAll('button')).map((b) => b.textContent?.trim());
    const i = textos.indexOf('Mouse');
    expect(textos.slice(i, i + 3)).toEqual(['Mouse', 'Monitores', 'Laptops']);
  });
});

// ─── antojo ──────────────────────────────────────────────────────────────────

// ─── enlaces de bloques (apicultura / antojo) ────────────────────────────────
describe('irAAccionConfigurada', () => {
  it('lee las claves planas que guarda el panel', () => {
    const nav = jest.fn();
    irAAccionConfigurada({ apiculturaHeroActionType: 'category', apiculturaHeroActionValue: 'Miel' }, 'apiculturaHeroAction', 's', nav);
    expect(nav).toHaveBeenCalledWith('/tienda/s/catalogo?category=Miel');
  });
  it('respeta el formato viejo (objeto) y el fallback', () => {
    const nav = jest.fn();
    irAAccionConfigurada({ antojoPromoHotAction: { type: 'search', search: 'calzone' } }, 'antojoPromoHotAction', 's', nav);
    irAAccionConfigurada({}, 'antojoPromoHotAction', 's', nav, '/tienda/s/catalogo?search=pizza');
    expect(nav.mock.calls.map((c) => c[0])).toEqual(['/tienda/s/catalogo?search=calzone', '/tienda/s/catalogo?search=pizza']);
  });
  it('"Sin enlace" no navega y la URL externa abre otra pestaña', () => {
    const nav = jest.fn();
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    irAAccionConfigurada({ kType: 'none' }, 'k', 's', nav);
    irAAccionConfigurada({ kType: 'url', kUrl: 'https://wa.me/51' }, 'k', 's', nav);
    expect(nav).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('https://wa.me/51', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});

// ─── panel = plantilla ───────────────────────────────────────────────────────
describe('panel', () => {
  it('cada plantilla expone los destinos de su menú', () => {
    const links = (id: string) => getLiveEditorConfig(id).linkFields.map((f) => f.key);
    expect(links('urbano')).toEqual(['urbanoMenu1Action']);
    expect(links('autopartes')).toHaveLength(7);
    expect(links('moda')).toHaveLength(8);
    const textos = (id: string) => getLiveEditorConfig(id).textFields.map((f) => f.key);
    expect(textos('urbano')).toContain('urbanoFeatureTitle');
    expect(textos('urbano')).not.toContain('urbanoFeatureLabel');
    expect(textos('apicultura')).not.toContain('apiculturaNewsletterTitle');
  });
});
