/**
 * QA del Panel de Despacho: franja de resumen del reparto propio y botón
 * "Exportar reparto" (descarga el Excel del día con responseType blob).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const panelItem = {
    tipo: 'COMPROBANTE', id: 1, comprobanteId: 11, comprobanteTipoDoc: 'NV', referencia: 'NV01-00000012', cliente: 'ROSA QA', telefono: '957039998', vendedor: 'V',
    total: 35, montoPagado: 0, saldoPendiente: 35, courier: 'PROPIOS', tipoEnvio: 'DOMICILIO', agenciaDestino: 'predio el porvenir mz b lt 5', celularDest: '957039998',
    nroPaquetes: 1, turnoEnvio: 'MANANA', codigoGuia: '', nroOrden: '', claveOrden: '', repartidorId: null, repartidor: '—', repartidorData: null, estado: 'PREPARANDO', creadoEn: '2026-09-21T15:00:00Z',
    tipoVentaReparto: 'CONTRAENTREGA', distrito: 'Ancón', montoCOD: 35, formaPagoCobro: 'YAPE', fechaEstimada: '2026-09-21T12:00:00Z',
};
const resumen = { fecha: '2026-09-21', fechaFin: '2026-09-21', totales: { pedidos: 3, completos: 2, contraentrega: 2, montoCobrar: 210, totalVenta: 260, costoEnvio: 0, entregados: 1 }, porDistrito: [{ nombre: 'Ancón', pedidos: 2, montoCobrar: 90, totalVenta: 140 }, { nombre: 'Ate', pedidos: 1, montoCobrar: 120, totalVenta: 120 }], incompletos: [{ documento: 'QARP-2', falta: 'FALTAN DATOS: distrito' }] };
const getMock = jest.fn((url: string, opts?: any) => {
    if (url.startsWith('/envio-despacho/panel')) return Promise.resolve({ data: { data: { data: [panelItem] } } });
    if (url.startsWith('/envio-despacho/reparto/resumen')) return Promise.resolve({ data: { data: resumen } });
    if (url.startsWith('/envio-despacho/reparto/exportar')) return Promise.resolve({ data: new Blob(['xlsx'], { type: opts?.responseType === 'blob' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/plain' }) });
    if (url.startsWith('/envio-despacho/config')) return Promise.resolve({ data: { data: {} } });
    return Promise.resolve({ data: { data: {} } });
});
const alertMock = jest.fn();
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string, o?: any) => getMock(u, o), put: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: Object.assign(() => ({ alert: alertMock }), { getState: () => ({ alert: alertMock }) }) }));
jest.mock('@/zustand/repartidores', () => ({ useRepartidoresStore: () => ({ repartidores: [], fetchRepartidores: () => Promise.resolve() }) }));
jest.mock('react-router-dom', () => ({ useLocation: () => ({ search: '?fecha=2026-09-21' }), useNavigate: () => jest.fn() }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: (p: any) => <input aria-label={p.text} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/components/Datatable', () => ({ __esModule: true, default: (p: any) => <div data-testid="tabla">{(p.bodyData || []).map((row: any, i: number) => <div key={i}>{Object.values(row).map((v: any, j) => <span key={j}>{v}</span>)}</div>)}</div> }));
jest.mock('../EditarDespachoModal', () => ({ EditarDespachoModal: () => null }));
jest.mock('../ModalTrazabilidad', () => ({ ModalTrazabilidad: () => null }));
jest.mock('@/features/admin/facturacion/utils/comprobanteProductMapper', () => ({ mapDetalleToInvoiceProduct: (d: any) => d }));

import DespachoView from '../DespachoView';

describe('Panel de Despacho · Reparto propio', () => {
    beforeEach(() => { getMock.mockClear(); alertMock.mockClear(); });

    it('muestra la franja de resumen con totales, incompletos y distritos', async () => {
        render(<DespachoView />);
        const franja = await screen.findByTestId('reparto-resumen');
        expect(franja).toHaveTextContent('Reparto propio · 21/09');
        expect(franja).toHaveTextContent('3'); // pedidos
        expect(franja).toHaveTextContent('210.00'); // a cobrar
        expect(franja).toHaveTextContent('1 con datos incompletos: QARP-2');
        expect(franja).toHaveTextContent('Ancón · 2 · S/ 90.00');
        expect(franja).toHaveTextContent('Ate · 1 · S/ 120.00');
        expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/envio-despacho/reparto/resumen?fecha=2026-09-21'), undefined);
    });

    it('la tabla muestra los chips de distrito y tipo de venta con el monto', async () => {
        render(<DespachoView />);
        await screen.findByTestId('tabla');
        expect(await screen.findByText('Ancón')).toBeInTheDocument();
        expect(screen.getByText('CONTRAENTREGA · S/ 35.00')).toBeInTheDocument();
    });

    it('Exportar reparto descarga el Excel del día (blob) y avisa de los incompletos', async () => {
        const createObjectURL = jest.fn(() => 'blob:x');
        const revokeObjectURL = jest.fn();
        (window as any).URL.createObjectURL = createObjectURL;
        (window as any).URL.revokeObjectURL = revokeObjectURL;
        const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        render(<DespachoView />);
        await screen.findByTestId('reparto-resumen');
        fireEvent.click(screen.getByTestId('btn-exportar-reparto'));
        await waitFor(() => expect(getMock).toHaveBeenCalledWith('/envio-despacho/reparto/exportar?fecha=2026-09-21', { responseType: 'blob' }));
        await waitFor(() => expect(clickSpy).toHaveBeenCalled());
        expect(createObjectURL).toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
        expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('1 pedido con datos incompletos'), 'warning');
        clickSpy.mockRestore();
    });

    it('sin reparto propio en el día no muestra la franja', async () => {
        getMock.mockImplementationOnce((url: string) => url.startsWith('/envio-despacho/panel') ? Promise.resolve({ data: { data: { data: [] } } }) : Promise.resolve({ data: { data: {} } }))
            .mockImplementationOnce(() => Promise.resolve({ data: { data: { ...resumen, totales: { ...resumen.totales, pedidos: 0 } } } }));
        render(<DespachoView />);
        await waitFor(() => expect(getMock).toHaveBeenCalled());
        await waitFor(() => expect(screen.queryByTestId('reparto-resumen')).not.toBeInTheDocument());
    });
});
