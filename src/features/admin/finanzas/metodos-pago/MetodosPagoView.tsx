import { Icon } from '@iconify/react';
import {
    MetodoPagoGrupo,
    formatSoles,
    methodColor,
    methodIcon,
} from './MetodosPagoModel';
import { useMetodosPagoViewModel } from './useMetodosPagoViewModel';
import { PeriodoSelector, PeriodoTitulo } from '../shared/PeriodoSelector';

function Skeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-3xl" />)}
            </div>
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
    );
}

function Kpi({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub?: string; tone: string }) {
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-sm border border-gray-100/50 dark:border-slate-800">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
                <Icon icon={icon} className="text-xl" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/50 dark:border-slate-800 overflow-hidden shadow-sm">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                    <Icon icon={methodIcon(metodo.metodo)} className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{metodo.metodo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {metodo.cantidad} pago(s) · {metodo.referencias} con operación/voucher
                    </p>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2 max-w-md">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{formatSoles(metodo.total)}</p>
                </div>
                <Icon icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} className="text-gray-400" />
            </button>

            {expanded && (
                <div className="border-t border-gray-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800/60">
                                <th className="text-left px-5 py-2.5 font-semibold text-gray-500">Fecha</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Comprobante</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Cliente</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Referencia</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Cuenta</th>
                                <th className="text-right px-5 py-2.5 font-semibold text-gray-500">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metodo.items.map((item) => (
                                <tr key={item.id} className="border-t border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{formatDate(item.fecha)}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{item.documento}</td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.cliente}</td>
                                    <td className="px-4 py-3 text-gray-500">{item.referencia || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500">{item.cuenta || '-'}</td>
                                    <td className="px-5 py-3 text-right font-black text-gray-900 dark:text-white">{formatSoles(item.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function MetodosPagoView({ sedeId }: { sedeId?: number | null } = {}) {
    const vm = useMetodosPagoViewModel(sedeId);
    const data = vm.data;
    const maxTotal = Math.max(...(data?.metodos ?? []).map((m) => m.total), 1);

    return (
        <div className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">Período</p>
                    <PeriodoTitulo vm={vm.periodo} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Día · Mes · Rango, el mismo selector que en las demás pestañas. */}
                    <PeriodoSelector vm={vm.periodo} />
                    <button onClick={vm.refreshData} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800">
                        <Icon icon="solar:refresh-bold" />
                    </button>
                    <button
                        onClick={vm.handleExportPDF}
                        disabled={vm.isGeneratingPDF || !data}
                        className="h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-bold-duotone'} />
                        PDF
                    </button>
                </div>
            </div>

            {vm.isLoading ? <Skeleton /> : !data || data.metodos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Icon icon="solar:card-2-bold-duotone" className="text-3xl text-gray-400 dark:text-slate-500" />
                    </div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Sin pagos registrados</p>
                    <p className="text-sm text-gray-400 mt-1">No hay pagos de venta para este período.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Kpi icon="solar:wallet-money-bold-duotone" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" label="Total cobrado" value={formatSoles(data.resumen.totalCobrado)} sub="pagos de ventas" />
                        <Kpi icon="solar:card-2-bold-duotone" tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" label="Métodos usados" value={String(data.resumen.totalMetodos)} sub="canales de cobro" />
                        <Kpi icon="solar:checklist-minimalistic-bold-duotone" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" label="Con voucher/op." value={`${data.resumen.totalConReferencia}/${data.resumen.totalPagos}`} sub="respaldo registrado" />
                        <Kpi icon="solar:archive-check-bold-duotone" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400" label="Respaldo legacy" value={String(data.resumen.totalRespaldo)} sub="comprobantes sin pago separado" />
                    </div>

                    <div className="space-y-2">
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

                    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Control del período</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Cada método se calcula desde pagos reales; los comprobantes antiguos sin pago separado entran como respaldo para no perder montos.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Total conciliado</p>
                            <p className="font-black text-gray-900 dark:text-white">{formatSoles(data.resumen.totalCobrado)}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
