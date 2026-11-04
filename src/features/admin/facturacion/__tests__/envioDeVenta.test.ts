import * as fs from 'fs';
import * as path from 'path';
import { avisosDestinatario, envioAlCambiarCliente, envioParaSiguienteVenta, envioTieneDestino, envioVacio } from '../envioDeVenta';

const ana = { nombre: 'ANA PRIMERA', telefono: '911111111', direccion: 'Av. Primera 111', distrito: 'Comas', nroDoc: '41111111' };
const beto = { nombre: 'BETO SEGUNDO', telefono: '922222222', direccion: 'Jr. Segundo 222', distrito: 'Lince' };
const cargado = () => ({
    ...envioVacio('Caja'),
    transportista: 'PROPIOS', tipoEnvio: 'DOMICILIO', turnoEnvio: 'TARDE', establecimiento: 'PRINCIPAL', repartidor: 'Moto', repartidorId: 3,
    agenciaDestino: 'Av. Primera 111', celularDest: '911111111', nombreDestinatario: 'ANA PRIMERA', distrito: 'Comas', distritoUbigeo: '150110',
    dniDestinatario: '41111111', claveEnvio: '1234', nroOrden: '99', costoEnvio: 10, montoCOD: 50, coordenadas: '-12,-77', observaciones: 'tocar timbre', fechaEstimada: '2026-11-04',
});

describe('entre una venta y la siguiente', () => {
    it('no queda nada del cliente anterior', () => {
        const e = envioParaSiguienteVenta(cargado());
        expect(envioTieneDestino(e)).toBe(false);
        expect(e).toMatchObject({ agenciaDestino: '', celularDest: '', nombreDestinatario: '', distrito: '', distritoUbigeo: '', dniDestinatario: '', claveEnvio: '', nroOrden: '', costoEnvio: 0, montoCOD: 0, coordenadas: '', observaciones: '', fechaEstimada: '' });
    });

    it('se conserva cómo trabaja la caja', () => {
        expect(envioParaSiguienteVenta(cargado())).toMatchObject({ transportista: 'PROPIOS', tipoEnvio: 'DOMICILIO', turnoEnvio: 'TARDE', establecimiento: 'PRINCIPAL', repartidor: 'Moto', repartidorId: 3, empaquetador: 'Caja' });
    });

    it('al emitir "Nueva venta" se limpia todo lo que es de la venta', () => {
        const src = fs.readFileSync(path.join(__dirname, '../useFacturacionViewModel.ts'), 'utf8');
        const cierre = src.slice(src.indexOf('const closeModalResponse'), src.indexOf('getAllProducts(refreshParams', src.indexOf('const closeModalResponse')));
        for (const set of ['setEnvioActivo(false)', 'envioParaSiguienteVenta', 'setAdelanto(0)', 'setDescontarStockNP(false)', 'setFechaRecojo(', 'setDescuentoPctNV(0)', 'setDescuentoSolesNV(0)', 'setFechaVencimientoCredito(', 'setFechaEmisionManual(', 'setPaymentDetail(', 'setAnticipos([])', 'setVendedorCampoId(null)']) {
            expect(cierre).toContain(set);
        }
    });
});

describe('cambiar de cliente con el envío cargado', () => {
    const deAna = () => ({ ...envioVacio(), agenciaDestino: ana.direccion, celularDest: ana.telefono, nombreDestinatario: ana.nombre, distrito: ana.distrito, distritoUbigeo: '150110', shalomAgenciaDestinoId: '7', dniDestinatario: ana.nroDoc });

    it('lo que vino del anterior se reemplaza por lo del nuevo', () => {
        const { envio, quedoAMano } = envioAlCambiarCliente(deAna(), ana, beto);
        expect(envio).toMatchObject({ agenciaDestino: beto.direccion, celularDest: beto.telefono, nombreDestinatario: beto.nombre, distrito: beto.distrito, distritoUbigeo: '', shalomAgenciaDestinoId: '', dniDestinatario: '' });
        expect(quedoAMano).toBe(false);
    });

    it('lo escrito a mano se respeta y avisa', () => {
        const { envio, quedoAMano } = envioAlCambiarCliente({ ...deAna(), agenciaDestino: 'Oficina de mi tía', nombreDestinatario: 'TÍA ROSA' }, ana, beto);
        expect(envio).toMatchObject({ agenciaDestino: 'Oficina de mi tía', nombreDestinatario: 'TÍA ROSA', celularDest: beto.telefono, distrito: beto.distrito });
        expect(quedoAMano).toBe(true);
    });

    it('sin datos del cliente nuevo no deja los del anterior', () => {
        const { envio } = envioAlCambiarCliente(deAna(), ana, { nombre: 'CARLA TERCERA' });
        expect(envio).toMatchObject({ agenciaDestino: '', celularDest: '', distrito: '', nombreDestinatario: 'CARLA TERCERA' });
    });

    it('salir de un cliente genérico no borra lo escrito a mano ni da aviso falso', () => {
        const manual = { ...envioVacio(), nombreDestinatario: 'LUIS', celularDest: '933333333' };
        const { envio, quedoAMano } = envioAlCambiarCliente(manual, { nombre: 'CLIENTES VARIOS', nroDoc: '10000000' }, beto);
        expect(envio).toMatchObject({ nombreDestinatario: 'LUIS', celularDest: '933333333', agenciaDestino: beto.direccion });
        expect(quedoAMano).toBe(false);
    });
});

describe('avisos cuando el envío no coincide con el cliente', () => {
    const cliente = { nombre: 'DIAZ ALTAMIRANO, SOLEDAD', telefono: '900 542 174' };

    it('el caso de ZABDI avisa por el nombre y por el celular', () => {
        expect(avisosDestinatario({ nombreDestinatario: 'ALFARO AVILA, ELIZABETH', celularDest: '968702413' }, cliente)).toEqual([
            'Recibe "ALFARO AVILA, ELIZABETH", pero la venta es de "DIAZ ALTAMIRANO, SOLEDAD".',
            'El celular del envío (968702413) no es el del cliente (900542174).',
        ]);
    });

    it('los datos del cliente, escritos distinto, no avisan', () => {
        expect(avisosDestinatario({ nombreDestinatario: 'Soledad Díaz', celularDest: '900542174' }, cliente)).toEqual([]);
    });

    it('sin cliente real no hay con qué comparar', () => {
        expect(avisosDestinatario({ nombreDestinatario: 'LUIS', celularDest: '968702413' }, { nombre: 'CLIENTES VARIOS' })).toEqual([]);
        expect(avisosDestinatario({ nombreDestinatario: 'LUIS', celularDest: '968702413' }, null)).toEqual([]);
    });

    it('un cliente sin celular no avisa por el celular', () => {
        expect(avisosDestinatario({ celularDest: '968702413' }, { nombre: 'ANA' })).toEqual([]);
    });
});
