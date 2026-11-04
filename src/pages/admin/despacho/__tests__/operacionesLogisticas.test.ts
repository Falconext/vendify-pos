import {
    codigoDocumento,
    consolidarPicking,
    destinoTxt,
    enviosDelAlcance,
    esEnvioOperable,
    kpisOperaciones,
    type OperacionEnvio,
} from '../operacionesLogisticas';
import type { VentaPanelItem } from '../usePanelVentasViewModel';

const fila = (o: Partial<VentaPanelItem>): VentaPanelItem =>
    ({ id: 1, comprobanteId: 1, estadoDespacho: 'PREPARANDO', esConvertida: false, despachoEnComprobanteId: null, saldo: 0, ...o }) as VentaPanelItem;

const envio = (referencia: string, items: [string, string, number][], nombre = 'Cliente'): OperacionEnvio =>
    ({
        referencia,
        nombre,
        courierLabel: 'Shalom',
        items: items.map(([codigo, descripcion, cantidad]) => ({ codigo, descripcion, cantidad, unidad: 'NIU', imagenUrl: null })),
    }) as OperacionEnvio;

describe('qué envíos entran en las operaciones', () => {
    it('deja fuera ventas sin despacho, devueltas, convertidas y las que van en el paquete de otra', () => {
        expect(esEnvioOperable(fila({}))).toBe(true);
        expect(esEnvioOperable(fila({ estadoDespacho: 'NO_APLICA' }))).toBe(false);
        expect(esEnvioOperable(fila({ estadoDespacho: 'DEVUELTO' }))).toBe(false);
        expect(esEnvioOperable(fila({ esConvertida: true }))).toBe(false);
        expect(esEnvioOperable(fila({ despachoEnComprobanteId: 9 }))).toBe(false);
        expect(esEnvioOperable(fila({ comprobanteId: null }))).toBe(false);
    });

    it('"Por preparar" son solo los que están en preparación', () => {
        const items = [fila({ id: 1 }), fila({ id: 2, estadoDespacho: 'EN_CAMINO' }), fila({ id: 3, estadoDespacho: 'ENTREGADO' })];
        expect(enviosDelAlcance(items, 'POR_PREPARAR').map((i) => i.id)).toEqual([1]);
        expect(enviosDelAlcance(items, 'TODOS')).toHaveLength(3);
    });

    it('cuenta el día y lo que falta cobrar en ruta (no lo ya entregado)', () => {
        const k = kpisOperaciones([
            fila({ saldo: 100 }),
            fila({ estadoDespacho: 'EN_CAMINO', saldo: 50 }),
            fila({ estadoDespacho: 'EN_DESTINO' }),
            fila({ estadoDespacho: 'ENTREGADO', saldo: 999 }),
            fila({ estadoDespacho: 'NO_APLICA', saldo: 70 }),
        ]);
        expect(k).toEqual({ envios: 4, porPreparar: 1, enTransito: 2, entregados: 1, porCobrar: 150 });
    });
});

describe('picking', () => {
    it('cada producto una vez, con sus pedidos, y primero lo que más se saca', () => {
        const r = consolidarPicking([
            envio('NV01-448', [['00022', 'TRIPODE', 1], ['00026', 'JAULA LED', 1]], 'DELZO'),
            envio('NV01-449', [['00022', 'TRIPODE', 1]], 'PUMA'),
            envio('NV01-450', [['00022', 'TRIPODE', 1]], 'GOMEZ'),
        ]);
        expect(r[0]).toMatchObject({ codigo: '00022', total: 3 });
        expect(r[0].lineas.map((l) => l.cliente)).toEqual(['DELZO', 'PUMA', 'GOMEZ']);
        expect(r[1]).toMatchObject({ codigo: '00026', total: 1 });
    });

    it('el mismo producto repetido en un pedido suma en una sola línea', () => {
        const r = consolidarPicking([envio('NV01-1', [['A', 'CABLE', 1], ['A', 'CABLE', 2]])]);
        expect(r[0].lineas).toEqual([{ referencia: 'NV01-1', cliente: 'Cliente', courier: 'Shalom', cantidad: 3 }]);
    });
});

describe('documento', () => {
    it('código con tipo, día y hora', () => {
        expect(codigoDocumento('PICKING', new Date(2026, 9, 29, 13, 42))).toBe('PK-291026-1342');
        expect(codigoDocumento('PACKING', new Date(2026, 9, 29, 9, 5))).toBe('PA-291026-0905');
    });

    it('destino: la agencia si va por agencia; si no, distrito y dirección', () => {
        expect(destinoTxt({ agencia: 'Shalom Cusco', distrito: 'x', direccion: 'y' })).toBe('Shalom Cusco');
        expect(destinoTxt({ agencia: '', distrito: 'Ate', direccion: 'Av. 1' })).toBe('Ate · Av. 1');
        expect(destinoTxt({ agencia: '', distrito: '', direccion: '' })).toBe('Sin destino');
    });
});
