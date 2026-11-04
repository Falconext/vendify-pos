/**
 * Órdenes de compra que llegan por partes (proveedor que factura una vez y
 * despacha en varios envíos). Cálculos de la pantalla, sin React.
 */

export interface LineaOrden {
    id: number;
    descripcion: string;
    cantidad: unknown;
    cantidadRecibida?: unknown;
}

const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
};
const r4 = (x: number) => Math.round(x * 10000) / 10000;

export const pendienteDe = (l: LineaOrden) => Math.max(0, r4(n(l.cantidad) - n(l.cantidadRecibida)));

/** Avance de la orden en unidades, para "Llegó 60 de 100". */
export const progresoOrden = (detalles: { cantidad: unknown; cantidadRecibida?: unknown }[] = []) => ({
    recibido: r4(detalles.reduce((a, d) => a + n(d.cantidadRecibida), 0)),
    pedido: r4(detalles.reduce((a, d) => a + n(d.cantidad), 0)),
});

/** Formato corto de cantidades: 60, 2.5 (sin ceros de más). */
export const fmtCant = (x: number) => String(Number(x.toFixed(4)));

/**
 * Lo que se manda al backend: una línea por producto con lo que llegó.
 * `valores` son los textos de los inputs por id de línea; vacío = 0.
 */
export const armarLlegadas = (lineas: LineaOrden[], valores: Record<number, string>) =>
    lineas.map((l) => ({ detalleId: l.id, cantidad: n(valores[l.id]) }));

/** ¿Con estas cantidades llega todo lo que falta? */
export const llegaTodo = (lineas: LineaOrden[], valores: Record<number, string>) =>
    lineas.every((l) => n(valores[l.id]) >= pendienteDe(l) - 1e-9);

/** Error para el usuario, o null si las cantidades sirven. */
export const errorDeLlegadas = (lineas: LineaOrden[], valores: Record<number, string>): string | null => {
    for (const l of lineas) {
        const c = n(valores[l.id]);
        if (c < 0) return 'Las cantidades no pueden ser negativas.';
        if (c > pendienteDe(l) + 1e-9) return `De "${l.descripcion}" faltan ${fmtCant(pendienteDe(l))}: no pueden llegar ${fmtCant(c)}.`;
    }
    if (lineas.every((l) => n(valores[l.id]) <= 0)) return 'Indica cuánto llegó de al menos un producto.';
    return null;
};
