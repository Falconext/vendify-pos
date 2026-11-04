import { memo, type SVGProps } from 'react';

/**
 * Ícono del Libro de Reclamaciones (libro abierto, como el distintivo de
 * INDECOPI). Usa `currentColor`: toma el color del texto donde se pinte.
 */
function IconoLibroReclamaciones({ size = 18, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* Tapas */}
      <path d="M16 8.5C13.2 6.4 9 5.6 3.5 6v18.5c5.5-.4 9.7.4 12.5 2.5 2.8-2.1 7-2.9 12.5-2.5V6C23 5.6 18.8 6.4 16 8.5Z" />
      {/* Lomo */}
      <path d="M16 8.5V27" />
      {/* Renglones */}
      <path d="M7 11.2c2.3-.1 4.3.3 6 1.1M7 15.2c2.3-.1 4.3.3 6 1.1M7 19.2c2.3-.1 4.3.3 6 1.1M25 11.2c-2.3-.1-4.3.3-6 1.1M25 15.2c-2.3-.1-4.3.3-6 1.1M25 19.2c-2.3-.1-4.3.3-6 1.1" strokeWidth={1.3} />
    </svg>
  );
}

export default memo(IconoLibroReclamaciones);
