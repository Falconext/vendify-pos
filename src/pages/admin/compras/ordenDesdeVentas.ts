/** Notas de venta → Orden de compra: lo que devuelve `compras/ordenes/desde-ventas`. */
export interface LineaDesdeVentas {
    productoId: number | null;
    descripcion: string;
    codigo: string | null;
    cantidadVendida: number;
    stock: number;
    /** Costo de una unidad, sin IGV (el del catálogo). */
    precioUnitario: number;
    gravado: boolean;
    origenes: { documento: string; cantidad: number }[];
    paquetes: any[];
}

export interface ResumenDesdeVentas {
    comprobanteIds: number[];
    notas: { id: number; documento: string; cliente: string | null; ordenes: string[] }[];
    descartadas: { documento: string; motivo: string }[];
    omitidas: string[];
    lineas: LineaDesdeVentas[];
}

/** Cuánto pedir: todo lo vendido, o solo lo que el stock no cubre (redondeado hacia arriba). */
export const cantidadAPedir = (
    linea: Pick<LineaDesdeVentas, 'cantidadVendida' | 'stock' | 'productoId'>,
    descontarStock: boolean,
): number => {
    if (!descontarStock || linea.productoId === null) return linea.cantidadVendida;
    const falta = linea.cantidadVendida - Math.max(0, Number(linea.stock) || 0);
    return falta > 0 ? Math.ceil(Math.round(falta * 1000) / 1000) : 0;
};

/** "Pedidos: NV01-25 (Ana), NV01-26" para las observaciones de la orden. */
export const observacionDeOrigen = (notas: ResumenDesdeVentas['notas']): string => {
    const lista = notas.map((n) => n.documento.replace(/-0+(?=\d)/, '-')).join(', ');
    return lista ? `Pedidos de clientes: ${lista}` : '';
};
