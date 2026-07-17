import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { get, post, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable from '@/components/Datatable';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import ModalConfirm from '@/components/ModalConfirm';
import type {
    IContratoVehicular, IVehiculo, IContratosResponse, EstadoContrato,
} from '@/interfaces/vehiculo';

// ─── Estilo CRM claro (Brix UI) ────────────────────────────────────────────────
const ACCENT = '#7551FF';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: string) =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v));
const diasRestantes = (fechaFin: string): number =>
    Math.ceil((new Date(fechaFin).getTime() - Date.now()) / 86400000);

// Pills de estado — punto de color + fondo pastel, estilo CRM.
const estadoPill: Record<EstadoContrato, { dot: string; text: string; bg: string }> = {
    VIGENTE: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    POR_VENCER: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    VENCIDO: { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' },
    CANCELADO: { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100' },
};
const estadoLabel: Record<EstadoContrato, string> = {
    VIGENTE: 'Vigente', POR_VENCER: 'Por vencer', VENCIDO: 'Vencido', CANCELADO: 'Cancelado',
};
const diasColor = (dias: number) => (dias < 0 ? 'text-rose-600 font-bold' : dias <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-medium');

const ESTADO_OPTS = [
    { id: 'TODOS', value: 'Todos los estados' },
    { id: 'VIGENTE', value: 'Vigentes' },
    { id: 'POR_VENCER', value: 'Por vencer' },
    { id: 'VENCIDO', value: 'Vencidos' },
    { id: 'CANCELADO', value: 'Cancelados' },
];
const DURACION_OPTS = [{ id: 6, value: '6 meses' }, { id: 12, value: '12 meses' }, { id: 24, value: '24 meses' }];

// ─── Modal Nuevo Contrato ─────────────────────────────────────────────────────
function NuevoContratoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const { alert } = useAlertStore();
    const [loading, setLoading] = useState(false);
    const [vehiculos, setVehiculos] = useState<IVehiculo[]>([]);
    const [form, setForm] = useState({
        vehiculoId: '', fechaInicio: new Date().toISOString().split('T')[0],
        duracionMeses: '12', montoAnual: '', observaciones: '',
    });

    useEffect(() => { get('vehiculos?limit=200').then((resp: any) => setVehiculos(resp.data?.data ?? [])); }, []);

    const vehiculoOpts = vehiculos.map((v) => ({ id: v.id, value: `${v.placa} — ${v.marca} ${v.modelo || ''}${v.cliente ? ` (${v.cliente.nombre})` : ''}` }));
    const vehiculoSel = vehiculoOpts.find((o) => String(o.id) === form.vehiculoId)?.value || '';
    const duracionSel = DURACION_OPTS.find((o) => String(o.id) === form.duracionMeses)?.value || '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.vehiculoId) { alert('Selecciona un vehículo', 'warning'); return; }
        setLoading(true);
        try {
            await post('contratos-vehiculares', {
                vehiculoId: parseInt(form.vehiculoId), fechaInicio: form.fechaInicio,
                duracionMeses: parseInt(form.duracionMeses),
                montoAnual: form.montoAnual ? parseFloat(form.montoAnual) : undefined,
                observaciones: form.observaciones || undefined,
            });
            alert('Contrato creado exitosamente', 'success');
            onSaved();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al crear contrato', 'error');
        } finally { setLoading(false); }
    };

    const fechaFinPreview = (() => {
        if (!form.fechaInicio || !form.duracionMeses) return null;
        const d = new Date(form.fechaInicio); d.setMonth(d.getMonth() + parseInt(form.duracionMeses));
        return fmt(d.toISOString());
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm font-jakarta" style={{ ['--accent' as any]: ACCENT }}>
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between px-6 py-5" style={{ background: ACCENT }}>
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/15 p-2.5"><Icon icon="solar:document-add-bold-duotone" className="text-2xl text-white" /></div>
                        <div><h2 className="text-lg font-bold text-white">Nuevo contrato</h2><p className="text-xs text-white/70">Suscripción anual vehicular</p></div>
                    </div>
                    <button onClick={onClose} className="text-white/70 transition hover:text-white"><Icon icon="solar:close-circle-bold" className="text-2xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    <Select name="vehiculoId" label="Vehículo *" options={vehiculoOpts} value={vehiculoSel} isSearch onChange={(id: any) => setForm((f) => ({ ...f, vehiculoId: String(id) }))} placeholder="— Seleccionar vehículo —" error={null} />
                    <div className="grid grid-cols-2 gap-4">
                        <InputPro name="fechaInicio" type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} isLabel label="Fecha de inicio *" error={null} />
                        <Select name="duracionMeses" label="Duración" options={DURACION_OPTS} value={duracionSel} onChange={(id: any) => setForm((f) => ({ ...f, duracionMeses: String(id) }))} error={null} />
                    </div>
                    {fechaFinPreview && (
                        <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                            <Icon icon="solar:calendar-mark-bold" className="text-lg text-violet-500" />
                            <span className="text-sm text-violet-700">Vence el <strong>{fechaFinPreview}</strong></span>
                        </div>
                    )}
                    <InputPro name="montoAnual" type="number" value={form.montoAnual} onChange={(e) => setForm((f) => ({ ...f, montoAnual: e.target.value }))} isLabel label="Monto anual (S/)" placeholder="500.00" error={null} />
                    <InputPro name="observaciones" type="textarea" rows={3} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} isLabel label="Observaciones" placeholder="GPS marca X instalado, alarma modelo Y..." error={null} />
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 disabled:opacity-60" style={{ background: ACCENT }}>
                            {loading ? <Icon icon="eos-icons:loading" /> : <Icon icon="solar:check-circle-bold" />}Crear contrato
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function ContratosVehicularesPage() {
    const { alert } = useAlertStore();
    const [data, setData] = useState<IContratoVehicular[]>([]);
    const [alertas, setAlertas] = useState<IContratoVehicular[]>([]);
    const [total, setTotal] = useState(0);
    const [estadoFilter, setEstadoFilter] = useState<EstadoContrato | 'TODOS'>('TODOS');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);
    const [loading, setLoading] = useState(false);
    const [modalNuevo, setModalNuevo] = useState(false);
    const [renovando, setRenovando] = useState<number | null>(null);
    const [contratoCancelar, setContratoCancelar] = useState<IContratoVehicular | null>(null);
    const [cancelando, setCancelando] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: '1', limit: '100',
                ...(estadoFilter !== 'TODOS' ? { estado: estadoFilter } : {}),
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
            });
            const [resp, alertasResp]: any[] = await Promise.all([
                get(`contratos-vehiculares?${params}`),
                get('contratos-vehiculares/alertas'),
            ]);
            const body: IContratosResponse = resp.data;
            setData(body.data);
            setTotal(body.paginacion?.total ?? body.data.length);
            setAlertas(alertasResp.data ?? []);
        } catch { alert('Error al cargar contratos', 'error'); }
        finally { setLoading(false); }
    }, [estadoFilter, debouncedSearch]);
    useEffect(() => { cargar(); }, [cargar]);

    const handleRenovar = async (contrato: IContratoVehicular) => {
        setRenovando(contrato.id);
        try { await patch(`contratos-vehiculares/${contrato.id}/renovar`, {}); alert(`Contrato de ${contrato.vehiculo?.placa} renovado por 12 meses`, 'success'); cargar(); }
        catch (err: any) { alert(err?.response?.data?.message || 'Error al renovar', 'error'); }
        finally { setRenovando(null); }
    };

    const handleCancelar = async () => {
        if (!contratoCancelar) return;
        setCancelando(true);
        try { await patch(`contratos-vehiculares/${contratoCancelar.id}/cancelar`, {}); alert('Contrato cancelado', 'success'); setContratoCancelar(null); cargar(); }
        catch (err: any) { alert(err?.response?.data?.message || 'Error al cancelar', 'error'); }
        finally { setCancelando(false); }
    };

    const bodyData = data.map((c) => {
        const dias = diasRestantes(c.fechaFin);
        const pill = estadoPill[c.estado];
        return {
            id: c.id,
            Vehículo: (
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 rounded-xl bg-violet-50 text-violet-600 grid place-items-center">
                        <Icon icon="solar:card-2-linear" className="text-lg" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-mono text-sm font-bold tracking-wide text-slate-800">{c.vehiculo?.placa}</span>
                        <p className="mt-0.5 text-xs text-slate-400 truncate">{c.vehiculo?.marca} {c.vehiculo?.modelo || ''}</p>
                    </div>
                </div>
            ),
            Propietario: (
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-[11px] font-bold">
                        {(c.vehiculo?.cliente?.nombre || '—').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[160px]">{c.vehiculo?.cliente?.nombre || '—'}</span>
                </div>
            ),
            Servicio: c.producto?.descripcion ? <span className="text-sm text-slate-600">{c.producto.descripcion}</span> : <span className="text-slate-300">—</span>,
            Inicio: <span className="text-sm text-slate-500">{fmt(c.fechaInicio)}</span>,
            Vencimiento: (
                <div><p className="text-sm font-semibold text-slate-700">{fmt(c.fechaFin)}</p><p className={`mt-0.5 text-xs ${diasColor(dias)}`}>{dias < 0 ? `Venció hace ${Math.abs(dias)}d` : `${dias} días`}</p></div>
            ),
            Estado: (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {estadoLabel[c.estado]}
                </span>
            ),
            Acciones: (
                <div className="flex items-center gap-1">
                    {c.estado !== 'CANCELADO' && (
                        <button title="Renovar +12 meses" onClick={() => handleRenovar(c)} disabled={renovando === c.id} className="rounded-lg p-2 text-violet-500 transition hover:bg-violet-50 disabled:opacity-50">
                            {renovando === c.id ? <Icon icon="eos-icons:loading" className="text-lg" /> : <Icon icon="solar:refresh-circle-bold" className="text-lg" />}
                        </button>
                    )}
                    {c.estado !== 'CANCELADO' && c.estado !== 'VENCIDO' && (
                        <button title="Cancelar contrato" onClick={() => setContratoCancelar(c)} className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50"><Icon icon="solar:close-circle-bold" className="text-lg" /></button>
                    )}
                </div>
            ),
        };
    });

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta" style={{ ['--accent' as any]: ACCENT }}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Vehículos</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Contratos</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 text-violet-600 shrink-0">
                        <Icon icon="solar:document-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight truncate">Contratos y suscripciones</h1>
                        <p className="text-sm text-slate-400 mt-0.5">Trazabilidad vehicular · {total} contrato{total !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por placa o propietario…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setModalNuevo(true)}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}>
                        <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nuevo contrato</span>
                    </button>
                </div>
            </div>

            {/* Alertas por vencer */}
            {alertas.length > 0 && (
                <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 mb-5">
                    <div className="mb-3 flex items-center gap-2.5">
                        <div className="h-8 w-8 grid place-items-center rounded-xl bg-amber-50 text-amber-600 shrink-0"><Icon icon="solar:danger-triangle-bold" className="text-lg" /></div>
                        <h3 className="text-sm font-bold text-slate-800">{alertas.length} contrato{alertas.length !== 1 ? 's' : ''} por vencer en los próximos 30 días</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {alertas.slice(0, 8).map((c) => {
                            const dias = diasRestantes(c.fechaFin);
                            return (
                                <div key={c.id} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                                    <span className="font-mono text-sm font-bold text-slate-800">{c.vehiculo?.placa}</span>
                                    <span className={`text-xs ${diasColor(dias)}`}>{dias < 0 ? 'Vencido' : `${dias}d`}</span>
                                    <button onClick={() => handleRenovar(c)} disabled={renovando === c.id} className="rounded-lg px-2.5 py-1 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-60" style={{ background: ACCENT }}>{renovando === c.id ? '...' : 'Renovar'}</button>
                                </div>
                            );
                        })}
                        {alertas.length > 8 && <span className="self-center text-xs font-semibold text-amber-600">+{alertas.length - 8} más</span>}
                    </div>
                </div>
            )}

            {/* Card contenedora */}
            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 p-4 border-b border-slate-100">
                    <button onClick={cargar} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    {ESTADO_OPTS.map((o) => {
                        const active = estadoFilter === o.id;
                        return (
                            <button key={o.id} onClick={() => setEstadoFilter(o.id as any)}
                                className={`h-9 px-3.5 rounded-xl text-sm font-semibold transition-colors ${active ? 'text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                style={active ? { background: ACCENT } : undefined}>
                                {o.value}
                            </button>
                        );
                    })}
                    <span className="ml-auto text-sm text-slate-400 font-medium px-1">{total.toLocaleString('es-PE')} resultados</span>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="p-4 space-y-2.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="py-16 text-center">
                        <Icon icon="solar:document-linear" className="mx-auto mb-2 text-5xl text-slate-200" />
                        <p className="text-sm text-slate-400">No hay contratos registrados</p>
                    </div>
                ) : (
                    <DataTable headerColumns={['Vehículo', 'Propietario', 'Servicio', 'Inicio', 'Vencimiento', 'Estado', 'Acciones']} bodyData={bodyData} pageSize={15} />
                )}
            </div>

            {modalNuevo && <NuevoContratoModal onClose={() => setModalNuevo(false)} onSaved={() => { setModalNuevo(false); cargar(); }} />}
            {contratoCancelar && (
                <ModalConfirm
                    isOpenModal={!!contratoCancelar}
                    setIsOpenModal={(v) => { if (!v) setContratoCancelar(null); }}
                    confirmSubmit={handleCancelar}
                    title="Cancelar contrato"
                    information={`¿Cancelar el contrato del vehículo ${contratoCancelar.vehiculo?.placa}? Esta acción no se puede deshacer.`}
                    confirmText="Cancelar contrato"
                    confirmLoading={cancelando}
                />
            )}
        </div>
    );
}
