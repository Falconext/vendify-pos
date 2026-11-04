import axios, { AxiosError, AxiosHeaders } from 'axios';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LibroReclamaciones from '../LibroReclamaciones';
import { vaciarTiendaPublica } from '@/lib/tiendaPublica';

const tienda = { nombreComercial: 'Zapas Ana', logo: null, diseno: { plantillaId: 'olmo', colorPrimario: '#0f766e' } };
const proveedor = { razonSocial: 'ZAPATERÍA ANA S.A.C.', ruc: '20123456789', direccion: 'Jr. Lima 100', nombreComercial: 'Zapas Ana', logo: null };

const no404 = () => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('404', 'ERR', config, {}, { status: 404, statusText: '', headers: {}, config, data: {} });
};

const abrir = () => render(
  <MemoryRouter initialEntries={['/tienda/zapas/libro-reclamaciones']}>
    <Routes><Route path="/tienda/:slug/libro-reclamaciones" element={<LibroReclamaciones />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  vaciarTiendaPublica();
  (SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 });
  (globalThis as any).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
afterEach(() => jest.restoreAllMocks());

describe('página pública del Libro de Reclamaciones', () => {
  it('pinta la hoja con el proveedor y el pie de la plantilla activa', async () => {
    jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      if (url.endsWith('/public/store/zapas')) return { data: { data: tienda } };
      if (url.endsWith('/public/store/zapas/libro-reclamaciones')) return { data: { data: { proveedor } } };
      return { data: { data: [] } };
    });
    abrir();
    expect(await screen.findByText('ZAPATERÍA ANA S.A.C.')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Hoja de reclamación' })).toBeInTheDocument();
    expect(screen.getAllByText('Volver a la tienda').length).toBeGreaterThan(0);
    // El pie de Olmo se carga perezoso y trae el enlace legal.
    expect(await screen.findByTestId('enlace-libro-reclamaciones')).toHaveAttribute('href', '/tienda/zapas/libro-reclamaciones');
  });

  it('tienda inexistente', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(no404());
    abrir();
    expect(await screen.findByText('No encontramos esta tienda.')).toBeInTheDocument();
  });

  it('sin red ofrece reintentar', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'));
    abrir();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
