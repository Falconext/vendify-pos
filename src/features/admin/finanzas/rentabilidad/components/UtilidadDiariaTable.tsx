import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { DiaUtilidad, PnlResponse, TotalUtilidad, formatCurrency } from '../RentabilidadModel';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "lun 03/11" — el día de la semana ayuda a ver qué días se vende más. */
function etiquetaDia(fecha: string): { dia: string; semana: string } {
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    const semana = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return { dia: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`, semana };
}

const pct = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const monto = (v: number) => (v < 0 ? `−${formatCurrency(Math.abs(v))}` : formatCurrency(v));

/** Si el backend todavía no manda la lista completa, se arma con resumenDiario. */
function diasDe(pnl: PnlResponse): { dias: DiaUtilidad[]; total: TotalUtilidad } {
    const dias: DiaUtilidad[] = pnl.utilidadDiaria
        ?? pnl.resumenDiario.map((d) => ({
            fecha: String(d.fecha).slice(0, 10),
            ventasNetas: d.ventasNetas,
            costoMercaderia: d.costoMercaderia,
            gananciaBruta: d.gananciaBruta,
            margenBruto: d.margenBruto,
            publicidad: d.publicidad,
            otrosGastos: d.otrosGastos,
            gastosOperativos: d.gastosOperativos,
            gananciaNeta: d.gananciaNeta,
            margenNeto: d.margenNeto,
            pedidos: d.pedidos,
        }));
    if (pnl.utilidadDiariaTotal) return { dias, total: pnl.utilidadDiariaTotal };
    const suma = (k: keyof DiaUtilidad) => dias.reduce((a, d) => a + Number(d[k] || 0), 0);
    const ventas = suma('ventasNetas');
    const bruta = suma('gananciaBruta');
    const neta = suma('gananciaNeta');
    const conVenta = dias.filter((d) => d.pedidos > 0).length;
    return {
        dias,
        total: {
            ventasNetas: ventas,
            costoMercaderia: suma('costoMercaderia'),
            gananciaBruta: bruta,
            margenBruto: ventas > 0 ? (bruta / ventas) * 100 : 0,
            gastosOperativos: suma('gastosOperativos'),
            gananciaNeta: neta,
            margenNeto: ventas > 0 ? (neta / ventas) * 100 : 0,
            pedidos: suma('pedidos'),
            diasConVenta: conVenta,
            diasSinVenta: dias.length - conVenta,
            ajustesSinDia: pnl.gananciaNeta - neta,
            gananciaNetaPeriodo: pnl.gananciaNeta,
        },
    };
}

interface Props {
    pnl: PnlResponse;
    onExportar?: () => Promise<void> | void;
}

export default function UtilidadDiariaTable({ pnl, onExportar }: Props) {
    const { dias, total } = useMemo(() => diasDe(pnl), [pnl]);
    const [soloConVenta, setSoloConVenta] = useState(false);
    const [exportando, setExportando] = useState(false);
    const visibles = soloConVenta ? dias.filter((d) => d.pedidos > 0 || d.gastosOperativos > 0) : dias;
    const mejor = dias.reduce<DiaUtilidad | null>((m, d) => (d.pedidos > 0 && (!m || d.gananciaNeta > m.gananciaNeta) ? d : m), null);
    const hayAjuste = Math.abs(total.ajustesSinDia) >= 0.01;

    const exportar = async () => {
        if (!onExportar) return;
        setExportando(true);
        try {
            await onExportar();
        } finally {
            setExportando(false);
        }
    };

    const th = 'px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap';
    const td = 'px-3 py-2.5 whitespace-nowrap tabular-nums';
    const colorNeto = (v: number) => (v < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400');

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100/50 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                        <Icon icon="solar:calendar-mark-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Utilidad por día</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Ventas menos el costo de lo vendido y los gastos de cada día · {pnl.periodo.label}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                        {total.diasConVenta} con venta · {total.diasSinVenta} sin venta
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={soloConVenta}
                            onChange={(e) => setSoloConVenta(e.target.checked)}
                        />
                        Ocultar días sin movimiento
                    </label>
                    {onExportar && (
                        <button
                            type="button"
                            onClick={exportar}
                            disabled={exportando || dias.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50 transition-colors"
                        >
                            <Icon icon={exportando ? 'line-md:loading-twotone-loop' : 'vscode-icons:file-type-excel'} className="text-base" />
                            Excel
                        </button>
                    )}
                </div>
            </div>

            {dias.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Aún no hay días en este período.</p>
            ) : (
                <>
                    {mejor && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Mejor día: <span className="font-bold text-gray-700 dark:text-gray-200">{etiquetaDia(mejor.fecha).semana} {etiquetaDia(mejor.fecha).dia}</span> con {monto(mejor.gananciaNeta)} de ganancia neta.
                        </p>
                    )}
                    <div className="overflow-x-auto -mx-4 sm:mx-0 max-h-[560px] overflow-y-auto rounded-2xl border border-gray-100 dark:border-slate-800">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900 z-10">
                                <tr className="text-right">
                                    <th className={`${th} text-left`}>Día</th>
                                    <th className={th}>Ventas</th>
                                    <th className={th}>Ventas netas</th>
                                    <th className={th}>Costo vendido</th>
                                    <th className={th}>Ganancia bruta</th>
                                    <th className={th}>Margen</th>
                                    <th className={th}>Gastos</th>
                                    <th className={th}>Ganancia neta</th>
                                    <th className={th}>Margen neto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {visibles.map((d) => {
                                    const { dia, semana } = etiquetaDia(d.fecha);
                                    const vacio = d.pedidos === 0 && d.gastosOperativos === 0 && d.ventasNetas === 0;
                                    return (
                                        <tr key={d.fecha} className={`text-right ${vacio ? 'text-gray-300 dark:text-slate-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                            <td className={`${td} text-left`}>
                                                <span className="inline-block w-8 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">{semana}</span>
                                                <span className="font-semibold">{dia}</span>
                                            </td>
                                            <td className={td}>{d.pedidos}</td>
                                            <td className={td}>{monto(d.ventasNetas)}</td>
                                            <td className={td}>{monto(d.costoMercaderia)}</td>
                                            <td className={td}>{monto(d.gananciaBruta)}</td>
                                            <td className={td}>{d.ventasNetas ? pct(d.margenBruto) : '—'}</td>
                                            <td className={td} title={d.publicidad ? `Publicidad ${formatCurrency(d.publicidad)} · Otros ${formatCurrency(d.otrosGastos)}` : undefined}>
                                                {monto(d.gastosOperativos)}
                                            </td>
                                            <td className={`${td} font-bold ${vacio ? '' : colorNeto(d.gananciaNeta)}`}>{monto(d.gananciaNeta)}</td>
                                            <td className={td}>{d.ventasNetas ? pct(d.margenNeto) : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 text-right font-bold text-gray-900 dark:text-white">
                                <tr className="border-t-2 border-gray-200 dark:border-slate-700">
                                    <td className={`${td} text-left`}>Total días</td>
                                    <td className={td}>{total.pedidos}</td>
                                    <td className={td}>{monto(total.ventasNetas)}</td>
                                    <td className={td}>{monto(total.costoMercaderia)}</td>
                                    <td className={td}>{monto(total.gananciaBruta)}</td>
                                    <td className={td}>{pct(total.margenBruto)}</td>
                                    <td className={td}>{monto(total.gastosOperativos)}</td>
                                    <td className={`${td} ${colorNeto(total.gananciaNeta)}`}>{monto(total.gananciaNeta)}</td>
                                    <td className={td}>{pct(total.margenNeto)}</td>
                                </tr>
                                {hayAjuste && (
                                    <>
                                        <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            <td className={`${td} text-left`} colSpan={7}>Otros ingresos y gastos del período sin día</td>
                                            <td className={td}>{monto(total.ajustesSinDia)}</td>
                                            <td className={td} />
                                        </tr>
                                        <tr>
                                            <td className={`${td} text-left`} colSpan={7}>Ganancia neta del período</td>
                                            <td className={`${td} ${colorNeto(total.gananciaNetaPeriodo)}`}>{monto(total.gananciaNetaPeriodo)}</td>
                                            <td className={td} />
                                        </tr>
                                    </>
                                )}
                            </tfoot>
                        </table>
                    </div>
                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                        {pnl.criterioIgvLabel}. El costo es el costo promedio de compra de cada producto.
                    </p>
                </>
            )}
        </div>
    );
}
