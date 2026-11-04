/**
 * Sede de un pedido de la tienda al documentarlo (stock por sede).
 *
 * - Pedido CON sede: su comprobante tiene que salir de esa sede. Desde el punto
 *   de venta se emite en la sede activa del cajero, así que si es otra el
 *   backend responde 409; la web avisa antes.
 * - Pedido SIN sede (modo "Todas las sedes") en empresa con varias: al generar
 *   la nota se elige de qué sede sale (por defecto, la activa del usuario).
 */
export interface SedeRef {
    id: number;
    nombre: string;
}

/** ¿El pedido es de otra sede que la activa? (sin sede o sin sede activa: no) */
export function esDeOtraSede(pedidoSedeId: number | null | undefined, sedeActivaId: number | null | undefined): boolean {
    return !!pedidoSedeId && !!sedeActivaId && pedidoSedeId !== sedeActivaId;
}

export function mensajeOtraSede(sedePedido: string, sedeActiva: string): string {
    return `Este pedido es de la sede ${sedePedido} y estás en ${sedeActiva}. Cámbiate a ${sedePedido} para emitirlo o genera la nota desde el pedido.`;
}

/** ¿Hay que pedir la sede al generar la nota? */
export const pideSedeParaNota = (pedidoSedeId: number | null | undefined, sedes: SedeRef[]): boolean =>
    !pedidoSedeId && sedes.length > 1;

/** Sede propuesta para la nota de un pedido sin sede: la activa si es de la lista, si no la principal. */
export function sedePorDefectoParaNota(sedes: (SedeRef & { esPrincipal?: boolean })[], sedeActivaId: number | null | undefined): number | null {
    if (sedeActivaId && sedes.some((s) => s.id === sedeActivaId)) return sedeActivaId;
    return sedes.find((s) => s.esPrincipal)?.id ?? sedes[0]?.id ?? null;
}

/** `sedeId` / `sede { id, nombre }` de un pedido tal como venga (API o estado de navegación). */
export function normalizarSedePedido(pedido: { sedeId?: unknown; sede?: unknown } | null | undefined): { sedeId: number | null; sede: SedeRef | null } {
    const sede = pedido?.sede && typeof pedido.sede === 'object' ? (pedido.sede as Record<string, unknown>) : null;
    const id = Number(pedido?.sedeId ?? sede?.id);
    if (!Number.isInteger(id) || id <= 0) return { sedeId: null, sede: null };
    const nombre = typeof sede?.nombre === 'string' && sede.nombre.trim() ? sede.nombre.trim() : `Sede ${id}`;
    return { sedeId: id, sede: { id, nombre } };
}
