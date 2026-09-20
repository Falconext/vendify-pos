/**
 * QA del modal "Coordinación de Envío" del POS en modo Reparto propio: al elegir
 * el chip aparece la misma sección del motorizado que en Editar despacho, el
 * tipo de venta se propone según lo que quede por cobrar y los campos nuevos
 * llegan al envioData que después se manda al backend.
 */
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const getUbigeos = jest.fn();
jest.mock('@/zustand/extentions', () => ({ useExtentionsStore: () => ({ ubigeos: [
    { codigo: '150102', departamento: 'Lima', provincia: 'Lima ', distrito: 'Ancón' },
    { codigo: '150103', departamento: 'Lima', provincia: 'Lima ', distrito: 'Ate' },
    { codigo: '040103', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Cayma' },
], getUbigeos }) }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: jest.fn() }) }));
jest.mock('@/zustand/repartidores', () => ({ useRepartidoresStore: () => ({ repartidores: [{ id: 7, nombre: 'PEDRO MOTO', celular: '999', sede: null }], fetchRepartidores: () => Promise.resolve() }) }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: (p: any) => <input aria-label={p.text} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: (p: any) => <select aria-label="turno" value={p.value} onChange={(e) => p.onChange(e.target.value)}>{(p.options || []).map((o: any) => <option key={o.id} value={o.id}>{o.value}</option>)}</select> }));
jest.mock('@/components/ShalomAgenciaSelect', () => ({ ShalomAgenciaSelect: () => null }));
jest.mock('@/components/EstablecimientoCombobox', () => ({ EstablecimientoCombobox: (p: any) => <input aria-label="Establecimiento" value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));

import { EnvioModal } from '../EnvioModal';

const inicial = {
    transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA', agenciaDestino: '', celularDest: '', nroPaquetes: 1, turnoEnvio: 'MANANA',
    tipoMercaderia: '', claveEnvio: '', nroOrden: '', claveOrden: '', establecimiento: '', repartidor: '', repartidorId: null,
    empaquetador: 'ADMIN', observaciones: '', fechaEstimada: '', costoEnvio: 0, pagarFlete: 'CLIENTE', aplicacionMontoCliente: 'ADELANTO',
    nombreDestinatario: '', dniDestinatario: '', contenidoPaquete: '', montoCOD: 0, pesoKg: 0, shalomTipoProducto: undefined,
    tipoVentaReparto: '', distritoUbigeo: '', distrito: '', coordenadas: '', formaPagoCobro: '', revisarProducto: false,
};

let ultimo: any = null;
function Harness({ medioPago, totalCredito, cliente }: { medioPago: string; totalCredito: number; cliente: string }) {
    const [envioData, setEnvioData] = useState<any>(inicial);
    ultimo = envioData;
    const vm = { envioData, setEnvioData, setEnvioActivo: jest.fn(), esInformal: true, formValues: { medioPago }, totalCredito, selectedClient: { nombre: cliente, telefono: '957039998' } };
    return <EnvioModal vm={vm} onClose={() => {}} />;
}

const abrirPropio = async (props: Partial<{ medioPago: string; totalCredito: number; cliente: string }> = {}) => {
    render(<Harness medioPago={props.medioPago ?? 'Efectivo'} totalCredito={props.totalCredito ?? 0} cliente={props.cliente ?? 'ROSA QA'} />);
    fireEvent.click(screen.getByText('Reparto propio'));
    await screen.findByTestId('seccion-reparto-propio');
};

describe('Coordinación de Envío (POS) · Reparto propio', () => {
    beforeEach(() => { getUbigeos.mockClear(); ultimo = null; });

    it('sin Reparto propio no muestra la sección del motorizado ni pide ubigeos', () => {
        render(<Harness medioPago="Efectivo" totalCredito={0} cliente="ROSA QA" />);
        expect(screen.queryByTestId('seccion-reparto-propio')).not.toBeInTheDocument();
        expect(screen.getByText('Datos de entrega')).toBeInTheDocument();
        expect(getUbigeos).not.toHaveBeenCalled();
    });

    it('al elegir Reparto propio muestra la sección, pasa a domicilio y oculta "Datos de entrega"', async () => {
        await abrirPropio();
        expect(screen.getByText('Reparto propio / motorizado')).toBeInTheDocument();
        expect(screen.queryByText('Datos de entrega')).not.toBeInTheDocument();
        expect(screen.getByText('Contraentrega')).toBeInTheDocument();
        expect(screen.getByText('Coordenadas (opcional)')).toBeInTheDocument();
        expect(screen.getByText('El cliente puede revisar el producto antes de pagar.')).toBeInTheDocument();
        expect(ultimo.tipoEnvio).toBe('DOMICILIO');
        expect(screen.getByDisplayValue('A domicilio')).toBeInTheDocument();
    });

    it('venta pagada en caja → propone "Solo entrega" y no cobra en destino', async () => {
        await abrirPropio({ medioPago: 'Efectivo' });
        expect(ultimo.tipoVentaReparto).toBe('SOLO_ENTREGA');
        expect(ultimo.formaPagoCobro).toBe('NO_COBRAR');
        expect(screen.queryByText('Monto a cobrar al entregar (S/)')).not.toBeInTheDocument();
        expect(screen.queryByText(/Queda por cobrar/)).not.toBeInTheDocument();
    });

    it('venta a crédito con saldo → propone "Contraentrega" en efectivo y muestra lo que queda por cobrar', async () => {
        await abrirPropio({ medioPago: 'Crédito', totalCredito: 35 });
        expect(ultimo.tipoVentaReparto).toBe('CONTRAENTREGA');
        expect(ultimo.formaPagoCobro).toBe('EFECTIVO');
        expect(screen.getByText(/Queda por cobrar/)).toBeInTheDocument();
        expect(screen.getByText('S/ 35.00')).toBeInTheDocument();
        expect(screen.getByText('Monto a cobrar al entregar (S/)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/S\/ 35\.00/)).toBeInTheDocument();
    });

    it('cambiar a "Cambio" apaga el cobro; volver a "Contraentrega + cambio" lo enciende en efectivo', async () => {
        await abrirPropio({ medioPago: 'Crédito', totalCredito: 35 });
        fireEvent.click(screen.getByText('Cambio'));
        expect(ultimo.tipoVentaReparto).toBe('CAMBIO');
        expect(ultimo.formaPagoCobro).toBe('NO_COBRAR');
        fireEvent.click(screen.getByText('Contraentrega + cambio'));
        expect(ultimo.tipoVentaReparto).toBe('CONTRAENTREGA_CAMBIO');
        expect(ultimo.formaPagoCobro).toBe('EFECTIVO');
    });

    it('el distrito se resuelve desde ubigeos (Lima primero) y guarda nombre + código', async () => {
        await abrirPropio();
        expect(getUbigeos).not.toHaveBeenCalled(); // ya hay ubigeos en el store
        const distrito = screen.getByPlaceholderText(/Escribe el distrito/);
        fireEvent.focus(distrito);
        fireEvent.change(distrito, { target: { value: 'an' } });
        fireEvent.click(await screen.findByText('Ancón'));
        expect(ultimo.distrito).toBe('Ancón');
        expect(ultimo.distritoUbigeo).toBe('150102');
        expect(screen.getByDisplayValue('Ancón')).toBeInTheDocument();
    });

    it('dirección, nombre de quien recibe, coordenadas, monto, forma de pago y revisar producto viajan al envioData', async () => {
        await abrirPropio({ medioPago: 'Crédito', totalCredito: 35 });
        fireEvent.change(screen.getByPlaceholderText(/Calle, número, referencia/), { target: { value: 'Av. Perú 123' } });
        fireEvent.change(screen.getByPlaceholderText(/Si queda vacío se usa el cliente: ROSA QA/), { target: { value: 'JUAN RECIBE' } });
        fireEvent.change(screen.getByPlaceholderText(/pegar de Google Maps/), { target: { value: '-12.1,-77.0' } });
        fireEvent.change(screen.getByPlaceholderText(/lo que falta por pagar/), { target: { value: '20' } });
        fireEvent.change(screen.getByDisplayValue('Efectivo'), { target: { value: 'YAPE' } });
        fireEvent.click(screen.getByLabelText('El cliente puede revisar el producto antes de pagar.'));
        await waitFor(() => expect(ultimo.revisarProducto).toBe(true));
        expect(ultimo).toMatchObject({ agenciaDestino: 'Av. Perú 123', tipoEnvio: 'DOMICILIO', nombreDestinatario: 'JUAN RECIBE', coordenadas: '-12.1,-77.0', montoCOD: 20, formaPagoCobro: 'YAPE', tipoVentaReparto: 'CONTRAENTREGA' });
    });

    it('cliente "WSP 9…" o "CLIENTES VARIOS" pide el nombre de quien recibe en vez de proponer el del cliente', async () => {
        await abrirPropio({ cliente: 'WSP 966666666' });
        expect(screen.getByPlaceholderText(/se registró solo con WhatsApp/)).toBeInTheDocument();
    });

    it('sin tipo de venta previo, elegir Reparto propio dos veces no pisa lo que el usuario ya eligió', async () => {
        await abrirPropio({ medioPago: 'Crédito', totalCredito: 35 });
        fireEvent.click(screen.getByText('Recojo'));
        fireEvent.click(screen.getByText('Shalom PRO'));
        fireEvent.click(screen.getByText('Reparto propio'));
        expect(ultimo.tipoVentaReparto).toBe('RECOJO');
    });
});
