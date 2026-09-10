// Definición de los elementos configurables del formato de cotización.
// Compartido entre el modal de configuración y el componente de impresión.

export interface ElemDef {
  key: string;
  label: string;
  /** Si el elemento se puede mostrar/ocultar. */
  hasVisible: boolean;
  /** Visibilidad por defecto cuando no hay configuración guardada (default: true). */
  defaultVisible?: boolean;
  /** Tamaño por defecto (px de fuente, o px de ancho para el logo). */
  defaultSize: number;
  min: number;
  max: number;
  unit?: string;
  /** Opción de modo (solo on/off): no se muestra el control de tamaño. */
  esModo?: boolean;
  /** El elemento admite un texto propio editable (se guarda en `texto`). */
  esTexto?: boolean;
  /** Ayuda mostrada en el campo de texto. */
  placeholder?: string;
  /** Formatos donde aplica. Si se omite, aplica a todos. */
  soloEn?: string[];
  grupo: 'Encabezado' | 'Cuerpo' | 'Pie';
}

export const COTIZ_ELEMENTOS: ElemDef[] = [
  { key: 'logo', label: 'Logo', hasVisible: true, defaultSize: 150, min: 40, max: 220, unit: 'px', grupo: 'Encabezado' },
  { key: 'nombreComercial', label: 'Nombre comercial', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'direccion', label: 'Dirección', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'rubro', label: 'Rubro / actividad', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'razonSocial', label: 'Razón social', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'celular', label: 'Celular', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'email', label: 'Email', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'web', label: 'Página web', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'datosCliente', label: 'Datos del cliente', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'datosCotizacion', label: 'Datos de la cotización', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'productos', label: 'Tabla de productos', hasVisible: false, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'sonTexto', label: 'Total en letras (SON:)', hasVisible: true, defaultSize: 18, min: 10, max: 24, grupo: 'Cuerpo' },
  { key: 'observaciones', label: 'Observaciones', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'detraccion', label: 'Detracción', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opGravadas', label: 'Op. gravadas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opExoneradas', label: 'Op. exoneradas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opInafectas', label: 'Op. inafectas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opGratuitas', label: 'Op. gratuitas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'subTotal', label: 'Sub total', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'descuentos', label: 'Descuentos', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'igv', label: 'IGV', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'montoTotal', label: 'Monto total', hasVisible: true, defaultSize: 18, min: 10, max: 24, grupo: 'Cuerpo' },
  // Modo: imprime la columna de precio como VALOR unitario (sin IGV) y el importe
  // de línea como valor de venta. El bloque de totales no cambia — ya muestra
  // Op. gravadas (sin IGV) + IGV + Total.
  { key: 'preciosSinIgv', label: 'Precios unitarios sin IGV', hasVisible: true, defaultVisible: false, esModo: true, defaultSize: 12, min: 12, max: 12, grupo: 'Cuerpo', soloEn: ['cotizFormatoConfig', 'notaVentaFormatoConfig'] },
  { key: 'qrPagos', label: 'QR de pago (Yape / Plin)', hasVisible: true, defaultVisible: false, defaultSize: 90, min: 60, max: 180, unit: 'px', grupo: 'Cuerpo' },
  { key: 'cuentas', label: 'Cuentas bancarias', hasVisible: true, defaultSize: 10, min: 7, max: 16, grupo: 'Pie' },
  // El mensaje del pie es editable: si la empresa no escribe uno propio se usa el
  // texto por defecto ("GRACIAS POR ELEGIR <empresa> PARA CUBRIR SUS
  // REQUERIMIENTOS" + "VUELVA PRONTO"). Admite varias líneas.
  { key: 'gracias', label: 'Mensaje de agradecimiento', hasVisible: true, esTexto: true, placeholder: 'Dejar vacío para usar el mensaje por defecto', defaultSize: 10, min: 7, max: 16, grupo: 'Pie' },
];

export type CotizConfig = Record<
  string,
  { visible?: boolean; size?: number; texto?: string }
>;

/** Lee visibilidad y tamaño de un elemento con sus valores por defecto. */
export function elemCfg(config: CotizConfig | undefined | null, key: string) {
  const def = COTIZ_ELEMENTOS.find((e) => e.key === key);
  const c = (config || {})[key] || {};
  return {
    // Si no hay valor guardado, se usa defaultVisible del elemento (default: true).
    visible: c.visible !== undefined ? c.visible : (def?.defaultVisible ?? true),
    size: c.size ?? def?.defaultSize ?? 12,
    // Vacío = usar el texto por defecto que arma cada plantilla.
    texto: String(c.texto ?? '').trim(),
  };
}

/**
 * Parte un texto libre en líneas para imprimirlo como renglones separados. El
 * empresario escribe una observación por línea en el textarea; el HTML colapsa
 * los saltos, así que hay que separarlas explícitamente.
 */
export function lineasDeTexto(texto: string | undefined | null): string[] {
  return String(texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
