import { useMemo } from 'react';
import { esEan13Valido, modulosEan13 } from '../utils/ean13';

interface Props {
  codigo: string;
  /** Ancho de un módulo en px. El estándar pide >= 0.264mm (~1px a 96dpi). */
  moduloPx?: number;
  altoBarras?: number;
  /** 0 = sin los dígitos debajo. */
  altoTexto?: number;
  margenModulos?: number;
  className?: string;
}

/**
 * Dibuja un EAN-13 como SVG. Sin librerías: las barras son rects sobre los 95
 * módulos del estándar. Si el código no es un EAN-13 válido no dibuja nada —
 * imprimir una etiqueta que no escanea es peor que no imprimirla.
 */
export default function CodigoBarrasEAN13({
  codigo,
  moduloPx = 2,
  altoBarras = 60,
  altoTexto = 12,
  margenModulos: margenBase = 10,
  className = '',
}: Props) {
  // El 1er dígito se dibuja dentro de la zona muda izquierda: si el margen es más
  // angosto que el propio dígito, se recorta y la etiqueta impresa queda sin él.
  const margenModulos =
    altoTexto > 0
      ? Math.max(margenBase, Math.ceil((altoTexto * 0.62) / moduloPx) + 1)
      : margenBase;

  const datos = useMemo(() => {
    if (!esEan13Valido(codigo)) return null;
    const modulos = modulosEan13(codigo);
    // Las guardas bajan hasta la línea del texto, como en el estándar.
    const extra = altoTexto > 0 ? altoTexto * 0.55 : 0;
    const esGuarda = (i: number) =>
      (i >= 0 && i < 3) || (i >= 45 && i < 50) || (i >= 92 && i < 95);

    const barras: { x: number; ancho: number; alto: number }[] = [];
    let i = 0;
    while (i < modulos.length) {
      if (modulos[i] === '0') {
        i++;
        continue;
      }
      let ancho = 1;
      while (
        i + ancho < modulos.length &&
        modulos[i + ancho] === '1' &&
        esGuarda(i) === esGuarda(i + ancho)
      ) {
        ancho++;
      }
      barras.push({
        x: (margenModulos + i) * moduloPx,
        ancho: ancho * moduloPx,
        alto: altoBarras + (esGuarda(i) ? extra : 0),
      });
      i += ancho;
    }

    return {
      barras,
      ancho: (modulos.length + margenModulos * 2) * moduloPx,
      alto: altoBarras + extra + (altoTexto > 0 ? altoTexto + 2 : 0),
      extra,
    };
  }, [codigo, moduloPx, altoBarras, altoTexto, margenModulos]);

  if (!datos) return null;

  const cx = (mod: number) => (margenModulos + mod) * moduloPx;
  const yTexto = datos.alto - 1;

  return (
    <svg
      viewBox={`0 0 ${datos.ancho} ${datos.alto}`}
      width={datos.ancho}
      height={datos.alto}
      shapeRendering="crispEdges"
      style={{ maxWidth: '100%', height: 'auto' }}
      className={className}
      role="img"
      aria-label={`Código de barras ${codigo}`}
    >
      <rect x={0} y={0} width={datos.ancho} height={datos.alto} fill="#ffffff" />
      <g fill="#000000">
        {datos.barras.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.ancho} height={b.alto} />
        ))}
      </g>
      {altoTexto > 0 && (
        <g fontFamily="monospace" fontSize={altoTexto} fill="#000000">
          <text x={cx(-1)} y={yTexto} textAnchor="end">
            {codigo[0]}
          </text>
          <text x={cx(24)} y={yTexto} textAnchor="middle">
            {codigo.slice(1, 7)}
          </text>
          <text x={cx(71)} y={yTexto} textAnchor="middle">
            {codigo.slice(7)}
          </text>
        </g>
      )}
    </svg>
  );
}
