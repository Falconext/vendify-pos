/** Los 400 del pedido (mensajes exactos del contrato) → qué hace la tienda. */
import { accionParaErrorDePedido } from '../erroresPedido';

describe('accionParaErrorDePedido', () => {
    it.each([
        ['Elige la sede donde quieres comprar.', 'ELEGIR_SEDE'],
        ['La sede elegida no está disponible en esta tienda.', 'SEDE_INVALIDA'],
        ['Polo azul no está disponible en Norte.', 'REVISAR_CARRITO'],
        ['Polo azul no está disponible.', 'REVISAR_CARRITO'],
        ['Stock insuficiente para Polo azul en Norte. Disponible: 2', 'REVISAR_CARRITO'],
        ['Stock insuficiente para Polo azul. Disponible: 0', 'REVISAR_CARRITO'],
        ['El teléfono es requerido', null],
        ['', null],
        [undefined, null],
    ])('%s → %s', (mensaje, accion) => {
        expect(accionParaErrorDePedido(mensaje)).toBe(accion);
    });
});
