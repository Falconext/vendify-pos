import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useInvoiceStore } from '@/zustand/invoices';
import {
    usePanelVentasViewModel,
    VentaPanelItem,
    TabVentas,
    TipoVenta,
    EstadoDespacho,
} from './usePanelVentasViewModel';
import { EditarDespachoModal } from './EditarDespachoModal';
import { ModalTrazabilidad } from './ModalTrazabilidad';
import KpiHero from '@/components/ui/KpiHero';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import ModalDetalleComprobante from '@/pages/admin/facturacion/ModalDetalleComprobante';
import ModalEnviarWhatsApp from '@/pages/admin/facturacion/ModalEnviarWhatsApp';
import ModalRegistrarPago from '@/pages/admin/facturacion/ModalRegistrarPago';
import ModalHistorialPagos from '@/pages/admin/facturacion/ModalHistorialPagos';
import ModalDetalleCuenta from '@/pages/admin/facturacion/ModalDetalleCuenta';
import TableActionMenu from '@/components/TableActionMenu';
import ModalConfirm from '@/components/ModalConfirm';
import { useUsersStore } from '@/zustand/users';
import { mapDetalleToInvoiceProduct } from '@/features/admin/facturacion/utils/comprobanteProductMapper';

// ─── Config badges (CRM claro) ──────────────────────────────────────────────────
const ACCENT = 'var(--accent, #7551FF)';

const TIPO_CONFIG: Record<TipoVenta, { label: string; cls: string }> = {
    BOLETA:            { label: 'Boleta',    cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' },
    FACTURA:           { label: 'Factura',   cls: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' },
    NOTA_CREDITO:      { label: 'N.Crédito', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
    NOTA_DEBITO:       { label: 'N.Débito',  cls: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' },
    TICKET:            { label: 'Ticket',    cls: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400' },
    NOTA_VENTA:        { label: 'N.Venta',   cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    NOTA_PEDIDO:       { label: 'N.Pedido',  cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    RECIBO_HONORARIOS: { label: 'R.Honor.',  cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    COMP_PAGO:         { label: 'C.Pago',    cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    OTRO:              { label: 'Otro',      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    PEDIDO_TIENDA:     { label: 'Tienda',    cls: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300' },
};

// Columnas configurables de la tabla de ventas (el usuario elige cuáles ver).
// Las columnas fijas (Fecha, Referencia, Tipo, Cliente, Total, Pago, Vendedor,
// Acciones) siempre se muestran. `sede` solo aplica al admin principal.
const COLUMNAS_CONFIG: { key: string; label: string; soloAdminPrincipal?: boolean }[] = [
    { key: 'sede', label: 'Sede', soloAdminPrincipal: true },
    { key: 'saldo', label: 'Saldo' },
    { key: 'mpago', label: 'Medio de pago' },
    { key: 'productos', label: 'Productos' },
    { key: 'sunat', label: 'SUNAT' },
    { key: 'despacho', label: 'Despacho' },
    { key: 'turno', label: 'Turno' },
    { key: 'celular', label: 'Celular' },
    { key: 'agencia', label: 'Agencia' },
    { key: 'paq', label: 'Paquetes' },
    { key: 'repartidor', label: 'Repartidor' },
    { key: 'dirigidoA', label: 'Cobro dirigido a' },
];
const COLUMNAS_OPCIONALES = COLUMNAS_CONFIG.map((c) => c.key);

// Etiquetas de estado de pago — alineadas con Comprobantes/Notas de venta
// ("Pagado" / "Pago parcial" / "Pendiente de pago") para que el usuario vea lo mismo.
const PAGO_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
    PAGADO:   { label: 'Pagado',            dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    PARCIAL:  { label: 'Pago parcial',      dot: 'bg-amber-500',   cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    PENDIENTE:{ label: 'Pendiente de pago', dot: 'bg-rose-500',    cls: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
};

const SUNAT_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
    ACEPTADO: { label: 'Aceptado',  dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    PENDIENTE:{ label: 'Pendiente', dot: 'bg-amber-500',   cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    RECHAZADO:{ label: 'Rechazado', dot: 'bg-rose-500',    cls: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
    ANULADO:  { label: 'Anulado',   dot: 'bg-slate-400',   cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
    NO_APLICA:{ label: '—',         dot: 'bg-slate-300',   cls: 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500' },
};

const ESTADOS_DESPACHO: { value: EstadoDespacho; label: string }[] = [
    { value: 'PREPARANDO', label: 'Preparando' },
    { value: 'EN_CAMINO',  label: 'En camino' },
    { value: 'EN_DESTINO', label: 'En destino' },
    { value: 'ENTREGADO',  label: 'Entregado' },
    { value: 'DEVUELTO',   label: 'Devuelto' },
];

const DESPACHO_CLS: Record<EstadoDespacho, string> = {
    PREPARANDO: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    EN_CAMINO:  'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    EN_DESTINO: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    ENTREGADO:  'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    DEVUELTO:   'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    NO_APLICA:  'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500',
};

// ─── Small components ─────────────────────────────────────────────────────────

function Badge({ label, cls }: { label: string; cls: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap ${cls}`}>
            {label}
        </span>
    );
}

function Pill({ label, cls, dot }: { label: string; cls: string; dot?: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
            {label}
        </span>
    );
}

function TabBtn({ active, onClick, label, count, variant = 'blue' }: {
    active: boolean; onClick: () => void; label: string; count: number;
    variant?: 'blue' | 'orange';
}) {
    const activeStyle = active
        ? (variant === 'orange' ? { background: '#F97316' } : { background: ACCENT })
        : undefined;
    const shadow = variant === 'orange' ? 'shadow-orange-500/30' : 'shadow-violet-500/30';
    const activeBadgeCls = variant === 'orange' ? 'bg-white text-orange-600' : 'bg-white text-violet-600';
    return (
        <button
            onClick={onClick}
            style={activeStyle}
            className={`flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                active
                    ? `text-white shadow-lg ${shadow}`
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-slate-700'
            }`}
        >
            {label}
            <span className={`min-w-[22px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold ${
                active ? activeBadgeCls : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
                {count}
            </span>
        </button>
    );
}

function KpiCard({ label, value, detail, icon, tone }: {
    label: string;
    value: string;
    detail: string;
    icon: string;
    tone: 'emerald' | 'red' | 'amber' | 'blue';
}) {
    const chip = {
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        red: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    }[tone];

    return (
        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none dark:border dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1.5 text-2xl font-extrabold text-slate-800 dark:text-white">{value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{detail}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${chip}`}>
                    <Icon icon={icon} width={22} />
                </span>
            </div>
        </div>
    );
}

// Dropdown selector de estado inline para filas con despacho
function EstadoDespachoSelector({ item, onChange }: {
    item: VentaPanelItem;
    onChange: (item: VentaPanelItem, nuevoEstado: string) => void;
}) {
    if (item.estadoDespacho === 'NO_APLICA') {
        return <Pill label="—" cls={DESPACHO_CLS.NO_APLICA} />;
    }
    return (
        <select
            value={item.estadoDespacho}
            onChange={(e) => onChange(item, e.target.value)}
            className={`text-xs font-semibold rounded-full px-2.5 py-1 border-none outline-none cursor-pointer ${DESPACHO_CLS[item.estadoDespacho] ?? DESPACHO_CLS.PREPARANDO}`}
        >
            {ESTADOS_DESPACHO.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
            ))}
        </select>
    );
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

const TIPOS_INFORMALES = new Set<TipoVenta>([
    'TICKET', 'NOTA_VENTA', 'NOTA_PEDIDO', 'RECIBO_HONORARIOS', 'COMP_PAGO', 'OTRO',
]);

function mapProductosComprobante(comprobante: any) {
    return Array.isArray(comprobante?.detalles)
        ? comprobante.detalles.map(mapDetalleToInvoiceProduct)
        : [];
}

// ─── Shalom ───────────────────────────────────────────────────────────────────

const SHALOM_COURIERS = new Set(['SHALOM_PRO', 'SHALOM_COD']);

const SHALOM_TIMELINE = [
    { key: 'registrado', label: 'Registrado' },
    { key: 'origen',     label: 'En origen' },
    { key: 'transito',   label: 'En tránsito' },
    { key: 'destino',    label: 'En destino / Agencia' },
    { key: 'entregado',  label: 'Entregado' },
];

function openBlob(blob: Blob, filename: string, mimeType: string) {
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    if (mimeType === 'application/pdf') a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function ShalomTrackingModal({ orderNumber, orderCode, onClose, onEntregado }: {
    orderNumber: string;
    orderCode: string;
    onClose: () => void;
    onEntregado?: () => Promise<void>;
}) {
    const [trackData, setTrackData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blobLoading, setBlobLoading] = useState<'ticket' | 'label' | null>(null);
    const [markingEntregado, setMarkingEntregado] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const fetchTrack = async (): Promise<void> => {
            try {
                const res = await apiClient.post('/shalom/track', { orderNumber, orderCode });
                if (cancelled) return;
                setTrackData(res.data?.data ?? res.data);
                setError('');
            } catch (err: any) {
                if (cancelled) return;
                setError(err?.response?.data?.message || 'No se pudo obtener el tracking. Verifica el N° de orden.');
            }
            if (!cancelled) setLoading(false);
        };
        setLoading(true);
        setError('');
        void fetchTrack();
        return () => { cancelled = true; };
    }, [orderNumber, orderCode, retryKey]);

    // Cuando responseType='blob', el error del backend también llega como Blob:
    // lo leemos para mostrar el motivo real (no un genérico).
    const blobErrorMsg = async (e: any, fallback: string): Promise<string> => {
        try {
            const blob = e?.response?.data;
            if (blob instanceof Blob) { const txt = await blob.text(); return JSON.parse(txt)?.message || fallback; }
        } catch { /* no-op */ }
        return e?.response?.data?.message || fallback;
    };

    const openTicket = async () => {
        setBlobLoading('ticket');
        try {
            const oseId = trackData?.ose_id ?? trackData?.order?.ose_id;
            const qs = oseId ? `?oseId=${encodeURIComponent(oseId)}` : '';
            const res = await apiClient.get(`/shalom/ticket/${orderNumber}/${orderCode}${qs}`, { responseType: 'blob' });
            openBlob(res.data, `voucher-${orderNumber}.pdf`, 'application/pdf');
        } catch (e) { useAlertStore.getState().alert(await blobErrorMsg(e, 'No se pudo obtener el ticket'), 'error'); }
        finally { setBlobLoading(null); }
    };

    const openLabel = async () => {
        setBlobLoading('label');
        try {
            const oseId = trackData?.ose_id ?? trackData?.order?.ose_id;
            const qs = oseId ? `?oseId=${encodeURIComponent(oseId)}` : '';
            const res = await apiClient.get(`/shalom/label/${orderNumber}/${orderCode}${qs}`, { responseType: 'blob' });
            openBlob(res.data, `etiqueta-${orderNumber}.pdf`, 'application/pdf');
        } catch (e) { useAlertStore.getState().alert(await blobErrorMsg(e, 'No se pudo obtener la etiqueta'), 'error'); }
        finally { setBlobLoading(null); }
    };

    const search = trackData?.search?.data ?? trackData?.search ?? null;
    const statuses = trackData?.statuses?.data ?? trackData?.statuses ?? null;

    return (
        <div className="fixed inset-0 top-[-30px] z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50  " onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <Icon icon="solar:delivery-bold-duotone" className="text-white text-lg" />
                        </div>
                        <div>
                            <p className="text-white font-black text-sm">Tracking Shalom</p>
                            <p className="text-slate-400 text-xs">Orden #{orderNumber} · clave {orderCode}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                        <Icon icon="solar:close-circle-bold" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                            <Icon icon="eos-icons:loading" className="animate-spin text-xl" />
                            <span className="text-sm">Consultando Shalom...</span>
                        </div>
                    )}
                    {error && (
                        <div className="text-center py-6 space-y-3">
                            <p className="text-sm text-red-500">{error}</p>
                            <button
                                type="button"
                                onClick={() => setRetryKey(k => k + 1)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Icon icon="solar:refresh-linear" />
                                Reintentar
                            </button>
                        </div>
                    )}

                    {search && !loading && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs space-y-1.5">
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{search.contenido}</p>
                            <div className="flex gap-4 text-slate-500 dark:text-slate-400">
                                <span>De: <strong className="text-slate-700 dark:text-slate-200">{search.origen?.nombre}</strong></span>
                                <span>→</span>
                                <span>A: <strong className="text-slate-700 dark:text-slate-200">{search.destino?.nombre}</strong></span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">
                                Destinatario: <strong className="text-slate-700 dark:text-slate-200">{search.destinatario?.nombre}</strong>
                            </p>
                            {search.entregado && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-bold">
                                    <Icon icon="solar:check-circle-bold" width={12} /> Entregado
                                </span>
                            )}
                        </div>
                    )}

                    {statuses && !loading && (
                        <div className="space-y-0">
                            {SHALOM_TIMELINE.map((step, i) => {
                                const ev = statuses[step.key];
                                const done = Boolean(ev?.fecha);
                                const isLast = i === SHALOM_TIMELINE.length - 1;
                                return (
                                    <div key={step.key} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${done ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            {!isLast && <div className={`w-0.5 flex-1 my-0.5 ${done ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ minHeight: 20 }} />}
                                        </div>
                                        <div className="pb-3">
                                            <p className={`text-sm font-semibold ${done ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{step.label}</p>
                                            {ev?.fecha && <p className="text-xs text-slate-400 dark:text-slate-500">{ev.fecha}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {onEntregado && search?.entregado && (
                        <button
                            type="button"
                            disabled={markingEntregado}
                            onClick={async () => {
                                setMarkingEntregado(true);
                                try { await onEntregado(); onClose(); }
                                finally { setMarkingEntregado(false); }
                            }}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        >
                            {markingEntregado
                                ? <Icon icon="eos-icons:loading" className="animate-spin" />
                                : <Icon icon="solar:check-circle-bold-duotone" />}
                            Marcar como entregado en el panel
                        </button>
                    )}
                    <div className="flex gap-3">
                        <button type="button" onClick={openTicket} disabled={blobLoading === 'ticket'}
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
                            {blobLoading === 'ticket' ? <Icon icon="eos-icons:loading" className="animate-spin" /> : <Icon icon="solar:bill-list-bold-duotone" />}
                            Comprobante
                        </button>
                        <button type="button" onClick={openLabel} disabled={blobLoading === 'label'}
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                            {blobLoading === 'label' ? <Icon icon="eos-icons:loading" className="animate-spin" /> : <Icon icon="solar:tag-price-bold-duotone" />}
                            Rótulo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function PanelVentasView() {
    const vm = usePanelVentasViewModel();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { alert } = useAlertStore();
    const { usuarios, getAllUsers } = useUsersStore();
    const queryFecha = searchParams.get('fecha');
    const queryComprobanteId = Number(searchParams.get('comprobanteId') || 0) || null;

    // El componente Calendar entrega la fecha en DD/MM/YYYY; el VM trabaja en YYYY-MM-DD.
    const handleFecha = (date: string, name: string) => {
        const iso = date ? moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') : '';
        if (name === 'fecha') {
            if (iso) vm.setFecha(iso); // la fecha de inicio siempre debe tener valor
        } else if (name === 'fechaFin') {
            vm.setFechaFin(iso); // vacío = quitar rango (un solo día)
        }
    };

    // ── Configuración de columnas visibles (persistida por usuario) ──────────────
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
        const defaults: Record<string, boolean> = {};
        COLUMNAS_CONFIG.forEach((c) => { defaults[c.key] = true; });
        try {
            // Migra la preferencia antigua de productos si existía.
            const legacy = localStorage.getItem('panel_mostrar_productos');
            if (legacy === 'false') defaults.productos = false;
            const saved = localStorage.getItem('panel_columnas');
            if (saved) return { ...defaults, ...JSON.parse(saved) };
        } catch { /* usa defaults */ }
        return defaults;
    });
    const [showColsMenu, setShowColsMenu] = useState(false);
    const [showFiltrosMenu, setShowFiltrosMenu] = useState(false);
    // El Select del proyecto espera {id, value}; el id 0 representa "todas".
    const sedesSelectOptions = [
        { id: 0, value: 'Todas las sedes (consolidado)' },
        ...vm.sedesOpciones.map((x: { id: number; nombre: string }) => ({ id: x.id, value: x.nombre })),
    ];
    // Contador para el badge: cuántos filtros secundarios están puestos.
    // La sede no cuenta acá porque tiene su propio selector siempre visible.
    const filtrosActivos =
        (vm.filtroRepartidorId !== undefined ? 1 : 0) +
        (vm.filtroUsuarioId ? 1 : 0) +
        (vm.filtroProducto ? 1 : 0) +
        (vm.filtroSerie ? 1 : 0) +
        (vm.filtroDni ? 1 : 0);
    const limpiarFiltros = () => {
        vm.setFiltroRepartidorId(undefined);
        vm.setFiltroUsuarioId(null);
        vm.setFiltroProducto('');
        vm.setFiltroSerie('');
        vm.setFiltroDni('');
    };
    // Fila cuyo popover "ver más productos" está abierto (key = `${tipo}-${id}`).
    const [prodPopover, setProdPopover] = useState<string | null>(null);
    const col = (key: string) => visibleCols[key] !== false;
    const toggleCol = (key: string) => {
        setVisibleCols((prev) => {
            const next = { ...prev, [key]: prev[key] === false };
            localStorage.setItem('panel_columnas', JSON.stringify(next));
            return next;
        });
    };
    const resetCols = () => {
        const all: Record<string, boolean> = {};
        COLUMNAS_CONFIG.forEach((c) => { all[c.key] = true; });
        localStorage.setItem('panel_columnas', JSON.stringify(all));
        setVisibleCols(all);
    };
    // Alias para no tocar todas las referencias existentes a "mostrarProductos".
    const mostrarProductos = col('productos');
    // CSV de columnas opcionales visibles, para que el export coincida con la tabla.
    const columnasVisiblesCSV = COLUMNAS_OPCIONALES.filter((k) => col(k)).join(',');
    // Total de columnas visibles (para colSpan de estados vacíos/carga).
    const totalCols =
        8 + // fijas: fecha, referencia, tipo, cliente, total, pago, vendedor, acciones
        (vm.esPrincipalAdmin && col('sede') ? 1 : 0) +
        COLUMNAS_OPCIONALES.filter((k) => k !== 'sede' && col(k)).length;

    const [detalleId, setDetalleId] = useState<number | null>(null);
    const [editDespachoId, setEditDespachoId] = useState<number | null>(null);
    const [confirmDespachoItem, setConfirmDespachoItem] = useState<VentaPanelItem | null>(null);
    const [trazabilidadItem, setTrazabilidadItem] = useState<VentaPanelItem | null>(null);
    const [waItem, setWaItem] = useState<VentaPanelItem | null>(null);
    const [pagoItem, setPagoItem] = useState<VentaPanelItem | null>(null);
    const [historialItem, setHistorialItem] = useState<VentaPanelItem | null>(null);
    const [detalleCuentaItem, setDetalleCuentaItem] = useState<VentaPanelItem | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuItem, setMenuItem] = useState<VentaPanelItem | null>(null);
    const [shalomTracking, setShalomTracking] = useState<{ orderNumber: string; orderCode: string; item: VentaPanelItem } | null>(null);
    const [anularItem, setAnularItem] = useState<VentaPanelItem | null>(null);
    const { cancelInvoice } = useInvoiceStore((s) => s);

    useEffect(() => {
        if (vm.canFilterByUsuario) {
            getAllUsers({ page: 1, limit: 200 });
        }
    }, [vm.canFilterByUsuario, getAllUsers]);

    useEffect(() => {
        if (queryFecha && moment(queryFecha, 'YYYY-MM-DD', true).isValid() && queryFecha !== vm.fecha) {
            vm.setFecha(queryFecha);
        }
    }, [queryFecha, vm.fecha, vm.setFecha]);

    const filasVisibles = queryComprobanteId
        ? vm.filtrados.filter((item) => item.comprobanteId === queryComprobanteId)
        : vm.filtrados;

    // Paginación (client-side) de la tabla de ventas.
    const PAGE_SIZE = 20;
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [vm.tab, vm.filtroUsuarioId, vm.busqueda, vm.filtroProducto, vm.fecha, vm.fechaFin, filasVisibles.length]);
    const totalPages = Math.max(1, Math.ceil(filasVisibles.length / PAGE_SIZE));
    const filasPagina = filasVisibles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, item: VentaPanelItem) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
        setMenuItem(item);
    };
    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuItem(null);
    };

    const parseSerie = (ref: string) => ref.split('-')[0] ?? ref;
    const parseCorrelativo = (ref: string) => {
        const parts = ref.split('-');
        return parts.length > 1 ? parseInt(parts[parts.length - 1], 10) || 0 : 0;
    };

    const toComprobanteObj = (item: VentaPanelItem) => ({
        id: item.comprobanteId,
        serie: parseSerie(item.referencia),
        correlativo: parseCorrelativo(item.referencia),
        mtoImpVenta: item.total,
        saldo: item.saldo,
        estadoPago: item.estadoPagoRaw,
        fechaEmision: item.fecha,
        formaPagoTipo: item.formaPagoTipo,
        montoDetraccion: item.montoDetraccion,
        porcentajeDetraccion: item.porcentajeDetraccion,
        cuotas: item.cuotas,
        observaciones: item.observaciones,
        cliente: { nombre: item.cliente, nroDoc: null },
        comprobante: TIPO_CONFIG[item.tipo]?.label ?? item.tipo,
        // Cobranza en campo: para preseleccionar el vendedor de campo al registrar el cobro.
        vendedorCampoId: item.vendedorCampoId ?? null,
        vendedorCampoNombre: item.vendedor,
    });

    const puedeRegistrarCobro = (item: VentaPanelItem) =>
        item.comprobanteId !== null && (item.estadoPago === 'PARCIAL' || item.estadoPago === 'PENDIENTE');

    // Guarda: ¿se puede convertir este comprobante informal a boleta/factura?
    const puedeDocumentarComprobante = (item: VentaPanelItem) =>
        item.comprobanteId !== null &&
        TIPOS_INFORMALES.has(item.tipo) &&
        !item.esConvertida &&
        item.estadoPago === 'PAGADO';

    // Guarda: ¿se puede documentar este pedido de tienda?
    const puedeDocumentarPedidoTienda = (item: VentaPanelItem) =>
        item.tipo === 'PEDIDO_TIENDA' &&
        item.estadoPago === 'PAGADO';

    const convertirComprobante = useCallback(async (item: VentaPanelItem, defaultType: 'BOLETA' | 'FACTURA') => {
        if (!item.comprobanteId) return;
        try {
            const { data } = await apiClient.get<any>(`/comprobante/${item.comprobanteId}`);
            const comp = data?.data ?? data;
            const cliente = comp?.cliente || null;
            const esRuc = String(cliente?.nroDoc || '').length === 11;
            navigate('/administrador/facturacion/nuevo', {
                state: {
                    defaultType,
                    fromNotaDeVenta: true,
                    notaDeVentaData: {
                        origenComprobanteId: item.comprobanteId,
                        cliente: defaultType === 'FACTURA' && !esRuc ? null : cliente,
                        clienteId: defaultType === 'FACTURA' && !esRuc ? null : comp?.clienteId,
                        observaciones: comp?.observaciones,
                        productos: mapProductosComprobante(comp),
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el comprobante para convertirlo', 'error');
        }
    }, [navigate, alert]);

    const convertirGuiaComprobante = useCallback(async (item: VentaPanelItem) => {
        if (!item.comprobanteId) return;
        try {
            const { data } = await apiClient.get<any>(`/comprobante/${item.comprobanteId}`);
            const comp = data?.data ?? data;
            navigate('/administrador/facturacion/guia-remision', {
                state: {
                    fromDespachoComprobante: true,
                    comprobanteGuia: {
                        id: item.comprobanteId,
                        referencia: item.referencia,
                        clienteNombre: comp?.cliente?.nombre || item.cliente,
                        clienteNroDoc: comp?.cliente?.nroDoc || '10000000',
                        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : comp?.cliente?.direccion || '',
                        agenciaEnvio: item.tipoEnvio,
                        items: mapProductosComprobante(comp),
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el comprobante para generar la guía', 'error');
        }
    }, [navigate, alert]);

    const convertirPedidoTienda = useCallback(async (item: VentaPanelItem, defaultType: 'BOLETA' | 'FACTURA') => {
        if (!item.pedidoId) return;
        try {
            const { data } = await apiClient.get<any>(`/tienda/pedidos/${item.pedidoId}`);
            const pedido = data?.data ?? data;
            navigate('/administrador/facturacion/nuevo', {
                state: {
                    defaultType,
                    defaultClient: 'CLIENTES_VARIOS',
                    fromPedidoTienda: true,
                    pedidoTiendaData: {
                        id: item.pedidoId,
                        codigoSeguimiento: item.referencia,
                        clienteNombre: item.cliente,
                        clienteTelefono: item.celularDest || '',
                        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : '',
                        tipoEntrega: 'ENVIO',
                        estadoEntrega: item.estadoDespacho === 'ENTREGADO' ? 'ENTREGADO_COMPLETADO' : 'CONFIRMADO',
                        estadoEnvio: item.estadoDespacho,
                        agenciaEnvio: item.tipoEnvio,
                        total: item.total,
                        montoPagado: item.total,
                        saldoPendiente: 0,
                        items: pedido?.items || pedido?.detalles || [],
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el pedido para convertirlo', 'error');
        }
    }, [navigate, alert]);

    const convertirGuiaPedidoTienda = useCallback(async (item: VentaPanelItem) => {
        if (!item.pedidoId) return;
        navigate('/administrador/facturacion/guia-remision', {
            state: {
                fromPedidoTienda: true,
                pedidoTiendaGuia: {
                    id: item.pedidoId,
                    codigoSeguimiento: item.referencia,
                    clienteNombre: item.cliente,
                    clienteTelefono: item.celularDest || '',
                    clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : '',
                    tipoEntrega: 'ENVIO',
                    estadoEnvio: item.estadoDespacho,
                    agenciaEnvio: item.tipoEnvio,
                    total: item.total,
                    montoPagado: item.total,
                    saldoPendiente: 0,
                    items: [],
                },
            },
        });
    }, [navigate]);

    const TABS: { key: TabVentas; label: string; count: number; variant?: 'blue' | 'orange' }[] = [
        { key: 'TODO',         label: 'Todo',         count: vm.countTodo },
        { key: 'VENTAS',       label: 'Ventas',       count: vm.countVentas },
        { key: 'CON_DESPACHO', label: 'Con despacho', count: vm.countDespacho },
        { key: 'POR_COBRAR',   label: 'Por cobrar',   count: vm.countPorCobrar, variant: 'orange' },
    ];
    const vendedoresOptions = usuarios.filter((u) => u.estado === 'ACTIVO');
    const totalVentasDia = Number(vm.totalVentasDia ?? 0);
    const totalPorCobrarDia = Number(vm.totalPorCobrarDia ?? 0);
    const porCobrarGlobalTotal = Number(vm.porCobrarGlobal?.total ?? 0);
    const porCobrarGlobalCantidad = Number(vm.porCobrarGlobal?.cantidad ?? 0);

    const kpis = [
        {
            label: 'Vendido hoy',
            value: `S/ ${totalVentasDia.toFixed(2)}`,
            detail: `${vm.countTodo ?? 0} registro${(vm.countTodo ?? 0) !== 1 ? 's' : ''} del día`,
            icon: 'solar:wallet-money-bold-duotone',
            tone: 'emerald' as const,
        },
        {
            label: 'Por cobrar hoy',
            value: `S/ ${totalPorCobrarDia.toFixed(2)}`,
            detail: `${vm.countPorCobrar ?? 0} venta${(vm.countPorCobrar ?? 0) !== 1 ? 's' : ''} con saldo hoy`,
            icon: 'solar:bill-list-bold-duotone',
            tone: totalPorCobrarDia > 0 ? 'red' as const : 'blue' as const,
        },
        {
            label: 'Pendiente total',
            value: `S/ ${porCobrarGlobalTotal.toFixed(2)}`,
            detail: `${porCobrarGlobalCantidad} cuenta${porCobrarGlobalCantidad !== 1 ? 's' : ''} acumulada${porCobrarGlobalCantidad !== 1 ? 's' : ''}`,
            icon: 'solar:alarm-bold-duotone',
            tone: porCobrarGlobalTotal > 0 ? 'amber' as const : 'blue' as const,
        },
        {
            label: 'Con despacho',
            value: String(vm.countDespacho),
            detail: 'Ventas del día con seguimiento',
            icon: 'solar:delivery-bold-duotone',
            tone: 'blue' as const,
        },
    ];

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-transparent font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Despacho</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Ventas del día</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Panel de Ventas</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {vm.fechaFin && vm.fechaFin > vm.fecha
                            ? 'Resumen del rango seleccionado y deuda pendiente acumulada.'
                            : 'Resumen del día seleccionado y deuda pendiente acumulada.'}
                        {/* El alcance se dice explícitamente: los KPIs y la tabla
                            cambian con él, y antes no había forma de saberlo. */}
                        {vm.esPrincipalAdmin && (
                            <span className="font-semibold">
                                {' '}Mostrando{' '}
                                {vm.sedeVista
                                    ? vm.sedesOpciones.find((s: { id: number; nombre: string }) => s.id === vm.sedeVista)?.nombre ?? 'una sede'
                                    : 'todas las sedes'}.
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => vm.setFecha(moment(vm.fecha).subtract(1, 'day').format('YYYY-MM-DD'))}
                        className="h-11 w-11 grid place-items-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <Icon icon="solar:arrow-left-linear" className="text-lg" />
                    </button>
                    <div className="w-40 shrink-0">
                        <Calendar
                            name="fecha"
                            value={vm.fecha ? moment(vm.fecha).format('DD/MM/YYYY') : ''}
                            onChange={handleFecha}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">hasta</span>
                    <div className="w-40 shrink-0">
                        <Calendar
                            name="fechaFin"
                            value={vm.fechaFin ? moment(vm.fechaFin).format('DD/MM/YYYY') : ''}
                            onChange={handleFecha}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    {vm.fechaFin && (
                        <button
                            onClick={() => vm.setFechaFin('')}
                            className="h-11 w-11 grid place-items-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Quitar rango (volver a un solo día)"
                        >
                            <Icon icon="solar:close-circle-linear" className="text-lg" />
                        </button>
                    )}
                    <button
                        onClick={() => vm.setFecha(moment(vm.fecha).add(1, 'day').format('YYYY-MM-DD'))}
                        className="h-11 w-11 grid place-items-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <Icon icon="solar:arrow-right-linear" className="text-lg" />
                    </button>
                    <button
                        onClick={vm.cargar}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                        style={{ background: ACCENT }}
                        title="Recargar"
                    >
                        <Icon icon="solar:refresh-linear" className={vm.loading ? 'animate-spin text-lg' : 'text-lg'} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button
                        onClick={() => vm.exportarResumen('pdf', columnasVisiblesCSV)}
                        disabled={vm.exportando !== null}
                        className="h-11 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
                        title="Exportar el rango en PDF imprimible"
                    >
                        <Icon icon={vm.exportando === 'pdf' ? 'svg-spinners:180-ring' : 'solar:file-text-bold-duotone'} className="text-lg" />
                        PDF
                    </button>
                    <button
                        onClick={() => vm.exportarResumen('excel', columnasVisiblesCSV)}
                        disabled={vm.exportando !== null}
                        className="h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-50"
                        title="Exportar el rango en Excel"
                    >
                        <Icon icon={vm.exportando === 'excel' ? 'svg-spinners:180-ring' : 'solar:document-add-bold-duotone'} className="text-lg" />
                        Excel
                    </button>
                </div>
            </div>

            <KpiHero
                className="mb-5"
                cards={kpis.map((k) => ({ label: k.label, value: k.value, detail: k.detail }))}
            />

            {/* Tabs + filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap mb-4">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {TABS.map((t) => (
                        <TabBtn key={t.key} active={vm.tab === t.key} onClick={() => vm.setTab(t.key)} label={t.label} count={t.count} variant={t.variant} />
                    ))}
                </div>
                <div className="flex gap-2 flex-wrap ml-auto items-center">
                    {/* Alcance por sede: el admin de la sede principal ve TODAS por defecto.
                        Antes no había forma de acotar y el encabezado decía "Sede Principal"
                        mientras la tabla y los KPIs mostraban todas las sedes. */}
                    {vm.esPrincipalAdmin && vm.sedesOpciones.length > 1 && (
                        <div className="w-[280px] shrink-0">
                            <Select
                                error=""
                                label="Sede"
                                withLabel={false}
                                name="sedeVista"
                                defaultValue="Todas las sedes (consolidado)"
                                value={
                                    vm.sedeVista
                                        ? vm.sedesOpciones.find((x: { id: number; nombre: string }) => x.id === vm.sedeVista)?.nombre ?? ''
                                        : 'Todas las sedes (consolidado)'
                                }
                                onChange={(id: any) => vm.setSedeVista(Number(id) === 0 ? null : Number(id))}
                                options={sedesSelectOptions}
                            />
                        </div>
                    )}
                    {/* Filtros secundarios agrupados: la fila tenía 9 controles y los
                        selects se recortaban. Solo queda a la vista lo que cambia los
                        totales (sede) o el layout (columnas), más la búsqueda. */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFiltrosMenu((v) => !v)}
                            title="Filtrar por repartidor, vendedor, producto, serie o documento"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all whitespace-nowrap ${
                                filtrosActivos > 0 || showFiltrosMenu
                                    ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon icon="solar:filter-bold-duotone" className="text-base" />
                            Filtros
                            {filtrosActivos > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black">
                                    {filtrosActivos}
                                </span>
                            )}
                        </button>
                        {showFiltrosMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowFiltrosMenu(false)} />
                                <div className="absolute right-0 mt-2 z-30 w-72 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Filtros</span>
                                        {filtrosActivos > 0 && (
                                            <button onClick={limpiarFiltros} className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Limpiar</button>
                                        )}
                                    </div>
                        {/* Filtro repartidor */}
                        {vm.repartidoresOpciones.length > 0 && (
                            <select
                                value={vm.filtroRepartidorId === undefined ? '' : vm.filtroRepartidorId === null ? 'sin' : String(vm.filtroRepartidorId)}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '') vm.setFiltroRepartidorId(undefined);
                                    else if (v === 'sin') vm.setFiltroRepartidorId(null);
                                    else vm.setFiltroRepartidorId(Number(v));
                                }}
                                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-600 dark:text-gray-300 focus:outline-none focus:border-[var(--accent)] transition-colors w-full"
                            >
                                <option value="">Todos los repartidores</option>
                                <option value="sin">Sin asignar</option>
                                {vm.repartidoresOpciones
                                    .filter((r) => r.id !== null)
                                    .map((r) => (
                                        <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                                    ))}
                            </select>
                        )}
                        {vm.canFilterByUsuario && (
                            <select
                                value={vm.filtroUsuarioId ?? ''}
                                onChange={(e) => vm.setFiltroUsuarioId(e.target.value ? Number(e.target.value) : null)}
                                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-600 dark:text-gray-300 focus:outline-none focus:border-[var(--accent)] transition-colors w-full"
                            >
                                <option value="">Todos los vendedores</option>
                                {vendedoresOptions.map((usuario) => (
                                    <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                                ))}
                            </select>
                        )}
                        {/* Filtro por Producto */}
                        <div className="relative">
                            <Icon icon="solar:box-minimalistic-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                            <input
                                type="text"
                                placeholder="Producto"
                                value={vm.filtroProducto}
                                onChange={(e) => vm.setFiltroProducto(e.target.value)}
                                className="h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-gray-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors w-full"
                            />
                        </div>
                        {/* Filtro Serie Garantía */}
                        <div className="relative">
                            <Icon icon="solar:shield-check-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                            <input
                                type="text"
                                placeholder="N° serie garantía"
                                value={vm.filtroSerie}
                                onChange={(e) => vm.setFiltroSerie(e.target.value.toUpperCase())}
                                className="h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-gray-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors w-full"
                            />
                        </div>
                        {/* Filtro DNI */}
                        <div className="relative">
                            <Icon icon="solar:card-2-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                            <input
                                type="text"
                                placeholder="DNI / RUC"
                                value={vm.filtroDni}
                                onChange={(e) => vm.setFiltroDni(e.target.value)}
                                className="h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-gray-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors w-full"
                            />
                        </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Configurar columnas visibles (reemplaza el toggle de productos) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColsMenu((s) => !s)}
                            title="Elegir qué columnas ver"
                            className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-sm font-bold transition-all whitespace-nowrap ${
                                showColsMenu
                                    ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon icon="solar:tuning-square-bold-duotone" className="text-base" />
                            Columnas
                        </button>
                        {showColsMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowColsMenu(false)} />
                                <div className="absolute right-0 mt-2 z-30 w-60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.12)] p-2">
                                    <div className="flex items-center justify-between px-2 py-1.5">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Columnas visibles</span>
                                        <button onClick={resetCols} className="text-[11px] font-bold hover:underline" style={{ color: ACCENT }}>Restablecer</button>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {COLUMNAS_CONFIG
                                            .filter((c) => !c.soloAdminPrincipal || vm.esPrincipalAdmin)
                                            .map((c) => (
                                                <label key={c.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={col(c.key)}
                                                        onChange={() => toggleCol(c.key)}
                                                        className="w-4 h-4 rounded border-slate-300 accent-[var(--accent,#7551FF)]"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-gray-200">{c.label}</span>
                                                </label>
                                            ))}
                                    </div>
                                    <p className="px-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400">
                                        Se guarda para tus próximas sesiones.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Búsqueda */}
                    <div className="relative">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={vm.busqueda}
                            onChange={(e) => vm.setBusqueda(e.target.value)}
                            className="h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-gray-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors w-48"
                        />
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none dark:border dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-3 py-3 text-left whitespace-nowrap">Fecha</th>
                                <th className="px-3 py-3 text-left whitespace-nowrap">Referencia</th>
                                <th className="px-3 py-3 text-left">Tipo</th>
                                {vm.esPrincipalAdmin && col('sede') && (
                                    <th className="px-3 py-3 text-left whitespace-nowrap">Sede</th>
                                )}
                                <th className="px-3 py-3 text-left">Cliente</th>
                                <th className="px-3 py-3 text-right whitespace-nowrap">Total</th>
                                {col('saldo') && <th className="px-3 py-3 text-right whitespace-nowrap">Saldo</th>}
                                {col('mpago') && <th className="px-3 py-3 text-left whitespace-nowrap">M.Pago</th>}
                                <th className="px-3 py-3 text-left">Pago</th>
                                {mostrarProductos && (
                                    <th className="px-3 py-3 text-left text-violet-500 whitespace-nowrap">
                                        <span className="flex items-center gap-1">
                                            <Icon icon="solar:box-bold-duotone" className="text-sm" />
                                            Productos
                                        </span>
                                    </th>
                                )}
                                {col('sunat') && <th className="px-3 py-3 text-left">SUNAT</th>}
                                {col('despacho') && <th className="px-3 py-3 text-left">Despacho</th>}
                                {col('turno') && <th className="px-3 py-3 text-left">Turno</th>}
                                {col('celular') && <th className="px-3 py-3 text-left">Celular</th>}
                                {col('agencia') && <th className="px-3 py-3 text-left">Agencia</th>}
                                {col('paq') && <th className="px-3 py-3 text-center whitespace-nowrap">Paq.</th>}
                                {col('repartidor') && <th className="px-3 py-3 text-left">Repartidor</th>}
                                <th className="px-3 py-3 text-left">Vendedor</th>
                                {col('dirigidoA') && <th className="px-3 py-3 text-left whitespace-nowrap">Cobro dirigido a</th>}
                                <th className="px-3 py-3 text-center">Acc.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vm.loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                                        <td colSpan={totalCols} className="py-3.5 px-3">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : filasVisibles.length === 0 ? (
                                <tr>
                                    <td colSpan={totalCols} className="py-16 text-center">
                                        <Icon icon="solar:inbox-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm">No hay ventas para este día</p>
                                    </td>
                                </tr>
                            ) : (
                                filasPagina.map((item) => {
                                    const tipoConf = TIPO_CONFIG[item.tipo] ?? { label: item.tipo, cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
                                    const pagoConf = PAGO_CONFIG[item.estadoPago] ?? PAGO_CONFIG.PENDIENTE;
                                    const sunatConf = SUNAT_CONFIG[item.estadoSunat] ?? SUNAT_CONFIG.NO_APLICA;
                                    const rowCls = item.esConvertida
                                        ? 'opacity-50 bg-slate-50/60 dark:bg-slate-800/40'
                                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40';

                                    return (
                                        <tr key={`${item.tipo}-${item.id}`} className={`border-b border-slate-50 dark:border-slate-800 transition-colors ${rowCls}`}>
                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                                                <div>{moment(item.fecha).format('DD/MM/YY')}</div>
                                                <div className="text-[10px] opacity-70">{moment(item.fecha).format('HH:mm')}</div>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-600 dark:text-gray-300 whitespace-nowrap">
                                                <span className={item.esConvertida ? 'line-through' : ''}>
                                                    {item.referencia}
                                                </span>
                                                {item.esConvertida && item.convertidaEn && (
                                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                        → {item.convertidaEn}
                                                    </div>
                                                )}
                                                {item.origenReferencia && (
                                                    <div className="text-[10px] text-violet-500 font-normal mt-0.5">
                                                        origen: {item.origenReferencia}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-col gap-0.5 items-start">
                                                    <Badge label={tipoConf.label} cls={tipoConf.cls} />
                                                    {item.esConvertida && (
                                                        <Badge label="Convertida" cls="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
                                                    )}
                                                </div>
                                            </td>
                                            {vm.esPrincipalAdmin && col('sede') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap max-w-[100px] truncate" title={item.sede}>
                                                    {item.sede}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 max-w-[160px]">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                        {(item.cliente || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-slate-700 dark:text-gray-200 text-sm truncate" title={item.cliente}>
                                                        {item.cliente}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-right whitespace-nowrap">
                                                <span className={item.esConvertida ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}>
                                                    S/ {Number(item.total ?? 0).toFixed(2)}
                                                </span>
                                            </td>
                                            {col('saldo') && (
                                                <td className="px-3 py-2.5 text-sm font-bold text-right whitespace-nowrap">
                                                    {(item.saldo ?? 0) > 0 ? (
                                                        <span className="text-rose-500">
                                                            S/ {Number(item.saldo ?? 0).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>
                                            )}
                                            {col('mpago') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                                                    {item.metodoPago}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5">
                                                <Pill label={pagoConf.label} cls={pagoConf.cls} dot={pagoConf.dot} />
                                            </td>
                                            {mostrarProductos && (
                                                <td className="px-3 py-2.5 max-w-[220px]">
                                                    {item.productos && item.productos.length > 0 ? (() => {
                                                        const prodKey = `${item.tipo}-${item.id}`;
                                                        const abierto = prodPopover === prodKey;
                                                        const visibles = abierto ? item.productos : item.productos.slice(0, 3);
                                                        return (
                                                            <div className="space-y-1">
                                                                {visibles.map((prod, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1.5">
                                                                        <span className="flex-shrink-0 min-w-[22px] h-[18px] flex items-center justify-center rounded-md bg-violet-50 dark:bg-violet-900/20 text-[9px] font-black text-violet-600 dark:text-violet-300 px-1">
                                                                            {prod.cantidad}x
                                                                        </span>
                                                                        <span className={`text-[10px] text-slate-600 dark:text-gray-300 leading-tight ${abierto ? '' : 'truncate'}`} title={prod.nombre}>
                                                                            {prod.nombre}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {item.productos.length > 3 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setProdPopover(abierto ? null : prodKey)}
                                                                        className="text-[9px] font-bold text-violet-600 dark:text-violet-400 hover:underline pl-0.5"
                                                                    >
                                                                        {abierto ? 'ver menos' : `+${item.productos.length - 3} más · ver todos`}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })() : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>
                                            )}
                                            {col('sunat') && (
                                                <td className="px-3 py-2.5">
                                                    <Pill label={sunatConf.label} cls={sunatConf.cls} dot={item.estadoSunat === 'NO_APLICA' ? undefined : sunatConf.dot} />
                                                </td>
                                            )}
                                            {col('despacho') && (
                                                <td className="px-3 py-2.5">
                                                    <EstadoDespachoSelector item={item} onChange={vm.actualizarEstado} />
                                                </td>
                                            )}
                                            {col('turno') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.turnoEnvio ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('celular') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.celularDest ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('agencia') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 max-w-[120px] truncate" title={item.agenciaDestino}>
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.agenciaDestino ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('paq') && (
                                                <td className="px-3 py-2.5 text-xs text-center text-slate-500 dark:text-gray-400">
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.nroPaquetes ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('repartidor') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap max-w-[100px] truncate" title={item.repartidor}>
                                                    {item.estadoDespacho !== 'NO_APLICA' ? item.repartidor : '—'}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 max-w-[100px] truncate" title={item.vendedor}>
                                                {item.vendedor}
                                            </td>
                                            {col('dirigidoA') && (
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                                                    {item.dirigidoA ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate max-w-[150px]" title={item.dirigidoA}>{item.dirigidoA}</span>
                                                            {(item.comprobantesPago?.length ?? 0) > 0 && (
                                                                <a
                                                                    href={item.comprobantesPago![0]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="Ver comprobante de pago subido"
                                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                                >
                                                                    <Icon icon="mdi:paperclip" width={12} height={12} />
                                                                    {item.comprobantesPago!.length > 1 ? item.comprobantesPago!.length : ''}
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleOpenMenu(e, item)}
                                                    className="h-8 w-8 grid place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors mx-auto"
                                                >
                                                    <Icon icon="mdi:dots-vertical" width={18} height={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {filasVisibles.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filasVisibles.length)} de {filasVisibles.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Anterior</button>
                            <span className="px-2 text-slate-500 dark:text-slate-400">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            {detalleId && (
                <ModalDetalleComprobante
                    comprobanteId={detalleId}
                    isOpen={true}
                    onClose={() => setDetalleId(null)}
                    onUpdated={vm.cargar}
                />
            )}
            {editDespachoId && (
                <EditarDespachoModal
                    comprobanteId={editDespachoId}
                    onClose={() => setEditDespachoId(null)}
                    onSuccess={() => { setEditDespachoId(null); vm.cargar(); }}
                />
            )}
            <ModalConfirm
                isOpenModal={confirmDespachoItem !== null}
                setIsOpenModal={(v) => { if (!v) setConfirmDespachoItem(null); }}
                title="Este pedido ya fue entregado"
                information={`"${confirmDespachoItem?.referencia ?? ''}" tiene estado Entregado. Editar el despacho podría modificar información de un pedido ya cerrado. ¿Deseas continuar de todos modos?`}
                confirmText="Sí, editar despacho"
                confirmSubmit={() => {
                    if (confirmDespachoItem?.comprobanteId) {
                        setEditDespachoId(confirmDespachoItem.comprobanteId);
                    }
                    setConfirmDespachoItem(null);
                }}
            />
            {trazabilidadItem?.comprobanteId && (
                <ModalTrazabilidad
                    comprobanteId={trazabilidadItem.comprobanteId}
                    referencia={trazabilidadItem.referencia}
                    cliente={trazabilidadItem.cliente}
                    onClose={() => setTrazabilidadItem(null)}
                />
            )}
            {waItem?.comprobanteId && (
                <ModalEnviarWhatsApp
                    isOpen={true}
                    onClose={() => setWaItem(null)}
                    comprobante={{
                        id: waItem.comprobanteId,
                        serie: parseSerie(waItem.referencia),
                        correlativo: parseCorrelativo(waItem.referencia),
                        comprobante: TIPO_CONFIG[waItem.tipo]?.label ?? waItem.tipo,
                        total: waItem.total,
                        clienteNombre: waItem.cliente,
                        // Prefill del número: teléfono del cliente; si no tiene, el celular del despacho
                        clienteCelular: waItem.clienteTelefono || (waItem.celularDest && waItem.celularDest !== '—' ? waItem.celularDest : ''),
                        clienteEmail: waItem.clienteEmail || '',
                    }}
                />
            )}

            {/* Cobros inline */}
            {pagoItem?.comprobanteId && (
                <ModalRegistrarPago
                    comprobante={toComprobanteObj(pagoItem)}
                    onClose={() => setPagoItem(null)}
                    onSuccess={() => { setPagoItem(null); vm.cargar(); }}
                />
            )}
            {historialItem?.comprobanteId && (
                <ModalHistorialPagos
                    comprobante={toComprobanteObj(historialItem)}
                    onClose={() => setHistorialItem(null)}
                />
            )}
            {detalleCuentaItem?.comprobanteId && (
                <ModalDetalleCuenta
                    comprobante={toComprobanteObj(detalleCuentaItem)}
                    onClose={() => setDetalleCuentaItem(null)}
                />
            )}

            {/* Dropdown de acciones por fila */}
            <TableActionMenu
                isOpen={Boolean(menuAnchor)}
                anchorEl={menuAnchor}
                onClose={handleCloseMenu}
            >
                {menuItem && (() => {
                    const it = menuItem;
                    const canDetalle = Boolean(it.comprobanteId);
                    const canDespacho = Boolean(it.comprobanteId) && it.estadoDespacho !== 'NO_APLICA';
                    const canWa = Boolean(it.comprobanteId);
                    const canConvertirComp = puedeDocumentarComprobante(it);
                    const canConvertirPedido = puedeDocumentarPedidoTienda(it);
                    const canCobro = puedeRegistrarCobro(it);

                    return (
                        <>
                            {/* — Visualización — */}
                            {canDetalle && (
                                <button type="button"
                                    onClick={() => { setDetalleId(it.comprobanteId); handleCloseMenu(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                >
                                    <Icon icon="solar:eye-bold-duotone" width={15} />
                                    <span>Ver detalle</span>
                                </button>
                            )}
                            {/* Comprobante(s) de pago subido(s) en registrar cobro */}
                            {(it.comprobantesPago?.length ?? 0) > 0 && it.comprobantesPago!.map((url, idx) => (
                                <a key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleCloseMenu}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium"
                                >
                                    <Icon icon="mdi:receipt-text-check-outline" width={15} />
                                    <span>Ver comprobante de pago{it.comprobantesPago!.length > 1 ? ` ${idx + 1}` : ''}</span>
                                </a>
                            ))}
                            {canWa && (
                                <button type="button"
                                    onClick={() => { setWaItem(it); handleCloseMenu(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                >
                                    <Icon icon="mdi:whatsapp" width={15} />
                                    <span>Enviar WhatsApp / Email</span>
                                </button>
                            )}

                            {/* — Despacho — */}
                            {canDespacho && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => {
                                            handleCloseMenu();
                                            if (it.estadoDespacho === 'ENTREGADO') {
                                                setConfirmDespachoItem(it);
                                            } else {
                                                setEditDespachoId(it.comprobanteId);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                                            it.estadoDespacho === 'ENTREGADO'
                                                ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                        }`}
                                    >
                                        <Icon
                                            icon={it.estadoDespacho === 'ENTREGADO' ? 'solar:lock-unlocked-bold-duotone' : 'solar:delivery-bold-duotone'}
                                            width={15}
                                        />
                                        <span>
                                            Editar despacho
                                            {it.estadoDespacho === 'ENTREGADO' && <span className="ml-1 text-[10px] opacity-70">(entregado)</span>}
                                        </span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { setTrazabilidadItem(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                    >
                                        <Icon icon="solar:map-point-wave-bold-duotone" width={15} />
                                        <span>Trazabilidad</span>
                                    </button>
                                    {SHALOM_COURIERS.has(it.courier) && (
                                        <button type="button"
                                            onClick={() => {
                                                handleCloseMenu();
                                                if (!it.nroOrden) {
                                                    useAlertStore.getState().alert('Agrega el N° de orden Shalom en "Editar despacho" primero', 'warning');
                                                    return;
                                                }
                                                setShalomTracking({ orderNumber: it.nroOrden, orderCode: it.claveOrden ?? '', item: it });
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            <Icon icon="solar:delivery-bold-duotone" width={15} />
                                            <span>{it.nroOrden ? `Tracking Shalom #${it.nroOrden}` : 'Tracking Shalom (sin N° orden)'}</span>
                                        </button>
                                    )}
                                </>
                            )}

                            {/* — Conversión informal → formal — */}
                            {canConvertirComp && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { convertirComprobante(it, 'BOLETA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-medium"
                                    >
                                        <Icon icon="solar:bill-list-bold-duotone" width={15} />
                                        <span>Convertir a Boleta</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirComprobante(it, 'FACTURA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                    >
                                        <Icon icon="solar:document-add-bold-duotone" width={15} />
                                        <span>Convertir a Factura</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirGuiaComprobante(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                                    >
                                        <Icon icon="solar:route-bold-duotone" width={15} />
                                        <span>Hacer Guía de Remisión</span>
                                    </button>
                                </>
                            )}

                            {/* — Conversión pedido tienda → formal — */}
                            {canConvertirPedido && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { convertirPedidoTienda(it, 'BOLETA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-medium"
                                    >
                                        <Icon icon="solar:bill-list-bold-duotone" width={15} />
                                        <span>Hacer Boleta</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirPedidoTienda(it, 'FACTURA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                    >
                                        <Icon icon="solar:document-add-bold-duotone" width={15} />
                                        <span>Hacer Factura</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirGuiaPedidoTienda(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                                    >
                                        <Icon icon="solar:route-bold-duotone" width={15} />
                                        <span>Hacer Guía de Remisión</span>
                                    </button>
                                </>
                            )}

                            {/* — Cobros — */}
                            {(canCobro || canDetalle) && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    {canCobro && (
                                        <button type="button"
                                            onClick={() => { setPagoItem(it); handleCloseMenu(); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                                        >
                                            <Icon icon="solar:hand-money-bold-duotone" width={15} />
                                            <span>Registrar cobro</span>
                                        </button>
                                    )}
                                    {canDetalle && (
                                        <>
                                            <button type="button"
                                                onClick={() => { setHistorialItem(it); handleCloseMenu(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                            >
                                                <Icon icon="solar:history-bold-duotone" width={15} />
                                                <span>Historial de pagos</span>
                                            </button>
                                            <button type="button"
                                                onClick={() => { setDetalleCuentaItem(it); handleCloseMenu(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                            >
                                                <Icon icon="solar:document-text-bold-duotone" width={15} />
                                                <span>Detalle de cuenta</span>
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {/* — Anular — */}
                            {it.comprobanteId && it.estadoSunat !== 'ANULADO' && !it.esConvertida && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { setAnularItem(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Icon icon="mdi:cancel" width={15} />
                                        <span>Anular</span>
                                    </button>
                                </>
                            )}
                        </>
                    );
                })()}
            </TableActionMenu>

            {/* Modal confirmación anulación */}
            {anularItem && (
                <div className="fixed inset-0 z-[999999] top-[-30px] flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Anular comprobante</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                            ¿Estás seguro que deseas anular este comprobante? Se revertirá el stock y se eliminarán los pagos registrados.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setAnularItem(null)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    const id = anularItem.comprobanteId!;
                                    setAnularItem(null);
                                    const res = await cancelInvoice(id);
                                    if (res.success) vm.cargar();
                                }}
                                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                                Sí, anular
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {shalomTracking && (
                <ShalomTrackingModal
                    orderNumber={shalomTracking.orderNumber}
                    orderCode={shalomTracking.orderCode}
                    onClose={() => setShalomTracking(null)}
                    onEntregado={async () => { await vm.actualizarEstado(shalomTracking.item, 'ENTREGADO'); }}
                />
            )}
        </div>
    );
}
