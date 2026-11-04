import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CostoReposicionProducto from '../CostoReposicionProducto';
import { dolarMargenesService } from '@/services/dolarMargenes.service';

jest.mock('@/services/dolarMargenes.service', () => ({
    ...jest.requireActual('@/services/dolarMargenes.service'),
    dolarMargenesService: { deProducto: jest.fn() },
}));

const fila = {
    productoId: 1, codigo: 'LAP-1', descripcion: 'Laptop', moneda: 'PEN', stock: 4, gravado: true,
    costoUsd: 100, tcCompra: 3.166, fechaCompra: '2026-09-15T00:00:00.000Z', documentoCompra: 'F001-101',
    costoCompraSoles: 316.6, costoReposicionSoles: 346.6, variacionTcPct: 9.5, precioActualSoles: 500,
    margenCompraPct: 25.3, margenReposicionPct: 18.2, precioSugerido: 584.3, precioSugeridoSoles: 584.3,
    sugeridoSobre: 'reposicion', estado: 'riesgo',
};

describe('CostoReposicionProducto (ficha)', () => {
    it('muestra lo pagado, lo de reponer hoy y pone el precio sugerido en el formulario', async () => {
        (dolarMargenesService.deProducto as jest.Mock).mockResolvedValue({
            tcHoy: 3.466, tcFecha: '2026-11-04', config: { umbralPct: 3, margenObjetivoPct: 30, colchonTc: 0 }, fila,
        });
        const usar = jest.fn();
        render(<MemoryRouter><CostoReposicionProducto productoId={1} onUsarPrecio={usar} /></MemoryRouter>);
        expect(await screen.findByText('Comprado en dólares')).toBeTruthy();
        expect(screen.getByText(/S\/ 346\.60/)).toBeTruthy();
        fireEvent.click(screen.getByText('Usar este precio'));
        expect(usar).toHaveBeenCalledWith(584.3);
    });

    it('sin compras en dólares no muestra nada', async () => {
        (dolarMargenesService.deProducto as jest.Mock).mockResolvedValue(null);
        const { container } = render(<MemoryRouter><CostoReposicionProducto productoId={6} onUsarPrecio={jest.fn()} /></MemoryRouter>);
        await new Promise((r) => setTimeout(r, 0));
        expect(container.innerHTML).toBe('');
    });
});
