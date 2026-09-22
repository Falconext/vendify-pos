// Definición de los elementos configurables del formato de cotización.
// Compartido entre el modal de configuración y el componente de impresión.

export interface ElemDef {
  key: string;
  /** Tamaño histórico del elemento en el ticket de 80mm (px). Default 16. */
  ticketBase?: number;
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
  /** Tamaño por defecto en factura/boleta cuando difiere del de cotización. */
  defaultSizeFiscal?: number;
  /** Etiqueta alternativa para factura/boleta. */
  labelFiscal?: string;
  grupo: 'Encabezado' | 'Cuerpo' | 'Pie';
}

export const COTIZ_ELEMENTOS: ElemDef[] = [
  { key: 'logo', label: 'Logo', hasVisible: true, defaultSize: 150, min: 40, max: 220, unit: 'px', grupo: 'Encabezado' },
  { key: 'nombreComercial', label: 'Nombre comercial', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'direccion', label: 'Dirección', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'rubro', label: 'Rubro / actividad', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  // En factura/boleta la razón social es el título del documento (20px), en cotización es una línea más.
  { key: 'razonSocial', label: 'Razón social', hasVisible: true, defaultSize: 12, defaultSizeFiscal: 20, min: 8, max: 24, grupo: 'Encabezado' },
  { key: 'celular', label: 'Celular', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'email', label: 'Email', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'web', label: 'Página web', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'datosCliente', label: 'Datos del cliente', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'datosCotizacion', label: 'Datos de la cotización', labelFiscal: 'Datos del comprobante', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'productos', label: 'Tabla de productos', hasVisible: false, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'sonTexto', label: 'Total en letras (SON:)', hasVisible: true, defaultSize: 18, min: 10, max: 24, grupo: 'Cuerpo' },
  { key: 'observaciones', label: 'Observaciones', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'detraccion', label: 'Detracción', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opGravadas', label: 'Op. gravadas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opExoneradas', label: 'Op. exoneradas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opInafectas', label: 'Op. inafectas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opGratuitas', label: 'Op. gratuitas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'icbper', label: 'ICBPER', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo', soloEn: ['facturaFormatoConfig', 'boletaFormatoConfig'] },
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
  { key: 'gracias', label: 'Mensaje de agradecimiento', hasVisible: true, esTexto: true, placeholder: 'Dejar vacío para usar el mensaje por defecto', defaultSize: 10, min: 7, max: 16, grupo: 'Pie', ticketBase: 15 },
  // La web del sistema es su propio interruptor: hay negocios que quieren dejar
  // "Sistema punto de venta / Desarrollado por …" pero sin la URL impresa. Apagar
  // la marca completa sigue estando en Perfil → Configuración.
  // OCULTA por defecto: en una instalación white-label imprimir la web del
  // proveedor delata al fabricante (el ticket decía "JAMBLE POS" y abajo
  // "vendify.pe"). Quien la quiera la enciende aquí.
  { key: 'marcaWeb', label: 'Web del sistema en el pie', hasVisible: true, defaultVisible: false, defaultSize: 10, min: 7, max: 16, grupo: 'Pie', ticketBase: 15 },
];

/**
 * Formatos que pueden tener un tamaño PROPIO (desvinculado del general):
 * A4 es el tamaño general; A5 y Ticket lo siguen salvo que la empresa lo
 * desvincule para ese elemento en Configurar formato.
 */
export type FormatoOverride = 'a5' | 'ticket';
export type FormatoImpresionKey = 'A4' | 'A5' | 'TICKET';

export const OVERRIDE_POR_FORMATO: Record<FormatoImpresionKey, FormatoOverride | null> = {
  A4: null,
  A5: 'a5',
  TICKET: 'ticket',
};

export type CotizConfig = Record<
  string,
  {
    visible?: boolean;
    size?: number;
    texto?: string;
    /** Tamaño propio en A5 (px). Ausente = sigue al general. */
    a5?: { size?: number };
    /** Tamaño propio en ticket (px reales del ticket). Ausente = general escalado. */
    ticket?: { size?: number };
  }
>;

/** Tamaño propio guardado para un formato, o undefined si sigue al general. */
export function sizeOverride(
  config: CotizConfig | undefined | null,
  key: string,
  formato: FormatoImpresionKey,
): number | undefined {
  const ov = OVERRIDE_POR_FORMATO[formato];
  if (!ov) return undefined;
  const n = Number((config || {})[key]?.[ov]?.size);
  return n > 0 ? n : undefined;
}

/** Campos de empresa que guardan el formato de factura/boleta (usan defaults fiscales). */
export const FORMATO_KEYS_FISCALES = ['facturaFormatoConfig', 'boletaFormatoConfig'] as const;

/**
 * Lee visibilidad, tamaño y texto propio de un elemento con sus valores por defecto.
 * `fiscal` = true para factura/boleta (aplica defaultSizeFiscal cuando existe).
 */
export function elemCfg(config: CotizConfig | undefined | null, key: string, fiscal = false, formato?: FormatoImpresionKey) {
  const def = COTIZ_ELEMENTOS.find((e) => e.key === key);
  const c = (config || {})[key] || {};
  const defaultSize = (fiscal ? def?.defaultSizeFiscal : undefined) ?? def?.defaultSize ?? 12;
  // A5 con tamaño propio: manda sobre el general. (El ticket se resuelve en
  // ticketPx porque además escala a la fuente del térmico.)
  const propioA5 = formato === 'A5' ? sizeOverride(config, key, 'A5') : undefined;
  return {
    // Si no hay valor guardado, se usa defaultVisible del elemento (default: true).
    visible: c.visible !== undefined ? c.visible : (def?.defaultVisible ?? true),
    size: propioA5 ?? c.size ?? defaultSize,
    // Vacío = usar el texto por defecto que arma cada plantilla.
    texto: String(c.texto ?? '').trim(),
  };
}

/**
 * Tamaño efectivo (px) de un elemento en el TICKET de 80mm.
 *
 * El ticket se imprime con fuente VT323 a 16px de base, mientras que los
 * tamaños del modal están pensados para A4 (10-12px). Por eso el valor
 * configurado no se aplica tal cual: se escala respecto a su default, de modo
 * que sin configurar el ticket sale exactamente como siempre, y cada "+"/"−"
 * del modal lo agranda o achica en proporción. `base` permite escalar líneas
 * secundarias (p. ej. notas de lote a 12px) con el mismo factor.
 */
export function ticketPx(config: CotizConfig | undefined | null, key: string, fiscal = false, base?: number): number {
  const def = COTIZ_ELEMENTOS.find((e) => e.key === key);
  const defaultSize = (fiscal ? def?.defaultSizeFiscal : undefined) ?? def?.defaultSize ?? 12;
  const tb = def?.ticketBase ?? 16;
  const b = base ?? tb;
  // Tamaño propio del ticket (desvinculado del general): se toma tal cual; las
  // líneas secundarias (`base`) se escalan en la misma proporción.
  const propio = sizeOverride(config, key, 'TICKET');
  if (propio) return Math.max(8, Math.round((b * propio) / tb));
  return Math.max(8, Math.round((b * elemCfg(config, key, fiscal).size) / defaultSize));
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
