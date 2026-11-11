import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import TableActionMenu from '@/components/TableActionMenu';
import useAlertStore from '@/zustand/alert';
import { patch } from '@/utils/fetch';
import { ESTADOS_FABRICACION, estadoFabricacionDe, type EstadoFabricacion } from './estadoFabricacion';

interface Props {
    comprobanteId: number;
    estado?: string | null;
    /** Anulada: se muestra el estado pero no se puede cambiar. */
    bloqueado?: boolean;
    onCambio?: (estado: EstadoFabricacion) => void;
}

/**
 * Chip con el estado de fabricación de una OT; un clic abre las opciones y
 * guarda al elegir. El despacho tiene su propio seguimiento: esto es solo en
 * qué va el trabajo.
 */
const EstadoFabricacionOT = ({ comprobanteId, estado, bloqueado, onCambio }: Props) => {
    const [actual, setActual] = useState<EstadoFabricacion>(estadoFabricacionDe(estado).id);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [guardando, setGuardando] = useState(false);
    const info = estadoFabricacionDe(actual);
    // Al recargar la lista llega el estado guardado.
    useEffect(() => { setActual(estadoFabricacionDe(estado).id); }, [estado]);

    const elegir = async (nuevo: EstadoFabricacion) => {
        setAnchor(null);
        if (nuevo === actual) return;
        setGuardando(true);
        const resp = await patch(`comprobante/${comprobanteId}/ot-estado`, { estadoOT: nuevo });
        setGuardando(false);
        if (!resp.success) {
            useAlertStore.getState().alert(resp.error || 'No se pudo cambiar el estado', 'error');
            return;
        }
        setActual(nuevo);
        useAlertStore.getState().alert(`Orden marcada como "${estadoFabricacionDe(nuevo).label}"`, 'success');
        onCambio?.(nuevo);
    };

    return (
        <>
            <button
                type="button"
                disabled={bloqueado || guardando}
                aria-label={`Fabricación: ${info.label}`}
                aria-haspopup="menu"
                aria-expanded={!!anchor}
                title={bloqueado ? 'Orden anulada' : 'Cambiar estado de fabricación'}
                onClick={(e) => { e.stopPropagation(); setAnchor(anchor ? null : e.currentTarget); }}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold transition ${info.chip} ${bloqueado ? 'cursor-default opacity-60' : 'hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400'}`}
            >
                {guardando
                    ? <Icon icon="svg-spinners:ring-resize" className="text-[11px]" />
                    : <span className={`h-[7px] w-[7px] rounded-full ${info.punto}`} />}
                {info.label}
                {!bloqueado && <Icon icon="solar:alt-arrow-down-linear" className="text-[11px] opacity-70" />}
            </button>
            <TableActionMenu isOpen={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} className="w-60">
                {/* El menú va en un portal, pero los clics igual suben a la fila (que abre el detalle). */}
                <div onClick={(ev) => ev.stopPropagation()}>
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-wide text-gray-400">Estado de fabricación</p>
                {ESTADOS_FABRICACION.map((e) => (
                    <button
                        key={e.id}
                        type="button"
                        role="menuitem"
                        onClick={() => elegir(e.id)}
                        className={`flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700/60 ${e.id === actual ? 'bg-gray-50 dark:bg-slate-700/40' : ''}`}
                    >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.punto}`} />
                        <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-gray-800 dark:text-gray-100">{e.label}</span>
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400">{e.descripcion}</span>
                        </span>
                        {e.id === actual && <Icon icon="solar:check-read-linear" className="mt-0.5 text-base text-violet-600" />}
                    </button>
                ))}
                </div>
            </TableActionMenu>
        </>
    );
};

export default EstadoFabricacionOT;
