export type OrigenPago = 'VENTA' | 'COMPRA';
export type EstadoConciliacion = 'CONCILIADO' | 'PENDIENTE';

export interface IPlantillaExcel {
  nombreArchivo: string;
  base64: string;
}

export interface IMatchSistema {
  origen: OrigenPago;
  documento: string;
  contraparte: string;
  monto: number;
  fecha: string;
  diferenciaMonto: number;
}

export interface IMovimientoBanco {
  fila: number;
  fecha: string | null;
  operacion: string;
  descripcion: string;
  monto: number;
  tipo: 'ABONO' | 'CARGO' | null;
  estado: EstadoConciliacion;
  match: IMatchSistema | null;
}

export interface IPagoSistema {
  origen: OrigenPago;
  operacion: string;
  operacionNorm: string;
  documento: string;
  contraparte: string;
  medioPago: string;
  monto: number;
  fecha: string;
}

export interface IResumenConciliacion {
  movimientosBanco: number;
  pagosSistema: number;
  conciliados: number;
  pendientesBanco: number;
  pendientesSistema: number;
  montoBanco: number;
  montoConciliado: number;
  montoPendienteBanco: number;
  diferenciasMonto: number;
}

export interface IResultadoConciliacion {
  resumen: IResumenConciliacion;
  movimientos: IMovimientoBanco[];
  sistemaPendientes: IPagoSistema[];
}

// Columnas esperadas en el Excel del banco (para mostrar en la UI).
export const COLUMNAS_BANCO = [
  'Fecha',
  'NumeroOperacion',
  'Monto',
  'Descripcion',
  'Tipo',
];
