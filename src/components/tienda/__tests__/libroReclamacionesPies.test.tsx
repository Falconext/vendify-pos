/**
 * Ley 29571: el Libro de Reclamaciones debe estar visible en la tienda.
 * Cada plantilla del registry tiene su pie y todos muestran el enlace.
 */
import axios from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { templateRegistry } from '@/templates/registry';
import { PIES_DE_PLANTILLA } from '@/components/tienda/PieDePlantilla';
import EnlaceLibroReclamaciones from '@/components/tienda/EnlaceLibroReclamaciones';

// Algunos pies piden medios de pago o datos a la API: aquí no hay red.
beforeEach(() => {
  jest.spyOn(axios, 'get').mockResolvedValue({ data: { data: [] } });
  // jsdom no mide SVG (el wordmark de Calma lo usa).
  (SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 });
  (globalThis as any).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
afterEach(() => jest.restoreAllMocks());

const Ubicacion = () => {
  const l = useLocation();
  return <p data-testid="loc">{l.pathname + l.search}</p>;
};

const tienda = { nombre: 'Tienda Demo', nombreComercial: 'Tienda Demo', whatsappTienda: '987654321', email: 'hola@demo.pe' };

describe('enlace al Libro de Reclamaciones en el pie de cada plantilla', () => {
  it('no falta el pie de ninguna plantilla del registry', () => {
    const faltan = Object.keys(templateRegistry).filter((id) => !PIES_DE_PLANTILLA[id]);
    expect(faltan).toEqual([]);
  });

  it.each(Object.keys(templateRegistry))('%s', async (id) => {
    const { default: Pie } = await PIES_DE_PLANTILLA[id]();
    render(
      <MemoryRouter initialEntries={['/tienda/demo']}>
        <Routes>
          <Route path="/tienda/:slug" element={<Pie tienda={tienda} slug="demo" diseno={{}} cp="#0f766e" categories={['Ofertas']} navigate={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
    const enlaces = await screen.findAllByTestId('enlace-libro-reclamaciones');
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a.getAttribute('href')).toBe('/tienda/demo/libro-reclamaciones');
      expect(a).toHaveTextContent('Libro de Reclamaciones');
      expect(a.querySelector('svg')).toBeTruthy();
    }
  });
});

describe('EnlaceLibroReclamaciones', () => {
  it('navega sin recargar y toma el slug de la URL si no se pasa', async () => {
    render(
      <MemoryRouter initialEntries={['/tienda/abc']}>
        <Routes><Route path="/tienda/:slug/*" element={<><EnlaceLibroReclamaciones /><Ubicacion /></>} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('enlace-libro-reclamaciones'));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/tienda/abc/libro-reclamaciones'));
  });

  it('conserva la vista previa de plantilla', () => {
    render(
      <MemoryRouter initialEntries={['/tienda/abc?previewPlantilla=olmo']}>
        <Routes><Route path="/tienda/:slug" element={<EnlaceLibroReclamaciones slug="abc" />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('enlace-libro-reclamaciones').getAttribute('href')).toBe('/tienda/abc/libro-reclamaciones?previewPlantilla=olmo');
  });
});
