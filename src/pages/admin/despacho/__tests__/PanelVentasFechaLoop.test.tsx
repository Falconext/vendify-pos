/**
 * Bug de producción: en el Panel de Ventas, al retroceder la fecha con la
 * flecha, la fecha volvía sola a la del día y la pantalla entraba en un bucle
 * infinito de peticiones (ERR_INSUFFICIENT_RESOURCES y React #185), dejando la
 * página en blanco. Se llega desde Repartidores → "Ver despachos", que navega
 * con `?fecha=…&repartidorId=…`.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const getMock = jest.fn((url: string, _o?: any) => {
    if (url.startsWith('/ventas/panel')) return Promise.resolve({ data: { data: { data: [] } } });
    if (url.startsWith('/envio-despacho/reparto/resumen')) return Promise.resolve({ data: { data: null } });
    return Promise.resolve({ data: { data: {} } });
});
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string, o?: any) => getMock(u, o), put: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
// Los stores se mockean con referencias ESTABLES, como hace zustand de verdad:
// si devolvieran objetos nuevos en cada render, el bucle sería del mock y no
// del componente, y estaríamos arreglando un bug que no existe en producción.
const alertState = { alert: jest.fn() };
const authState = { auth: { rol: 'ADMIN_EMPRESA', id: 1 }, sedeActiva: { id: 1, esPrincipal: true } };
const sedesState = { sedes: [] as any[], listarSedes: jest.fn() };
const usersState = { usuarios: [] as any[], getAllUsers: jest.fn() };
const invoicesState = { cancelInvoice: jest.fn() };
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: Object.assign(() => alertState, { getState: () => alertState }) }));
jest.mock('@/zustand/auth', () => ({ useAuthStore: () => authState }));
jest.mock('@/zustand/sedes', () => ({ useSedesStore: () => sedesState }));
jest.mock('@/zustand/users', () => ({ useUsersStore: () => usersState }));
jest.mock('@/zustand/invoices', () => ({ useInvoiceStore: () => invoicesState }));

// La URL trae la fecha: es como se entra desde "Ver despachos" del repartidor.
let searchParams = new URLSearchParams('fecha=2026-10-08&repartidorId=38');
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
    useSearchParams: () => [searchParams, jest.fn()],
}));

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: (p: any) => <input data-testid={`cal-${p.name}`} value={p.value} readOnly /> }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Autoscrolltable', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('@/components/TableActionMenu', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ModalConfirm', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ShalomTrackingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/OlvaTrackingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../RotuloPrint', () => ({ __esModule: true, default: () => null }));
jest.mock('../RotulosLotePrint', () => ({ __esModule: true, default: () => null }));
jest.mock('../EditarDespachoModal', () => ({ EditarDespachoModal: () => null }));
jest.mock('../ModalTrazabilidad', () => ({ ModalTrazabilidad: () => null }));
jest.mock('../ReporteEnviosModal', () => ({ ReporteEnviosModal: () => null }));
jest.mock('@/pages/admin/facturacion/ModalDetalleComprobante', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/admin/facturacion/ModalEnviarWhatsApp', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/admin/facturacion/ModalRegistrarPago', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/admin/facturacion/ModalHistorialPagos', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/admin/facturacion/ModalDetalleCuenta', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/admin/facturacion/utils/comprobanteProductMapper', () => ({ mapDetalleToInvoiceProduct: (d: any) => d }));

import PanelVentasView from '../PanelVentasView';

const panelCalls = () => getMock.mock.calls.filter(([u]) => String(u).startsWith('/ventas/panel'));
const fechasPedidas = () => panelCalls().map(([u]) => String(u).match(/fecha=(\d{4}-\d{2}-\d{2})/)?.[1]);

describe('Panel de Ventas · retroceder la fecha', () => {
    beforeEach(() => { getMock.mockClear(); });

    it('al abrirlo con ?fecha= en la URL consulta esa fecha una sola vez', async () => {
        render(<PanelVentasView />);
        await waitFor(() => expect(panelCalls().length).toBeGreaterThan(0));
        await new Promise((r) => setTimeout(r, 120));
        expect(fechasPedidas().every((f) => f === '2026-10-08')).toBe(true);
        // Sin bucle: un puñado de llamadas, no cientos.
        expect(panelCalls().length).toBeLessThan(5);
    });

    it('la flecha de retroceder cambia el día y NO rebota a la fecha de la URL', async () => {
        render(<PanelVentasView />);
        await waitFor(() => expect(panelCalls().length).toBeGreaterThan(0));
        getMock.mockClear();

        fireEvent.click(screen.getByTestId('btn-dia-anterior'));
        await waitFor(() => expect(panelCalls().length).toBeGreaterThan(0));
        await new Promise((r) => setTimeout(r, 200));

        const fechas = fechasPedidas();
        // El bug: alternaba 2026-10-07 / 2026-10-08 sin parar.
        expect(fechas).not.toContain('2026-10-08');
        expect(fechas.every((f) => f === '2026-10-07')).toBe(true);
        expect(panelCalls().length).toBeLessThan(5);
        expect(screen.getByTestId('cal-fecha')).toHaveValue('07/10/2026');
    });

    it('se puede seguir retrocediendo varios días seguidos', async () => {
        render(<PanelVentasView />);
        await waitFor(() => expect(panelCalls().length).toBeGreaterThan(0));
        for (const esperada of ['07/10/2026', '06/10/2026', '05/10/2026']) {
            fireEvent.click(screen.getByTestId('btn-dia-anterior'));
            await waitFor(() => expect(screen.getByTestId('cal-fecha')).toHaveValue(esperada));
        }
    });

    it('avanzar también funciona y no rebota', async () => {
        render(<PanelVentasView />);
        await waitFor(() => expect(panelCalls().length).toBeGreaterThan(0));
        fireEvent.click(screen.getByTestId('btn-dia-siguiente'));
        await waitFor(() => expect(screen.getByTestId('cal-fecha')).toHaveValue('09/10/2026'));
        await new Promise((r) => setTimeout(r, 150));
        expect(screen.getByTestId('cal-fecha')).toHaveValue('09/10/2026');
    });
});

describe('Panel de Ventas · entrar desde "Ver despachos" de un repartidor', () => {
    beforeEach(() => { getMock.mockClear(); });

    it('aplica el filtro de repartidor y el día de ENTREGA que manda la URL', async () => {
        // Es el enlace que arma Repartidores: por fechaEnvio (día de entrega),
        // que es lo que cuentan sus tarjetas, no por fecha de emisión.
        searchParams = new URLSearchParams('fechaEnvio=2026-10-08&repartidorId=38');
        render(<PanelVentasView />);
        await waitFor(() => expect(panelCalls().length).toBeGreaterThan(0));
        await new Promise((r) => setTimeout(r, 150));
        const urls = panelCalls().map(([u]) => String(u));
        expect(urls.some((u) => u.includes('fechaEnvio=2026-10-08'))).toBe(true);
        expect(panelCalls().length).toBeLessThan(5);
        searchParams = new URLSearchParams('fecha=2026-10-08&repartidorId=38');
    });
});
