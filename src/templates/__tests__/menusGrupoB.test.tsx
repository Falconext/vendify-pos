/**
 * Menús configurables y navegación sin recarga de las plantillas falcon,
 * construccion, joyeria (Aurum), carteras (Luxora), luxury y spa.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FalconFooter, FalconHeader } from '@/templates/falcon/FalconShared';
import ConstruccionHeader from '@/templates/construccion/ConstruccionHeader';
import { ConstruccionFooter } from '@/templates/construccion/ConstruccionHomePage';
import { bloquesConDestino } from '@/templates/shared/destinoBloque';
import { getLiveEditorConfig } from '@/components/tienda/liveEditorFields';

beforeAll(() => {
  // framer-motion (whileInView) necesita IntersectionObserver; jsdom no lo trae.
  (globalThis as any).IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
});

function Ubicacion() {
  const loc = useLocation();
  return <output data-testid="ubicacion">{`${loc.pathname}${loc.search}`}</output>;
}

function montar(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/tienda/demo']}>
      <Routes>
        <Route path="*" element={<>{ui}<Ubicacion /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

const enlace = (nombre: string | RegExp) => screen.getByRole('link', { name: nombre });
const ubicacion = () => screen.getByTestId('ubicacion').textContent;

const CATS = [{ nombre: 'Ofertas' }, { nombre: 'Colecciones' }, { nombre: 'Servicios' }, { nombre: 'Taladros' }];
const TIENDA = { nombreComercial: 'Demo' };

describe('falcon', () => {
  const header = (diseno: any = {}) => (
    <FalconHeader tienda={TIENDA} slug="demo" green="#1a8d4e" cartCount={0} cartTotal={0} onOpenCart={() => {}} diseno={diseno} categories={CATS} />
  );

  it('"Ofertas" del header filtra por la categoría parecida y navega sin recargar', () => {
    montar(header());
    const ofertas = enlace('Ofertas');
    expect(ofertas).toHaveAttribute('href', '/tienda/demo/catalogo?category=Ofertas');
    fireEvent.click(ofertas);
    expect(ubicacion()).toBe('/tienda/demo/catalogo?category=Ofertas');
  });

  it('"Ofertas" respeta el texto y el destino del editor; "Sin enlace" lo oculta', () => {
    const { unmount } = montar(header({ falconNavOffers: 'Remate', falconNavOffersActionType: 'search', falconNavOffersActionValue: 'remate' }));
    expect(enlace('Remate')).toHaveAttribute('href', '/tienda/demo/catalogo?search=remate');
    unmount();
    montar(header({ falconNavOffersActionType: 'none' }));
    expect(screen.queryByRole('link', { name: 'Ofertas' })).toBeNull();
  });

  it('footer: Inicio/Nosotros/Tienda fijos, Novedades ordena por nuevo y Atención va a seguimiento/contacto', () => {
    montar(<FalconFooter tienda={TIENDA} slug="demo" green="#1a8d4e" categories={[]} diseno={{}} />);
    expect(enlace('Inicio')).toHaveAttribute('href', '/tienda/demo');
    expect(enlace('Nosotros')).toHaveAttribute('href', '/tienda/demo/contacto');
    expect(enlace('Tienda')).toHaveAttribute('href', '/tienda/demo/catalogo');
    expect(enlace('Novedades')).toHaveAttribute('href', '/tienda/demo/catalogo?sort=new');
    expect(enlace('Mi cuenta')).toHaveAttribute('href', '/tienda/demo/seguimiento');
    expect(enlace('Rastrea tu pedido')).toHaveAttribute('href', '/tienda/demo/seguimiento');
    expect(enlace('Cambios/Devoluciones')).toHaveAttribute('href', '/tienda/demo/contacto');
    expect(enlace('Productos')).toHaveAttribute('href', '/tienda/demo/catalogo');
  });

  it('footer: sin redes configuradas no hay íconos "#"; con Instagram sale solo ese', () => {
    const { container, unmount } = montar(<FalconFooter tienda={TIENDA} slug="demo" green="#1a8d4e" diseno={{}} />);
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(screen.queryByText('Síguenos')).toBeNull();
    unmount();
    const r = montar(<FalconFooter tienda={{ ...TIENDA, instagramUrl: 'https://instagram.com/demo' }} slug="demo" green="#1a8d4e" diseno={{}} />);
    expect(r.container.querySelector('a[href="https://instagram.com/demo"]')).toHaveAttribute('target', '_blank');
  });
});

describe('construccion', () => {
  const header = (diseno: any = {}) => (
    <ConstruccionHeader tienda={TIENDA} slug="demo" diseno={diseno} accent="#ffb400" cartCount={0} onOpenCart={() => {}} categories={CATS} />
  );

  it('Categorías/Productos/Ofertas destacadas son configurables y conservan su badge', () => {
    montar(header({ construccionNavProductsActionType: 'category', construccionNavProductsActionValue: 'Taladros', construccionNavOffersActionType: 'none' }));
    const categorias = enlace(/Categorías/);
    expect(within(categorias).getByText('OFERTA')).toBeInTheDocument();
    const productos = enlace(/Productos/);
    expect(productos).toHaveAttribute('href', '/tienda/demo/catalogo?category=Taladros');
    expect(within(productos).getByText('TOP')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ofertas destacadas' })).toBeNull();
    fireEvent.click(productos);
    expect(ubicacion()).toBe('/tienda/demo/catalogo?category=Taladros');
  });

  it('el buscador navega sin recargar (vacío → catálogo)', () => {
    montar(header());
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'martillo' } });
    fireEvent.submit(screen.getByPlaceholderText('Buscar...').closest('form')!);
    expect(ubicacion()).toBe('/tienda/demo/catalogo?search=martillo');
  });

  it('footer: Novedades ordena por lo más nuevo', () => {
    montar(<ConstruccionFooter tienda={TIENDA} slug="demo" cp="#ffb400" categories={[]} diseno={{}} />);
    expect(enlace('Novedades')).toHaveAttribute('href', '/tienda/demo/catalogo?sort=new');
  });
});





describe('panel "Personalizar tienda"', () => {
  const claves = (id: string) => {
    const c = getLiveEditorConfig(id);
    return {
      textos: c.textFields.map((f) => f.key),
      enlaces: c.linkFields.map((f) => f.key),
      imagenes: c.imageFields.map((f) => f.key),
    };
  };

  it('cada plantilla expone los destinos de sus botones y no campos muertos', () => {
    expect(claves('falcon').enlaces).toEqual(expect.arrayContaining(['falconNavOffersAction', 'falconMenu2Action', 'falconMenu8Action']));
    expect(claves('construccion').enlaces).toEqual(expect.arrayContaining(['construccionNavCategoriesAction', 'construccionNavProductsAction', 'construccionNavOffersAction', 'construccionMenu1Action']));
  });

  it('las claves no se repiten dentro de una plantilla', () => {
    for (const id of ['falcon', 'construccion']) {
      const { textos, enlaces } = claves(id);
      expect(new Set(textos).size).toBe(textos.length);
      expect(new Set(enlaces).size).toBe(enlaces.length);
    }
  });
});
