/**
 * Qué hacer con un 400 de `POST /public/store/:slug/orders` (mensajes exactos
 * del contrato de stock por sede):
 * - "Elige la sede donde quieres comprar."            → abrir el selector.
 * - "La sede elegida no está disponible en esta tienda." → olvidar la sede y elegir otra.
 * - "<x> no está disponible[ en <sede>]." / "Stock insuficiente para …" → revisar el carrito.
 */
export type AccionErrorPedido = 'ELEGIR_SEDE' | 'SEDE_INVALIDA' | 'REVISAR_CARRITO';

export function accionParaErrorDePedido(mensaje: unknown): AccionErrorPedido | null {
    const m = String(mensaje ?? '').trim();
    if (!m) return null;
    if (/^Elige la sede donde quieres comprar/i.test(m)) return 'ELEGIR_SEDE';
    if (/^La sede elegida no está disponible/i.test(m)) return 'SEDE_INVALIDA';
    if (/^Stock insuficiente para /i.test(m) || / no está disponible( en .+)?\.?$/i.test(m)) return 'REVISAR_CARRITO';
    return null;
}
