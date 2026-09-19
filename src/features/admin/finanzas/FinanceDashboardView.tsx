import { MonoAreaChart, fmtMoney, MONO_SERIES } from '@/components/charts/mono';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { PeriodoSelector, PeriodoTitulo } from './shared/PeriodoSelector';
import Select from '@/components/Select';
import { useFinanceDashboardViewModel } from './useFinanceDashboardViewModel';

export default function FinanceDashboardView() {
    const vm = useFinanceDashboardViewModel();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    // Design tokens extracted from Velouré image
    const cardClass = "bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-slate-800 transition-all hover:shadow-md";
    const iconBgBase = "w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4";

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#F8F9FB] p-3 dark:bg-[#0A0D14] sm:p-6">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                {/* Title row */}
                <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-1">
                            <span>Finanzas</span>
                            <Icon icon="solar:alt-arrow-right-linear" />
                            <span className="text-indigo-600">Dashboard</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Resumen Financiero</h1>
                        <PeriodoTitulo vm={vm.periodo} className="!text-base mt-1 !font-semibold text-gray-600 dark:text-gray-300" />
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsMobileFiltersOpen((value) => !value)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-lg shadow-indigo-500/20 sm:w-auto md:hidden"
                    >
                        <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                        {isMobileFiltersOpen ? 'Ocultar filtros' : 'Ver filtros'}
                    </button>
                </div>

                {/* Filters / Actions */}
                <div className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827] md:flex md:flex-row md:flex-wrap md:items-end`}>
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
                    {/* Día · Mes · Rango, el mismo selector que en las demás pestañas de Análisis Financiero. */}
                    <div className="w-full md:w-auto">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">Período</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <PeriodoSelector vm={vm.periodo} />
                        </div>
                    </div>
                    <div className="flex gap-3 md:ml-auto">
                        <button
                            onClick={vm.refreshData}
                            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 dark:shadow-indigo-900/20"
                        >
                            <Icon icon="solar:refresh-bold" />
                        </button>
                        <button
                            onClick={vm.handleExportPDF}
                            disabled={vm.isGeneratingPDF || !vm.kpis}
                            className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white shadow-lg shadow-rose-200 transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-rose-900/20 md:flex-none"
                        >
                            <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-bold-duotone'} className="text-lg" />
                            {vm.isGeneratingPDF ? 'Generando...' : 'PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Aviso: al filtrar por vendedor, los egresos son del negocio */}
            {vm.isAdmin && vm.selectedUsuarioId && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                    <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 shrink-0 text-base" />
                    <span>Estás viendo las <strong>ventas/ingresos del vendedor seleccionado</strong>. Los egresos (gastos y compras) corresponden al negocio completo, no se atribuyen a un vendedor.</span>
                </div>
            )}

            {/* Main Content Grid */}
            {vm.isLoading ? (
                <div className="flex justify-center items-center py-32">
                    <Icon icon="line-md:loading-twotone-loop" className="text-4xl text-indigo-500" />
                    <span className="ml-3 text-gray-500 dark:text-gray-400 font-medium">Actualizando resumen financiero...</span>
                </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Chart & Stats */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Chart Card */}
                    <div className={`${cardClass} min-h-[400px]`}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Flujo de Caja Real</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ingresos vs Egresos diarios</p>
                            </div>
                            {/* Chart Legend/Actions if needed */}
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MONO_SERIES[0] }}></span> Ingresos
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MONO_SERIES[1] }}></span> Egresos
                                </span>
                            </div>
                        </div>

                        <MonoAreaChart
                            data={vm.formattedChartData}
                            index="date"
                            categories={["Ingresos", "Egresos"]}
                            valueFormatter={(v) => fmtMoney(v)}
                            height={300}
                        />
                    </div>

                    {/* Quick Stats Grid (Secondary) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={cardClass}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Total Por Cobrar</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{vm.valueFormatter(vm.kpis?.porCobrar || 0)}</h3>
                                </div>
                                <div className={`${iconBgBase} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400`}>
                                    <Icon icon="solar:hand-money-bold-duotone" />
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 mt-4">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Pendiente de cobro a clientes</p>
                        </div>

                        <div className={cardClass}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Total Por Pagar</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{vm.valueFormatter(vm.kpis?.porPagar || 0)}</h3>
                                </div>
                                <div className={`${iconBgBase} bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400`}>
                                    <Icon icon="solar:bill-check-bold-duotone" />
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 mt-4">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '35%' }}></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Pendiente de pago a proveedores</p>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ingresos por método de pago</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Total cobrado según pagos reales del periodo.
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] uppercase font-black text-gray-400">Conciliado</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{vm.valueFormatter(vm.conciliacion?.totalPorMetodo || 0)}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {(vm.metodosPago || []).length === 0 ? (
                                <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-4 text-sm text-gray-500 dark:text-gray-400">
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
                                        <div key={item.metodo} className="rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">{item.metodo}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.explicacion}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">{vm.valueFormatter(item.total)}</p>
                                                    <p className="text-[11px] text-gray-400">{item.cantidad} pago(s)</p>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                                                <div className={`h-full rounded-full ${colorByMethod[item.metodo] || 'bg-gray-500'}`} style={{ width: `${width}%` }} />
                                            </div>
                                            {['TRANSFERENCIA', 'TARJETA'].includes(item.metodo) && (
                                                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-2">
                                                    {item.referencias}/{item.cantidad} con operación o voucher registrado.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {(vm.conciliacion?.comprobantesRespaldo ?? 0) > 0 && (
                            <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                Incluye {vm.conciliacion?.comprobantesRespaldo} comprobante(s) antiguo(s) sin pago separado para no perder el monto en el reporte.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Summary Cards (Vertical Stack like "Detail Transactions") */}
                <div className="space-y-6">
                    <div className={`rounded-3xl p-6 shadow-sm border border-gray-100/50 transition-all hover:shadow-md bg-indigo-600 text-white border-indigo-500 hover:shadow-indigo-200`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-xl  ">
                                <Icon icon="solar:wallet-money-bold-duotone" className="text-2xl" />
                            </div>
                            <span className="text-indigo-100 text-sm font-medium bg-indigo-500/30 px-2 py-1 rounded-lg">{vm.periodo.periodo === 'mes' ? 'Este mes' : vm.periodo.periodo === 'dia' ? 'Día' : 'Rango'}</span>
                        </div>
                        <p className="text-indigo-100 font-medium mb-1">Ingresos Totales</p>
                        <h3 className="text-3xl font-bold mb-4">{vm.valueFormatter(vm.kpis?.ingresosPeriodo || 0)}</h3>
                        <div className="flex items-center gap-2 text-indigo-200 text-sm">
                            <Icon icon="solar:graph-up-bold" />
                            <span>+12.5% vs mes anterior</span>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">Resumen Rápido</h3>
                            <button className="text-gray-400 hover:text-indigo-600">
                                <Icon icon="solar:menu-dots-bold" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Icon icon="solar:card-send-bold-duotone" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Egresos</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Gastos operativos</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{vm.valueFormatter(vm.kpis?.egresosPeriodo || 0)}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Icon icon="solar:scale-bold-duotone" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Balance</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Utilidad neta</p>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold ${(vm.kpis?.balancePeriodo || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {vm.valueFormatter(vm.kpis?.balancePeriodo || 0)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={vm.handleExportPDF}
                            disabled={vm.isGeneratingPDF}
                            className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
