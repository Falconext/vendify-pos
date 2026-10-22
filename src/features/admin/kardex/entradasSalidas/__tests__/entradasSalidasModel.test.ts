/**
 * Entradas y salidas de mercadería: la lista se arma como el carrito del POS.
 * Pedido de un cliente que venía de un sistema con Inventario → Entradas /
 * Salidas, donde agregaba producto, cantidad y seguía.
 */
import {
    agregarALista,
    armarPayload,
    avisoDeFila,
    etiquetaVariante,
    problemasPorClave,
    stockEnSede,
    sugiereCompra,
    totalUnidades,
    varianteQueFalta,
    type Linea,
} from '../EntradasSalidasModel';

const base = (cambios: Partial<Linea> = {}): Omit<Linea, 'key'> => ({
    productoId: 1,
    codigo: 'P1',
    descripcion: 'Cemento',
    variante: null,
    unidad: 'NIU',
    stockSede: 10,
    cantidad: 1,
    costoUnitario: '',
    lote: '',
    vence: '',
    lotes: [],
    ...cambios,
});

describe('armar la lista', () => {
    it('escanear dos veces el mismo producto suma uno, no repite la fila', () => {
        let { lista } = agregarALista([], base(), 'a');
        ({ lista } = agregarALista(lista, base(), 'b'));
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({ key: 'a', cantidad: 2 });
    });

    it('otro producto va en su propia fila', () => {
        let { lista } = agregarALista([], base(), 'a');
        const r = agregarALista(lista, base({ productoId: 2 }), 'b');
        expect(r.lista).toHaveLength(2);
        expect(r.key).toBe('b');
    });

    it('cuenta las unidades de todas las filas', () => {
        expect(totalUnidades([{ ...base({ cantidad: 1.5 }), key: 'a' }, { ...base({ cantidad: 2 }), key: 'b' }])).toBe(3.5);
    });
});

describe('lo que se manda al servidor', () => {
    const lista: Linea[] = [
        { ...base({ cantidad: 3, costoUnitario: '12.5', lote: 'l-1', vence: '2027-01-31' }), key: 'a' },
        { ...base({ productoId: 2, cantidad: 1 }), key: 'b' },
    ];

    it('en una entrada lleva costo y lote', () => {
        expect(armarPayload('ENTRADA', 'INVENTARIO_INICIAL', '  ', lista)).toEqual({
            tipo: 'ENTRADA',
            motivo: 'INVENTARIO_INICIAL',
            detalle: undefined,
            items: [
                { productoId: 1, cantidad: 3, costoUnitario: 12.5, lote: 'L-1', vence: '2027-01-31' },
                { productoId: 2, cantidad: 1 },
            ],
        });
    });

    it('en una salida no manda costo: se valoriza al costo que ya tiene', () => {
        expect(armarPayload('SALIDA', 'MERMA', 'rotos', lista).items[0]).not.toHaveProperty('costoUnitario');
    });

    it('los avisos del servidor vuelven a su fila', () => {
        expect(problemasPorClave(lista, [{ linea: 2, mensaje: 'Sin stock.' }])).toEqual({ b: 'Sin stock.' });
    });
});

describe('avisos antes de guardar', () => {
    const ctx = { loteObligatorio: false };
    it('salida mayor al stock de la sede', () => {
        expect(avisoDeFila('SALIDA', { ...base({ cantidad: 11 }), key: 'a' }, ctx)).toBe('Solo hay 10 en esta sede.');
        expect(avisoDeFila('ENTRADA', { ...base({ cantidad: 11 }), key: 'a' }, ctx)).toBeNull();
    });

    it('cantidad vacía o cero', () => {
        expect(avisoDeFila('ENTRADA', { ...base({ cantidad: NaN }), key: 'a' }, ctx)).toMatch(/mayor que cero/);
    });

    it('farmacia: la entrada pide lote, y vencimiento si el lote es nuevo', () => {
        const farmacia = { loteObligatorio: true };
        expect(avisoDeFila('ENTRADA', { ...base(), key: 'a' }, farmacia)).toBe('Indica el lote.');
        expect(avisoDeFila('ENTRADA', { ...base({ lote: 'L9' }), key: 'a' }, farmacia)).toMatch(/vencimiento/);
        const conLote = base({ lote: 'L1', lotes: [{ lote: 'L1', stockActual: 5, fechaVencimiento: '2027-01-01', activo: true }] });
        expect(avisoDeFila('ENTRADA', { ...conLote, key: 'a' }, farmacia)).toBeNull();
    });

    it('salida de un lote con menos de lo pedido', () => {
        const l = base({ cantidad: 6, lote: 'L1', lotes: [{ lote: 'L1', stockActual: 5, fechaVencimiento: '2027-01-01', activo: true }] });
        expect(avisoDeFila('SALIDA', { ...l, key: 'a' }, ctx)).toBe('El lote L1 tiene 5.');
    });
});

describe('detalles', () => {
    it('nombre de la talla como en el POS', () => {
        expect(etiquetaVariante({ Color: 'Negro', Talla: 'M' })).toBe('Negro / M');
        expect(etiquetaVariante(null)).toBeNull();
    });

    it('stock de la sede activa, no el global', () => {
        expect(stockEnSede({ stock: 99, stocks: [{ sedeId: 1, stock: '4.000' }, { sedeId: 2, stock: 9 }] }, 1)).toBe(4);
        expect(stockEnSede({ stock: 99, stocks: [] }, 1)).toBe(0);
    });

    it('recuerda Compras solo cuando puede ser una compra', () => {
        expect(sugiereCompra('ENTRADA', 'INVENTARIO_INICIAL')).toBe(true);
        expect(sugiereCompra('ENTRADA', 'DEVOLUCION_CLIENTE')).toBe(false);
        expect(sugiereCompra('SALIDA', 'OTRO')).toBe(false);
    });
});

describe('nombre de variantes', () => {
    it('no repite la talla si el nombre ya la trae', () => {
        expect(varianteQueFalta('Polo básico - L / Blanco', { Talla: 'L', Color: 'Blanco' })).toBeNull();
        expect(varianteQueFalta('Polo básico', { Talla: 'L', Color: 'Blanco' })).toBe('L / Blanco');
    });
});
