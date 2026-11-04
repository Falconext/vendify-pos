import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

export interface MensajeEstadoPendiente {
    referencia: string;
    cliente: string;
    estadoLabel: string;
    telefono: string;
    texto: string;
}

interface Props {
    pendiente: MensajeEstadoPendiente;
    procesando: boolean;
    onEnviar: (telefono: string, texto: string) => void;
    onSoloEstado: () => void;
    onCancelar: () => void;
}

/**
 * Al cambiar el estado del despacho: el aviso al cliente ya viene armado y el
 * negocio lo revisa o lo cambia antes de que salga.
 */
export function ModalMensajeEstado({ pendiente, procesando, onEnviar, onSoloEstado, onCancelar }: Props) {
    const [telefono, setTelefono] = useState(pendiente.telefono);
    const [texto, setTexto] = useState(pendiente.texto);

    useEffect(() => {
        setTelefono(pendiente.telefono);
        setTexto(pendiente.texto);
    }, [pendiente]);

    const puedeEnviar = telefono.replace(/\D/g, '').length >= 9 && texto.trim().length > 0;

    // Portal al body: dentro del panel, un ancestro hace que `fixed` no cubra
    // la ventana entera y quedaba una franja sin oscurecer arriba.
    return createPortal(
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={procesando ? undefined : onCancelar}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#111827]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-emerald-600 px-5 py-3 text-white">
                    <div className="flex items-center gap-2">
                        <Icon icon="mdi:whatsapp" className="text-xl" />
                        <p className="text-sm font-bold">Avisar al cliente · {pendiente.estadoLabel}</p>
                    </div>
                    <button type="button" onClick={onCancelar} disabled={procesando} className="rounded-lg p-1 hover:bg-white/15">
                        <Icon icon="mdi:close" className="text-lg" />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {pendiente.referencia} · {pendiente.cliente}. Puedes cambiar el mensaje antes de enviarlo.
                    </p>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mensaje</span>
                        <textarea
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            rows={6}
                            autoFocus
                            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">*texto* sale en negrita en WhatsApp.</span>
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Celular del cliente</span>
                        <input
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            inputMode="tel"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                    </label>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onSoloEstado}
                        disabled={procesando}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Solo cambiar estado
                    </button>
                    <button
                        type="button"
                        onClick={() => onEnviar(telefono, texto)}
                        disabled={procesando || !puedeEnviar}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Icon icon={procesando ? 'svg-spinners:180-ring' : 'solar:plain-bold'} className="text-base" />
                        Cambiar estado y enviar
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
