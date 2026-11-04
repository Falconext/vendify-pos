import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DolarMargenesView from '../DolarMargenesView';
import { filtrarFilas, precioAAplicar } from '../dolarMargenesModel';
import { dolarMargenesService, type DolarMargenes, type FilaReposicion } from '@/services/dolarMargenes.service';

jest.mock('@/services/dolarMargenes.service', () => ({
    ...jest.requireActual('@/services/dolarMargenes.service'),
    dolarMargenesService: { listar: jest.fn(), guardarConfig: jest.fn(), aplicarPrecios: jest.fn(), deProducto: jest.fn() },
}));

const fila = (extra: Partial<FilaReposicion> = {}): FilaReposicion => ({
    productoId: 1, codigo: 'LAP-1', descripcion: 'Laptop', moneda: 'PEN', stock: 4, gravado: true,
    costoUsd: 100, tcCompra: 3.4, fechaCompra: '2026-10-01T00:00:00.000Z', documentoCompra: 'F001-77',
    costoCompraSoles: 340, costoReposicionSoles: 376, variacionTcPct: 10.6, precioActualSoles: 500,
    margenCompraPct: 19.8, margenReposicionPct: 11.3, precioSugerido: 633.9, precioSugeridoSoles: 633.9, sugeridoSobre: 'reposicion',
    estado: 'riesgo', ...extra,
});

const respuesta: DolarMargenes = {
    tcHoy: 3.76, tcFecha: '2026-11-03', config: { umbralPct: 3, margenObjetivoPct: 30, colchonTc: 0 },
    resumen: { total: 2, riesgo: 1, margenBajo: 0, bajo: 1 },
    filas: [fila(), fila({ productoId: 2, codigo: 'MOU-1', descripcion: 'Mouse', estado: 'bajo', variacionTcPct: -9.6 })],
};

describe('modelo', () => {
    it('filtra por estado y búsqueda', () => {
        expect(filtrarFilas(respuesta.filas, 'riesgo', '').map((f) => f.productoId)).toEqual([1]);
        expect(filtrarFilas(respuesta.filas, 'todos', 'mou').map((f) => f.productoId)).toEqual([2]);
    });
    it('aplica el precio escrito a mano antes que el sugerido', () => {
        expect(precioAAplicar(fila(), {})).toBe(633.9);
        expect(precioAAplicar(fila(), { 1: '650' })).toBe(650);
    });
});

describe('DolarMargenesView', () => {
    beforeEach(() => {
        (dolarMargenesService.listar as jest.Mock).mockResolvedValue(respuesta);
        (dolarMargenesService.aplicarPrecios as jest.Mock).mockResolvedValue({ actualizados: 1, anteriores: [{ productoId: 1, precio: 500 }] });
    });

    it('arranca mostrando lo que está en riesgo, ya elegido, y aplica el precio sugerido', async () => {
        render(<MemoryRouter><DolarMargenesView /></MemoryRouter>);
        expect(await screen.findByText('Laptop')).toBeTruthy();
        expect(screen.queryByText('Mouse')).toBeNull();
        expect(screen.getByText('S/ 3.760')).toBeTruthy();
        fireEvent.click(screen.getByText('Aplicar precio nuevo'));
        fireEvent.click(await screen.findByText('Sí, cambiar precios'));
        await waitFor(() =>
            expect(dolarMargenesService.aplicarPrecios).toHaveBeenCalledWith([{ productoId: 1, precio: 633.9 }]),
        );
        expect(await screen.findByText(/Deshacer último cambio/)).toBeTruthy();
    });
});
