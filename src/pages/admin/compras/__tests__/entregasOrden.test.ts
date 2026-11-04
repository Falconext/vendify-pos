import { armarLlegadas, errorDeLlegadas, llegaTodo, pendienteDe, progresoOrden } from '../entregasOrden';

const lineas = [
    { id: 1, descripcion: 'Zapato 38', cantidad: '100', cantidadRecibida: '60' },
    { id: 2, descripcion: 'Zapato 39', cantidad: 50, cantidadRecibida: 0 },
];

describe('entregas de una orden de compra', () => {
    it('calcula lo pendiente y el avance', () => {
        expect(pendienteDe(lineas[0])).toBe(40);
        expect(progresoOrden(lineas)).toEqual({ recibido: 60, pedido: 150 });
    });

    it('arma lo que llega y sabe si completa la orden', () => {
        expect(armarLlegadas(lineas, { 1: '40', 2: '' })).toEqual([
            { detalleId: 1, cantidad: 40 },
            { detalleId: 2, cantidad: 0 },
        ]);
        expect(llegaTodo(lineas, { 1: '40', 2: '10' })).toBe(false);
        expect(llegaTodo(lineas, { 1: '40', 2: '50' })).toBe(true);
    });

    it('avisa si se pasa de lo que falta o no llega nada', () => {
        expect(errorDeLlegadas(lineas, { 1: '41' })).toBe('De "Zapato 38" faltan 40: no pueden llegar 41.');
        expect(errorDeLlegadas(lineas, {})).toBe('Indica cuánto llegó de al menos un producto.');
        expect(errorDeLlegadas(lineas, { 2: '5' })).toBeNull();
    });
});
