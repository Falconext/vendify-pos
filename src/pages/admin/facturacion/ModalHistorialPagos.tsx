import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { createPortal } from 'react-dom';
import { usePagosStore } from '@/zustand/pagos';

interface ModalHistorialPagosProps {
    comprobante: any;
    onClose: () => void;
}

const medioPagoIcon: Record<string, string> = {
    EFECTIVO: 'solar:banknote-bold-duotone',
    YAPE: 'solar:smartphone-bold-duotone',
    PLIN: 'solar:smartphone-bold-duotone',
    TRANSFERENCIA: 'solar:transfer-horizontal-bold-duotone',
    TARJETA: 'solar:card-bold-duotone',
};

// Mismos logos que el POS y "Registrar pago".
const MEDIO_LOGOS: Record<string, string> = {
    EFECTIVO: '/assets/pagos/efectivo.png',
    YAPE: '/assets/pagos/yape.png',
    PLIN: '/assets/pagos/plin.png',
    TRANSFERENCIA: '/assets/pagos/transferencia.png',
    TARJETA: '/assets/pagos/tarjeta.png',
};

const DIRIGIDO_LABEL: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    EMPRESA: 'Empresa',
    VENDEDOR: 'Vendedor',
};

const ModalHistorialPagos = ({ comprobante, onClose }: ModalHistorialPagosProps) => {
    const { getHistorialPagos, editarReferenciaPago, subirComprobantePago } = usePagosStore();
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPagado, setTotalPagado] = useState(0);
    const [imgPreview, setImgPreview] = useState<string>('');
    // Edición del N° de operación de un pago
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [refEdit, setRefEdit] = useState('');
    const [guardandoRef, setGuardandoRef] = useState(false);
    // Subida del comprobante/voucher de un pago (desde el historial)
    const [subiendoId, setSubiendoId] = useState<number | null>(null);

    // Adjunta la imagen del voucher a un pago que aún no lo tiene (o lo reemplaza).
    const subirVoucher = async (pagoId: number, file: File | null | undefined) => {
        if (!file) return;
        setSubiendoId(pagoId);
        try {
            const res = await subirComprobantePago(pagoId, file);
            if (res.success && res.comprobanteUrl) {
                setPagos((prev) => prev.map((p) => (p.id === pagoId ? { ...p, comprobanteUrl: res.comprobanteUrl } : p)));
            }
        } finally {
            setSubiendoId(null);
        }
    };

    const cargarPagos = async () => {
        try {
            setLoading(true);
            const result = await getHistorialPagos(comprobante.id);
            if (result.success) {
                setPagos(result.pagos || []);
                setTotalPagado(result.totalPagado || 0);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (comprobante?.id) cargarPagos();
    }, [comprobante?.id, getHistorialPagos]); // eslint-disable-line react-hooks/exhaustive-deps

    const iniciarEdicion = (pago: any) => {
        setEditandoId(pago.id);
        setRefEdit(pago.referencia || '');
    };

    const guardarReferencia = async (pagoId: number) => {
        setGuardandoRef(true);
        try {
            const res = await editarReferenciaPago(pagoId, { referencia: refEdit.trim() || null });
            if (res.success) {
                setPagos((prev) => prev.map((p) => (p.id === pagoId ? { ...p, referencia: refEdit.trim() || null } : p)));
                setEditandoId(null);
            }
        } finally {
            setGuardandoRef(false);
        }
    };

    const totalComprobante = Number(comprobante?.mtoImpVenta || 0);
    // comprobante.saldo viene del panel y ya descuenta adelanto + pagos anteriores.
    // totalPagado viene de los Pago records fetched ahora.
    // Math.min asegura que si el adelanto no generó un Pago record,
    // el saldo del panel (que sí lo descuenta) sea el techo correcto.
    const saldoPendiente = Math.min(
        Number(comprobante?.saldo ?? 0),
        Math.max(0, totalComprobante - totalPagado),
    );

    const pctPagado = totalComprobante > 0 ? Math.min(100, Math.round((totalPagado / totalComprobante) * 100)) : 0;
    const numero = `${comprobante?.serie || ''}-${String(comprobante?.correlativo ?? '').padStart(8, '0')}`;
    const logoMedio = (m: string) => MEDIO_LOGOS[String(m || '').toUpperCase()];
    const labelMedio = (m: string) => { const u = String(m || '').toUpperCase(); return u ? u.charAt(0) + u.slice(1).toLowerCase() : '—'; };

    // Mismo lenguaje visual que "Registrar pago" / "Coordinar envío": header
    // degradado con resumen, lista tipo línea de tiempo con el logo del medio.
    const content = (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 font-jakarta">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col" data-testid="modal-historial-pagos">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                <Icon icon="solar:history-bold-duotone" className="text-white text-xl" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-white font-black text-lg leading-none">Historial de pagos</h2>
                                <p className="text-indigo-200 text-xs mt-1 truncate">
                                    <span className="font-mono font-bold text-white/90">{numero}</span>
                                    <span className="mx-1.5 opacity-60">·</span>
                                    {comprobante?.cliente?.nombre || 'Sin cliente'}
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0">
                            <Icon icon="solar:close-circle-bold" className="text-lg" />
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                            { k: 'Total', v: totalComprobante, cls: 'text-white' },
                            { k: 'Pagado', v: totalPagado, cls: 'text-emerald-200' },
                            { k: 'Saldo', v: saldoPendiente, cls: saldoPendiente > 0.005 ? 'text-amber-200' : 'text-emerald-200' },
                        ].map((c) => (
                            <div key={c.k} className="rounded-2xl bg-white/10 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">{c.k}</p>
                                <p className={`text-sm font-black tabular-nums ${c.cls}`}>S/ {c.v.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${pctPagado}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-indigo-100 tabular-nums">{pctPagado}%</span>
                    </div>
                </div>

                {/* Lista de pagos */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Icon icon="eos-icons:loading" className="text-3xl text-indigo-400" />
                        </div>
                    ) : pagos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Icon icon="solar:wallet-money-linear" className="text-3xl text-slate-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin pagos registrados</p>
                            <p className="text-xs text-slate-400 mt-0.5">Los cobros de esta venta aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Línea de tiempo */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="space-y-3">
                                {pagos.map((pago: any, index: number) => {
                                    const logo = logoMedio(pago.medioPago);
                                    return (
                                        <div key={pago.id} className="relative flex gap-3" data-testid="pago-item">
                                            <div className="relative z-10 w-10 h-10 shrink-0 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                                                {logo
                                                    ? <img src={logo} alt={pago.medioPago} className="w-6 h-6 object-contain" />
                                                    : <Icon icon={medioPagoIcon[pago.medioPago] || 'solar:card-bold-duotone'} className="text-slate-500 text-lg" />}
                                            </div>
                                            <div className="flex-1 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                                                            Pago #{pagos.length - index}
                                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wide">{labelMedio(pago.medioPago)}</span>
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <Icon icon="solar:calendar-linear" className="text-[12px]" />
                                                            {moment(pago.fecha).format('DD/MM/YYYY HH:mm')}
                                                        </p>
                                                    </div>
                                                    <span className="text-base font-black text-slate-900 dark:text-white tabular-nums shrink-0">S/ {Number(pago.monto).toFixed(2)}</span>
                                                </div>

                                                {/* N° de operación (editable) */}
                                                <div className="mt-2">
                                                    {editandoId === pago.id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                autoFocus
                                                                value={refEdit}
                                                                onChange={(e) => setRefEdit(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') guardarReferencia(pago.id); if (e.key === 'Escape') setEditandoId(null); }}
                                                                placeholder="N° de operación"
                                                                className="h-8 w-40 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
                                                            />
                                                            <button type="button" onClick={() => guardarReferencia(pago.id)} disabled={guardandoRef}
                                                                className="h-8 w-8 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center" title="Guardar">
                                                                <Icon icon={guardandoRef ? 'svg-spinners:180-ring' : 'solar:check-read-bold'} className="text-base" />
                                                            </button>
                                                            <button type="button" onClick={() => setEditandoId(null)}
                                                                className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center" title="Cancelar">
                                                                <Icon icon="solar:close-circle-linear" className="text-base" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button type="button" onClick={() => iniciarEdicion(pago)} title="Editar N° de operación"
                                                            className="group inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                                                            <Icon icon="solar:hashtag-square-linear" className="text-sm" />
                                                            <span className="font-semibold">{pago.referencia ? String(pago.referencia).toUpperCase() : 'Sin N° de operación'}</span>
                                                            <Icon icon="solar:pen-2-linear" className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    )}
                                                </div>

                                                {pago.observacion && (
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 italic">“{pago.observacion}”</p>
                                                )}

                                                {(pago.vendedorNombre || pago.dirigidoA) && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {pago.vendedorNombre && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
                                                                <Icon icon="solar:user-bold-duotone" className="text-[12px]" />
                                                                {pago.vendedorNombre}
                                                            </span>
                                                        )}
                                                        {pago.dirigidoA && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 text-[11px] font-semibold">
                                                                <Icon icon="solar:hand-money-bold-duotone" className="text-[12px]" />
                                                                Dirigido a: {DIRIGIDO_LABEL[pago.dirigidoA] || pago.dirigidoA}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Voucher */}
                                                {pago.comprobanteUrl ? (
                                                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                                        <button type="button" onClick={() => setImgPreview(pago.comprobanteUrl)} className="flex items-center gap-2 group">
                                                            <img src={pago.comprobanteUrl} alt="Comprobante" className="h-10 w-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:ring-2 group-hover:ring-indigo-400 transition" />
                                                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">Ver voucher</span>
                                                        </button>
                                                        <a href={pago.comprobanteUrl} target="_blank" rel="noopener noreferrer" download title="Descargar comprobante"
                                                            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition">
                                                            <Icon icon="solar:download-minimalistic-bold-duotone" className="text-[13px]" />
                                                            Descargar
                                                        </a>
                                                        <label className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold hover:border-indigo-300 transition cursor-pointer" title="Reemplazar comprobante">
                                                            <Icon icon={subiendoId === pago.id ? 'svg-spinners:180-ring' : 'solar:refresh-bold-duotone'} className="text-[13px]" />
                                                            Cambiar
                                                            <input type="file" accept="image/*" className="hidden" disabled={subiendoId === pago.id} onChange={(e) => subirVoucher(pago.id, e.target.files?.[0])} />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <label className="mt-2.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition cursor-pointer" title="Adjuntar el voucher / comprobante de este pago">
                                                        <Icon icon={subiendoId === pago.id ? 'svg-spinners:180-ring' : 'solar:gallery-add-bold-duotone'} className="text-[14px]" />
                                                        {subiendoId === pago.id ? 'Subiendo…' : 'Adjuntar voucher'}
                                                        <input type="file" accept="image/*" className="hidden" disabled={subiendoId === pago.id} onChange={(e) => subirVoucher(pago.id, e.target.files?.[0])} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                        {pagos.length} {pagos.length === 1 ? 'pago registrado' : 'pagos registrados'}
                    </p>
                    <button type="button" onClick={onClose}
                        className="h-11 px-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Lightbox del comprobante */}
            {imgPreview && (
                <div
                    className="fixed inset-0 z-[9999999] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setImgPreview('')}
                >
                    <img src={imgPreview} alt="Comprobante" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" />
                    <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <a
                            href={imgPreview}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            title="Descargar comprobante"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition"
                        >
                            <Icon icon="solar:download-minimalistic-bold-duotone" className="text-lg" />
                            Descargar
                        </a>
                        <button onClick={() => setImgPreview('')} className="text-white/80 hover:text-white p-1.5">
                            <Icon icon="mdi:close" className="text-3xl" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

export default ModalHistorialPagos;
