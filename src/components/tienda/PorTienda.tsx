import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Cada tienda es una página nueva. Sin esto, al pasar de /tienda/a a
 * /tienda/b sin recargar React reutiliza la misma página y, hasta que llega
 * la tienda b, se sigue viendo la tienda a (su plantilla y sus productos)
 * bajo la dirección de la b.
 */
export default function PorTienda({ children }: { children: ReactNode }) {
    const { slug } = useParams();
    return <Fragment key={slug}>{children}</Fragment>;
}
