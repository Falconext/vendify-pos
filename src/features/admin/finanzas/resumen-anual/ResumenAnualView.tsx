import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { get } from '@/utils/fetch';
import { formatCurrency } from '../rentabilidad/RentabilidadModel';
import { NOMBRE_MES, mejorMes, type ResumenAnual } from './ResumenAnualModel';

// Con signo: un mes en pérdida tiene margen negativo (formatPercent lo vuelve positivo).
const margen = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
const signo = (n: number) => (n < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400');

export default function ResumenAnualView({ sedeId }: { sedeId?: number | null }) {
    const anioHoy = new Date().getFullYear();
    const [anio, setAnio] = useState(anioHoy);
    const [data, setData] = useState<ResumenAnual | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const params = new URLSearchParams({ anio: String(anio) });
            if (sedeId) params.set('sedeId', String(sedeId));
            const resp = await get<ResumenAnual>(`analisis-financiero/resumen-anual?${params}`);
            if (resp.data) setData(resp.data);
            else setError('No se pudo cargar el resumen del año.');
        } catch {
            setError('No se pudo cargar el resumen del año.');
        } finally {
            setCargando(false);
        }
    }, [anio, sedeId]);

    useEffect(() => { cargar(); }, [cargar]);

    const meses = data?.anio === anio ? data.meses : [];
    const total = data?.anio === anio ? data.total : null;
    const mejor = mejorMes(meses);

    return (
        <div className="space-y-5" data-testid="resumen-anual">
            {/* Año */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ganancia del año</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cada mes es el mismo resultado de Rentabilidad. "Con IGV" suma el IGV cobrado: es lo que debió entrar a la cuenta.
                    </p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-[#111827]">
                    <button type="button" aria-label="Año anterior" onClick={() => setAnio((a) => a - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">
                        <Icon icon="solar:alt-arrow-left-linear" width={18} />
                    </button>
                    <span className="min-w-[4rem] text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white">{anio}</span>
                    <button type="button" aria-label="Año siguiente" disabled={anio >= anioHoy} onClick={() => setAnio((a) => a + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-800">
                        <Icon icon="solar:alt-arrow-right-linear" width={18} />
                    </button>
                </div>
            </div>

            {/* Totales del año */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ganancia del año (sin IGV)</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${signo(total?.gananciaNeta ?? 0)}`} data-testid="anual-total-sin-igv">{formatCurrency(total?.gananciaNeta ?? 0)}</p>
                    <p className="text-[11px] text-gray-400">Margen {margen(total?.margenNeto ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ganancia del año (con IGV)</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${signo(total?.gananciaConIgv ?? 0)}`} data-testid="anual-total-con-igv">{formatCurrency(total?.gananciaConIgv ?? 0)}</p>
                    <p className="text-[11px] text-gray-400">IGV cobrado {formatCurrency(total?.igvVentas ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mejor mes</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{mejor ? NOMBRE_MES[mejor.mes - 1] : '—'}</p>
                    <p className="text-[11px] text-gray-400">{mejor ? `${formatCurrency(mejor.gananciaNeta)} sin IGV` : 'Sin meses todavía'}</p>
                </div>
            </div>

            {/* Mes a mes */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-[#111827]">
                {error ? (
                    <div className="flex items-center justify-between gap-3 p-5 text-sm text-rose-600">
                        {error}
                        <button type="button" onClick={cargar} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold">Reintentar</button>
                    </div>
                ) : cargando && !meses.length ? (
                    <div className="flex items-center justify-center p-10 text-gray-400"><Icon icon="svg-spinners:180-ring" width={26} /></div>
                ) : !meses.length ? (
                    <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Todavía no hay meses en {anio}.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-slate-800">
                                    <th className="px-4 py-3">Mes</th>
                                    <th className="px-4 py-3 text-right">Ventas</th>
                                    <th className="px-4 py-3 text-right">Gastos op.</th>
                                    <th className="px-4 py-3 text-right">Compras</th>
                                    <th className="px-4 py-3 text-right">Ganancia sin IGV</th>
                                    <th className="px-4 py-3 text-right">Ganancia con IGV</th>
                                    <th className="px-4 py-3 text-right">Margen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {meses.map((m) => (
                                    <tr key={m.mes} className="border-b border-gray-50 last:border-0 dark:border-slate-800/60" data-testid={`anual-mes-${m.mes}`}>
                                        <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">{NOMBRE_MES[m.mes - 1]}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300" title={`Sin IGV ${formatCurrency(m.ventasNetas)}`}>{formatCurrency(m.ventasConIgv)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{formatCurrency(m.gastosOperativos)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{formatCurrency(m.comprasConsumo)}</td>
                                        <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${signo(m.gananciaNeta)}`}>{formatCurrency(m.gananciaNeta)}</td>
                                        <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${signo(m.gananciaConIgv)}`}>{formatCurrency(m.gananciaConIgv)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{margen(m.margenNeto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {total && (
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold dark:border-slate-700 dark:bg-slate-900/40" data-testid="anual-total">
                                        <td className="px-4 py-3 text-gray-900 dark:text-white">Total {anio}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(total.ventasConIgv)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(total.gastosOperativos)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(total.comprasConsumo)}</td>
                                        <td className={`px-4 py-3 text-right tabular-nums ${signo(total.gananciaNeta)}`}>{formatCurrency(total.gananciaNeta)}</td>
                                        <td className={`px-4 py-3 text-right tabular-nums ${signo(total.gananciaConIgv)}`}>{formatCurrency(total.gananciaConIgv)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{margen(total.margenNeto)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
