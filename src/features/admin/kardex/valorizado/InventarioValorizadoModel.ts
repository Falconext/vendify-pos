export interface ProductoValorizado {
    id: number;
    codigo: string;
    descripcion: string;
    stock: number;
    costoPromedio: number;
    /** Unitario con IGV si es gravado: lo que se le pagó al proveedor. */
    costoDeBolsillo: number;
    valorTotal: number;
    precioVenta: number;
    valorVenta: number;
    gananciaPotencial: number;
    margenPotencial: number;
    sinCosto: boolean;
    sinPrecio: boolean;
    categoria?: { id: number; nombre: string };
    unidadMedida: { codigo: string; nombre: string };
}

export interface ResumenValorizado {
    totalProductos: number;
    valorTotalInventario: number;
    productosStockCritico: number;
    productosStockCero: number;
    valorVentaInventario: number;
    gananciaPotencial: number;
    margenPotencial: number;
    baseGanancia: 'SIN_IGV' | 'CON_IGV';
    criterioIgv: string;
    productosSinCosto: number;
    productosSinPrecio: number;
    productosStockNegativo: number;
    todasLasSedes: boolean;
}

export interface InventarioValorizadoData {
    productos: ProductoValorizado[];
    resumen: ResumenValorizado;
}

export type FiltroValorizado = 'conStock' | 'todos' | 'sinCosto' | 'sinPrecio' | 'negativo';

export type OrdenValorizado =
    | 'valorTotal'
    | 'valorVenta'
    | 'gananciaPotencial'
    | 'margenPotencial'
    | 'stock'
    | 'descripcion';

export const FILTROS: Array<{ id: FiltroValorizado; label: string }> = [
    { id: 'conStock', label: 'Con stock' },
    { id: 'todos', label: 'Todos' },
    { id: 'sinCosto', label: 'Sin costo' },
    { id: 'sinPrecio', label: 'Sin precio' },
    { id: 'negativo', label: 'Stock negativo' },
];

export const POR_PAGINA = 50;

export const formatSoles = (n: number) =>
    `${n < 0 ? '−' : ''}S/ ${Math.abs(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatPct = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n || 0).toFixed(1)}%`;

export const formatStock = (n: number) =>
    (n || 0).toLocaleString('es-PE', { maximumFractionDigits: 3 });

/** Filtra, busca por palabras (código o descripción) y ordena. */
export function aplicarVista(
    productos: ProductoValorizado[],
    filtro: FiltroValorizado,
    busqueda: string,
    orden: OrdenValorizado,
    asc: boolean,
): ProductoValorizado[] {
    const palabras = busqueda.toLowerCase().split(/\s+/).filter(Boolean);
    const filtrados = productos.filter((p) => {
        if (filtro === 'conStock' && !(p.stock > 0)) return false;
        if (filtro === 'sinCosto' && !p.sinCosto) return false;
        if (filtro === 'sinPrecio' && !p.sinPrecio) return false;
        if (filtro === 'negativo' && !(p.stock < 0)) return false;
        if (palabras.length === 0) return true;
        const texto = `${p.codigo || ''} ${p.descripcion || ''} ${p.categoria?.nombre || ''}`.toLowerCase();
        return palabras.every((w) => texto.includes(w));
    });
    const dir = asc ? 1 : -1;
    return [...filtrados].sort((a, b) =>
        orden === 'descripcion'
            ? dir * String(a.descripcion || '').localeCompare(String(b.descripcion || ''))
            : dir * ((Number(a[orden]) || 0) - (Number(b[orden]) || 0)),
    );
}
