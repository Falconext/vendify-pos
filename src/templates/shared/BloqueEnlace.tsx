import { forwardRef, type HTMLAttributes, type Ref } from 'react';
import { EnlaceTienda } from '@/components/tienda/navTienda';

type Props = Omit<HTMLAttributes<HTMLElement>, 'href'> & {
  /** `null` = "Sin enlace": se pinta igual pero no navega. */
  href: string | null;
  slug: string | undefined;
  diseno?: any;
};

/**
 * Tarjeta/banner del home con destino configurable: navega sin recargar dentro
 * de la tienda, abre otra pestaña si es una URL externa y, si el dueño eligió
 * "Sin enlace", queda como bloque estático con el mismo aspecto.
 */
export const BloqueEnlace = forwardRef<HTMLElement, Props>(function BloqueEnlace({ href, slug, diseno, ...rest }, ref) {
  if (!href) return <div ref={ref as Ref<HTMLDivElement>} {...rest} />;
  const externo = !href.startsWith('/');
  return (
    <EnlaceTienda
      ref={ref as Ref<HTMLAnchorElement>}
      href={href}
      slug={slug}
      diseno={diseno}
      {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}
      {...rest}
    />
  );
});
