import { Icon } from '@iconify/react';
import {
    MESES_FULL,
    MetodoPagoGrupo,
    formatSoles,
    methodColor,
    methodIcon,
} from './MetodosPagoModel';
import { useMetodosPagoViewModel } from './useMetodosPagoViewModel';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

function Skeleton() {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)}
            </div>
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
            </div>
        </div>
    );
}

function Kpi({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub?: string; tone: string }) {
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
                <Icon icon={icon} className="text-xl" />
            </div>
            <p className="text-slate-400 uppercase tracking-wide text-xs font-semibold mb-1">{label}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">{value}</h3>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
}

function MetodoRow({ metodo, maxTotal, expanded, onToggle }: {
    metodo: MetodoPagoGrupo;
    maxTotal: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const color = methodColor(metodo.metodo);
    const pct = maxTotal > 0 ? Math.max(6, Math.round((metodo.total / maxTotal) * 100)) : 0;

    return (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
                    <Icon icon={methodIcon(metodo.metodo)} className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{metodo.metodo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {metodo.cantidad} pago(s) · {metodo.referencias} con operación/voucher
                    </p>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2 max-w-md">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 uppercase tracking-wide text-[11px] font-semibold">Total</p>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">{formatSoles(metodo.total)}</p>
                </div>
                <Icon icon={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-slate-400 shrink-0" />
            </button>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs min-w-[720px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
                                <th className="text-left px-5 py-2.5">Fecha</th>
                                <th className="text-left px-4 py-2.5">Comprobante</th>
                                <th className="text-left px-4 py-2.5">Cliente</th>
                                <th className="text-left px-4 py-2.5">Referencia</th>
                                <th className="text-left px-4 py-2.5">Cuenta</th>
                                <th className="text-right px-5 py-2.5">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metodo.items.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDate(item.fecha)}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{item.documento}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.cliente}</td>
                                    <td className="px-4 py-3 text-slate-400">{item.referencia || '-'}</td>
                                    <td className="px-4 py-3 text-slate-400">{item.cuenta || '-'}</td>
                                    <td className="px-5 py-3 text-right font-bold text-slate-800 dark:text-white">{formatSoles(item.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function MetodosPagoView() {
    const vm = useMetodosPagoViewModel();
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const data = vm.data;
    const maxTotal = Math.max(...(data?.metodos ?? []).map((m) => m.total), 1);

    return (
        <div className="min-h-0 -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Métodos de pago</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Métodos de pago</h1>
                        {!vm.usarRango && vm.isCurrentOrFuture && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: ACCENT }}>En curso</span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {vm.usarRango ? `${formatDate(vm.fechaInicio)} - ${formatDate(vm.fechaFin)}` : `${MESES_FULL[vm.mesActual - 1]} ${vm.anioActual}`}
                        {' · '}pagos de ventas conciliados por canal
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => vm.setUsarRango(!vm.usarRango)}
                        className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-1.5 ${vm.usarRango ? 'text-white border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        style={vm.usarRango ? { background: ACCENT } : undefined}
                    >
                        <Icon icon="solar:calendar-linear" /> {vm.usarRango ? 'Rango de fechas' : 'Mes completo'}
                    </button>
                    {vm.usarRango ? (
                        <>
                            <input type="date" value={vm.fechaInicio} onChange={(e) => vm.setFechaInicio(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)]" />
                            <input type="date" value={vm.fechaFin} onChange={(e) => vm.setFechaFin(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)]" />
                        </>
                    ) : (
                        <>
                            <button onClick={() => vm.navegarMes(-1)} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                                <Icon icon="solar:alt-arrow-left-linear" />
                            </button>
                            <button onClick={() => vm.navegarMes(1)} disabled={vm.isCurrentOrFuture} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30">
                                <Icon icon="solar:alt-arrow-right-linear" />
                            </button>
                        </>
                    )}
                    <button onClick={vm.refreshData} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={vm.isLoading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <button
                        onClick={vm.handleExportPDF}
                        disabled={vm.isGeneratingPDF || !data}
                        className="h-9 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-bold'} />
                        PDF
                    </button>
                </div>
            </div>

            {vm.isLoading ? <Skeleton /> : !data || data.metodos.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Icon icon="solar:card-2-linear" className="text-3xl text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Sin pagos registrados</p>
                    <p className="text-sm text-slate-400 mt-1">No hay pagos de venta para este período.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Kpi icon="solar:wallet-money-bold-duotone" tone="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" label="Total cobrado" value={formatSoles(data.resumen.totalCobrado)} sub="pagos de ventas" />
                        <Kpi icon="solar:card-2-bold-duotone" tone="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" label="Métodos usados" value={String(data.resumen.totalMetodos)} sub="canales de cobro" />
                        <Kpi icon="solar:checklist-minimalistic-bold-duotone" tone="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" label="Con voucher/op." value={`${data.resumen.totalConReferencia}/${data.resumen.totalPagos}`} sub="respaldo registrado" />
                        <Kpi icon="solar:archive-check-bold-duotone" tone="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" label="Respaldo legacy" value={String(data.resumen.totalRespaldo)} sub="comprobantes sin pago separado" />
                    </div>

                    <div className="space-y-2.5">
                        {data.metodos.map((metodo) => (
                            <MetodoRow
                                key={metodo.metodo}
                                metodo={metodo}
                                maxTotal={maxTotal}
                                expanded={vm.expandedMethod === metodo.metodo}
                                onToggle={() => vm.toggleMethod(metodo.metodo)}
                            />
                        ))}
                    </div>

                    <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Icon icon="solar:shield-check-bold-duotone" className="text-xl" />
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-400 uppercase tracking-wide text-xs font-semibold">Control del período</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Cada método se calcula desde pagos reales; los comprobantes antiguos sin pago separado entran como respaldo para no perder montos.</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-slate-400 uppercase tracking-wide text-[11px] font-semibold">Total conciliado</p>
                            <p className="font-extrabold text-slate-800 dark:text-white text-lg">{formatSoles(data.resumen.totalCobrado)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
