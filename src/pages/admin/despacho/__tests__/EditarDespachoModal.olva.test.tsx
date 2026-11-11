/**
 * QA de la guía Olva en "Editar Despacho". Regenerar crea otra guía real que la API
 * de Olva no deja anular, así que pide confirmación; la primera guía no.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

let comprobante: any = {};
let nroOrden: string | null = null;
const mockCrearGuia = jest.fn(async () => ({ id: 1, nroOrden: '2965870-26', codigoGuia: '2965870-26', claveEnvio: '4200', olvaAgenciaDestinoCodigo: '145', olvaGuiaCreadaEn: null }));
const putMock = jest.fn((_url: string, _body: any) => Promise.resolve({ data: { code: 1 } }));
const getMock = jest.fn((url: string) => {
    if (url.startsWith('/envio-despacho/comprobante/')) return Promise.resolve({ data: { data: {
        transportista: 'OLVA', tipoEnvio: 'AGENCIA', agenciaDestino: 'OLVA MIRAFLORES', olvaAgenciaDestinoCodigo: '145', celularDest: '957039998',
        nroPaquetes: 1, montoCOD: 0, costoEnvio: null, nroOrden,
    } } });
    if (url.startsWith('/comprobante/')) return Promise.resolve({ data: { data: comprobante } });
    return Promise.resolve({ data: {} });
});
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string) => getMock(u), put: (u: string, b: any) => putMock(u, b), patch: (u: string, b: any) => putMock(u, b), delete: jest.fn(() => Promise.resolve({ data: { code: 1 } })), post: jest.fn() } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: jest.fn() }) }));
jest.mock('@/zustand/repartidores', () => ({ useRepartidoresStore: () => ({ repartidores: [], fetchRepartidores: () => Promise.resolve() }) }));
jest.mock('@/zustand/extentions', () => ({ useExtentionsStore: () => ({ ubigeos: [], getUbigeos: jest.fn() }) }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: (p: any) => <input aria-label={p.text} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: (p: any) => <select aria-label="turno" value={p.value} onChange={(e) => p.onChange(e.target.value)}>{(p.options || []).map((o: any) => <option key={o.id} value={o.id}>{o.value}</option>)}</select> }));
jest.mock('@/components/ShalomAgenciaSelect', () => ({ ShalomAgenciaSelect: () => null }));
jest.mock('@/components/ShalomProductoSelect', () => ({ ShalomProductoSelect: () => null }));
jest.mock('@/components/OlvaAgenciaSelect', () => ({ OlvaAgenciaSelect: () => null }));
jest.mock('@/components/EstablecimientoCombobox', () => ({ EstablecimientoCombobox: (p: any) => <input aria-label="Establecimiento" value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/services/shalom.service', () => ({ shalomService: { getInstancia: () => Promise.reject(new Error('n/a')), crearGuia: jest.fn() }, mensajeErrorShalom: (_e: any, m: string) => m }));
jest.mock('@/services/olva.service', () => ({ olvaService: { getConfig: () => Promise.resolve({ habilitado: true, habilitadoPorPlan: true, apiConfigurada: true, agenciaOrigenCodigo: '7', agenciaOrigenNombre: 'LINCE' }), crearGuia: (...a: any[]) => (mockCrearGuia as any)(...a) }, mensajeErrorOlva: (_e: any, m: string) => m }));

import { EditarDespachoModal } from '../EditarDespachoModal';

const abrir = async () => {
    comprobante = { serie: 'NV01', correlativo: 47, tipoDoc: 'NV', tipoMoneda: 'PEN', mtoImpVenta: 80, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO', cliente: { id: 1, nombre: 'ROSA QA', nroDoc: '12345678', telefono: '957039998' }, usuario: { nombre: 'VENDEDOR' } };
    render(<EditarDespachoModal comprobanteId={47} onClose={() => {}} onSuccess={() => {}} />);
    await screen.findByText(/(Re)?[Gg]enerar guía en Olva/);
};

describe('Editar Despacho · guía Olva', () => {
    beforeEach(() => { mockCrearGuia.mockClear(); putMock.mockClear(); nroOrden = null; });

    it('la primera guía se genera sin preguntar', async () => {
        await abrir();
        fireEvent.click(await screen.findByText('Generar guía en Olva'));
        await waitFor(() => expect(mockCrearGuia).toHaveBeenCalledTimes(1));
        expect(screen.queryByTestId('olva-confirmar-otra-guia')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('olva-clave-retiro')).toHaveValue('4200'));
    });

    it('regenerar avisa primero y no crea nada al cancelar', async () => {
        nroOrden = '2965869-26';
        await abrir();
        fireEvent.click(await screen.findByText('Regenerar guía en Olva'));
        expect(screen.getByTestId('olva-confirmar-otra-guia')).toHaveTextContent('La guía 2965869-26 seguirá registrada');
        expect(mockCrearGuia).not.toHaveBeenCalled();

        fireEvent.click(screen.getAllByText('Cancelar')[0]);
        expect(screen.queryByTestId('olva-confirmar-otra-guia')).not.toBeInTheDocument();
        expect(mockCrearGuia).not.toHaveBeenCalled();
    });

    it('al confirmar, crea la otra guía forzada', async () => {
        nroOrden = '2965869-26';
        await abrir();
        fireEvent.click(await screen.findByText('Regenerar guía en Olva'));
        fireEvent.click(screen.getByText('Crear otra guía'));
        await waitFor(() => expect(mockCrearGuia).toHaveBeenCalledTimes(1));
        expect((mockCrearGuia.mock.calls[0] as any[])[1]).toMatchObject({ forzar: true });
        expect(screen.queryByTestId('olva-confirmar-otra-guia')).not.toBeInTheDocument();
    });
});
