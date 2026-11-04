import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { obtenerTiendaPublica } from '@/lib/tiendaPublica';
import FranjaSede from './FranjaSede';
import ModalElegirSede from './ModalElegirSede';
import ModalCarritoSede from './ModalCarritoSede';
import AvisoOtraSede, { debeAvisarOtraSede } from './AvisoOtraSede';
import { aplicarAjustes, guardarCarrito, revisarCarrito, type RevisionCarrito } from './carritoSede';
import {
    clienteEligeSede,
    fichaDe,
    normalizarStockTienda,
    sedeParaPedido,
    sedePorId,
    useSedeTiendaStore,
} from './sedeTienda';

/** Dentro del editor de plantillas (iframe) no se interrumpe con el modal. */
const enIframe = (): boolean => {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
};

interface Pendiente extends RevisionCarrito {
    /** `cambio`: se está pasando a otra sede. `revision`: el carrito en la sede actual. */
    tipo: 'cambio' | 'revision';
    sedeId: number | null;
    mensaje: string | null;
}

interface Props {
    slug: string;
    /** Producto de la ruta (`/producto/:id`), para el aviso "Disponible en …". */
    productoId: number | null;
}

/**
 * Todo lo de la sede en la tienda pública, igual para las 43 plantillas: la
 * franja "Comprando en", el modal para elegir (primera visita o al tocar la
 * franja), la revisión del carrito al cambiar y el aviso común de la ficha.
 */
export default function ControlSedeTienda({ slug, productoId }: Props) {
    const [params] = useSearchParams();
    const vistaPrevia = slug === 'preview' || !!params.get('previewPlantilla') || enIframe();

    const stockTienda = useSedeTiendaStore((s) => (s.slug === slug ? s.stockTienda : null));
    const sedeId = useSedeTiendaStore((s) => s.sedeId);
    const eligioAntes = useSedeTiendaStore((s) => s.eligioAntes);
    const selectorAbierto = useSedeTiendaStore((s) => s.selectorAbierto);
    const motivoSelector = useSedeTiendaStore((s) => s.motivoSelector);
    const revision = useSedeTiendaStore((s) => s.revision);
    const ficha = useSedeTiendaStore((s) => (productoId ? fichaDe(s.fichas, slug, productoId) : null));
    const { iniciar, confirmarSede, carritoCambiado, abrirSelector, cerrarSelector, setFranjaVisible } = useSedeTiendaStore.getState();

    const [color, setColor] = useState('#111827');
    const [horario, setHorario] = useState<string | null>(null);
    const [aplicando, setAplicando] = useState<number | null>(null);
    const [pendiente, setPendiente] = useState<Pendiente | null>(null);

    useEffect(() => {
        let vivo = true;
        obtenerTiendaPublica(slug)
            .then(({ data }) => {
                const t = (data?.data ?? data) as Record<string, any> | null;
                if (!vivo || !t) return;
                iniciar(slug, normalizarStockTienda(t.stockTienda));
                setColor(t.diseno?.colorPrimario || t.colorPrimario || '#111827');
                setHorario(typeof t.horarioAtencion === 'string' && t.horarioAtencion.trim() ? t.horarioAtencion.trim() : null);
            })
            .catch(() => { /* la página muestra su propio error */ });
        return () => { vivo = false; };
    }, [slug, iniciar]);

    const eligeSede = clienteEligeSede(stockTienda);
    const sedeActual = sedePorId(stockTienda, sedeId);
    const mostrarFranja = eligeSede && !!sedeActual;

    useEffect(() => {
        setFranjaVisible(mostrarFranja);
        return () => setFranjaVisible(false);
    }, [mostrarFranja, setFranjaVisible]);

    // Primera visita: se pregunta una vez; cerrar sin elegir se queda con la de la tienda.
    useEffect(() => {
        if (eligeSede && !eligioAntes && !vistaPrevia) abrirSelector();
    }, [eligeSede, eligioAntes, vistaPrevia, abrirSelector]);

    const cambiarSede = useCallback(async (nueva: number) => {
        const actual = useSedeTiendaStore.getState().sedeId;
        if (nueva === actual) { confirmarSede(nueva); return; }
        setAplicando(nueva);
        try {
            const rev = await revisarCarrito(slug, nueva);
            if (rev && rev.ajustes.length) {
                cerrarSelector();
                setPendiente({ ...rev, tipo: 'cambio', sedeId: nueva, mensaje: null });
                return;
            }
        } catch {
            // Sin respuesta: se cambia igual; el pedido vuelve a validar el stock.
        } finally {
            setAplicando(null);
        }
        confirmarSede(nueva);
    }, [slug, confirmarSede, cerrarSelector]);

    // El checkout pide revisar el carrito cuando el pedido vuelve con un 400 de stock.
    const ultimaRevision = useRef(revision.n);
    useEffect(() => {
        if (revision.n === ultimaRevision.current) return;
        ultimaRevision.current = revision.n;
        const sede = sedeParaPedido(slug);
        revisarCarrito(slug, sede)
            .then((rev) => {
                if (rev && rev.ajustes.length) setPendiente({ ...rev, tipo: 'revision', sedeId: sede, mensaje: revision.mensaje });
                else if (revision.mensaje) window.alert(revision.mensaje);
            })
            .catch(() => { if (revision.mensaje) window.alert(revision.mensaje); });
    }, [revision, slug]);

    const confirmarPendiente = () => {
        if (!pendiente) return;
        guardarCarrito(slug, aplicarAjustes(pendiente.carrito, pendiente.ajustes));
        carritoCambiado();
        if (pendiente.tipo === 'cambio' && pendiente.sedeId) confirmarSede(pendiente.sedeId);
        setPendiente(null);
    };

    const sedePendiente = pendiente ? sedePorId(stockTienda, pendiente.sedeId) : null;
    const fichaVigente = ficha && (ficha.sedeId ?? stockTienda?.sedeDefaultId ?? null) === sedeId ? ficha : null;

    return (
        <>
            {mostrarFranja && sedeActual && (
                <FranjaSede sede={sedeActual} color={color} onAbrir={() => abrirSelector()} />
            )}

            {eligeSede && selectorAbierto && stockTienda && (
                <ModalElegirSede
                    sedes={stockTienda.sedes}
                    sedeActualId={sedeId}
                    color={color}
                    aplicandoId={aplicando}
                    motivo={motivoSelector}
                    horario={horario}
                    primeraVez={!eligioAntes}
                    onElegir={(id) => void cambiarSede(id)}
                    onCerrar={() => (eligioAntes || !sedeId ? cerrarSelector() : confirmarSede(sedeId))}
                />
            )}

            {pendiente && (
                <ModalCarritoSede
                    sedeNombre={sedePendiente?.nombre ?? null}
                    ajustes={pendiente.ajustes}
                    color={color}
                    mensaje={pendiente.mensaje}
                    textoConfirmar={pendiente.tipo === 'cambio' ? `Ajustar y comprar en ${sedePendiente?.nombre ?? 'esta sede'}` : 'Actualizar mi carrito'}
                    textoCancelar={pendiente.tipo === 'cambio' ? `Seguir en ${sedeActual?.nombre ?? 'mi sede'}` : 'Cerrar'}
                    onConfirmar={confirmarPendiente}
                    onCancelar={() => setPendiente(null)}
                />
            )}

            {mostrarFranja && sedeActual && debeAvisarOtraSede(fichaVigente) && (
                <AvisoOtraSede
                    key={`${productoId}:${sedeId}`}
                    ficha={fichaVigente}
                    sedeNombre={sedeActual.nombre}
                    color={color}
                    onCambiar={(id) => void cambiarSede(id)}
                />
            )}
        </>
    );
}
