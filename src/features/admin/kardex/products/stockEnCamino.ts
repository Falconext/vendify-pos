/**
 * "En camino": lo que ya se le pidió al proveedor y todavía no llegó.
 *
 * Pedido de KREZKA (Pierre): las vendedoras cierran ventas de tallas que aún
 * no están en el inventario porque vienen en una orden de compra, y hoy no
 * tienen cómo responder "¿llega o no llega?" sin preguntar.
 *
 * Lo manda el backend en cada producto y en cada variante, calculado sobre las
 * órdenes de compra EMITIDAS. Acá viven las reglas de cómo se muestra.
 *
 * Regla de oro: esto NO es stock. Nunca se suma al número de disponibles ni
 * habilita vender. Es información para el vendedor.
 */

const numero = (valor: unknown): number => {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Unidades pedidas y no recibidas de un producto o variante. */
export const enCaminoDe = (item: any): number => numero(item?.enCamino);

/** La entrega comprometida más próxima, si alguna orden la tiene. */
export const proximaEntregaDe = (item: any): string | null => {
    const valor = String(item?.enCaminoProximaEntrega ?? '').trim();
    return valor === '' ? null : valor;
};

/** "20/10/2026" a partir del ISO que manda el backend. */
export const fechaCorta = (iso: string | null): string => {
    if (!iso) return '';
    const [a, m, d] = iso.split('-');
    if (!a || !m || !d) return '';
    return `${d}/${m}/${a}`;
};

/** Texto del renglón de stock en el POS y en el inventario. */
export const textoDeStock = (item: any, stock: unknown): string => {
    const hay = Number(stock) || 0;
    const viene = enCaminoDe(item);
    if (viene <= 0) return `Stock: ${hay}`;
    return `Stock: ${hay} · +${viene} en camino`;
};

/**
 * El detalle que se muestra al pasar el mouse. Nunca promete una fecha que la
 * orden no tiene: decir "llega el 20" cuando nadie se comprometió es peor que
 * no decir nada.
 */
export const detalleEnCamino = (item: any): string => {
    const viene = enCaminoDe(item);
    if (viene <= 0) return '';
    const fecha = fechaCorta(proximaEntregaDe(item));
    const base = `${viene} unidad${viene === 1 ? '' : 'es'} pedidas al proveedor`;
    return fecha ? `${base}, llegan el ${fecha}` : `${base}, sin fecha confirmada`;
};

/**
 * Lo que el vendedor necesita decidir parado frente al cliente.
 * - 'disponible'  → hay en el almacén, se vende y punto
 * - 'por-llegar'  → no hay, pero viene: se toma como Nota de Pedido
 * - 'sin-stock'   → no hay ni viene
 */
export type SituacionStock = 'disponible' | 'por-llegar' | 'sin-stock';

export const situacionDeStock = (item: any, stock: unknown): SituacionStock => {
    if ((Number(stock) || 0) > 0) return 'disponible';
    return enCaminoDe(item) > 0 ? 'por-llegar' : 'sin-stock';
};

// ─────────────────────────────────────────────────────────────────────────────
// Disponibilidad completa (fase 2): además de lo que viene, cuánto de eso ya
// está prometido en Notas de Pedido sin entregar.
//
// Sin esto, dos vendedoras veían las mismas 3 unidades que vienen y las dos
// tomaban el pedido. El backend manda `comprometido` y `saldoPrometible`.
// ─────────────────────────────────────────────────────────────────────────────

export type SituacionCompleta = 'disponible' | 'por-llegar' | 'comprometido' | 'agotado';

/** Ya prometido a clientes en Notas de Pedido pendientes. */
export const comprometidoDe = (item: any): number => numero(item?.comprometido);

/**
 * Cuánto más se puede prometer. Puede ser negativo: significa que se prometió
 * más de lo que va a haber, y eso hay que mostrarlo, no esconderlo.
 */
export const saldoPrometibleDe = (item: any): number => {
    const directo = Number(item?.saldoPrometible);
    if (Number.isFinite(directo)) return directo;
    // Si el backend no lo mandó (versión vieja), se arma con lo que haya.
    return (Number(item?.stock) || 0) + enCaminoDe(item) - comprometidoDe(item);
};

export const situacionCompleta = (item: any, stock?: unknown): SituacionCompleta => {
    const hay = stock === undefined ? Number(item?.stock) || 0 : Number(stock) || 0;
    const entregable = hay - comprometidoDe(item);
    if (entregable > 0) return 'disponible';
    if (saldoPrometibleDe(item) > 0) return 'por-llegar';
    return enCaminoDe(item) > 0 || comprometidoDe(item) > 0 ? 'comprometido' : 'agotado';
};

/** El aviso que ve el vendedor antes de comprometer una entrega. */
export const avisoDeDisponibilidad = (
    item: any,
    stock?: unknown,
): { tono: 'ok' | 'aviso' | 'alerta'; texto: string } => {
    const hay = stock === undefined ? Number(item?.stock) || 0 : Number(stock) || 0;
    const viene = enCaminoDe(item);
    const prometido = comprometidoDe(item);
    const saldo = saldoPrometibleDe(item);
    const fecha = fechaCorta(proximaEntregaDe(item));

    switch (situacionCompleta(item, hay)) {
        case 'disponible':
            return { tono: 'ok', texto: `${hay - prometido} para entregar ahora` };
        case 'por-llegar':
            return {
                tono: 'aviso',
                texto: fecha
                    ? `Sin stock libre · puedes comprometer ${saldo} que llegan el ${fecha}`
                    : `Sin stock libre · puedes comprometer ${saldo} en camino (sin fecha confirmada)`,
            };
        case 'comprometido':
            return {
                tono: 'alerta',
                texto: saldo < 0
                    ? `Ya se prometieron ${Math.abs(saldo)} más de las que habrá. Revisa los pedidos pendientes.`
                    : `Todo lo que hay y lo que viene (${viene}) ya está comprometido en pedidos`,
            };
        default:
            return { tono: 'alerta', texto: 'Sin stock y sin reposición pedida' };
    }
};
