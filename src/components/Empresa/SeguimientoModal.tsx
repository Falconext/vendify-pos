import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import useAlertStore from '@/zustand/alert';
import {
    listarSeguimientos,
    crearSeguimiento,
    actualizarGestion,
    type SeguimientoEmpresa,
    type EstadoGestion,
} from '@/services/empresaPostventa.service';

interface Props {
    empresa: any | null; // fila/empresa abierta; null = cerrado
    onClose: () => void;
    onGestionActualizada: (empresaId: number, estadoGestion: EstadoGestion | null) => void;
}

const ESTADOS: { id: EstadoGestion; label: string; cls: string; dot: string }[] = [
    { id: 'POR_CONTACTAR', label: 'Por contactar', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
    { id: 'CONTACTADA', label: 'Contactada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
    { id: 'EN_NEGOCIACION', label: 'En negociación', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    { id: 'RECUPERADA', label: 'Recuperada', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { id: 'PERDIDA', label: 'Perdida', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', dot: 'bg-rose-500' },
];

const CANALES = [
    { id: 'WHATSAPP', label: 'WhatsApp', icon: 'ic:baseline-whatsapp' },
    { id: 'LLAMADA', label: 'Llamada', icon: 'solar:phone-bold' },
    { id: 'CORREO', label: 'Correo', icon: 'solar:letter-bold' },
    { id: 'PRESENCIAL', label: 'Presencial', icon: 'solar:users-group-rounded-bold' },
    { id: 'OTRO', label: 'Otro', icon: 'solar:chat-round-dots-bold' },
];

const estadoMeta = (id?: string | null) => ESTADOS.find((e) => e.id === id);

const fmtFecha = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const SeguimientoModal = ({ empresa, onClose, onGestionActualizada }: Props) => {
    const { alert } = useAlertStore();
    const [items, setItems] = useState<SeguimientoEmpresa[]>([]);
    const [loading, setLoading] = useState(false);
    const [nota, setNota] = useState('');
    const [canal, setCanal] = useState<string>('WHATSAPP');
    const [saving, setSaving] = useState(false);
    const [savingEstado, setSavingEstado] = useState<string | null>(null);

    const empresaId: number | undefined = empresa?.id;
    const estadoActual: EstadoGestion | null = empresa?.estadoGestion ?? null;
    const nombre = empresa?.nombreComercial || empresa?.['Razon Social'] || empresa?.razonSocial || 'Empresa';

    useEffect(() => {
        if (!empresaId) return;
        setLoading(true);
        listarSeguimientos(empresaId)
            .then(setItems)
            .catch(() => alert('No se pudo cargar la bitácora', 'error'))
            .finally(() => setLoading(false));
        setNota('');
        setCanal('WHATSAPP');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaId]);

    if (!empresa) return null;

    const cambiarEstado = async (id: EstadoGestion | null) => {
        if (!empresaId || savingEstado) return;
        setSavingEstado(id ?? 'NULL');
        try {
            await actualizarGestion(empresaId, { estadoGestion: id });
            onGestionActualizada(empresaId, id);
            const fresh = await listarSeguimientos(empresaId);
            setItems(fresh);
            alert('Estado de gestión actualizado', 'success');
        } catch {
            alert('No se pudo actualizar el estado', 'error');
        } finally {
            setSavingEstado(null);
        }
    };

    const registrar = async () => {
        if (!empresaId || saving) return;
        const texto = nota.trim();
        if (!texto) { alert('Escribe una nota', 'warning'); return; }
        setSaving(true);
        try {
            await crearSeguimiento(empresaId, { nota: texto, canal });
            const fresh = await listarSeguimientos(empresaId);
            setItems(fresh);
            setNota('');
            alert('Seguimiento registrado', 'success');
        } catch {
            alert('No se pudo registrar el seguimiento', 'error');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0F1623] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:clipboard-heart-bold-duotone" className="text-rose-500 text-xl shrink-0" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{nombre}</h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Seguimiento postventa / retención</p>
                    </div>
                    <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Icon icon="solar:close-circle-bold" width={20} height={20} />
                    </button>
                </div>

                <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5">
                    {/* Estado de gestión */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Estado de gestión</p>
                        <div className="flex flex-wrap gap-2">
                            {ESTADOS.map((e) => {
                                const active = estadoActual === e.id;
                                return (
                                    <button
                                        key={e.id}
                                        type="button"
                                        disabled={savingEstado !== null}
                                        onClick={() => cambiarEstado(active ? null : e.id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-50 ${active ? `${e.cls} border-transparent ring-2 ring-offset-1 ring-slate-300/60 dark:ring-offset-[#0F1623]` : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
                                        {e.label}
                                        {savingEstado === e.id && <Icon icon="svg-spinners:180-ring" width={12} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Nueva nota */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Registrar contacto</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {CANALES.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setCanal(c.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${canal === c.id ? 'btn-accent-soft border-accent-brand' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                >
                                    <Icon icon={c.icon} width={14} height={14} />
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            rows={3}
                            placeholder="¿Qué conversaste con el cliente? ¿Qué acordaron? Próximo paso…"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--accent)] resize-none"
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={registrar}
                                disabled={saving || !nota.trim()}
                                className="btn-accent inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                            >
                                <Icon icon={saving ? 'svg-spinners:180-ring' : 'solar:add-circle-bold'} width={16} height={16} />
                                Registrar seguimiento
                            </button>
                        </div>
                    </div>

                    {/* Historial */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Historial ({items.length})</p>
                        {loading ? (
                            <div className="py-8 text-center text-sm text-slate-400"><Icon icon="svg-spinners:180-ring" className="inline mr-2" />Cargando…</div>
                        ) : items.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Aún no hay seguimientos registrados</div>
                        ) : (
                            <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 flex flex-col gap-4">
                                {items.map((s) => {
                                    const em = estadoMeta(s.estadoGestion);
                                    const canalMeta = CANALES.find((c) => c.id === s.canal);
                                    return (
                                        <li key={s.id} className="ml-4">
                                            <span className="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0F1623]" style={{ background: 'var(--accent, #7551FF)' }} />
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                {canalMeta && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                        <Icon icon={canalMeta.icon} width={13} height={13} />{canalMeta.label}
                                                    </span>
                                                )}
                                                {em && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${em.cls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${em.dot}`} />{em.label}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">{fmtFecha(s.creadoEn)}</span>
                                            </div>
                                            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{s.nota}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">por {s.autorNombre}</p>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default SeguimientoModal;
