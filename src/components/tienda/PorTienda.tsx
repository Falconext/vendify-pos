import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ControlSedeTienda from '@/features/tiendaSede/ControlSedeTienda';
import { instalarInterceptorSede } from '@/features/tiendaSede/interceptorSede';
import { useSedeTiendaStore } from '@/features/tiendaSede/sedeTienda';

// Las plantillas leen el catálogo con el axios global: ahí se agrega `?sede=`.
instalarInterceptorSede(axios);

interface Props {
    children: ReactNode;
    /** Franja "Comprando en", modal de sede y aviso de la ficha (no en seguimiento, blog…). */
    conSede?: boolean;
    /**
     * Volver a montar la página al cambiar de sede (todo se vuelve a pedir con
     * la sede nueva). El checkout no: perdería lo que el cliente ya escribió;
     * él mismo relee el carrito y la dirección de recojo.
     */
    recargarAlCambiarSede?: boolean;
}

/**
 * Cada tienda es una página nueva. Sin esto, al pasar de /tienda/a a
 * /tienda/b sin recargar React reutiliza la misma página y, hasta que llega
 * la tienda b, se sigue viendo la tienda a (su plantilla y sus productos)
 * bajo la dirección de la b. Lo mismo al cambiar de sede: la página se vuelve
 * a montar y pide el catálogo de la sede nueva, sin recargar el navegador.
 */
export default function PorTienda({ children, conSede = true, recargarAlCambiarSede = true }: Props) {
    const { slug, id } = useParams();
    const generacion = useSedeTiendaStore((s) => (s.slug === slug ? s.generacion : 0));
    const productoId = Number(id);
    const clave = recargarAlCambiarSede ? `${slug}:${generacion}` : String(slug);
    return (
        <>
            {slug && conSede && (
                <ControlSedeTienda slug={slug} productoId={Number.isInteger(productoId) && productoId > 0 ? productoId : null} />
            )}
            <Fragment key={clave}>{children}</Fragment>
        </>
    );
}
