/**
 * Resumen anual de ganancias (KREZKA, 02-11): "enero ganancia con IGV y sin
 * IGV, febrero…, y el total del año". Cada mes es el P&L de Rentabilidad de
 * ese mes, así que los números cuadran con esa pestaña.
 */
export interface ResumenAnualMes {
    mes: number;
    ventasNetas: number;
    ventasConIgv: number;
    igvVentas: number;
    costoMercaderia: number;
    gananciaBruta: number;
    otrosIngresos: number;
    gastosOperativos: number;
    comprasConsumo: number;
    gananciaNeta: number;
    gananciaConIgv: number;
    margenNeto: number;
}

export interface ResumenAnual {
    anio: number;
    meses: ResumenAnualMes[];
    total: Omit<ResumenAnualMes, 'mes'>;
}

export const NOMBRE_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** El mes de más ganancia (sin IGV); null si no hay meses. */
export function mejorMes(meses: ResumenAnualMes[]): ResumenAnualMes | null {
    return meses.reduce<ResumenAnualMes | null>((m, x) => (!m || x.gananciaNeta > m.gananciaNeta ? x : m), null);
}
