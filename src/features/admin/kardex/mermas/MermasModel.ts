/**
 * Reporte de mermas y ajustes de inventario.
 *
 * Pedido de DEMENVER: ver las salidas sueltas en el historial no alcanza para
 * decidir. Lo que sirve es saber cuántas unidades y cuánta plata se perdieron
 * en el período, y por qué.
 */

export interface MermaPorMotivo {
    codigo: string;
    etiqueta: string;
    /** Merma, vencido y pérdida son plata perdida; el resto son correcciones. */
    esPerdida: boolean;
    unidades: number;
    valor: number;
    movimientos: number;
}

export interface MermaPorProducto {
    productoId: number;
    codigo: string;
    descripcion: string;
    unidades: number;
    valor: number;
}

export interface MermaDetalle {
    id: number;
    fecha: string;
    tipoMovimiento: 'INGRESO' | 'SALIDA';
    motivo: string;
    esPerdida: boolean;
    producto: string;
    codigo: string;
    sede: string;
    cantidad: number;
    costoUnitario: number;
    valor: number;
    /** Lo que escribió a mano quien hizo el ajuste. */
    detalle: string;
    responsable: string;
}

export interface ReporteMermas {
    resumen: {
        unidadesPerdidas: number;
        valorPerdido: number;
        movimientosConMotivo: number;
        productosAfectados: number;
    };
    porMotivo: MermaPorMotivo[];
    porProducto: MermaPorProducto[];
    detalle: MermaDetalle[];
}

export const REPORTE_VACIO: ReporteMermas = {
    resumen: { unidadesPerdidas: 0, valorPerdido: 0, movimientosConMotivo: 0, productosAfectados: 0 },
    porMotivo: [],
    porProducto: [],
    detalle: [],
};
