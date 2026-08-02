import { Icon } from '@iconify/react';
import { BarChart } from '@tremor/react';
import {
    CategoriaRentabilidad,
    CategoriasResponse,
    formatSoles,
    formatPct,
    catColor,
    CAT_COLORS,
} from './CategoriasModel';
import { useCategoriasViewModel } from './useCategoriasViewModel';

const ACCENT = 'var(--accent, #7551FF)';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-3xl" />
                ))}
            </div>
            <div className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
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
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${iconBg}`}>
                <Icon icon={icon} className={`text-xl ${iconColor}`} />
            </div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">{label}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight truncate">{value}</h3>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

// ─── Margin Badge ─────────────────────────────────────────────────────────────

function MarginBadge({ value }: { value: number }) {
    const good = value >= 30;
    const mid = value >= 10;
    const cls = good
        ? 'bg-emerald-50 text-emerald-600'
        : mid
            ? 'bg-amber-50 text-amber-600'
            : 'bg-rose-50 text-rose-600';
    const dot = good ? 'bg-emerald-500' : mid ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
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
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
            {/* Header row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors text-left"
            >
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

                {/* Category name */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{cat.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{cat.cantidadProductos} producto{cat.cantidadProductos !== 1 ? 's' : ''} · {Math.round(cat.unidadesVendidas)} uds</p>
                </div>

                {/* Share bar */}
                <div className="hidden md:flex flex-col items-end w-32">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{formatPct(pct)} del total</p>
                </div>

                {/* Margen */}
                <div className="hidden md:block text-center w-20">
                    <MarginBadge value={cat.margenPromedio} />
                    <p className="text-[10px] text-slate-400 mt-1">margen</p>
                </div>

                {/* Ingreso */}
                <div className="text-right w-28 hidden md:block">
                    <p className="text-xs text-slate-400">Ingresos</p>
                    <p className="font-bold text-sm text-slate-700">{formatSoles(cat.ingresoTotal)}</p>
                </div>

                {/* Ganancia */}
                <div className="text-right w-28">
                    <p className="text-xs text-slate-400">Ganancia</p>
                    <p className="font-bold text-sm text-emerald-600">{formatSoles(cat.gananciaTotal)}</p>
                </div>

                {/* Chevron */}
                <Icon
                    icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                    className="text-slate-400 flex-shrink-0 text-base"
                />
            </button>

            {/* Expanded: products table */}
            {isExpanded && (
                <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                <th className="text-left px-5 py-2.5">Producto</th>
                                <th className="text-right px-4 py-2.5">P. Venta</th>
                                <th className="text-right px-4 py-2.5">Costo</th>
                                <th className="text-right px-4 py-2.5">Margen</th>
                                <th className="text-right px-4 py-2.5">Uds</th>
                                <th className="text-right px-5 py-2.5">Ganancia Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cat.productos.map((prod, pi) => (
                                <tr
                                    key={pi}
                                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                                >
                                    <td className="px-5 py-3 font-semibold text-slate-700 max-w-[200px] truncate">
                                        {prod.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatSoles(prod.precioUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-400">
                                        {formatSoles(prod.costoUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <MarginBadge value={prod.margen} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {prod.unidadesVendidas % 1 === 0
                                            ? prod.unidadesVendidas
                                            : prod.unidadesVendidas.toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
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
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Ingresos vs Ganancia por categoría</h3>
            <p className="text-xs text-slate-400 mb-5">Top {chartData.length} categorías del período</p>
            <BarChart
                data={chartData}
                index="name"
                categories={['Ingresos', 'Ganancia']}
                colors={['violet', 'emerald']}
                valueFormatter={(v) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                showLegend
                showGridLines={false}
                className="h-56"
            />
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ mes, anio }: { mes: number; anio: number }) {
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Jul','Ago','Sep','Oct','Nov','Dic'];
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Icon icon="solar:tag-linear" className="text-3xl text-slate-300" />
            </div>
            <p className="font-bold text-slate-700">Sin ventas en {MESES[mes - 1]} {anio}</p>
            <p className="text-sm text-slate-400 mt-1">No hay comprobantes registrados en este período.</p>
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CategoriasView() {
    const vm = useCategoriasViewModel();
    const { data, isLoading, mesActual, anioActual, expandedCat, isCurrentOrFuture } = vm;

    return (
        <div className="space-y-5 font-jakarta" style={{ ['--accent' as any]: ACCENT }}>
            {/* Period navigator */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Período</p>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight flex items-center">
                        {MESES_FULL[mesActual - 1]} {anioActual}
                        {isCurrentOrFuture && (
                            <span className="ml-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: ACCENT }}>
                                En curso
                            </span>
                        )}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={vm.handleExportPDF}
                        disabled={vm.isGeneratingPDF || !data}
                        className="h-9 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                    >
                        <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-linear'} />
                        PDF
                    </button>
                    <button
                        onClick={() => vm.navegarMes(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <Icon icon="solar:alt-arrow-left-linear" />
                    </button>
                    <button
                        onClick={() => vm.navegarMes(1)}
                        disabled={isCurrentOrFuture}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
                    >
                        <Icon icon="solar:alt-arrow-right-linear" />
                    </button>
                </div>
            </div>

            {isLoading ? <Skeleton /> : !data || data.categorias.length === 0 ? (
                <EmptyState mes={mesActual} anio={anioActual} />
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard
                            icon="solar:tag-bold-duotone"
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                            label="Categorías activas"
                            value={String(data.totalCategorias)}
                            sub="con ventas este mes"
                        />
                        <KpiCard
                            icon="solar:cup-star-bold-duotone"
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            label="Mejor categoría"
                            value={data.mejorCategoria ?? '—'}
                            sub="mayor ganancia"
                        />
                        <KpiCard
                            icon="solar:wallet-money-bold-duotone"
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            label="Ingresos totales"
                            value={formatSoles(data.ingresoTotal)}
                            sub="ventas del período"
                        />
                        <div className="bg-emerald-500 rounded-3xl p-5 shadow-[0_2px_20px_rgba(16,185,129,0.25)]">
                            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                <Icon icon="solar:graph-up-bold-duotone" className="text-xl text-white" />
                            </div>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide mb-1.5">Ganancia total</p>
                            <h3 className="text-2xl font-extrabold text-white tracking-tight">{formatSoles(data.gananciaTotal)}</h3>
                            <p className="text-white/70 text-xs mt-1">Margen {formatPct(data.margenPromedio)}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <GananciasChart data={data} />

                    {/* Category Legend */}
                    <div className="flex flex-wrap gap-2">
                        {data.categorias.map((c, i) => (
                            <div key={c.nombre} className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-[0_2px_20px_rgba(15,23,42,0.05)] text-xs">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                                <span className="text-slate-600 font-semibold">{c.nombre}</span>
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
                    <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Resumen del mes</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Ingresos</p>
                                <p className="font-bold text-slate-800">{formatSoles(data.ingresoTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Costo mercadería</p>
                                <p className="font-bold text-slate-800">{formatSoles(data.ingresoTotal - data.gananciaTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Ganancia bruta</p>
                                <p className="font-bold text-emerald-600">{formatSoles(data.gananciaTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Margen</p>
                                <p className="font-bold text-slate-800">{formatPct(data.margenPromedio)}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
