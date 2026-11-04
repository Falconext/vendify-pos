import { useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { readableText } from '@/templates/shared/color';
import { textoMotivo, type AjusteLinea } from './carritoSede';

interface Props {
    /** Sede donde se revisó el carrito. */
    sedeNombre: string | null;
    ajustes: AjusteLinea[];
    color: string;
    /** Mensaje del servidor que motivó la revisión (p. ej. un 400 al pedir). */
    mensaje: string | null;
    /** Texto del botón principal ("Ajustar y comprar en Norte"). */
    textoConfirmar: string;
    /** Botón secundario; sin él solo se puede confirmar o cerrar. */
    textoCancelar: string;
    onConfirmar: () => void;
    onCancelar: () => void;
}

/** Qué pasa con el carrito en la sede: lo que se quita y lo que se ajusta. */
export default function ModalCarritoSede({ sedeNombre, ajustes, color, mensaje, textoConfirmar, textoCancelar, onConfirmar, onCancelar }: Props) {
    const cerrar = useCallback(() => onCancelar(), [onCancelar]);
    useEscapeKey(cerrar, true);
    const quitados = ajustes.filter((a) => a.nuevaCantidad === 0).length;

    return (
        <div className="fixed inset-0 z-[1001] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-carrito-sede">
            <div className="absolute inset-0 bg-black/45" onClick={cerrar} />
            <div className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" data-testid="modal-carrito-sede">
                <div className="px-5 pb-3 pt-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <Icon icon="solar:cart-cross-linear" className="h-5 w-5" />
                    </div>
                    <h2 id="titulo-carrito-sede" className="text-lg font-semibold text-gray-900">
                        {sedeNombre ? `Tu carrito en ${sedeNombre}` : 'Revisa tu carrito'}
                    </h2>
                    <p className="mt-1 text-[13px] leading-5 text-gray-500">
                        {mensaje || `${ajustes.length === 1 ? 'Un producto no está disponible' : `${ajustes.length} productos no están disponibles`} como lo pediste.`}
                        {quitados > 0 ? ' Lo que no se pueda pedir sale del carrito.' : ''}
                    </p>
                </div>

                <ul className="divide-y divide-gray-100 overflow-y-auto border-y border-gray-100 px-5">
                    {ajustes.map((a) => (
                        <li key={a.indice} className="flex items-center gap-3 py-3" data-testid={`ajuste-${a.indice}`}>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-gray-900">{a.nombre}</span>
                                <span className="block text-[12px] text-gray-500">{textoMotivo(a.motivo, sedeNombre)}</span>
                            </span>
                            <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${a.nuevaCantidad > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'}`}>
                                {a.nuevaCantidad > 0 ? `Quedan ${a.nuevaCantidad}` : 'Se quita'}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="grid gap-2 p-5">
                    <button
                        type="button"
                        data-testid="carrito-sede-confirmar"
                        onClick={onConfirmar}
                        className="rounded-2xl py-3 text-sm font-semibold transition hover:opacity-90"
                        style={{ backgroundColor: color, color: readableText(color) }}
                    >
                        {textoConfirmar}
                    </button>
                    <button type="button" onClick={onCancelar} className="rounded-2xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                        {textoCancelar}
                    </button>
                </div>
            </div>
        </div>
    );
}
