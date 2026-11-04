/**
 * Devuelve el color de texto legible (blanco u oscuro) según la luminancia del
 * fondo. Así los botones/acentos combinan con CUALQUIER color elegido en
 * "Personalizar": texto blanco sobre acentos oscuros, texto oscuro sobre claros.
 */
export function readableText(bg: string | undefined | null, dark = '#111111', light = '#ffffff'): string {
  const hex = normalizeHex(bg);
  if (!hex) return light; // sin color válido: asumimos fondo con color → blanco
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.6 ? dark : light;
}

function normalizeHex(value: string | undefined | null): string | null {
  if (!value) return null;
  let hex = value.trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}
