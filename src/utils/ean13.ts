/**
 * Codificación y dibujo de EAN-13, sin dependencias.
 *
 * Un EAN-13 son 95 módulos (barras/espacios de ancho 1):
 *   guarda inicio (101) + 6 dígitos × 7 + guarda central (01010) +
 *   6 dígitos × 7 + guarda fin (101)
 *
 * El PRIMER dígito no se dibuja: se codifica en el patrón de paridad (L/G) de
 * los 6 dígitos de la izquierda. Por eso 12 dígitos ocupan las barras y el 13º
 * (verificador) va en el grupo derecho.
 */

// Grupo izquierdo, paridad impar.
const L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
// Grupo izquierdo, paridad par.
const G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
// Grupo derecho (siempre el complemento de L).
const R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];
// Paridad de los 6 dígitos izquierdos según el primer dígito.
const PARIDAD = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

/** Dígito verificador EAN-13 (módulo 10, pesos 1 y 3 alternados). */
export function digitoVerificadorEan13(doceDigitos: string): number {
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const d = doceDigitos.charCodeAt(i) - 48;
    suma += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (suma % 10)) % 10;
}

/** `true` si es un EAN-13 bien formado y con verificador correcto. */
export function esEan13Valido(codigo: string): boolean {
  const raw = String(codigo ?? '').trim();
  if (!/^\d{13}$/.test(raw)) return false;
  return digitoVerificadorEan13(raw.slice(0, 12)) === Number(raw[12]);
}

/**
 * Los 95 módulos del código como cadena de '0' (espacio) y '1' (barra).
 * Lanza si el código no es un EAN-13 válido: dibujar un código inválido sería
 * peor que no dibujar nada — se imprimiría una etiqueta que no escanea.
 */
export function modulosEan13(codigo: string): string {
  const raw = String(codigo ?? '').trim();
  if (!esEan13Valido(raw)) {
    throw new Error(`No es un EAN-13 válido: "${raw}"`);
  }
  const d = raw.split('').map(Number);
  const paridad = PARIDAD[d[0]];

  let out = '101'; // guarda inicio
  for (let i = 1; i <= 6; i++) {
    out += paridad[i - 1] === 'L' ? L[d[i]] : G[d[i]];
  }
  out += '01010'; // guarda central
  for (let i = 7; i <= 12; i++) out += R[d[i]];
  out += '101'; // guarda fin
  return out;
}

/** Índices de módulo de las guardas: se dibujan más largas, como en el estándar. */
const GUARDAS: [number, number][] = [
  [0, 3], // inicio
  [45, 50], // central
  [92, 95], // fin
];

function esGuarda(i: number): boolean {
  return GUARDAS.some(([a, b]) => i >= a && i < b);
}

export interface OpcionesBarras {
  /** Ancho de un módulo, en las unidades del viewBox. */
  moduloPx?: number;
  /** Alto de las barras normales. */
  altoBarras?: number;
  /** Alto del texto de los dígitos (0 = sin texto). */
  altoTexto?: number;
  /** Zona muda a cada lado, en módulos. El estándar pide 9-11. */
  margenModulos?: number;
  color?: string;
  fondo?: string;
}

/**
 * SVG del código como string. Sirve igual en la web (dentro de un contenedor)
 * y en el HTML que `expo-print` convierte a PDF en la app.
 */
export function svgEan13(codigo: string, opts: OpcionesBarras = {}): string {
  const m = opts.moduloPx ?? 2;
  const alto = opts.altoBarras ?? 60;
  const altoTexto = opts.altoTexto ?? 12;
  const margenBase = opts.margenModulos ?? 10;
  const color = opts.color ?? '#000000';
  const fondo = opts.fondo ?? '#ffffff';

  const modulos = modulosEan13(codigo);
  // El 1er dígito se dibuja dentro de la zona muda izquierda: si el margen es más
  // angosto que el propio dígito, el navegador lo recorta y el código queda
  // ilegible para una persona (el escáner igual lo lee, pero la etiqueta miente).
  // Un dígito monoespaciado ocupa ~0.62em, más un módulo de aire.
  const margen = altoTexto > 0
    ? Math.max(margenBase, Math.ceil((altoTexto * 0.62) / m) + 1)
    : margenBase;
  // Las guardas bajan hasta la línea base del texto, como en el estándar.
  const extra = altoTexto > 0 ? altoTexto * 0.55 : 0;
  const ancho = (modulos.length + margen * 2) * m;
  const altoTotal = alto + extra + (altoTexto > 0 ? altoTexto + 2 : 0);

  let barras = '';
  let i = 0;
  while (i < modulos.length) {
    if (modulos[i] === '0') {
      i++;
      continue;
    }
    // Agrupa módulos contiguos en una sola barra: menos nodos y bordes nítidos.
    let ancho1 = 1;
    while (i + ancho1 < modulos.length && modulos[i + ancho1] === '1' && esGuarda(i) === esGuarda(i + ancho1)) {
      ancho1++;
    }
    const h = alto + (esGuarda(i) ? extra : 0);
    barras += `<rect x="${(margen + i) * m}" y="0" width="${ancho1 * m}" height="${h}"/>`;
    i += ancho1;
  }

  // Los dígitos van como en el estándar: el 1º fuera a la izquierda, luego los
  // dos grupos de 6 centrados bajo sus barras.
  let texto = '';
  if (altoTexto > 0) {
    const y = altoTotal - 1;
    const cx = (mod: number) => (margen + mod) * m;
    const t = (x: number, s: string, anchor = 'middle') =>
      `<text x="${x}" y="${y}" font-family="monospace" font-size="${altoTexto}" text-anchor="${anchor}" fill="${color}">${s}</text>`;
    texto += t(cx(-1), codigo[0], 'end');
    texto += t(cx(3 + 21), codigo.slice(1, 7));
    texto += t(cx(50 + 21), codigo.slice(7));
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${altoTotal}" ` +
    `width="${ancho}" height="${altoTotal}" shape-rendering="crispEdges">` +
    `<rect x="0" y="0" width="${ancho}" height="${altoTotal}" fill="${fondo}"/>` +
    `<g fill="${color}">${barras}</g>${texto}</svg>`
  );
}
