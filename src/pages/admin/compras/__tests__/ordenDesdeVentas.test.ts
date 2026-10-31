import { cantidadAPedir, observacionDeOrigen } from '../ordenDesdeVentas';

describe('cuánto pedir al proveedor desde notas de venta', () => {
    it('sin descontar stock se pide todo lo vendido', () => {
        expect(cantidadAPedir({ productoId: 1, cantidadVendida: 7, stock: 3 }, false)).toBe(7);
    });
    it('descontando stock se pide solo lo que falta y nunca negativo', () => {
        expect(cantidadAPedir({ productoId: 1, cantidadVendida: 7, stock: 3 }, true)).toBe(4);
        expect(cantidadAPedir({ productoId: 1, cantidadVendida: 2, stock: 9 }, true)).toBe(0);
        expect(cantidadAPedir({ productoId: 1, cantidadVendida: 2.5, stock: 1 }, true)).toBe(2);
        expect(cantidadAPedir({ productoId: 1, cantidadVendida: 3, stock: -4 }, true)).toBe(3);
    });
    it('un ítem libre no tiene stock: se pide lo vendido', () => {
        expect(cantidadAPedir({ productoId: null, cantidadVendida: 5, stock: 0 }, true)).toBe(5);
    });
    it('la observación nombra las notas sin ceros de relleno', () => {
        expect(observacionDeOrigen([
            { id: 1, documento: 'NV01-00000025', cliente: 'Ana', ordenes: [] },
            { id: 2, documento: 'NP01-00000001', cliente: null, ordenes: [] },
        ])).toBe('Pedidos de clientes: NV01-25, NP01-1');
    });
});
