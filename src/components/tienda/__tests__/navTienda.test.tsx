import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  EnlaceTienda, camposDeMenu, whatsappDeTienda, categoriaParecida, conVistaPrevia, hrefDeAccion, itemsDeMenu, productoEnCategoria,
} from '../navTienda';

const MENU = [
  { textoKey: 'mMenu1Text', accionKey: 'mMenu1Action', textoPorDefecto: 'Repuestos' },
  { textoKey: 'mMenu2Text', accionKey: 'mMenu2Action', textoPorDefecto: 'Tuning' },
  { textoKey: 'mMenu3Text', accionKey: 'mMenu3Action', textoPorDefecto: 'Contacto', rutaPorDefecto: '/contacto' },
];
const CATS = [{ nombre: 'REPUESTOS' }, { nombre: 'Cascos' }];

describe('categoriaParecida', () => {
  it('ignora mayúsculas, tildes y espacios', () => {
    expect(categoriaParecida('Envíos ', [{ nombre: 'ENVIOS' }])).toBe('ENVIOS');
  });
  it('acepta singular/plural', () => {
    expect(categoriaParecida('Repuesto', CATS)).toBe('REPUESTOS');
    expect(categoriaParecida('casco', CATS)).toBe('Cascos');
  });
  it('sin coincidencia o texto muy corto: null', () => {
    expect(categoriaParecida('Tuning', CATS)).toBeNull();
    expect(categoriaParecida('a', CATS)).toBeNull();
  });
  it('si dos categorías se parecen igual, no adivina', () => {
    expect(categoriaParecida('casco', [{ nombre: 'Cascos' }, { nombre: 'Casco' }])).toBe('Casco'); // la exacta gana
    expect(categoriaParecida('cascos', [{ nombre: 'Casco' }, { nombre: 'CASCOES' }])).toBeNull();
  });
});

describe('itemsDeMenu', () => {
  const base = { slug: 'bbs', categorias: CATS };
  it('sin configurar: categoría parecida, si no catálogo; ruta fija para contacto', () => {
    const items = itemsDeMenu(MENU, { ...base, diseno: {} });
    expect(items.map(i => i.href)).toEqual([
      '/tienda/bbs/catalogo?category=REPUESTOS',
      '/tienda/bbs/catalogo',
      '/tienda/bbs/contacto',
    ]);
    expect(items[0].categoria).toBe('REPUESTOS');
  });
  it('respeta el texto y el destino elegidos en el editor', () => {
    const items = itemsDeMenu(MENU, { ...base, diseno: { mMenu2Text: 'Cascos y más', mMenu2ActionType: 'category', mMenu2ActionValue: 'Cascos' } });
    expect(items[1]).toMatchObject({ label: 'Cascos y más', href: '/tienda/bbs/catalogo?category=Cascos', categoria: 'Cascos' });
  });
  it('"Sin enlace" oculta el botón', () => {
    const items = itemsDeMenu(MENU, { ...base, diseno: { mMenu1ActionType: 'none' } });
    expect(items.map(i => i.label)).toEqual(['Tuning', 'Contacto']);
  });
  it('búsqueda, producto y URL externa', () => {
    const d = {
      mMenu1ActionType: 'search', mMenu1ActionValue: 'aceite 20w',
      mMenu2ActionType: 'product', mMenu2ActionProductId: 7,
      mMenu3ActionType: 'url', mMenu3ActionUrl: 'https://wa.me/51999',
    };
    const items = itemsDeMenu(MENU, { ...base, diseno: d });
    expect(items.map(i => i.href)).toEqual(['/tienda/bbs/catalogo?search=aceite%2020w', '/tienda/bbs/producto/7', 'https://wa.me/51999']);
    expect(items[2].externo).toBe(true);
  });
  it('"Automático" guardado como null vuelve a la categoría parecida', () => {
    const items = itemsDeMenu(MENU, { ...base, diseno: { mMenu1ActionType: null, mMenu1ActionValue: 'Cascos' } });
    expect(items[0].href).toBe('/tienda/bbs/catalogo?category=REPUESTOS');
  });
});

describe('WhatsApp por defecto (servicio, envíos)', () => {
  const DEF = [{ textoKey: 'sT', accionKey: 'sA', textoPorDefecto: 'Servicio', rutaPorDefecto: '/contacto', whatsappTexto: 'Hola, quiero agendar un servicio.' }];
  it('con número: abre WhatsApp con el mensaje listo', () => {
    const [i] = itemsDeMenu(DEF, { diseno: {}, slug: 'm', categorias: [], whatsapp: '51965274360' });
    expect(i).toMatchObject({ externo: true, href: 'https://wa.me/51965274360?text=Hola%2C%20quiero%20agendar%20un%20servicio.' });
  });
  it('sin número: contacto; con categoría parecida o destino elegido, eso manda', () => {
    expect(itemsDeMenu(DEF, { diseno: {}, slug: 'm', categorias: [] })[0].href).toBe('/tienda/m/contacto');
    expect(itemsDeMenu(DEF, { diseno: {}, slug: 'm', categorias: [{ nombre: 'Servicios' }], whatsapp: '51999' + '888777' })[0].href).toBe('/tienda/m/catalogo?category=Servicios');
    expect(itemsDeMenu(DEF, { diseno: { sAType: 'catalog' }, slug: 'm', categorias: [], whatsapp: '51999888777' })[0].href).toBe('/tienda/m/catalogo');
  });
  it('número de la tienda: agrega 51 a celulares de 9 dígitos y descarta basura', () => {
    expect(whatsappDeTienda({ whatsappTienda: '965 274 360' })).toBe('51965274360');
    expect(whatsappDeTienda({ telefono: '+51 965-274-360' })).toBe('51965274360');
    expect(whatsappDeTienda({ telefono: '123' })).toBeNull();
    expect(whatsappDeTienda(null)).toBeNull();
  });
});

describe('camposDeMenu', () => {
  it('un texto y un destino por botón, con "Automático"', () => {
    const { textFields, linkFields } = camposDeMenu(MENU);
    expect(textFields.map(f => f.key)).toEqual(['mMenu1Text', 'mMenu2Text', 'mMenu3Text']);
    expect(linkFields.every(f => f.permiteAuto)).toBe(true);
  });
});

describe('hrefDeAccion / vista previa', () => {
  it('categoría vacía cae al catálogo y none no lleva a ningún lado', () => {
    expect(hrefDeAccion({ type: 'category', value: '' }, 's')).toBe('/tienda/s/catalogo');
    expect(hrefDeAccion({ type: 'none' }, 's')).toBeNull();
  });
  it('conserva la query de la vista previa de plantilla', () => {
    expect(conVistaPrevia('/tienda/s/catalogo?category=A', { __previewPlantillaId: 'motos' }))
      .toBe('/tienda/s/catalogo?category=A&previewPlantilla=motos&previewOrigen=template');
    expect(conVistaPrevia('https://x.com', { __previewPlantillaId: 'motos' })).toBe('https://x.com');
  });
});

describe('productoEnCategoria', () => {
  it('principal o adicional, sin tildes ni mayúsculas', () => {
    const p = { categoria: { nombre: 'Cascos' }, categoriasExtra: [{ id: 2, nombre: 'Ofertas' }] };
    expect(productoEnCategoria(p, 'cascos')).toBe(true);
    expect(productoEnCategoria(p, 'OFERTAS')).toBe(true);
    expect(productoEnCategoria(p, 'Repuestos')).toBe(false);
    expect(productoEnCategoria({ categoria: 'Té' }, 'te')).toBe(true);
  });
});

function Donde() {
  const l = useLocation();
  return <p data-testid="ruta">{l.pathname + l.search}</p>;
}

describe('EnlaceTienda', () => {
  const montar = (slug: string, diseno?: any) => render(
    <MemoryRouter initialEntries={['/tienda/s']}>
      <Routes><Route path="*" element={<><EnlaceTienda href={`/tienda/s/catalogo?category=A`} slug={slug} diseno={diseno}>Ir</EnlaceTienda><Donde /></>} /></Routes>
    </MemoryRouter>,
  );
  it('navega sin recargar', () => {
    montar('s');
    fireEvent.click(screen.getByText('Ir'));
    expect(screen.getByTestId('ruta').textContent).toBe('/tienda/s/catalogo?category=A');
  });
  it('con Ctrl deja al navegador abrir otra pestaña', () => {
    montar('s');
    fireEvent.click(screen.getByText('Ir'), { ctrlKey: true });
    expect(screen.getByTestId('ruta').textContent).toBe('/tienda/s');
  });
  it('en el editor de vista previa avisa en vez de navegar', () => {
    const fn = jest.fn();
    window.addEventListener('preview-nav', fn);
    montar('preview');
    fireEvent.click(screen.getByText('Ir'));
    expect((fn.mock.calls[0][0] as CustomEvent).detail).toBe('catalogo');
    expect(screen.getByTestId('ruta').textContent).toBe('/tienda/s');
    window.removeEventListener('preview-nav', fn);
  });
  it('el href lleva la vista previa de plantilla', () => {
    montar('s', { __previewPlantillaId: 'motos' });
    expect(screen.getByText('Ir').getAttribute('href')).toContain('previewPlantilla=motos');
  });
});
