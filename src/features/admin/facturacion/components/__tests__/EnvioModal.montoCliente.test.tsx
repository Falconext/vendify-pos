/**
 * QA funcional del monto de Coordinación de Envío sobre el modal real.
 *
 * Reproduce la boleta B0A1-269 de IMPORTEMOS JUNTOS: reparto propio, el
 * vendedor escribe en "Adelanto ya pagado" y la boleta sale cobrando esa
 * plata otra vez (S/129 de producto → S/257.95 de total).
 */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const getUbigeos = jest.fn();
jest.mock('@/zustand/extentions', () => ({ useExtentionsStore: () => ({ ubigeos: [
    { codigo: '150117', departamento: 'Lima', provincia: 'Lima ', distrito: 'Los Olivos' },
], getUbigeos }) }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: jest.fn() }) }));
jest.mock('@/zustand/repartidores', () => ({ useRepartidoresStore: () => ({ repartidores: [{ id: 4, nombre: 'MOTORIZADO', celular: '999', sede: null }], fetchRepartidores: () => Promise.resolve() }) }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: (p: any) => <input aria-label={p.text} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: (p: any) => <select aria-label="turno" value={p.value} onChange={(e) => p.onChange(e.target.value)}>{(p.options || []).map((o: any) => <option key={o.id} value={o.id}>{o.value}</option>)}</select> }));
jest.mock('@/components/ShalomAgenciaSelect', () => ({ ShalomAgenciaSelect: () => null }));
jest.mock('@/components/ShalomProductoSelect', () => ({ ShalomProductoSelect: () => null }));
jest.mock('@/components/OlvaAgenciaSelect', () => ({ OlvaAgenciaSelect: () => null }));
jest.mock('@/components/EstablecimientoCombobox', () => ({ EstablecimientoCombobox: (p: any) => <input aria-label="Establecimiento" value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/services/shalom.service', () => ({ shalomService: { getInstancia: () => Promise.reject(new Error('n/a')) } }));

import { EnvioModal } from '../EnvioModal';

const base = {
    transportista: 'PROPIOS', tipoEnvio: 'DOMICILIO', agenciaDestino: 'Los Olivos', celularDest: '956443123',
    nroPaquetes: 1, turnoEnvio: 'MANANA', tipoMercaderia: '', claveEnvio: '', nroOrden: '', claveOrden: '',
    establecimiento: 'Sede Principal', repartidor: 'MOTORIZADO', repartidorId: 4, empaquetador: 'Jose Amaya',
    observaciones: '', fechaEstimada: '2026-10-05', costoEnvio: 0, pagarFlete: 'CLIENTE',
    // Estado inicial real del POS: sin valor, lo decide el contexto.
    aplicacionMontoCliente: undefined,
    nombreDestinatario: '', dniDestinatario: '', contenidoPaquete: '', montoCOD: 0, pesoKg: 0,
    tipoVentaReparto: 'SOLO_ENTREGA', distritoUbigeo: '150117', distrito: 'Los Olivos', coordenadas: '',
    formaPagoCobro: 'NO_COBRAR', revisarProducto: false,
};

let ultimo: any = null;
function Harness({ esInformal, transportista = 'PROPIOS', costoEnvio = 0, aplicacionGuardada }: { esInformal: boolean; transportista?: string; costoEnvio?: number; aplicacionGuardada?: string }) {
    const [envioData, setEnvioData] = useState<any>({ ...base, transportista, costoEnvio, aplicacionMontoCliente: aplicacionGuardada });
    ultimo = envioData;
    const vm = {
        envioData, setEnvioData, setEnvioActivo: jest.fn(), esInformal,
        formValues: { medioPago: 'Yape' }, totalCredito: 0,
        selectedClient: { nombre: 'WSP 956443123', telefono: '956443123' },
    };
    return <EnvioModal vm={vm} onClose={() => {}} />;
}

const textoDelAviso = () => screen.queryByTestId('aviso-monto-envio')?.textContent ?? '';

describe('Boleta + reparto propio — el caso que rompió B0A1-269', () => {
    beforeEach(() => { ultimo = null; });

    it('el monto escrito NO se agrega al comprobante', () => {
        render(<Harness esInformal={false} costoEnvio={128.95} />);
        expect(textoDelAviso()).toMatch(/No se agrega al comprobante/i);
        expect(textoDelAviso()).not.toMatch(/sube el total/i);
    });

    it('el aviso muestra el monto exacto', () => {
        render(<Harness esInformal={false} costoEnvio={128.95} />);
        expect(textoDelAviso()).toContain('128.95');
    });

    it('el campo sigue llamándose adelanto, porque eso es lo que hace', () => {
        render(<Harness esInformal={false} costoEnvio={128.95} />);
        expect(screen.getByText('Adelanto ya pagado (S/)')).toBeInTheDocument();
        expect(screen.queryByText('Cobro extra al cliente (S/)')).not.toBeInTheDocument();
    });

    it('la opción marcada es "Negocio absorbe", no "Item envío"', () => {
        render(<Harness esInformal={false} costoEnvio={128.95} />);
        const negocio = screen.getByRole('button', { name: 'Negocio absorbe' });
        const item = screen.getByRole('button', { name: 'Item envío' });
        expect(negocio.className).toMatch(/border-indigo-500/);
        expect(item.className).not.toMatch(/border-indigo-500/);
    });

    it('sin monto no hay ningún aviso', () => {
        render(<Harness esInformal={false} costoEnvio={0} />);
        expect(screen.queryByTestId('aviso-monto-envio')).not.toBeInTheDocument();
    });
});

describe('Si el vendedor SÍ quiere cobrarle el envío, se puede — pero avisado', () => {
    it('al elegir "Item envío" el aviso pasa a alerta y dice que sube el total', () => {
        render(<Harness esInformal={false} costoEnvio={30} />);
        fireEvent.click(screen.getByRole('button', { name: 'Item envío' }));
        expect(textoDelAviso()).toMatch(/sube el total del comprobante/i);
    });

    it('la etiqueta del campo cambia y deja de decir "adelanto"', () => {
        render(<Harness esInformal={false} costoEnvio={30} />);
        fireEvent.click(screen.getByRole('button', { name: 'Item envío' }));
        expect(screen.getByText('Cobro extra al cliente (S/)')).toBeInTheDocument();
        expect(screen.queryByText('Adelanto ya pagado (S/)')).not.toBeInTheDocument();
    });

    it('el aviso le dice qué elegir si esa plata ya la pagó', () => {
        render(<Harness esInformal={false} costoEnvio={30} />);
        fireEvent.click(screen.getByRole('button', { name: 'Item envío' }));
        expect(textoDelAviso()).toMatch(/Negocio absorbe/i);
    });

    it('la elección queda guardada en envioData para el backend', () => {
        render(<Harness esInformal={false} costoEnvio={30} />);
        fireEvent.click(screen.getByRole('button', { name: 'Item envío' }));
        expect(ultimo.aplicacionMontoCliente).toBe('ITEM_ENVIO');
        expect(ultimo.pagarFlete).toBe('CLIENTE');
    });
});

describe('No se rompe lo que ya funcionaba', () => {
    it('con courier, el flete se le sigue cobrando al cliente por defecto', () => {
        render(<Harness esInformal={false} transportista="SHALOM_PRO" costoEnvio={25} />);
        expect(textoDelAviso()).toMatch(/sube el total del comprobante/i);
        expect(screen.getByRole('button', { name: 'Item envío' }).className).toMatch(/border-indigo-500/);
    });

    it('en nota de venta el adelanto sigue siendo adelanto', () => {
        render(<Harness esInformal={true} costoEnvio={50} />);
        expect(textoDelAviso()).toMatch(/saldo pendiente/i);
        expect(screen.getByRole('button', { name: 'Adelanto' }).className).toMatch(/border-indigo-500/);
    });

    it('reparto propio con adelanto guardado (NV convertida a boleta) no vuelve a cobrar', () => {
        render(<Harness esInformal={false} costoEnvio={128.95} aplicacionGuardada="ADELANTO" />);
        expect(textoDelAviso()).toMatch(/No se agrega al comprobante/i);
    });

    it('la boleta no ofrece la opción Adelanto', () => {
        render(<Harness esInformal={false} costoEnvio={50} />);
        expect(screen.queryByRole('button', { name: 'Adelanto' })).not.toBeInTheDocument();
    });
});
