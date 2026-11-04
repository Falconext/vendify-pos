import { useState } from 'react';
import { Icon } from '@iconify/react';
import { mensajeOtraSede } from '@/features/admin/tienda/sedePedido';

interface Props {
    sedePedido: { id: number; nombre: string };
    sedeActiva: string;
    /** El usuario tiene acceso a la sede del pedido (puede cambiarse). */
    puedeCambiar: boolean;
    onCambiar: () => Promise<boolean>;
    onGenerarNota: () => void;
    onCerrar: () => void;
}

/** Aviso antes de abrir el punto de venta con un pedido de otra sede. */
export default function ModalPedidoOtraSede({ sedePedido, sedeActiva, puedeCambiar, onCambiar, onGenerarNota, onCerrar }: Props) {
    const [cambiando, setCambiando] = useState(false);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={cambiando ? undefined : onCerrar} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111827]" data-testid="modal-pedido-otra-sede">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                    <Icon icon="solar:buildings-2-bold" className="text-xl" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pedido de {sedePedido.nombre}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{mensajeOtraSede(sedePedido.nombre, sedeActiva)}</p>
                {!puedeCambiar && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No tienes acceso a {sedePedido.nombre}: pídele a tu administrador que te la asigne en Usuarios.</p>
                )}
                <div className="mt-5 grid gap-2">
                    {puedeCambiar && (
                        <button
                            type="button"
                            data-testid="otra-sede-cambiar"
                            disabled={cambiando}
                            onClick={async () => { setCambiando(true); const ok = await onCambiar(); if (!ok) setCambiando(false); }}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-700"
                        >
                            <Icon icon={cambiando ? 'svg-spinners:180-ring' : 'solar:transfer-horizontal-bold'} />
                            Cambiarme a {sedePedido.nombre} y continuar
                        </button>
                    )}
                    <button type="button" data-testid="otra-sede-nota" disabled={cambiando} onClick={onGenerarNota} className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800">
                        Generar la nota desde el pedido
                    </button>
                    <button type="button" disabled={cambiando} onClick={onCerrar} className="py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
