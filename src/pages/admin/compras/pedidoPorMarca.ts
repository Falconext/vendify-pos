/** Una fila de GET compras/ordenes/sugerido-por-marca. */
export interface FilaPedidoMarca {
    productoId: number;
    descripcion: string;
    variante: string | null;
    stock: number;
    stockMinimo: number;
    vendidos: number;
    costo: number;
    tipoAfectacionIGV: string | null;
    sugerido: number;
}

export interface LineaPedidoMarca {
    productoId: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    gravado: boolean;
    unidadesPorPaquete: null;
}

/** Afectación IGV (Catálogo 07): solo 10-17 gravado. Sin dato → gravado. */
const esGravado = (tipo: string | null) => {
    const cod = String(tipo ?? '10').trim();
    return cod === '' || cod.startsWith('1');
};

/**
 * Las líneas de la orden para lo que se escribió en la grilla: una por
 * producto (o tono) con cantidad > 0. El tono va en la descripción porque al
 * proveedor se le pide "Base Colorfix — Tono: 170-N", no "Base Colorfix".
 * El costo viene sin IGV; con "Precios con IGV incluido" entra con su IGV.
 */
export function lineasDePedidoMarca(
    filas: FilaPedidoMarca[],
    cantidades: Record<number, string>,
    factorCosto = 1,
): LineaPedidoMarca[] {
    return filas.flatMap((f) => {
        const cantidad = Math.floor(Number(cantidades[f.productoId]) || 0);
        if (cantidad <= 0) return [];
        const gravado = esGravado(f.tipoAfectacionIGV);
        return [{
            productoId: f.productoId,
            descripcion: f.variante ? `${f.descripcion} — ${f.variante}` : f.descripcion,
            cantidad,
            precioUnitario: Number(((Number(f.costo) || 0) * (gravado ? factorCosto : 1)).toFixed(2)),
            gravado,
            unidadesPorPaquete: null,
        }];
    });
}

/**
 * Suma las líneas nuevas a las que ya tiene la orden. Si el mismo producto ya
 * está pedido por unidad, se suman las cantidades en esa línea: pedir dos veces
 * la misma marca (o un tono que ya se agregó a mano) no debe duplicar filas.
 * Las líneas pedidas por caja se dejan aparte para no mezclar presentaciones.
 */
export function fusionarLineas<T extends { productoId?: number; cantidad: number; unidadesPorPaquete?: number | null }>(
    actuales: T[],
    nuevas: T[],
): T[] {
    const resultado = [...actuales];
    for (const linea of nuevas) {
        const i = linea.productoId == null ? -1 : resultado.findIndex(
            (d) => d.productoId === linea.productoId && !(Number(d.unidadesPorPaquete) > 1),
        );
        if (i >= 0) resultado[i] = { ...resultado[i], cantidad: resultado[i].cantidad + linea.cantidad };
        else resultado.push(linea);
    }
    return resultado;
}
