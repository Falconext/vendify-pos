import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { usePeriodo } from '../shared/usePeriodo';
import { PeriodoSelector, PeriodoTitulo } from '../shared/PeriodoSelector';

interface ComisionDetalle {
    id: number;
    comprobante: { tipoDoc: string; serie: string; correlativo: number; fechaEmision: string; mtoImpVenta: number };
    descripcion: string | null;
    motivo: string | null;
    cantidad: number;
    montoComision: number;
    estado: 'PENDIENTE' | 'PAGADO';
}

interface VendedorComision {
    vendedor: { id: number; nombre: string; rol: string; dni: string };
    totalComision: number;
    totalPagado: number;
    totalPendiente: number;
    cantidadVentas: number;
    comisiones: ComisionDetalle[];
}

interface ResumenMensual {
    mes: number | null;
    anio: number | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    vendedores: VendedorComision[];
}

function formatCurrency(n: number | string) {
    return `S/ ${parseFloat(String(n || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ComisionesView() {
    // Día · Mes · Rango, el mismo selector que en las demás pestañas de Análisis
    // Financiero. El backend filtra por mes/año o por fecha de emisión (rango).
    const periodo = usePeriodo('mes');
    const [data, setData] = useState<ResumenMensual | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [detallePage, setDetallePage] = useState(1);
    const DETALLE_PAGE_SIZE = 15;
    const [pagandoId, setPagandoId] = useState<number | null>(null);
    const alertFn = useAlertStore(s => s.alert);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const [filtroVendedor, setFiltroVendedor] = useState<number | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    // El período ya lo filtra el backend (mes/año o rango por fecha de emisión
    // en hora de Lima), igual que en las demás pestañas: acá no se vuelve a
    // filtrar en cliente.
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await get<ResumenMensual>(`/comisiones/resumen?${periodo.queryParams()}`);
            setData(res.data ?? null);
        } catch {
            setData({ mes: periodo.mesActual, anio: periodo.anioActual, vendedores: [] });
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo.key]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Al cambiar de período se cierra el detalle abierto y el filtro de vendedor.
    useEffect(() => {
        setExpandedId(null);
        setFiltroVendedor(null);
    }, [periodo.key]);

    // ── Datos filtrados ───────────────────────────────────────────────────────
    const vendedoresFiltrados = useMemo<VendedorComision[]>(() => {
        if (!data?.vendedores) return [];
        return data.vendedores
            .filter(v => filtroVendedor === null || v.vendedor.id === filtroVendedor)
            .map(v => ({
                ...v,
                totalComision: parseFloat(String(v.totalComision || 0)),
                totalPagado: parseFloat(String(v.totalPagado || 0)),
                totalPendiente: parseFloat(String(v.totalPendiente || 0)),
            }))
            .filter(v => v.comisiones.length > 0);
    }, [data, filtroVendedor]);

    const totalGeneral   = useMemo(() => vendedoresFiltrados.reduce((s, v) => s + v.totalComision, 0), [vendedoresFiltrados]);
    const totalPendiente = useMemo(() => vendedoresFiltrados.reduce((s, v) => s + v.totalPendiente, 0), [vendedoresFiltrados]);

    // ── Acciones ─────────────────────────────────────────────────────────────
    const marcarPagado = async (vendedorId: number) => {
        setPagandoId(vendedorId);
        try {
            // Se liquida exactamente lo que se está viendo (mes, día o rango).
            await patch(`/comisiones/pagar/${vendedorId}?${periodo.queryParams()}`, {});
            alertFn('Comisiones marcadas como PAGADO', 'success');
            fetchData();
        } catch {
            alertFn('Error al marcar comisiones', 'error');
        } finally {
            setPagandoId(null);
        }
    };

    const exportarCSV = async () => {
        try {
            const res = await get<any[]>(`/comisiones/exportar?${periodo.queryParams()}`);
            const rows = (res.data ?? []).filter((r: any) =>
                filtroVendedor === null || r.vendedorId === filtroVendedor,
            );
            if (!rows.length) { alertFn('Sin datos para exportar con los filtros actuales', 'warning'); return; }
            const headers = ['Vendedor', 'DNI', 'Comprobante', 'Tipo', 'Fecha', 'Total Venta', 'Producto', 'Cantidad', 'Comisión', 'Estado'];
            const csvRows = [
                headers.join(','),
                ...rows.map((r: any) => [
                    `"${r.vendedor}"`, r.dniVendedor, r.comprobante, r.tipoDoc, r.fechaVenta,
                    r.totalVenta, `"${r.producto}"`, r.cantidad, r.montoComision, r.estado,
                ].join(','))
            ];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Comisiones_${periodo.rango.fechaInicio}_${periodo.rango.fechaFin}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alertFn('Error al exportar', 'error');
        }
    };

    const todosLosVendedores = data?.vendedores ?? [];
    const hayFiltrosActivos = filtroVendedor !== null;

    return (
        <div className="space-y-5">
            {/* ── Fila 1: período + export ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">Período</p>
                    <PeriodoTitulo vm={periodo} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Día · Mes · Rango, el mismo selector que en las demás pestañas. */}
                    <PeriodoSelector vm={periodo} />
                    <button onClick={fetchData} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800" title="Actualizar">
                        <Icon icon="solar:refresh-bold" />
                    </button>
                <button
                    onClick={exportarCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                    <Icon icon="solar:file-download-bold-duotone" />
                    Exportar CSV
                </button>
                </div>
            </div>

            {/* ── Fila 2: filtros (solo si hay algo que filtrar: el período ya vive arriba) ── */}
            {(todosLosVendedores.length > 1 || hayFiltrosActivos) && (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/50 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Icon icon="solar:filter-bold-duotone" className="text-indigo-500 text-base" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filtros</span>
                    {hayFiltrosActivos && (
                        <button
                            onClick={() => setFiltroVendedor(null)}
                            className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                            <Icon icon="solar:restart-bold" className="text-xs" />
                            Limpiar filtros
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 items-end">
                    {/* Filtro por vendedor */}
                    {todosLosVendedores.length > 1 && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Vendedor</p>
                            <select
                                value={filtroVendedor ?? ''}
                                onChange={e => setFiltroVendedor(e.target.value ? Number(e.target.value) : null)}
                                className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[160px]"
                            >
                                <option value="">Todos los vendedores</option>
                                {todosLosVendedores.map(v => (
                                    <option key={v.vendedor.id} value={v.vendedor.id}>{v.vendedor.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Resumen del período activo */}
                {hayFiltrosActivos && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
                        <Icon icon="solar:calendar-search-bold-duotone" className="text-indigo-400 text-base flex-shrink-0" />
                        <span>
                            Mostrando <strong className="text-gray-700 dark:text-gray-200">{periodo.label}</strong>
                            {filtroVendedor !== null && (
                                <> · vendedor: <strong className="text-indigo-600 dark:text-indigo-400">
                                    {todosLosVendedores.find(v => v.vendedor.id === filtroVendedor)?.vendedor.nombre}
                                </strong></>
                            )}
                        </span>
                    </div>
                )}
            </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Comisiones', value: totalGeneral, icon: 'solar:dollar-minimalistic-bold-duotone', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                    { label: 'Pendiente de Pago', value: totalPendiente, icon: 'solar:clock-circle-bold-duotone', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Vendedores', value: vendedoresFiltrados.length, icon: 'solar:users-group-rounded-bold-duotone', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', isCurrency: false },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-100/50 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                                <Icon icon={kpi.icon} className={`text-xl ${kpi.color}`} />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{kpi.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${kpi.color}`}>
                            {(kpi as any).isCurrency === false ? kpi.value : formatCurrency(kpi.value as number)}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Lista vendedores ── */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Icon icon="mdi:loading" className="animate-spin text-3xl text-indigo-500" />
                </div>
            ) : !vendedoresFiltrados.length ? (
                <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 border border-gray-100/50 dark:border-slate-800 text-center">
                    <Icon icon="solar:hand-money-bold-duotone" className="text-5xl text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        {hayFiltrosActivos
                            ? 'Sin comisiones para los filtros seleccionados'
                            : `Sin comisiones registradas para ${periodo.label}`}
                    </p>
                    {!hayFiltrosActivos && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Asigna comisiones por producto en Kardex → Productos → campo "Comisión por vendedor"
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {vendedoresFiltrados.map((v) => {
                        const isExpanded = expandedId === v.vendedor.id;
                        const allPaid = v.totalPendiente === 0;
                        return (
                            <div key={v.vendedor.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/50 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Vendedor row */}
                                <div className="flex items-center gap-4 p-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {v.vendedor.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{v.vendedor.nombre}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">DNI {v.vendedor.dni} · {v.cantidadVentas} ventas</p>
                                        {/* Montos visibles en móvil */}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:hidden">
                                            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(v.totalComision)}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">Pag. {formatCurrency(v.totalPagado)}</span>
                                            <span className={v.totalPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}>Pend. {formatCurrency(v.totalPendiente)}</span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-6 text-right">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(v.totalComision)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pagado</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.totalPagado)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pendiente</p>
                                            <p className={`text-sm font-bold ${v.totalPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                                                {formatCurrency(v.totalPendiente)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-2">
                                        {!allPaid && (
                                            <button
                                                onClick={() => marcarPagado(v.vendedor.id)}
                                                disabled={pagandoId === v.vendedor.id}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {pagandoId === v.vendedor.id
                                                    ? <Icon icon="mdi:loading" className="animate-spin" />
                                                    : <Icon icon="solar:check-circle-bold-duotone" />}
                                                Liquidar
                                            </button>
                                        )}
                                        {allPaid && (
                                            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Icon icon="solar:check-circle-bold-duotone" />
                                                Pagado
                                            </span>
                                        )}
                                        <button
                                            onClick={() => { setExpandedId(isExpanded ? null : v.vendedor.id); setDetallePage(1); }}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <Icon
                                                icon="solar:alt-arrow-down-bold"
                                                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Detalle comisiones */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-slate-800">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-slate-800/50">
                                                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comprobante</th>
                                                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Producto</th>
                                                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Motivo</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cant.</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total comprobante</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comisión</th>
                                                        <th className="px-4 py-2.5 text-center font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                                    {v.comisiones.slice((detallePage - 1) * DETALLE_PAGE_SIZE, detallePage * DETALLE_PAGE_SIZE).map((c) => (
                                                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">
                                                                {c.comprobante.serie}-{String(c.comprobante.correlativo).padStart(8, '0')}
                                                                <span className="text-gray-400 ml-1">
                                                                    · {new Date(c.comprobante.fechaEmision).toLocaleDateString('es-PE')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200 max-w-[200px] truncate">
                                                                {c.descripcion ?? '—'}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-[280px]">
                                                                {c.motivo ?? '—'}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{c.cantidad}</td>
                                                            <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">
                                                                {formatCurrency(c.comprobante.mtoImpVenta)}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">
                                                                {formatCurrency(c.montoComision)}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                                                    c.estado === 'PAGADO'
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                                }`}>
                                                                    {c.estado === 'PAGADO' ? 'PAGADO' : 'PENDIENTE'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {v.comisiones.length > DETALLE_PAGE_SIZE && (() => {
                                            const totalPag = Math.ceil(v.comisiones.length / DETALLE_PAGE_SIZE);
                                            const ini = (detallePage - 1) * DETALLE_PAGE_SIZE + 1;
                                            const fin = Math.min(detallePage * DETALLE_PAGE_SIZE, v.comisiones.length);
                                            return (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">{ini}–{fin} de {v.comisiones.length}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => setDetallePage(p => Math.max(1, p - 1))} disabled={detallePage === 1} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Anterior</button>
                                                        <span className="px-2 text-gray-500 dark:text-gray-400">{detallePage} / {totalPag}</span>
                                                        <button onClick={() => setDetallePage(p => Math.min(totalPag, p + 1))} disabled={detallePage === totalPag} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Siguiente</button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
