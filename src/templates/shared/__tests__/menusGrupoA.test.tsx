import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { hrefDeBloque, pistaDeBoton } from '@/templates/shared/enlacesTienda';

// framer-motion (whileInView del footer) necesita IntersectionObserver; jsdom no lo trae.
beforeAll(() => {
  (globalThis as any).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
});

const CATS = [{ nombre: 'REPUESTOS' }, { nombre: 'Cascos' }, { nombre: 'Calzado' }, { nombre: 'Ofertas' }];

function Donde() {
  const l = useLocation();
  return <p data-testid="ruta">{l.pathname + l.search}</p>;
}

const montar = (ui: React.ReactElement) => render(
  <MemoryRouter initialEntries={['/tienda/bbs']}>
    <Routes><Route path="*" element={<>{ui}<Donde /></>} /></Routes>
  </MemoryRouter>,
);

const hrefDe = (texto: string) => screen.getAllByText(texto)[0].closest('a')?.getAttribute('href');






describe('hrefDeBloque (CTAs del home)', () => {
  it('automático: categoría parecida, si no la ruta por defecto', () => {
    expect(hrefDeBloque({}, 'motosGearAction', { slug: 's', categorias: [{ nombre: 'EQUIPAMIENTO' }], pistas: ['Equipamiento'] })).toBe('/tienda/s/catalogo?category=EQUIPAMIENTO');
    expect(hrefDeBloque({}, 'motosPreorderAction', { slug: 's', categorias: [], pistas: ['Preventa'], rutaPorDefecto: '/catalogo?sort=new' })).toBe('/tienda/s/catalogo?sort=new');
  });
  it('elegido en el editor gana; "Sin enlace" = null', () => {
    expect(hrefDeBloque({ abarrotesPromoOneActionType: 'search', abarrotesPromoOneActionValue: 'arroz' }, 'abarrotesPromoOneAction', { slug: 's' })).toBe('/tienda/s/catalogo?search=arroz');
    expect(hrefDeBloque({ xActionType: 'none' }, 'xAction', { slug: 's', pistas: ['Ofertas'], categorias: CATS })).toBeNull();
  });
  it('pistaDeBoton quita el verbo del botón', () => {
    expect(pistaDeBoton('Comprar calzado')).toBe('calzado');
    expect(pistaDeBoton('Ver ofertas')).toBe('ofertas');
  });
});

