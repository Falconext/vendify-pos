export interface ProductoVendido {
    productoId: number | null;
    codigo: string | null;
    nombre: string;
    categoria: string;
    unidadesVendidas: number;
    precioPromedio: number;
    costoUnitario: number;
    ingresoTotal: number;
    ventasConIgv?: number;
    costoTotal: number;
    gananciaTotal: number;
    margen: number;
    participacion: number;
}

export interface ProductosVendidosDia {
    fecha: string;
    unidades: number;
    ingreso: number;
    costo: number;
    ganancia: number;
    /** Ingreso del día por cada producto del top (clave = nombre del producto). */
    productos: Record<string, number>;
}

export interface ProductosVendidosResponse {
    periodo: {
        mes: number;
        anio: number;
        fechaInicio?: string | null;
        fechaFin?: string | null;
        label: string;
    };
    resumen: {
        ingresoTotal: number;
        /** Ventas con IGV (lo que pagó el cliente); ingresoTotal es la neta sin IGV. */
        ventasConIgv?: number;
        costoTotal: number;
        gananciaTotal: number;
        margenPromedio: number;
        unidadesVendidas: number;
        totalProductos: number;
        documentos: number;
        mejorProducto: string | null;
    };
    productos: ProductoVendido[];
    topProductos: string[];
    serieDiaria: ProductosVendidosDia[];
}

export type Metrica = 'ingreso' | 'ganancia' | 'unidades';
export type Modo = 'diario' | 'acumulado';

export const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export const METRICAS: { id: Metrica; label: string }[] = [
    { id: 'ingreso', label: 'Ingreso' },
    { id: 'ganancia', label: 'Ganancia' },
    { id: 'unidades', label: 'Unidades' },
];

export function formatSoles(value: number): string {
    return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUnidades(value: number): string {
    return Number(value || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
}

export function formatPct(value: number): string {
    return `${Number(value || 0).toFixed(1)}%`;
}

export function formatFecha(value?: string | null): string {
    if (!value) return '-';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
}

/** Etiqueta corta para el eje X del gráfico diario (dd/mm). */
export function formatFechaCorta(value: string): string {
    const [, m, d] = value.split('-');
    return `${d}/${m}`;
}

/**
 * Convierte la serie diaria en el dataset del gráfico: aplica la métrica
 * elegida y, en modo acumulado, suma el corrido día a día.
 */
export function buildSerieChart(
    serie: ProductosVendidosDia[],
    metrica: Metrica,
    modo: Modo,
    productos: string[],
): Record<string, number | string>[] {
    let totalAcc = 0;
    const accProd: Record<string, number> = {};
    productos.forEach((p) => { accProd[p] = 0; });

    return serie.map((dia) => {
        const valor = metrica === 'unidades' ? dia.unidades : metrica === 'ganancia' ? dia.ganancia : dia.ingreso;
        totalAcc += valor;

        const punto: Record<string, number | string> = {
            fecha: dia.fecha,
            Total: Number((modo === 'acumulado' ? totalAcc : valor).toFixed(2)),
        };

        // El desglose por producto solo existe en ingreso; con otras métricas se omite.
        if (metrica === 'ingreso') {
            for (const nombre of productos) {
                accProd[nombre] += dia.productos?.[nombre] ?? 0;
                punto[nombre] = Number((modo === 'acumulado' ? accProd[nombre] : (dia.productos?.[nombre] ?? 0)).toFixed(2));
            }
        }
        return punto;
    });
}
