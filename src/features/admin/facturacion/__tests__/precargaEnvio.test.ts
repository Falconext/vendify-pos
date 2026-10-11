/**
 * Qué se trae solo del cliente al coordinar el envío.
 *
 * Hasta ahora solo venía el celular, aunque el cliente también tiene dirección
 * y distrito guardados. El vendedor los retipeaba en cada venta.
 */
import { celularUtil, precargaDesdeCliente } from '../precargaEnvio';

const CLIENTE = {
    nombre: 'MONZON CHACON AFRIKA',
    telefono: '920780797',
    direccion: 'AV. PERU 123, DPTO 201',
    distrito: 'Ate',
};
const VACIO = { celularDest: '', agenciaDestino: '', distrito: '', nombreDestinatario: '' };

describe('Lo que trae de un cliente con todo cargado', () => {
    it('trae los cuatro campos', () => {
        expect(precargaDesdeCliente(CLIENTE, VACIO)).toEqual({
            celularDest: '920780797',
            agenciaDestino: 'AV. PERU 123, DPTO 201',
            distrito: 'Ate',
            nombreDestinatario: 'MONZON CHACON AFRIKA',
        });
    });

    it('con un cliente a medio cargar, trae solo lo que tiene', () => {
        const parcial = { nombre: 'JUAN PEREZ', telefono: null, direccion: 'JR. LIMA 45', distrito: null };
        expect(precargaDesdeCliente(parcial, VACIO)).toEqual({
            agenciaDestino: 'JR. LIMA 45',
            nombreDestinatario: 'JUAN PEREZ',
        });
    });
});

describe('NUNCA pisa lo que el usuario ya escribió', () => {
    it('si la dirección ya tiene algo, no la toca', () => {
        const r = precargaDesdeCliente(CLIENTE, { ...VACIO, agenciaDestino: 'OTRA DIRECCION' });
        expect(r.agenciaDestino).toBeUndefined();
        expect(r.distrito).toBe('Ate'); // los demás sí
    });

    it('si el formulario está completo, no devuelve nada', () => {
        const lleno = { celularDest: '911111111', agenciaDestino: 'X', distrito: 'Y', nombreDestinatario: 'Z' };
        expect(precargaDesdeCliente(CLIENTE, lleno)).toEqual({});
    });

    it('un guion cuenta como vacío: lo deja una importación sin dato', () => {
        const r = precargaDesdeCliente(CLIENTE, { ...VACIO, agenciaDestino: '-' });
        expect(r.agenciaDestino).toBe('AV. PERU 123, DPTO 201');
    });

    it('y un guion en el cliente NO se precarga', () => {
        const sinDato = { ...CLIENTE, direccion: '-' };
        expect(precargaDesdeCliente(sinDato, VACIO).agenciaDestino).toBeUndefined();
    });
});

describe('Un cliente genérico no aporta nada', () => {
    it('CLIENTES VARIOS no precarga', () => {
        // Es el caso del mostrador: lo que haya ahí no es de nadie.
        expect(precargaDesdeCliente({ ...CLIENTE, nombre: 'CLIENTES VARIOS' }, VACIO)).toEqual({});
        expect(precargaDesdeCliente({ ...CLIENTE, nombre: 'Cliente Varios' }, VACIO)).toEqual({});
    });

    it('un registro hecho solo con el WhatsApp tampoco', () => {
        expect(precargaDesdeCliente({ ...CLIENTE, nombre: 'WSP 987654321' }, VACIO)).toEqual({});
    });

    it('sin cliente, nada', () => {
        expect(precargaDesdeCliente(null, VACIO)).toEqual({});
        expect(precargaDesdeCliente(undefined, VACIO)).toEqual({});
    });
});

describe('El celular solo se precarga si sirve', () => {
    it('un celular peruano válido pasa', () => {
        expect(celularUtil('920780797')).toBe('920780797');
    });

    it('acepta el número con espacios o guiones, como se copia de WhatsApp', () => {
        expect(celularUtil('920 780 797')).toBe('920780797');
        expect(celularUtil('920-780-797')).toBe('920780797');
    });

    it('un fijo NO se precarga: el courier no puede avisar por ahí', () => {
        expect(celularUtil('014251234')).toBe('');
    });

    it('ni uno a medio cargar, ni uno de más dígitos', () => {
        expect(celularUtil('9207807')).toBe('');
        expect(celularUtil('51920780797')).toBe('');
    });

    it('vacío o nulo no rompe', () => {
        expect(celularUtil('')).toBe('');
        expect(celularUtil(null)).toBe('');
        expect(celularUtil(undefined)).toBe('');
    });

    it('un cliente con fijo trae lo demás pero no el teléfono', () => {
        const conFijo = { ...CLIENTE, telefono: '014251234' };
        const r = precargaDesdeCliente(conFijo, VACIO);
        expect(r.celularDest).toBeUndefined();
        expect(r.agenciaDestino).toBe('AV. PERU 123, DPTO 201');
    });
});

describe('Bordes', () => {
    it('sin estado actual, precarga igual', () => {
        expect(precargaDesdeCliente(CLIENTE, null).distrito).toBe('Ate');
    });

    it('limpia espacios de más', () => {
        const sucio = { nombre: '  JUAN  ', telefono: '920780797', direccion: '  JR. LIMA 45  ', distrito: ' Ate ' };
        const r = precargaDesdeCliente(sucio, VACIO);
        expect(r.nombreDestinatario).toBe('JUAN');
        expect(r.agenciaDestino).toBe('JR. LIMA 45');
        expect(r.distrito).toBe('Ate');
    });
});
