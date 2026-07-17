import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
    PnlResponse,
    GastoOperativo,
    EvolucionPoint,
    formatCurrency,
    formatDate,
    formatPercent,
    getMesFullLabel,
    GastoFormData,
    IngresoManual,
    IngresoFormData,
} from './RentabilidadModel';
import PnlTable from './components/PnlTable';
import GastosPanel from './components/GastosPanel';
import IngresosPanel from './components/IngresosPanel';
import EvolucionChart from './components/EvolucionChart';
import GastoFormModal from './components/GastoFormModal';
import IngresoFormModal from './components/IngresoFormModal';
import HistorialFinancieroDrawer from './components/HistorialFinancieroDrawer';

// ── Estilo CRM claro (Brix UI) — mismo lenguaje visual que el dashboard ──────
const ACCENT = '#7551FF';

interface RentabilidadViewProps {
    mesActual: number;
    anioActual: number;
    pnl: PnlResponse | null;
    evolucion: EvolucionPoint[];
    gastos: GastoOperativo[];
    ingresos: IngresoManual[];
    isLoading: boolean;
    isModalOpen: boolean;
    gastoEditando: GastoOperativo | null;
    isSaving: boolean;
    isIngresoModalOpen: boolean;
    ingresoEditando: IngresoManual | null;
    isSavingIngreso: boolean;
    isCurrentOrFuture: boolean;
    navegarMes: (delta: -1 | 1) => void;
    crearGasto: (data: GastoFormData) => Promise<boolean>;
    actualizarGasto: (id: number, data: Partial<GastoFormData>) => Promise<boolean>;
    eliminarGasto: (id: number) => Promise<boolean>;
    abrirModalCrear: () => void;
    abrirModalEditar: (gasto: GastoOperativo) => void;
    cerrarModal: () => void;
    crearIngreso: (data: IngresoFormData) => Promise<boolean>;
    actualizarIngreso: (id: number, data: Partial<IngresoFormData>) => Promise<boolean>;
    eliminarIngreso: (id: number) => Promise<boolean>;
    abrirModalCrearIngreso: () => void;
    abrirModalEditarIngreso: (ingreso: IngresoManual) => void;
    cerrarModalIngreso: () => void;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    title: string;
    value: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    sub?: string;
    subColor?: string;
    badge?: React.ReactNode;
    highlighted?: boolean;
    highlightColor?: string;
}

function KpiCard({ title, value, icon, iconBg, iconColor, sub, subColor, badge, highlighted, highlightColor }: KpiCardProps) {
    if (highlighted) {
        return (
            <div className={`rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.08)] transition-all hover:shadow-md ${highlightColor ?? 'bg-emerald-500'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="w-11 h-11 grid place-items-center bg-white/20 rounded-2xl">
                        <Icon icon={icon} className="text-white text-xl" />
                    </div>
                    {badge && <div>{badge}</div>}
                </div>
                <p className="text-white/80 font-semibold uppercase tracking-wide text-xs mb-1.5">{title}</p>
                <h3 className="text-[22px] font-extrabold text-white tracking-tight">{value}</h3>
                {sub && (
                    <p className={`text-sm mt-1 font-medium ${subColor ?? 'text-white/70'}`}>{sub}</p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${iconBg}`}>
                    <Icon icon={icon} className={iconColor} />
                </div>
                {badge && <div>{badge}</div>}
            </div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide text-xs mb-1.5">{title}</p>
            <h3 className="text-[22px] font-extrabold text-slate-800 tracking-tight">{value}</h3>
            {sub && (
                <p className={`text-sm mt-1 font-medium ${subColor ?? 'text-slate-400'}`}>{sub}</p>
            )}
        </div>
    );
}

// ─── Variación badge ──────────────────────────────────────────────────────────

function VariacionBadge({ variacion }: { variacion: number | null }) {
    if (variacion === null) return null;
    const isPositive = variacion >= 0;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
            <Icon
                icon={isPositive ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'}
                className="text-xs"
            />
            {formatPercent(variacion)} vs mes ant.
        </span>
    );
}

function DailyProfitCard({ pnl }: { pnl: PnlResponse }) {
    const topDays = pnl.resumenDiario.slice(0, 7);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <Icon icon="solar:calendar-mark-bold-duotone" className="text-emerald-600 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-base">Ganancia diaria real</h3>
                        <p className="text-xs text-slate-400">Ventas menos productos, publicidad y gastos diarios</p>
                    </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">
                    Últimos {topDays.length || 0} días
                </span>
            </div>

            {topDays.length === 0 ? (
                <div className="py-10 text-center">
                    <Icon icon="solar:calendar-linear" className="text-4xl text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Aún no hay ventas con productos para este período.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {topDays.map((day) => {
                        const positive = day.gananciaNeta >= 0;
                        return (
                            <div
                                key={day.fecha}
                                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-slate-800">{formatDate(day.fecha)}</span>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        positive
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-rose-50 text-rose-600'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${positive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        Neto {formatPercent(day.margenNeto)}
                                    </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Ventas</span>
                                        <span className="font-semibold text-slate-600">{formatCurrency(day.ventasNetas)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Costo real</span>
                                        <span className="font-semibold text-slate-600">{formatCurrency(day.costoMercaderia)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Publicidad</span>
                                        <span className="font-semibold text-slate-600">{formatCurrency(day.publicidad)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>ROAS</span>
                                        <span className="font-semibold text-slate-600">{day.roas === null ? '-' : `${day.roas.toFixed(2)}x`}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Pedidos / costo pub.</span>
                                        <span className="font-semibold text-slate-600">
                                            {day.pedidos} / {day.costoPublicidadPorPedido === null ? '-' : formatCurrency(day.costoPublicidadPorPedido)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-200">
                                        <span className="font-bold text-slate-700">Ganancia neta</span>
                                        <span className={`font-extrabold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {formatCurrency(day.gananciaNeta)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RentabilidadView(props: RentabilidadViewProps) {
    const {
        mesActual, anioActual, pnl, evolucion, gastos, ingresos,
        isLoading, isModalOpen, gastoEditando, isSaving, isCurrentOrFuture,
        isIngresoModalOpen, ingresoEditando, isSavingIngreso,
        navegarMes, crearGasto, actualizarGasto, eliminarGasto,
        abrirModalCrear, abrirModalEditar, cerrarModal,
        crearIngreso, actualizarIngreso, eliminarIngreso,
        abrirModalCrearIngreso, abrirModalEditarIngreso, cerrarModalIngreso,
    } = props;

    const isNeta = (pnl?.gananciaNeta ?? 0) >= 0;
    const [isHistorialOpen, setIsHistorialOpen] = useState(false);

    return (
        <div className="space-y-6 font-jakarta" style={{ ['--accent' as any]: ACCENT }}>
            {/* ── Month Navigator ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Rentabilidad P&amp;L</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-slate-400">
                            Análisis detallado de ganancias y pérdidas
                        </p>
                        <button onClick={() => setIsHistorialOpen(true)} className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-600 text-xs font-semibold rounded-xl hover:bg-violet-100 transition-colors border border-violet-100">
                            <Icon icon="solar:history-bold-duotone" />
                            Ver historial completo
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                    <button
                        onClick={() => navegarMes(-1)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-[var(--accent)] hover:bg-violet-50 transition-colors"
                    >
                        <Icon icon="solar:arrow-left-bold" className="text-base" />
                        <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-50">
                        <Icon icon="solar:calendar-date-bold-duotone" className="text-[var(--accent)] text-base" />
                        <span className="text-sm font-bold text-violet-700 whitespace-nowrap">
                            {getMesFullLabel(mesActual)} {anioActual}
                        </span>
                    </div>

                    <button
                        onClick={() => navegarMes(1)}
                        disabled={isCurrentOrFuture}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-[var(--accent)] hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-600 disabled:hover:bg-transparent"
                    >
                        <span className="hidden sm:inline">Siguiente</span>
                        <Icon icon="solar:arrow-right-bold" className="text-base" />
                    </button>
                </div>
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100">
                                <div className="w-11 h-11 rounded-2xl bg-slate-100 animate-pulse mb-4" />
                                <div className="h-3 w-24 rounded bg-slate-100 animate-pulse mb-3" />
                                <div className="h-6 w-32 rounded-lg bg-slate-100 animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 h-72 rounded-3xl bg-slate-100 animate-pulse" />
                        <div className="lg:col-span-2 h-72 rounded-3xl bg-slate-100 animate-pulse" />
                    </div>
                </>
            )}

            {!isLoading && (
                <>
                    {/* ── Row 1: KPI Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                        {/* Ventas Netas */}
                        <KpiCard
                            title="Ventas Netas"
                            value={formatCurrency(pnl?.ventasNetas ?? 0)}
                            icon="solar:cart-large-4-bold-duotone"
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                        />

                        {/* Ingresos Manuales (operativos del mes) */}
                        <KpiCard
                            title="Ingresos Manuales"
                            value={formatCurrency(pnl?.otrosIngresos ?? 0)}
                            icon="solar:wallet-money-bold-duotone"
                            iconBg="bg-teal-50"
                            iconColor="text-teal-600"
                            sub={(pnl?.otrosIngresos ?? 0) > 0
                                ? `Suma a la ganancia · ${ingresos.length} registro${ingresos.length === 1 ? '' : 's'}`
                                : 'Sin ingresos manuales este mes'}
                            subColor="text-teal-500"
                        />

                        {/* Ganancia Bruta */}
                        <KpiCard
                            title="Ganancia Bruta"
                            value={formatCurrency(pnl?.gananciaBruta ?? 0)}
                            icon="solar:chart-bold-duotone"
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            sub={pnl ? `Margen ${formatPercent(pnl.margenBruto)} · Costo real ${formatCurrency(pnl.costoMercaderia)}` : undefined}
                            subColor="text-blue-500"
                        />

                        {/* Total Gastos Operativos */}
                        <KpiCard
                            title="Total Gastos Op."
                            value={formatCurrency(pnl?.gastosTotales ?? 0)}
                            icon="solar:bill-list-bold-duotone"
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            sub={pnl
                                ? `Publicidad ${formatCurrency(pnl.gastoPublicidad)}`
                                : 'Sin gastos registrados'}
                            subColor="text-amber-500"
                        />

                        {/* Ganancia Neta — highlighted */}
                        <KpiCard
                            title="Ganancia Neta Real"
                            value={formatCurrency(pnl?.gananciaNeta ?? 0)}
                            icon={isNeta ? 'solar:graph-up-bold-duotone' : 'solar:graph-down-bold-duotone'}
                            iconBg=""
                            iconColor=""
                            sub={pnl ? `Margen ${formatPercent(pnl.margenNeto)}` : undefined}
                            subColor="text-white/70"
                            highlighted
                            highlightColor={isNeta
                                ? 'bg-emerald-500 hover:shadow-emerald-200'
                                : 'bg-rose-500 hover:shadow-rose-200'}
                            badge={
                                pnl != null && pnl.comparacion.variacionPorcentaje !== null
                                    ? <VariacionBadge variacion={pnl.comparacion.variacionPorcentaje} />
                                    : undefined
                            }
                        />
                    </div>

                    {/* ── Row 2: PnlTable + Panels ── */}
                    {pnl ? (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* P&L Table — 60% */}
                            <div className="lg:col-span-3">
                                <PnlTable pnl={pnl} />
                            </div>
                            {/* Right panels — 40%: Gastos + Ingresos stacked */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                <GastosPanel
                                    gastos={gastos}
                                    onAgregar={abrirModalCrear}
                                    onEditar={abrirModalEditar}
                                    onEliminar={eliminarGasto}
                                />
                                <IngresosPanel
                                    ingresos={ingresos}
                                    onAgregar={abrirModalCrearIngreso}
                                    onEditar={abrirModalEditarIngreso}
                                    onEliminar={eliminarIngreso}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-[0_2px_20px_rgba(15,23,42,0.05)] text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                <Icon icon="solar:chart-2-linear" className="text-3xl text-slate-300" />
                            </div>
                            <p className="text-slate-600 font-semibold">Sin datos para {getMesFullLabel(mesActual)} {anioActual}</p>
                            <p className="text-sm text-slate-400 mt-1">Aún no hay ventas registradas en este período</p>
                        </div>
                    )}

                    {pnl && <DailyProfitCard pnl={pnl} />}

                    {/* ── Row 3: Evolution Chart ── */}
                    <EvolucionChart evolucion={evolucion} />
                </>
            )}

            {/* ── Gasto Form Modal ── */}
            <GastoFormModal
                isOpen={isModalOpen}
                mesActual={mesActual}
                anioActual={anioActual}
                gastoEditando={gastoEditando}
                isSaving={isSaving}
                onClose={cerrarModal}
                onCrear={crearGasto}
                onActualizar={actualizarGasto}
            />

            {/* ── Ingreso Form Modal ── */}
            <IngresoFormModal
                isOpen={isIngresoModalOpen}
                mesActual={mesActual}
                anioActual={anioActual}
                ingresoEditando={ingresoEditando}
                isSaving={isSavingIngreso}
                onClose={cerrarModalIngreso}
                onCrear={crearIngreso}
                onActualizar={actualizarIngreso}
            />

            <HistorialFinancieroDrawer
                isOpen={isHistorialOpen}
                onClose={() => setIsHistorialOpen(false)}
                onEditarGasto={abrirModalEditar}
                onEliminarGasto={eliminarGasto}
                onEditarIngreso={abrirModalEditarIngreso}
                onEliminarIngreso={eliminarIngreso}
            />
        </div>
    );
}
