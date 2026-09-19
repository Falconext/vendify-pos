import { MonoAreaChart, MONO_SERIES } from '@/components/charts/mono';
import { Icon } from '@iconify/react';
import { EvolucionPoint, formatCurrency, getMesLabel } from '../RentabilidadModel';

interface EvolucionChartProps {
    evolucion: EvolucionPoint[];
}

export default function EvolucionChart({ evolucion }: EvolucionChartProps) {
    const chartData = evolucion.map(p => ({
        mes: `${getMesLabel(p.mes)} ${String(p.anio).slice(-2)}`,
        'Ventas Netas': p.ventasNetas,
        'Ganancia Bruta': p.gananciaBruta,
        'Ganancia Neta': p.gananciaNeta,
    }));

    const valueFormatter = (v: number) => formatCurrency(v);

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-slate-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <Icon icon="solar:graph-up-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Evolución Financiera</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Últimos 6 meses</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 flex-wrap">
                    <LegendDot color={MONO_SERIES[0]} label="Ventas Netas" />
                    <LegendDot color={MONO_SERIES[1]} label="Ganancia Bruta" />
                    <LegendDot color={MONO_SERIES[2]} label="Ganancia Neta" />
                </div>
            </div>

            {/* Chart */}
            {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Icon icon="solar:chart-2-bold-duotone" className="text-4xl text-gray-200 dark:text-slate-700 mb-3" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos de evolución disponibles</p>
                </div>
            ) : (
                <MonoAreaChart
                    data={chartData}
                    index="mes"
                    categories={['Ventas Netas', 'Ganancia Bruta', 'Ganancia Neta']}
                    valueFormatter={valueFormatter}
                    height={300}
                />
            )}
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}
