import { useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import { mensajeEstadoCuenta, resumirSeleccion, telefonoWhatsApp, type NotaElegida } from './seleccionNotas';

interface Props {
    notas: NotaElegida[];
    negocio: string;
    onClose: () => void;
}

/**
 * Estado de cuenta por WhatsApp con las notas elegidas. Abre el WhatsApp del
 * propio usuario con el mensaje listo (wa.me): no pasa por la API de Meta ni
 * necesita el módulo de IA de Ventas, y el empresario lo revisa antes de enviar.
 */
export default function ModalEstadoCuentaWhatsApp({ notas, negocio, onClose }: Props) {
    const r = resumirSeleccion(notas);
    const [telefono, setTelefono] = useState(r.telefono);
    const [mensaje, setMensaje] = useState(() => mensajeEstadoCuenta(notas, negocio));
    const [copiado, setCopiado] = useState(false);
    const numero = telefonoWhatsApp(telefono);

    const abrir = () => {
        if (!numero) return;
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
    };
    const copiar = async () => {
        try { await navigator.clipboard.writeText(mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* sin permiso de portapapeles */ }
    };

    const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

    return (
        <Modal isOpenModal closeModal={onClose} title="Estado de cuenta por WhatsApp" icon="logos:whatsapp-icon" width="560px" position="right">
            <div className="space-y-4 p-4" data-testid="modal-estado-cuenta">
                {!r.mismoCliente && (
                    <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        <Icon icon="solar:danger-triangle-bold" width={16} className="mt-px shrink-0" />
                        Elegiste notas de clientes distintos. Revisa el mensaje antes de enviarlo.
                    </p>
                )}
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-gray-500">Celular del cliente</label>
                    <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 987 654 321" inputMode="tel" className={inputCls} aria-label="Celular del cliente" />
                    {telefono && !numero && <p className="mt-1 text-xs text-rose-600">Ese número no parece un celular.</p>}
                    {!telefono && <p className="mt-1 text-xs text-gray-500">El cliente no tiene celular registrado: escríbelo aquí.</p>}
                </div>
                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-gray-500">Mensaje</label>
                    <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={12} className={`${inputCls} font-mono text-xs leading-relaxed`} aria-label="Mensaje" />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={copiar} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200">
                        <Icon icon={copiado ? 'solar:check-circle-bold' : 'solar:copy-linear'} className="text-lg" />
                        {copiado ? 'Copiado' : 'Copiar mensaje'}
                    </button>
                    <button type="button" onClick={abrir} disabled={!numero} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50">
                        <Icon icon="ic:baseline-whatsapp" className="text-lg" />
                        Abrir WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
}
