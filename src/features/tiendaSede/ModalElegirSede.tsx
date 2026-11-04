import { useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { readableText } from '@/templates/shared/color';
import { direccionDeSede, type SedeTienda } from './sedeTienda';

interface Props {
    sedes: SedeTienda[];
    sedeActualId: number | null;
    color: string;
    /** Sede que se está aplicando (revisando el carrito): muestra la ruedita. */
    aplicandoId: number | null;
    motivo: string | null;
    horario?: string | null;
    primeraVez: boolean;
    onElegir: (sedeId: number) => void;
    onCerrar: () => void;
}

/** "¿Dónde quieres comprar?": cada sede con su dirección; un toque la elige. */
export default function ModalElegirSede({ sedes, sedeActualId, color, aplicandoId, motivo, horario, primeraVez, onElegir, onCerrar }: Props) {
    const cerrar = useCallback(() => { if (!aplicandoId) onCerrar(); }, [aplicandoId, onCerrar]);
    useEscapeKey(cerrar, true);
    const texto = readableText(color);

    return (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-elegir-sede">
            <div className="absolute inset-0 bg-black/45" onClick={cerrar} />
            <div className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" data-testid="modal-elegir-sede">
                <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
                    <div className="min-w-0">
                        <h2 id="titulo-elegir-sede" className="text-lg font-semibold text-gray-900">¿Dónde quieres comprar?</h2>
                        <p className="mt-1 text-[13px] leading-5 text-gray-500">
                            Te mostramos el stock y la dirección de recojo de la sede que elijas.{primeraVez ? '' : ' Puedes cambiarla cuando quieras.'}
                        </p>
                    </div>
                    <button type="button" onClick={cerrar} aria-label="Cerrar" className="-mr-1 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                        <Icon icon="solar:close-circle-linear" className="h-6 w-6" />
                    </button>
                </div>

                {motivo && (
                    <p className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800" role="alert">
                        <Icon icon="solar:info-circle-linear" className="mt-0.5 h-4 w-4 flex-none" />
                        {motivo}
                    </p>
                )}

                <ul className="space-y-2 overflow-y-auto px-5 pb-4">
                    {sedes.map((s) => {
                        const activa = s.id === sedeActualId;
                        const cargando = aplicandoId === s.id;
                        const direccion = direccionDeSede(s);
                        return (
                            <li key={s.id}>
                                <button
                                    type="button"
                                    data-testid={`elegir-sede-${s.id}`}
                                    disabled={!!aplicandoId}
                                    onClick={() => onElegir(s.id)}
                                    aria-pressed={activa}
                                    className="flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition hover:bg-gray-50 disabled:cursor-wait"
                                    style={{ borderColor: activa ? color : '#F1F1F3' }}
                                >
                                    <span
                                        className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full"
                                        style={{ backgroundColor: activa ? color : '#F4F4F5', color: activa ? texto : '#71717A' }}
                                    >
                                        <Icon icon={cargando ? 'svg-spinners:180-ring' : activa ? 'solar:check-read-linear' : 'solar:shop-2-linear'} className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-gray-900">{s.nombre}</span>
                                            {s.esPrincipal && <span className="flex-none rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Principal</span>}
                                        </span>
                                        <span className="mt-0.5 block text-[12.5px] leading-5 text-gray-500">{direccion || 'Dirección por confirmar'}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {horario && (
                    <p className="flex items-center gap-1.5 border-t border-gray-100 px-5 py-3 text-[12px] text-gray-500">
                        <Icon icon="solar:clock-circle-linear" className="h-4 w-4" /> {horario}
                    </p>
                )}
            </div>
        </div>
    );
}
