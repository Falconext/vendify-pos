import { Icon } from '@iconify/react';
import { ReactNode } from 'react';
import {
    ChartFrame,
    MonoBarChart,
    MonoDonutChart,
    MonoLineChart,
    fmtInt,
    fmtMoney,
} from '@/components/charts/mono';

// Estado de stock: colores SEMÁNTICOS (status) — normal / crítico / sin stock.
// Se conservan por su significado; el resto del dashboard es monocromático violeta.
const STOCK_COLORS = ['#10B981', '#F59E0B', '#F43F5E'];

interface StockSlice { name: string; value: number; color?: string }
interface Vendido { name: string; codigo?: string; cantidad: number; total: number }
interface Rentable { name: string; codigo?: string; ganancia: number }

interface Props {
    pieData: StockSlice[];
    topVendidos: Vendido[];
    topRentables: Rentable[];
    accent?: string;
}

const truncate = (s: string, n = 22) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

const HeadTitle = ({ icon, tint, children }: { icon: string; tint: string; children: ReactNode }) => (
    <span className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tint}`}>
            <Icon icon={icon} className="text-base" />
        </span>
        <span>{children}</span>
    </span>
);

const EmptyState = ({ text, h = 'h-64' }: { text: string; h?: string }) => (
    <div className={`flex ${h} flex-col items-center justify-center py-10 text-center`}>
        <Icon icon="solar:chart-2-linear" className="mb-2 text-4xl text-slate-200 dark:text-slate-700" />
        <p className="text-sm text-slate-400">{text}</p>
    </div>
);

export default function KardexPremiumCharts({ pieData, topVendidos, topRentables }: Props) {
    const totalStock = (pieData ?? []).reduce((acc, s) => acc + Number(s.value || 0), 0);
    const donutData = (pieData ?? []).map((s, i) => ({
        ...s,
        color: s.color ?? STOCK_COLORS[i % STOCK_COLORS.length],
    }));

    return (
        <>
            {/* Fila 1: Estado de stock (donut) + Top 10 más vendidos (barras) */}
            <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ChartFrame
                    index={0}
                    title={
                        <HeadTitle icon="solar:pie-chart-2-bold-duotone" tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Estado del stock
                        </HeadTitle>
                    }
                    subtitle="Distribución del inventario"
                >
                    {totalStock > 0 ? (
                        <>
                            <MonoDonutChart
                                data={donutData}
                                category="value"
                                index="name"
                                height={200}
                                centerLabel="Productos"
                                centerValue={fmtInt(totalStock)}
                                valueFormatter={(v) => `${fmtInt(v)} u.`}
                            />
                            <div className="mt-3 space-y-1.5">
                                {donutData.map((s) => (
                                    <div key={s.name} className="flex items-center justify-between text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                            <span className="truncate font-medium text-slate-600 dark:text-gray-300">{s.name}</span>
                                        </span>
                                        <span className="shrink-0 font-bold text-slate-700 dark:text-gray-200">{fmtInt(s.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState text="Sin productos en inventario" h="h-52" />
                    )}
                </ChartFrame>

                <div className="lg:col-span-2">
                    <ChartFrame
                        index={1}
                        title={
                            <HeadTitle icon="solar:ranking-bold-duotone" tint="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                                Top 10 más vendidos
                            </HeadTitle>
                        }
                        subtitle="Por unidades vendidas"
                    >
                        {topVendidos.length > 0 ? (
                            <MonoBarChart
                                data={topVendidos}
                                index="name"
                                categories={['cantidad']}
                                orientation="bars"
                                height={332}
                                categoryWidth={190}
                                valueFormatter={(v) => `${fmtInt(v)} u.`}
                                xTickFormatter={(v) => truncate(String(v), 26)}
                            />
                        ) : (
                            <EmptyState text="Aún no hay ventas registradas" h="h-80" />
                        )}
                    </ChartFrame>
                </div>
            </div>

            {/* Fila 2: Top 5 más rentables (línea) */}
            <div className="mb-6">
                <ChartFrame
                    index={2}
                    title={
                        <HeadTitle icon="solar:graph-up-bold-duotone" tint="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                            Top 5 más rentables
                        </HeadTitle>
                    }
                    subtitle="Mayor ganancia entre los más vendidos"
                >
                    {topRentables.length > 0 ? (
                        <MonoLineChart
                            data={topRentables}
                            index="name"
                            categories={['ganancia']}
                            height={288}
                            valueFormatter={(v) => fmtMoney(v)}
                            xTickFormatter={(v) => truncate(String(v), 12)}
                        />
                    ) : (
                        <EmptyState text="Sin datos de rentabilidad todavía" h="h-72" />
                    )}
                </ChartFrame>
            </div>
        </>
    );
}
