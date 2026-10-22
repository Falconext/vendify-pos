/**
 * Entradas y salidas de mercadería en un solo documento (NE/NS).
 *
 * Pedido de un cliente (2026-10-22): en su sistema anterior entraba a
 * Inventario → Entradas, agregaba el producto, ponía la cantidad y seguía
 * añadiendo. En Krezka cada ajuste era de un producto a la vez. Esto es esa
 * misma lista, como el carrito del POS: buscar o escanear, cantidad, Enter.
 */

export type TipoDocumento = 'ENTRADA' | 'SALIDA';

export interface Motivo {
    codigo: string;
    etiqueta: string;
}

export interface ContextoInventario {
    lotePermitido: boolean;
    loteObligatorio: boolean;
    motivos: Record<TipoDocumento, Motivo[]>;
}

export const CONTEXTO_VACIO: ContextoInventario = {
    lotePermitido: false,
    loteObligatorio: false,
    motivos: { ENTRADA: [], SALIDA: [] },
};

export interface LoteProducto {
    lote: string;
    stockActual: number;
    fechaVencimiento: string;
    activo: boolean;
}

/** Una fila de la lista que se está armando. */
export interface Linea {
    /** Clave de React: el mismo producto puede ir en dos filas con lotes distintos. */
    key: string;
    productoId: number;
    codigo: string;
    descripcion: string;
    variante: string | null;
    unidad: string;
    imagenUrl?: string;
    stockSede: number;
    cantidad: number;
    costoUnitario: string;
    lote: string;
    vence: string;
    lotes: LoteProducto[];
}

export interface ResumenDocumento {
    id: number;
    tipo: TipoDocumento;
    numero: string;
    fecha: string;
    motivo: string;
    motivoEtiqueta: string;
    detalle: string | null;
    sede: string;
    responsable: string;
    productos: number;
    unidades: number;
}

export interface DetalleDocumento extends Omit<ResumenDocumento, 'productos' | 'unidades'> {
    items: {
        productoId: number;
        codigo: string;
        descripcion: string;
        variante: string | null;
        unidad: string;
        cantidad: number;
        costoUnitario: number | null;
        lote: string | null;
        fechaVencimiento: string | null;
    }[];
}

export interface ProblemaFila {
    linea: number;
    productoId?: number;
    mensaje: string;
}

export const TITULO: Record<TipoDocumento, string> = {
    ENTRADA: 'Nueva entrada',
    SALIDA: 'Nueva salida',
};

/** "Talla: M, Color: Negro" → "Negro / M": como la muestra el POS. */
export const etiquetaVariante = (valores: unknown): string | null => {
    if (!valores || typeof valores !== 'object') return null;
    const v = Object.values(valores as Record<string, unknown>).filter((x) => x != null && String(x).trim() !== '');
    return v.length ? v.map(String).join(' / ') : null;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * La talla que hay que mostrar junto al nombre, o null si el nombre ya la
 * dice: muchas variantes se crean como "Polo básico - L / Blanco" y repetirla
 * se lee "Polo básico - L / Blanco · Blanco / L".
 */
export const varianteQueFalta = (descripcion: string, valores: unknown): string | null => {
    const etiqueta = etiquetaVariante(valores);
    if (!etiqueta) return null;
    const nombre = descripcion.toLowerCase();
    const yaDice = Object.values(valores as Record<string, unknown>).every((v) => nombre.includes(String(v).toLowerCase()));
    return yaDice ? null : etiqueta;
};

/** El stock de la sede activa: el que se va a mover. */
export const stockEnSede = (p: any, sedeId?: number): number => {
    const fila = Array.isArray(p?.stocks) ? p.stocks.find((s: any) => s.sedeId === sedeId) : undefined;
    return r3(Number(fila?.stock ?? 0));
};

/**
 * Agrega un producto a la lista. Si ya está (sin lote), suma uno en vez de
 * repetir la fila: es lo que espera quien escanea la misma caja dos veces.
 */
export const agregarALista = (
    lista: Linea[],
    nueva: Omit<Linea, 'key'>,
    keyNueva: string = `${nueva.productoId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
): { lista: Linea[]; key: string } => {
    const existente = lista.find((l) => l.productoId === nueva.productoId && !l.lote);
    if (existente && !nueva.lote) {
        return {
            lista: lista.map((l) => (l.key === existente.key ? { ...l, cantidad: r3(l.cantidad + 1) } : l)),
            key: existente.key,
        };
    }
    return { lista: [...lista, { ...nueva, key: keyNueva }], key: keyNueva };
};

/** Lo que se manda al backend. */
export const armarPayload = (tipo: TipoDocumento, motivo: string, detalle: string, lista: Linea[]) => ({
    tipo,
    motivo,
    detalle: detalle.trim() || undefined,
    items: lista.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        ...(tipo === 'ENTRADA' && l.costoUnitario.trim() !== '' ? { costoUnitario: Number(l.costoUnitario) } : {}),
        ...(l.lote.trim() ? { lote: l.lote.trim().toUpperCase() } : {}),
        ...(l.lote.trim() && l.vence ? { vence: l.vence } : {}),
    })),
});

/** Los avisos del backend vienen por número de fila; la pantalla los pinta por clave. */
export const problemasPorClave = (lista: Linea[], problemas: ProblemaFila[] | undefined): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const p of problemas ?? []) {
        const fila = lista[p.linea - 1];
        if (fila) out[fila.key] = out[fila.key] ? `${out[fila.key]} ${p.mensaje}` : p.mensaje;
    }
    return out;
};

/**
 * Lo que se puede revisar sin ir al servidor, para avisar mientras se arma la
 * lista y no recién al guardar. El servidor vuelve a revisar todo.
 */
export const avisoDeFila = (
    tipo: TipoDocumento,
    l: Linea,
    ctx: Pick<ContextoInventario, 'loteObligatorio'>,
): string | null => {
    if (!(l.cantidad > 0)) return 'Pon una cantidad mayor que cero.';
    const conLotes = ctx.loteObligatorio || l.lotes.some((x) => x.activo);
    if (tipo === 'ENTRADA') {
        if (conLotes && !l.lote.trim()) return 'Indica el lote.';
        const nuevo = l.lote.trim() && !l.lotes.some((x) => x.lote === l.lote.trim().toUpperCase());
        if (nuevo && !l.vence) return 'Lote nuevo: indica el vencimiento.';
        return null;
    }
    if (l.cantidad > l.stockSede) return `Solo hay ${l.stockSede} en esta sede.`;
    if (l.lote) {
        const lote = l.lotes.find((x) => x.lote === l.lote);
        if (lote && l.cantidad > lote.stockActual) return `El lote ${l.lote} tiene ${lote.stockActual}.`;
    }
    return null;
};

/**
 * Si la mercadería llegó con factura del proveedor, va por Compras: ahí queda
 * el costo y el IGV que el contador necesita. Se avisa en las entradas que
 * pueden confundirse con una compra; una devolución o un conteo no.
 */
export const sugiereCompra = (tipo: TipoDocumento, motivo: string) =>
    tipo === 'ENTRADA' && ['INVENTARIO_INICIAL', 'BONIFICACION', 'OTRO', ''].includes(motivo);

export const totalUnidades = (lista: Linea[]) => r3(lista.reduce((s, l) => s + (Number(l.cantidad) || 0), 0));
