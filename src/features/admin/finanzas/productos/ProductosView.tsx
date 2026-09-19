import { Icon } from '@iconify/react';
import { MonoAreaChart, MonoLineChart, MONO_SERIES, fmtMoney } from '@/components/charts/mono';
import {
    MESES_FULL,
    METRICAS,
    ProductoVendido,
    formatFecha,
    formatFechaCorta,
    formatPct,
    formatSoles,
    formatUnidades,
} from './ProductosModel';
import { useProductosViewModel } from './useProductosViewModel';

function Skeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-3xl" />)}
            </div>
            <div className="h-80 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
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
            {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
        </div>
    );
}

function SegmentedButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
        >
            {children}
        </button>
    );
}

function ProductoRow({ producto, maxIngreso }: { producto: ProductoVendido; maxIngreso: number }) {
    const pct = maxIngreso > 0 ? Math.max(4, Math.round((producto.ingresoTotal / maxIngreso) * 100)) : 0;
    const margenTone = producto.margen >= 30
        ? 'text-emerald-600 dark:text-emerald-400'
        : producto.margen >= 10
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-rose-600 dark:text-rose-400';

    return (
        <tr className="border-t border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
            <td className="px-5 py-3">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-[260px]">{producto.nombre}</p>
                <p className="text-xs text-gray-400 truncate max-w-[260px]">
                    {producto.codigo ? `${producto.codigo} · ` : ''}{producto.categoria}
                </p>
                <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2 max-w-[220px]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: MONO_SERIES[0] }} />
                </div>
            </td>
            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatUnidades(producto.unidadesVendidas)}</td>
            <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">{formatSoles(producto.precioPromedio)}</td>
            <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">{formatSoles(producto.costoUnitario)}</td>
            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{formatSoles(producto.ingresoTotal)}</td>
            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white hidden sm:table-cell">{formatSoles(producto.gananciaTotal)}</td>
            <td className={`px-4 py-3 text-right font-black ${margenTone}`}>{formatPct(producto.margen)}</td>
            <td className="px-5 py-3 text-right text-gray-500 hidden lg:table-cell">{formatPct(producto.participacion)}</td>
        </tr>
    );
}

export default function ProductosView({ sedeId }: { sedeId?: number | null } = {}) {
    const vm = useProductosViewModel(sedeId);
    const data = vm.data;
    const maxIngreso = Math.max(...(data?.productos ?? []).map(p => p.ingresoTotal), 1);
    const valueFormatter = vm.metrica === 'unidades' ? formatUnidades : (v: number) => fmtMoney(v);
    const Chart = vm.modo === 'acumulado' ? MonoAreaChart : MonoLineChart;

    return (
        <div className="space-y-5">
            {/* ── Barra de período ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">Período</p>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {vm.periodo === 'dia'
                            ? formatFecha(vm.dia)
                            : vm.periodo === 'rango'
                                ? `${formatFecha(vm.fechaInicio)} - ${formatFecha(vm.fechaFin)}`
                                : `${MESES_FULL[vm.mesActual - 1]} ${vm.anioActual}`}
                        {((vm.periodo === 'mes' && vm.isCurrentOrFuture) || (vm.periodo === 'dia' && vm.esHoy)) && (
                            <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                {vm.periodo === 'dia' ? 'Hoy' : 'En curso'}
                            </span>
                        )}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Día · Mes · Rango. El día reusa el mismo rango de fechas del
                        backend (fechaInicio = fechaFin), sin endpoint nuevo. */}
                    <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 gap-1">
                        <SegmentedButton active={vm.periodo === 'dia'} onClick={() => vm.setPeriodo('dia')}>Día</SegmentedButton>
                        <SegmentedButton active={vm.periodo === 'mes'} onClick={() => vm.setPeriodo('mes')}>Mes</SegmentedButton>
                        <SegmentedButton active={vm.periodo === 'rango'} onClick={() => vm.setPeriodo('rango')}>Rango</SegmentedButton>
                    </div>
                    {vm.periodo === 'rango' && (
                        <>
                            <input type="date" value={vm.fechaInicio} onChange={(e) => vm.setFechaInicio(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                            <input type="date" value={vm.fechaFin} onChange={(e) => vm.setFechaFin(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                        </>
                    )}
                    {vm.periodo === 'dia' && (
                        <>
                            <button onClick={() => vm.navegarDia(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                                <Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" />
                            </button>
                            <input type="date" value={vm.dia} max={vm.hoy} onChange={(e) => vm.setDia(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                            <button onClick={() => vm.navegarDia(1)} disabled={vm.esHoy} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30">
                                <Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </>
                    )}
                    {vm.periodo === 'mes' && (
                        <>
                            <button onClick={() => vm.navegarMes(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                                <Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" />
                            </button>
                            <button onClick={() => vm.navegarMes(1)} disabled={vm.isCurrentOrFuture} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30">
                                <Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </>
                    )}
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

            {vm.isLoading ? <Skeleton /> : !data || data.productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Icon icon="solar:box-bold-duotone" className="text-3xl text-gray-400 dark:text-slate-500" />
                    </div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Sin ventas en el período</p>
                    <p className="text-sm text-gray-400 mt-1">No hay comprobantes con productos para estas fechas.</p>
                </div>
            ) : (
                <>
                    {/* ── KPIs ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Kpi icon="solar:box-bold-duotone" tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" label="Unidades vendidas" value={formatUnidades(data.resumen.unidadesVendidas)} sub={`${data.resumen.totalProductos} producto(s) · ${data.resumen.documentos} doc.`} />
                        <Kpi icon="solar:cart-large-4-bold-duotone" tone="bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400" label="Ventas" value={formatSoles(data.resumen.ventasConIgv ?? data.resumen.ingresoTotal)} sub={`sin IGV ${formatSoles(data.resumen.ingresoTotal)} · neto de notas de crédito`} />
                        <Kpi icon="solar:money-bag-bold-duotone" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" label="Ganancia" value={formatSoles(data.resumen.gananciaTotal)} sub={`costo ${formatSoles(data.resumen.costoTotal)}`} />
                        <Kpi icon="solar:graph-up-bold-duotone" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400" label="Margen promedio" value={formatPct(data.resumen.margenPromedio)} sub={data.resumen.mejorProducto ? `Top: ${data.resumen.mejorProducto}` : undefined} />
                    </div>

                    {/* ── Serie temporal ── */}
                    <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100/50 dark:border-slate-800">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {vm.modo === 'acumulado' ? 'Acumulado por día' : 'Movimiento por día'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {vm.modo === 'acumulado'
                                        ? 'Corrido del período: cada punto suma todos los días anteriores.'
                                        : 'Valor vendido en cada día del período.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-1 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 p-1">
                                    {METRICAS.map(m => (
                                        <SegmentedButton key={m.id} active={vm.metrica === m.id} onClick={() => vm.setMetrica(m.id)}>
                                            {m.label}
                                        </SegmentedButton>
                                    ))}
                                </div>
                                <div className="inline-flex items-center gap-1 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 p-1">
                                    <SegmentedButton active={vm.modo === 'diario'} onClick={() => vm.setModo('diario')}>Diario</SegmentedButton>
                                    <SegmentedButton active={vm.modo === 'acumulado'} onClick={() => vm.setModo('acumulado')}>Acumulado</SegmentedButton>
                                </div>
                                <button
                                    onClick={vm.toggleTop}
                                    disabled={!vm.puedeMostrarTop}
                                    title={vm.puedeMostrarTop ? 'Superponer los 5 productos con más ingreso' : 'Disponible solo con la métrica Ingreso'}
                                    className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors disabled:opacity-40 ${vm.mostrarTop && vm.puedeMostrarTop ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-800'}`}
                                >
                                    Top 5 productos
                                </button>
                            </div>
                        </div>

                        {vm.categories.length > 1 && (
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                {vm.categories.map((cat, i) => (
                                    <span key={cat} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MONO_SERIES[i % MONO_SERIES.length] }} />
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        )}

                        <Chart
                            data={vm.chartData}
                            index="fecha"
                            categories={vm.categories}
                            valueFormatter={valueFormatter}
                            xTickFormatter={(v: string) => formatFechaCorta(v)}
                            height={320}
                        />
                    </div>

                    {/* ── Ranking ── */}
                    <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-gray-100/50 dark:border-slate-800 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-5">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Productos vendidos</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Ordenado por ingreso · {vm.productosFiltrados.length} de {data.productos.length}
                                </p>
                            </div>
                            <div className="relative">
                                <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={vm.busqueda}
                                    onChange={(e) => vm.setBusqueda(e.target.value)}
                                    placeholder="Buscar producto, código o categoría"
                                    className="h-10 w-full sm:w-72 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-800/60">
                                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500">Producto</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Unid.</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 hidden md:table-cell">P. prom.</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 hidden lg:table-cell">Costo unit.</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Ingreso (sin IGV)</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 hidden sm:table-cell">Ganancia</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Margen</th>
                                        <th className="text-right px-5 py-2.5 font-semibold text-gray-500 hidden lg:table-cell">Particip.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vm.productosFiltrados.map((producto) => (
                                        <ProductoRow
                                            key={`${producto.productoId ?? 'srv'}-${producto.nombre}`}
                                            producto={producto}
                                            maxIngreso={maxIngreso}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {vm.productosFiltrados.length === 0 && (
                            <p className="px-5 py-8 text-center text-sm text-gray-400">Ningún producto coincide con la búsqueda.</p>
                        )}
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Cómo se calcula</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Mismas reglas que el P&amp;L: se excluyen comprobantes anulados y cotizaciones, las notas de crédito restan,
                                el costo es costo promedio + costo fijo del producto y los montos en dólares se convierten con el tipo de cambio del comprobante.
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Ganancia del período</p>
                            <p className="font-black text-gray-900 dark:text-white">{formatSoles(data.resumen.gananciaTotal)}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
