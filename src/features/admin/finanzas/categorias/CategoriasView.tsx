import { Icon } from '@iconify/react';
import { MonoBarChart, fmtMoney, MONO_SERIES } from '@/components/charts/mono';
import {
    CategoriaRentabilidad,
    CategoriasResponse,
    formatSoles,
    formatPct,
    catColor,
    CAT_COLORS,
} from './CategoriasModel';
import { useCategoriasViewModel } from './useCategoriasViewModel';
import { PeriodoSelector, PeriodoTitulo } from '../shared/PeriodoSelector';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
                ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-2xl" />
            ))}
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, iconBg, iconColor, label, value, sub }: {
    icon: string; iconBg: string; iconColor: string;
    label: string; value: string; sub?: string;
}) {
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-sm border border-gray-100/50 dark:border-slate-800">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${iconBg}`}>
                <Icon icon={icon} className={`text-xl ${iconColor}`} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

// ─── Margin Badge ─────────────────────────────────────────────────────────────

function MarginBadge({ value }: { value: number }) {
    const good = value >= 30;
    const mid = value >= 10;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
            good ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : mid ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
            {formatPct(value)}
        </span>
    );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoriaRow({
    cat, idx, isExpanded, totalGanancia, onToggle,
}: {
    cat: CategoriaRentabilidad;
    idx: number;
    isExpanded: boolean;
    totalGanancia: number;
    onToggle: () => void;
}) {
    const color = catColor(idx);
    const pct = totalGanancia > 0 ? (cat.gananciaTotal / totalGanancia) * 100 : 0;

    return (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/50 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

                {/* Category name */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{cat.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cat.cantidadProductos} producto{cat.cantidadProductos !== 1 ? 's' : ''} · {Math.round(cat.unidadesVendidas)} uds</p>
                </div>

                {/* Share bar */}
                <div className="hidden md:flex flex-col items-end w-32">
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{formatPct(pct)} del total</p>
                </div>

                {/* Margen */}
                <div className="hidden md:block text-center w-20">
                    <MarginBadge value={cat.margenPromedio} />
                    <p className="text-[10px] text-gray-400 mt-1">margen</p>
                </div>

                {/* Ingreso */}
                <div className="text-right w-28 hidden md:block">
                    <p className="text-xs text-gray-400">Ventas</p>
                    <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{formatSoles(cat.ventasConIgv ?? cat.ingresoTotal)}</p>
                    <p className="text-[10px] text-gray-400">sin IGV {formatSoles(cat.ingresoTotal)}</p>
                </div>

                {/* Ganancia */}
                <div className="text-right w-28">
                    <p className="text-xs text-gray-400">Ganancia</p>
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatSoles(cat.gananciaTotal)}</p>
                </div>

                {/* Chevron */}
                <Icon
                    icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                    className="text-gray-400 flex-shrink-0 text-base"
                />
            </button>

            {/* Expanded: products table */}
            {isExpanded && (
                <div className="border-t border-gray-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800/60">
                                <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Producto</th>
                                <th className="text-right px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">P. Venta</th>
                                <th className="text-right px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Costo</th>
                                <th className="text-right px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Margen</th>
                                <th className="text-right px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Uds</th>
                                <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Ganancia Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cat.productos.map((prod, pi) => (
                                <tr
                                    key={pi}
                                    className="border-t border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200 max-w-[200px] truncate">
                                        {prod.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                        {formatSoles(prod.precioUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-500">
                                        {formatSoles(prod.costoUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <MarginBadge value={prod.margen} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                        {prod.unidadesVendidas % 1 === 0
                                            ? prod.unidadesVendidas
                                            : prod.unidadesVendidas.toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatSoles(prod.gananciaTotal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function GananciasChart({ data }: { data: CategoriasResponse }) {
    const chartData = data.categorias.slice(0, 10).map((c, i) => ({
        name: c.nombre.length > 18 ? c.nombre.slice(0, 16) + '…' : c.nombre,
        Ingresos: c.ingresoTotal,
        Ganancia: c.gananciaTotal,
        color: catColor(i),
    }));

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-slate-800">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Ingresos vs Ganancia por categoría</h3>
            <p className="text-xs text-gray-400 mb-4">Top {chartData.length} categorías del período</p>
            <div className="flex items-center gap-3 flex-wrap mb-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MONO_SERIES[0] }} /> Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MONO_SERIES[1] }} /> Ganancia
                </span>
            </div>
            <MonoBarChart
                data={chartData}
                index="name"
                categories={['Ingresos', 'Ganancia']}
                orientation="columns"
                valueFormatter={(v) => fmtMoney(v)}
                height={300}
            />
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Icon icon="solar:tag-bold-duotone" className="text-3xl text-gray-400 dark:text-slate-500" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Sin ventas en {label}</p>
            <p className="text-sm text-gray-400 mt-1">No hay comprobantes registrados en este período.</p>
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function CategoriasView({ sedeId }: { sedeId?: number | null } = {}) {
    const vm = useCategoriasViewModel(sedeId);
    const { data, isLoading, expandedCat } = vm;

    return (
        <div className="space-y-5">
            {/* Period navigator: Día · Mes · Rango, el mismo selector que en las demás pestañas. */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">Período</p>
                    <PeriodoTitulo vm={vm.periodo} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PeriodoSelector vm={vm.periodo} />
                    <button onClick={vm.refreshData} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800" title="Actualizar">
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

            {isLoading ? <Skeleton /> : !data || data.categorias.length === 0 ? (
                <EmptyState label={vm.periodo.label} />
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard
                            icon="solar:tag-bold-duotone"
                            iconBg="bg-indigo-50 dark:bg-indigo-900/20"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                            label="Categorías activas"
                            value={String(data.totalCategorias)}
                            sub="con ventas en el período"
                        />
                        <KpiCard
                            icon="solar:cup-star-bold-duotone"
                            iconBg="bg-amber-50 dark:bg-amber-900/20"
                            iconColor="text-amber-600 dark:text-amber-400"
                            label="Mejor categoría"
                            value={data.mejorCategoria ?? '—'}
                            sub="mayor ganancia"
                        />
                        <KpiCard
                            icon="solar:wallet-money-bold-duotone"
                            iconBg="bg-violet-50 dark:bg-violet-900/20"
                            iconColor="text-violet-600 dark:text-violet-400"
                            label="Ventas totales"
                            value={formatSoles(data.ventasConIgv ?? data.ingresoTotal)}
                            sub={`sin IGV ${formatSoles(data.ingresoTotal)}`}
                        />
                        <div className="bg-emerald-500 rounded-3xl p-5 shadow-sm">
                            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                <Icon icon="solar:graph-up-bold-duotone" className="text-xl text-white" />
                            </div>
                            <p className="text-white/80 text-sm font-medium mb-1">Ganancia total</p>
                            <h3 className="text-2xl font-bold text-white tracking-tight">{formatSoles(data.gananciaTotal)}</h3>
                            <p className="text-white/70 text-xs mt-1">Margen {formatPct(data.margenPromedio)}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <GananciasChart data={data} />

                    {/* Category Legend */}
                    <div className="flex flex-wrap gap-2">
                        {data.categorias.map((c, i) => (
                            <div key={c.nombre} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#111827] rounded-full border border-gray-100 dark:border-slate-800 text-xs">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{c.nombre}</span>
                            </div>
                        ))}
                    </div>

                    {/* Category rows */}
                    <div className="space-y-2">
                        {data.categorias.map((cat, idx) => (
                            <CategoriaRow
                                key={cat.nombre}
                                cat={cat}
                                idx={idx}
                                isExpanded={expandedCat === cat.nombre}
                                totalGanancia={data.gananciaTotal}
                                onToggle={() => vm.toggleCat(cat.nombre)}
                            />
                        ))}
                    </div>

                    {/* Footer totals */}
                    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Resumen del mes</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Ventas (sin IGV)</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{formatSoles(data.ventasConIgv ?? data.ingresoTotal)} <span className="text-xs font-normal text-gray-400">({formatSoles(data.ingresoTotal)})</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Costo mercadería</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{formatSoles(data.ingresoTotal - data.gananciaTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Ganancia bruta</p>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatSoles(data.gananciaTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Margen</p>
                                <p className="font-bold text-gray-800 dark:text-white">{formatPct(data.margenPromedio)}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
