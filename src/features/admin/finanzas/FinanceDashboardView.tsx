import { AreaChart } from '@tremor/react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useState } from 'react';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import { useFinanceDashboardViewModel } from './useFinanceDashboardViewModel';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

export default function FinanceDashboardView() {
    const vm = useFinanceDashboardViewModel();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    // Estilo CRM claro (mismo lenguaje visual del dashboard principal)
    const cardClass =
        'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 transition-all hover:shadow-[0_4px_28px_rgba(15,23,42,0.08)]';
    const iconChip = 'w-12 h-12 rounded-2xl flex items-center justify-center text-xl';

    return (
        <div
            className="w-full overflow-x-hidden font-jakarta"
        >
            {/* Header */}
            <div className="mb-6 space-y-5">
                <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Flujo de Caja</h2>
                        <p className="mt-1 text-sm text-slate-400 dark:text-gray-400">Ingresos, egresos y conciliación del periodo.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsMobileFiltersOpen((value) => !value)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all sm:w-auto md:hidden"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                        {isMobileFiltersOpen ? 'Ocultar filtros' : 'Ver filtros'}
                    </button>
                </div>
                <div
                    className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} flex-col gap-4 rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none md:flex md:flex-row md:flex-wrap md:items-end`}
                >
                    {vm.isAdmin && vm.esPrincipal && (
                        <div className="w-full md:min-w-[200px] md:flex-1 md:basis-[200px]">
                            <Select
                                onChange={vm.handleSelectSede}
                                label="Sede"
                                name="sedeId"
                                options={vm.sedesOptions}
                                error=""
                                defaultValue="Todas las sedes"
                            />
                        </div>
                    )}
                    {vm.isAdmin && (
                        <div className="w-full md:min-w-[200px] md:flex-1 md:basis-[200px]">
                            <Select
                                onChange={vm.handleSelectUsuario}
                                label="Vendedor"
                                name="usuarioId"
                                options={vm.usuariosOptions}
                                error=""
                                defaultValue="Todos los vendedores"
                            />
                        </div>
                    )}
                    <div className="w-full md:min-w-[170px] md:flex-1 md:basis-[180px]">
                        <Calendar
                            text="Fecha Inicio"
                            name="fechaInicio"
                            value={moment(vm.fechaInicio).format('DD/MM/YYYY')}
                            onChange={vm.handleDateChange}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    <div className="w-full md:min-w-[170px] md:flex-1 md:basis-[180px]">
                        <Calendar
                            text="Fecha Fin"
                            name="fechaFin"
                            value={moment(vm.fechaFin).format('DD/MM/YYYY')}
                            onChange={vm.handleDateChange}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    <div className="flex gap-3 md:ml-auto">
                        <button
                            onClick={vm.refreshData}
                            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border-2 transition-colors hover:bg-violet-50"
                            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
                        >
                            <Icon icon="solar:refresh-bold" />
                        </button>
                        <button
                            onClick={vm.handleExportPDF}
                            disabled={vm.isGeneratingPDF || !vm.kpis}
                            className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
                        >
                            <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-bold-duotone'} className="text-lg" />
                            {vm.isGeneratingPDF ? 'Generando...' : 'PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Aviso: al filtrar por vendedor, los egresos son del negocio */}
            {vm.isAdmin && vm.selectedUsuarioId && (
                <div className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 shrink-0 text-base" />
                    <span>Estás viendo las <strong>ventas/ingresos del vendedor seleccionado</strong>. Los egresos (gastos y compras) corresponden al negocio completo, no se atribuyen a un vendedor.</span>
                </div>
            )}

            {/* Contenido */}
            {vm.isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-[400px] rounded-3xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                            <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    </div>
                </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Columna izquierda: gráfico y stats */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Gráfico */}
                    <div className={`${cardClass} min-h-[400px]`}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Flujo de Caja Real</h2>
                                <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Ingresos vs Egresos diarios</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }}></span> Ingresos
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Egresos
                                </span>
                            </div>
                        </div>

                        <AreaChart
                            className="h-80 mt-4"
                            data={vm.formattedChartData}
                            index="date"
                            categories={["Ingresos", "Egresos"]}
                            colors={["violet", "rose"]}
                            curveType="monotone"
                            showLegend={false}
                            showGridLines={false}
                            showAnimation
                            yAxisWidth={60}
                            valueFormatter={vm.valueFormatter}
                        />
                    </div>

                    {/* Stats secundarios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={cardClass}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-gray-400 font-bold mb-1.5">Total Por Cobrar</p>
                                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.kpis?.porCobrar || 0)}</h3>
                                </div>
                                <div className={`${iconChip} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400`}>
                                    <Icon icon="solar:hand-money-bold-duotone" />
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-4">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-gray-400 mt-2">Pendiente de cobro a clientes</p>
                        </div>

                        <div className={cardClass}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-gray-400 font-bold mb-1.5">Total Por Pagar</p>
                                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.kpis?.porPagar || 0)}</h3>
                                </div>
                                <div className={`${iconChip} bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400`}>
                                    <Icon icon="solar:bill-check-bold-duotone" />
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-4">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '35%' }}></div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-gray-400 mt-2">Pendiente de pago a proveedores</p>
                        </div>
                    </div>

                    {/* Ingresos por método de pago */}
                    <div className={cardClass}>
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Ingresos por método de pago</h2>
                                <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
                                    Total cobrado según pagos reales del periodo.
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400 dark:text-gray-400">Conciliado</p>
                                <p className="text-lg font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.conciliacion?.totalPorMetodo || 0)}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {(vm.metodosPago || []).length === 0 ? (
                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-6 text-center text-sm text-slate-400 dark:text-gray-400">
                                    <Icon icon="solar:wallet-linear" className="text-3xl text-slate-200 dark:text-gray-600 mx-auto mb-1.5" />
                                    Aún no hay pagos registrados en este rango.
                                </div>
                            ) : (
                                vm.metodosPago.map((item: any) => {
                                    const maxTotal = Math.max(...vm.metodosPago.map((m: any) => Number(m.total || 0)), 1);
                                    const width = Math.max(8, Math.round((Number(item.total || 0) / maxTotal) * 100));
                                    const colorByMethod: Record<string, string> = {
                                        EFECTIVO: 'bg-emerald-500',
                                        YAPE: 'bg-violet-500',
                                        PLIN: 'bg-sky-500',
                                        TRANSFERENCIA: 'bg-blue-600',
                                        TARJETA: 'bg-amber-500',
                                    };
                                    return (
                                        <div key={item.metodo} className="rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{item.metodo}</p>
                                                    <p className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">{item.explicacion}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(item.total)}</p>
                                                    <p className="text-[11px] text-slate-400 dark:text-gray-400">{item.cantidad} pago(s)</p>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                                                <div className={`h-full rounded-full ${colorByMethod[item.metodo] || 'bg-slate-400'}`} style={{ width: `${width}%` }} />
                                            </div>
                                            {['TRANSFERENCIA', 'TARJETA'].includes(item.metodo) && (
                                                <p className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 mt-2">
                                                    {item.referencias}/{item.cantidad} con operación o voucher registrado.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {(vm.conciliacion?.comprobantesRespaldo ?? 0) > 0 && (
                            <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                Incluye {vm.conciliacion?.comprobantesRespaldo} comprobante(s) antiguo(s) sin pago separado para no perder el monto en el reporte.
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna derecha: tarjetas resumen */}
                <div className="space-y-6">
                    <div
                        className="rounded-3xl p-6 shadow-lg shadow-violet-500/30 text-white transition-all"
                        style={{ background: ACCENT }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-2xl">
                                <Icon icon="solar:wallet-money-bold-duotone" className="text-2xl" />
                            </div>
                            <span className="text-white/90 text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">Este mes</span>
                        </div>
                        <p className="text-white/80 font-medium mb-1">Ingresos Totales</p>
                        <h3 className="text-3xl font-extrabold mb-4">{vm.valueFormatter(vm.kpis?.ingresosPeriodo || 0)}</h3>
                        <div className="flex items-center gap-2 text-white/80 text-sm">
                            <Icon icon="solar:graph-up-bold" />
                            <span>+12.5% vs mes anterior</span>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-slate-800 dark:text-white">Resumen Rápido</h3>
                            <button className="text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400">
                                <Icon icon="solar:menu-dots-bold" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform">
                                        <Icon icon="solar:card-send-bold-duotone" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Egresos</p>
                                        <p className="text-xs text-slate-400 dark:text-gray-400">Gastos operativos</p>
                                    </div>
                                </div>
                                <span className="text-sm font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.kpis?.egresosPeriodo || 0)}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform">
                                        <Icon icon="solar:scale-bold-duotone" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Balance</p>
                                        <p className="text-xs text-slate-400 dark:text-gray-400">Utilidad neta</p>
                                    </div>
                                </div>
                                <span className={`text-sm font-extrabold ${(vm.kpis?.balancePeriodo || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {vm.valueFormatter(vm.kpis?.balancePeriodo || 0)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={vm.handleExportPDF}
                            disabled={vm.isGeneratingPDF}
                            className="w-full mt-6 py-3 text-white rounded-2xl font-bold hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ background: ACCENT }}
                        >
                            {vm.isGeneratingPDF ? (
                                <>
                                    <Icon icon="solar:loading-bold" className="animate-spin" />
                                    <span>Generando PDF...</span>
                                </>
                            ) : (
                                <>
                                    <span>Ver Reporte Detallado</span>
                                    <Icon icon="solar:arrow-right-linear" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
