/**
 * QA del Reporte de envíos: el modal (qué pide a la API al cambiar courier y
 * rango, y qué descarga) y, sobre todo, que su entrada viva en una pantalla
 * que el router realmente renderice.
 *
 * Lo segundo existe por un error real: el botón se puso primero en
 * `DespachoView`, que tiene sus tests en verde pero NO está ruteado en
 * App.tsx — un componente huérfano. Los tests de unidad no lo detectaron
 * porque montan el componente directamente, sin pasar por las rutas, así que
 * la feature quedaba inalcanzable para el usuario con todo en verde.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const resumen = {
    fecha: '2026-10-01',
    fechaFin: '2026-10-31',
    courier: 'SHALOM',
    totales: { pedidos: 6, completos: 5, contraentrega: 1, montoCobrar: 180, totalVenta: 1080, costoEnvio: 62, entregados: 2 },
    porMes: [{ nombre: '2026-09', pedidos: 1, montoCobrar: 0, totalVenta: 180 }, { nombre: '2026-10', pedidos: 5, montoCobrar: 180, totalVenta: 900 }],
    porDestino: [{ nombre: 'SHALOM CUSCO CENTRO', pedidos: 3, montoCobrar: 0, totalVenta: 540 }, { nombre: 'SHALOM PIURA', pedidos: 1, montoCobrar: 0, totalVenta: 180 }],
    porCourier: [{ nombre: 'Shalom', pedidos: 6, montoCobrar: 180, totalVenta: 1080 }],
    porEstado: [{ nombre: 'EN_AGENCIA', pedidos: 3, montoCobrar: 180, totalVenta: 540 }],
    porSede: [{ nombre: 'Sede Principal', pedidos: 6, montoCobrar: 180, totalVenta: 1080 }],
    incompletos: [{ documento: 'B001-6', falta: 'FALTAN DATOS: nombre, DNI' }],
};
const vacio = { ...resumen, totales: { ...resumen.totales, pedidos: 0 }, porMes: [], porDestino: [], porCourier: [], incompletos: [] };

const getMock = jest.fn((url: string, _o?: any) => {
    if (url.includes('/reparto/resumen')) {
        return Promise.resolve({ data: { data: url.includes('courier=OLVA') ? vacio : resumen } });
    }
    if (url.includes('/reparto/exportar')) {
        return Promise.resolve({ data: new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) });
    }
    return Promise.resolve({ data: { data: {} } });
});
const alertMock = jest.fn();
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string, o?: any) => getMock(u, o) } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: Object.assign(() => ({ alert: alertMock }), { getState: () => ({ alert: alertMock }) }) }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Modal', () => ({ __esModule: true, default: (p: any) => <div data-testid="modal">{p.children}</div> }));
jest.mock('@/components/Date', () => ({
    Calendar: (p: any) => <input aria-label={p.text} value={p.value} onChange={(e: any) => p.onChange(e.target.value)} />,
}));

import { ReporteEnviosModal } from '../ReporteEnviosModal';

const ultimaUrlResumen = () =>
    [...getMock.mock.calls].reverse().find(([u]) => String(u).includes('/reparto/resumen'))?.[0] as string;

describe('Reporte de envíos · el modal', () => {
    beforeEach(() => { getMock.mockClear(); alertMock.mockClear(); });

    it('arranca en Shalom y pide el mes en curso', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        await waitFor(() => expect(ultimaUrlResumen()).toBeTruthy());
        const url = ultimaUrlResumen();
        expect(url).toContain('courier=SHALOM');
        expect(url).toMatch(/fecha=\d{4}-\d{2}-01/);
        expect(url).toMatch(/fechaFin=\d{4}-\d{2}-\d{2}/);
    });

    it('muestra los totales, el mes a mes y los destinos que devuelve la API', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        expect(await screen.findByText('6')).toBeInTheDocument();          // envíos
        expect(await screen.findByText('1080.00')).toBeInTheDocument();    // venta
        expect(await screen.findByText('62.00')).toBeInTheDocument();      // flete
        expect(screen.getByText('SHALOM CUSCO CENTRO')).toBeInTheDocument();
        expect(screen.getByText('Por agencia destino')).toBeInTheDocument();
        expect(screen.getByText('Mes a mes')).toBeInTheDocument();
    });

    it('avisa de los envíos a los que les falta un dato para la guía', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        expect(await screen.findByText(/sin datos completos para la guía/)).toHaveTextContent('B001-6');
    });

    it('al cambiar de courier vuelve a consultar con ese courier', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        await waitFor(() => expect(ultimaUrlResumen()).toContain('courier=SHALOM'));
        fireEvent.click(screen.getByTestId('reporte-courier-TODOS'));
        await waitFor(() => expect(ultimaUrlResumen()).toContain('courier=TODOS'));
        // En "todos" el destino mezcla agencias y distritos, así que el título cambia.
        expect(await screen.findByText('Por destino')).toBeInTheDocument();
        expect(screen.getByText('Por courier')).toBeInTheDocument();
    });

    it('en reparto propio el destino se titula por distrito', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        fireEvent.click(screen.getByTestId('reporte-courier-PROPIOS'));
        expect(await screen.findByText('Por distrito')).toBeInTheDocument();
    });

    it('los atajos de rango cambian las fechas que se consultan', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        await waitFor(() => expect(ultimaUrlResumen()).toBeTruthy());
        fireEvent.click(screen.getByText('Este año'));
        await waitFor(() => expect(ultimaUrlResumen()).toMatch(/fecha=\d{4}-01-01/));
    });

    it('sin envíos en el rango lo dice y no deja descargar', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        fireEvent.click(screen.getByTestId('reporte-courier-OLVA'));
        expect(await screen.findByText('No hay envíos en ese rango')).toBeInTheDocument();
        expect(screen.getByTestId('btn-descargar-reporte-envios')).toBeDisabled();
    });

    it('descargar pide el Excel con el mismo courier y rango que se ve en pantalla', async () => {
        render(<ReporteEnviosModal onClose={() => {}} />);
        await waitFor(() => expect(ultimaUrlResumen()).toBeTruthy());
        (global as any).URL.createObjectURL = jest.fn(() => 'blob:x');
        (global as any).URL.revokeObjectURL = jest.fn();
        fireEvent.click(screen.getByTestId('btn-descargar-reporte-envios'));
        await waitFor(() => {
            const exp = getMock.mock.calls.find(([u]) => String(u).includes('/reparto/exportar'));
            expect(exp).toBeTruthy();
            expect(String(exp![0])).toContain('courier=SHALOM');
            expect((exp![1] as any)?.responseType).toBe('blob');
        });
        expect(alertMock).not.toHaveBeenCalled();
    });
});

describe('Reporte de envíos · la entrada tiene que ser alcanzable', () => {
    const leer = (rel: string) =>
        require('fs').readFileSync(require('path').join(__dirname, rel), 'utf8');

    it('PanelVentasView abre el reporte y está ruteado en App.tsx', () => {
        const panel = leer('../PanelVentasView.tsx');
        expect(panel).toContain('ReporteEnviosModal');
        expect(panel).toContain('btn-reporte-envios');

        const app = leer('../../../../App.tsx');
        expect(app).toContain('PanelVentasView');
        expect(app).toMatch(/element=\{<PanelVentasView\s*\/>\}/);
    });

    it('la entrada no vive SOLO en un componente que el router no renderiza', () => {
        const app = leer('../../../../App.tsx');
        const pantallas = ['PanelVentasView', 'DespachoView'];
        const ruteadas = pantallas.filter((c) => app.includes(`<${c} />`));
        const conEntrada = pantallas.filter((c) => leer(`../${c}.tsx`).includes('btn-reporte-envios'));
        // Al menos una pantalla con la entrada tiene que estar ruteada.
        expect(conEntrada.filter((c) => ruteadas.includes(c)).length).toBeGreaterThan(0);
    });
});
