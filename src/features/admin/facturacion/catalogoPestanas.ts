/**
 * Número de la pestaña "Todos" del catálogo del POS.
 *
 * No es la suma de las pestañas: un producto puede estar en varias categorías
 * y se contaría una vez por cada una. Vale el total del servidor pedido sin
 * categoría ni búsqueda; si todavía no se vio, el total actual cuando no hay
 * filtro, y solo como último recurso la suma (comportamiento anterior).
 */
export function totalPestanaTodos(p: {
    totalSinFiltro: number | null
    sinFiltroAhora: boolean
    totalActual: number
    sumaPestanas: number
}): number {
    if (p.sinFiltroAhora && p.totalActual > 0) return p.totalActual;
    if (p.totalSinFiltro != null && p.totalSinFiltro > 0) return p.totalSinFiltro;
    return p.sumaPestanas || p.totalActual;
}
