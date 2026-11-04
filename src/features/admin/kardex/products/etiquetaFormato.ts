/**
 * Tamaño de las etiquetas de código de barras. Cada negocio tiene su impresora
 * (rollos de 50×25, 30×30, 40×30, dobles de 33×25…), así que además de los
 * tamaños comunes se puede escribir uno propio. Se recuerda por equipo: la
 * impresora está conectada a esa computadora, no a la empresa.
 */

export type TipoPapel = 'rollo' | 'a4';

export interface FormatoEtiqueta {
  /** id del tamaño elegido; 'personalizado' usa ancho/alto/columnas escritos. */
  id: string;
  tipo: TipoPapel;
  ancho: number;
  alto: number;
  /** Etiquetas por fila (rollos dobles o triples; en A4, columnas de la hoja). */
  columnas: number;
}

export interface FormatoPredefinido extends FormatoEtiqueta {
  label: string;
  detalle: string;
}

export const FORMATOS_PREDEFINIDOS: FormatoPredefinido[] = [
  { id: 'rollo-50x25', tipo: 'rollo', ancho: 50, alto: 25, columnas: 1, label: 'Rollo 50 × 25 mm', detalle: 'Una etiqueta por corte' },
  { id: 'rollo-30x30', tipo: 'rollo', ancho: 30, alto: 30, columnas: 1, label: 'Rollo 30 × 30 mm', detalle: 'Etiqueta cuadrada' },
  { id: 'rollo-40x30', tipo: 'rollo', ancho: 40, alto: 30, columnas: 1, label: 'Rollo 40 × 30 mm', detalle: 'Una etiqueta por corte' },
  { id: 'rollo-60x40', tipo: 'rollo', ancho: 60, alto: 40, columnas: 1, label: 'Rollo 60 × 40 mm', detalle: 'Etiqueta grande' },
  { id: 'a4-65x35', tipo: 'a4', ancho: 65, alto: 35, columnas: 3, label: 'Hoja A4', detalle: '3 × 8 etiquetas de 65 × 35 mm' },
];

export const LIMITES = { anchoMin: 20, anchoMax: 110, altoMin: 15, altoMax: 100, columnasMax: 4 } as const;

const CLAVE = 'ETIQUETAS_BARRAS_FORMATO';
const DEFECTO = FORMATOS_PREDEFINIDOS[0];

const acotar = (v: unknown, min: number, max: number, defecto: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : defecto;
};

/** Un formato con medidas dentro de lo que una impresora de etiquetas acepta. */
export function normalizarFormato(f: Partial<FormatoEtiqueta> | null | undefined): FormatoEtiqueta {
  const predefinido = FORMATOS_PREDEFINIDOS.find((p) => p.id === f?.id);
  if (predefinido) return { id: predefinido.id, tipo: predefinido.tipo, ancho: predefinido.ancho, alto: predefinido.alto, columnas: predefinido.columnas };
  if (f?.id !== 'personalizado') return { ...DEFECTO };
  return {
    id: 'personalizado',
    tipo: 'rollo',
    ancho: acotar(f.ancho, LIMITES.anchoMin, LIMITES.anchoMax, DEFECTO.ancho),
    alto: acotar(f.alto, LIMITES.altoMin, LIMITES.altoMax, DEFECTO.alto),
    columnas: acotar(f.columnas, 1, LIMITES.columnasMax, 1),
  };
}

export function leerFormatoGuardado(): FormatoEtiqueta {
  try {
    return normalizarFormato(JSON.parse(localStorage.getItem(CLAVE) ?? 'null'));
  } catch {
    return { ...DEFECTO };
  }
}

export function guardarFormato(f: FormatoEtiqueta): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(f));
  } catch {
    // Sin almacenamiento (modo privado): se usa el formato solo en esta sesión.
  }
}

/** mm → px de pantalla/impresión (96 dpi). */
const PX_POR_MM = 96 / 25.4;

/**
 * Cuánto mide el código de barras dentro de la etiqueta. El EAN-13 son 95
 * módulos más las zonas mudas; se ajusta al ancho disponible sin pasar de 1.5px
 * por módulo, y las barras ocupan el alto que dejan los textos encendidos.
 */
export function medidasCodigo(
  f: Pick<FormatoEtiqueta, 'ancho' | 'alto'>,
  textos: { nombre: boolean; variante: boolean; precio: boolean },
) {
  const margenModulos = 6;
  const altoTexto = f.alto < 22 ? 0 : 9;
  // Con el texto de los dígitos el componente ensancha la zona muda izquierda.
  const modulos = 95 + 2 * Math.max(margenModulos, altoTexto ? 7 : 0);
  const anchoUtil = f.ancho * PX_POR_MM * 0.92;
  const moduloPx = Math.min(1.5, Math.max(0.8, anchoUtil / modulos));
  const ocupadoTextos = (textos.nombre ? 10 : 0) + (textos.variante ? 9 : 0) + (textos.precio ? 12 : 0);
  const altoUtil = f.alto * PX_POR_MM - ocupadoTextos - altoTexto - 8;
  const altoBarras = Math.round(Math.min(60, Math.max(14, altoUtil)));
  return { moduloPx, altoBarras, altoTexto, margenModulos };
}

/** @page para react-to-print: rollos = una fila por página; A4 con margen. */
export function estiloPagina(f: FormatoEtiqueta): string {
  const base = '@media print { html, body { margin: 0 !important; padding: 0 !important; } }';
  return f.tipo === 'a4'
    ? `@page { size: A4; margin: 6mm; } ${base}`
    : `@page { size: ${f.ancho * f.columnas}mm ${f.alto}mm; margin: 0; } ${base}`;
}
