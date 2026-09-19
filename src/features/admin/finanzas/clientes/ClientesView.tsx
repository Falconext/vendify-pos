import { Icon } from '@iconify/react';
import { MonoBarChart, MonoDonutChart, fmtMoney } from '@/components/charts/mono';
import { MESES_FULL, formatFecha, formatPct, formatSoles } from '../productos/ProductosModel';
import {
    CiudadRanking,
    ClienteRanking,
    CourierRanking,
    RepartidorRanking,
    TIPO_REPARTIDOR_LABEL,
    formatFechaHora,
} from './ClientesModel';
import { useClientesViewModel } from './useClientesViewModel';

function Skeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-3xl" />)}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
                <div className="h-80 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
                <div className="h-80 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
            </div>
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

function Card({ title, subtitle, icon, children, right }: { title: string; subtitle?: string; icon: string; children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100/50 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-700 dark:text-gray-200 shrink-0">
                        <Icon icon={icon} className="text-lg" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
                    </div>
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}

function Vacio({ texto }: { texto: string }) {
    return <p className="py-10 text-center text-sm text-gray-400">{texto}</p>;
}

const medalla = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

/** Barra de ranking: nombre + barra proporcional + valor. */
function RankRow({ pos, nombre, sub, valor, pct, badge }: { pos: number; nombre: string; sub?: string; valor: string; pct: number; badge?: React.ReactNode }) {
    return (
        <div className="py-2.5 border-b border-gray-50 dark:border-slate-800/60 last:border-0">
            <div className="flex items-center gap-3">
                <span className="w-7 text-center text-sm font-black text-gray-400 shrink-0">{medalla(pos)}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{nombre}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{valor}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-gray-400 truncate">{sub}</p>
                        {badge}
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ClienteFielCard({ cliente }: { cliente: ClienteRanking | null }) {
    if (!cliente) {
        return (
            <div className="rounded-3xl p-5 sm:p-6 border border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10">
                <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Cliente más fiel</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aún ningún cliente repitió compra en este período. Prueba con un rango mayor o "Histórico".</p>
            </div>
        );
    }
    return (
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-200/50 dark:shadow-none">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80 mb-1">🏆 Cliente más fiel</p>
                    <h3 className="text-2xl font-black leading-tight truncate">{cliente.nombre}</h3>
                    <p className="text-sm text-white/80 mt-0.5">{cliente.nroDoc ? `${cliente.nroDoc} · ` : ''}{cliente.ciudad}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Icon icon="solar:medal-ribbons-star-bold-duotone" className="text-2xl" />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="rounded-2xl bg-white/15 p-3"><p className="text-[10px] uppercase font-bold text-white/70">Compras</p><p className="text-xl font-black">{cliente.compras}</p></div>
                <div className="rounded-2xl bg-white/15 p-3"><p className="text-[10px] uppercase font-bold text-white/70">Total comprado</p><p className="text-xl font-black">{formatSoles(cliente.ingreso)}</p></div>
                <div className="rounded-2xl bg-white/15 p-3"><p className="text-[10px] uppercase font-bold text-white/70">Meses activo</p><p className="text-xl font-black">{cliente.mesesActivos}</p></div>
                <div className="rounded-2xl bg-white/15 p-3"><p className="text-[10px] uppercase font-bold text-white/70">Última compra</p><p className="text-xl font-black">{cliente.diasDesdeUltima === 0 ? 'Hoy' : cliente.diasDesdeUltima === null ? '-' : `hace ${cliente.diasDesdeUltima} d`}</p></div>
            </div>
        </div>
    );
}

function CiudadesCard({ ciudades }: { ciudades: CiudadRanking[] }) {
    const top = ciudades.slice(0, 8);
    const max = Math.max(...top.map(c => c.ingreso), 1);
    const chartData = top.map(c => ({ ciudad: c.ciudad.length > 22 ? `${c.ciudad.slice(0, 21)}…` : c.ciudad, Ingreso: c.ingreso }));
    return (
        <Card icon="solar:map-point-wave-bold-duotone" title="Ciudades que más compran" subtitle="Por ubicación registrada del cliente · ingreso en soles">
            {ciudades.length === 0 ? <Vacio texto="Sin ventas en el período." /> : (
                <div className="grid lg:grid-cols-5 gap-5">
                    <div className="lg:col-span-2">
                        <MonoBarChart data={chartData} index="ciudad" categories={['Ingreso']} orientation="bars" height={Math.max(220, top.length * 34)} categoryWidth={150} valueFormatter={(v) => fmtMoney(v)} showGrid={false} />
                    </div>
                    <div className="lg:col-span-3">
                        {top.map((c, i) => (
                            <RankRow
                                key={c.ciudad}
                                pos={i}
                                nombre={c.ciudad}
                                sub={`${c.compras} compra${c.compras === 1 ? '' : 's'} · ${c.clientes} cliente${c.clientes === 1 ? '' : 's'}${c.departamento && c.departamento !== c.ciudad ? ` · ${c.departamento}` : ''}`}
                                valor={formatSoles(c.ingreso)}
                                pct={(c.ingreso / max) * 100}
                                badge={<span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{formatPct(c.participacion)} del total</span>}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

function ClientesTabla({ clientes, busqueda, setBusqueda, total }: { clientes: ClienteRanking[]; busqueda: string; setBusqueda: (v: string) => void; total: number }) {
    const max = Math.max(...clientes.map(c => c.ingreso), 1);
    return (
        <Card
            icon="solar:users-group-rounded-bold-duotone"
            title="Ranking de clientes"
            subtitle={`${total} cliente${total === 1 ? '' : 's'} con compras · ordenado por total comprado`}
            right={
                <div className="relative w-full max-w-[220px]">
                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente o ciudad" className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0F1219] text-sm" />
                </div>
            }
        >
            {clientes.length === 0 ? <Vacio texto="Sin clientes para mostrar." /> : (
                <div className="overflow-x-auto -mx-2">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                                <th className="text-left px-2 py-2 w-10">#</th>
                                <th className="text-left px-2 py-2">Cliente</th>
                                <th className="text-left px-2 py-2">Ciudad</th>
                                <th className="text-right px-2 py-2">Compras</th>
                                <th className="text-right px-2 py-2">Total</th>
                                <th className="text-right px-2 py-2">Ticket prom.</th>
                                <th className="text-right px-2 py-2">Última compra</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.slice(0, 50).map((c, i) => (
                                <tr key={`${c.clienteId ?? 'v'}-${i}`} className="border-t border-gray-50 dark:border-slate-800/60">
                                    <td className="px-2 py-2.5 font-black text-gray-400">{medalla(i)}</td>
                                    <td className="px-2 py-2.5">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[260px]">{c.nombre}</p>
                                        <p className="text-[11px] text-gray-400">{c.nroDoc || 'sin documento'}{c.compras >= 2 ? ' · recurrente' : ''}</p>
                                        <div className="mt-1 h-1 w-40 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${Math.max(3, (c.ingreso / max) * 100)}%` }} /></div>
                                    </td>
                                    <td className="px-2 py-2.5 text-gray-600 dark:text-gray-300">{c.ciudad}</td>
                                    <td className="px-2 py-2.5 text-right font-bold text-gray-900 dark:text-white">{c.compras}</td>
                                    <td className="px-2 py-2.5 text-right font-bold text-gray-900 dark:text-white">{formatSoles(c.ingreso)}</td>
                                    <td className="px-2 py-2.5 text-right text-gray-600 dark:text-gray-300">{formatSoles(c.ticketPromedio)}</td>
                                    <td className="px-2 py-2.5 text-right text-gray-600 dark:text-gray-300">{formatFechaHora(c.ultimaCompra)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {clientes.length > 50 && <p className="text-xs text-gray-400 px-2 pt-2">Mostrando los 50 primeros de {clientes.length}.</p>}
                </div>
            )}
        </Card>
    );
}

function RepartidoresCard({ repartidores }: { repartidores: RepartidorRanking[] }) {
    const max = Math.max(...repartidores.map(r => r.entregados), 1);
    return (
        <Card icon="solar:delivery-bold-duotone" title="Ranking de repartidores" subtitle="Envíos entregados · incluye couriers (Shalom, Olva) cuando no hay repartidor asignado">
            {repartidores.length === 0 ? <Vacio texto="Sin envíos registrados en el período." /> : (
                repartidores.slice(0, 10).map((r, i) => (
                    <RankRow
                        key={`${r.repartidorId ?? r.nombre}`}
                        pos={i}
                        nombre={r.nombre}
                        sub={`${TIPO_REPARTIDOR_LABEL[r.tipo ?? ''] ?? (r.tipo || 'Repartidor')} · ${r.envios} envío${r.envios === 1 ? '' : 's'}${r.devueltos ? ` · ${r.devueltos} devuelto${r.devueltos === 1 ? '' : 's'}` : ''} · ventas ${formatSoles(r.ingreso)}`}
                        valor={`${r.entregados} entregados`}
                        pct={(r.entregados / max) * 100}
                        badge={<span className={`text-[10px] font-bold ${r.tasaEntrega >= 90 ? 'text-emerald-600 dark:text-emerald-400' : r.tasaEntrega >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatPct(r.tasaEntrega)} entrega</span>}
                    />
                ))
            )}
        </Card>
    );
}

function CouriersCard({ couriers, envios, entregados }: { couriers: CourierRanking[]; envios: number; entregados: number }) {
    const data = couriers.map(c => ({ courier: c.courier, Envíos: c.envios }));
    return (
        <Card icon="solar:box-bold-duotone" title="Couriers" subtitle="Shalom, Olva y otros transportistas · estado según rastreo">
            {couriers.length === 0 ? <Vacio texto="Sin envíos por courier en el período." /> : (
                <div className="grid sm:grid-cols-5 gap-4 items-center">
                    <div className="sm:col-span-2">
                        <MonoDonutChart data={data} category="Envíos" index="courier" height={200} centerLabel="Entregados" centerValue={`${entregados}/${envios}`} valueFormatter={(v) => `${v} envío${v === 1 ? '' : 's'}`} />
                    </div>
                    <div className="sm:col-span-3 space-y-2">
                        {couriers.map(c => (
                            <div key={c.courier} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-slate-800 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{c.courier}</p>
                                    <p className="text-[11px] text-gray-400">{c.entregados} entregados · {c.enTransito} en camino{c.devueltos ? ` · ${c.devueltos} devueltos` : ''}{c.costoEnvio ? ` · flete ${formatSoles(c.costoEnvio)}` : ''}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{c.envios}</p>
                                    <p className={`text-[10px] font-bold ${c.tasaEntrega >= 90 ? 'text-emerald-600' : c.tasaEntrega >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{formatPct(c.tasaEntrega)} entrega</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

export default function ClientesView({ sedeId }: { sedeId?: number | null }) {
    const vm = useClientesViewModel(sedeId);
    const data = vm.data;

    return (
        <div className="space-y-5">
            {/* ── Barra de período (mismo control que Productos, + Histórico) ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">Período</p>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {vm.periodo === 'dia'
                            ? formatFecha(vm.dia)
                            : vm.periodo === 'rango'
                                ? `${formatFecha(vm.fechaInicio)} - ${formatFecha(vm.fechaFin)}`
                                : vm.periodo === 'historico'
                                    ? 'Todo el historial'
                                    : `${MESES_FULL[vm.mesActual - 1]} ${vm.anioActual}`}
                        {((vm.periodo === 'mes' && vm.isCurrentOrFuture) || (vm.periodo === 'dia' && vm.esHoy)) && (
                            <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                {vm.periodo === 'dia' ? 'Hoy' : 'En curso'}
                            </span>
                        )}
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 gap-1">
                        <SegmentedButton active={vm.periodo === 'dia'} onClick={() => vm.setPeriodo('dia')}>Día</SegmentedButton>
                        <SegmentedButton active={vm.periodo === 'mes'} onClick={() => vm.setPeriodo('mes')}>Mes</SegmentedButton>
                        <SegmentedButton active={vm.periodo === 'rango'} onClick={() => vm.setPeriodo('rango')}>Rango</SegmentedButton>
                        <SegmentedButton active={vm.periodo === 'historico'} onClick={() => vm.setPeriodo('historico')}>Histórico</SegmentedButton>
                    </div>
                    {vm.periodo === 'rango' && (
                        <>
                            <input type="date" value={vm.fechaInicio} onChange={(e) => vm.setFechaInicio(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                            <input type="date" value={vm.fechaFin} onChange={(e) => vm.setFechaFin(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                        </>
                    )}
                    {vm.periodo === 'dia' && (
                        <>
                            <button onClick={() => vm.navegarDia(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"><Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" /></button>
                            <input type="date" value={vm.dia} max={vm.hoy} onChange={(e) => vm.setDia(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                            <button onClick={() => vm.navegarDia(1)} disabled={vm.esHoy} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" /></button>
                        </>
                    )}
                    {vm.periodo === 'mes' && (
                        <>
                            <button onClick={() => vm.navegarMes(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"><Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" /></button>
                            <button onClick={() => vm.navegarMes(1)} disabled={vm.isCurrentOrFuture} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" /></button>
                        </>
                    )}
                    <button onClick={vm.refreshData} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800"><Icon icon="solar:refresh-bold" /></button>
                </div>
            </div>

            {vm.error && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/10 px-4 py-3">
                    <p className="text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2"><Icon icon="solar:danger-triangle-bold" /> {vm.error}{data ? ' · se muestra la última información cargada.' : ''}</p>
                    <button onClick={vm.refreshData} className="h-9 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">Reintentar</button>
                </div>
            )}
            {vm.isLoading && !data ? <Skeleton /> : data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Kpi icon="solar:users-group-two-rounded-bold-duotone" label="Clientes que compraron" value={String(data.resumen.clientesDistintos)} sub={`${data.resumen.clientesRecurrentes} repitieron compra`} tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
                        <Kpi icon="solar:map-point-bold-duotone" label="Ciudades" value={String(data.resumen.ciudadesDistintas)} sub={data.ciudades[0] ? `Top: ${data.ciudades[0].ciudad}` : undefined} tone="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
                        <Kpi icon="solar:bill-list-bold-duotone" label="Ticket promedio" value={formatSoles(data.resumen.ticketPromedio)} sub={`${data.resumen.documentos} comprobantes · ${formatSoles(data.resumen.ingresoTotal)}`} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                        <Kpi icon="solar:delivery-bold-duotone" label="Envíos" value={String(data.resumen.envios)} sub={`${data.resumen.enviosEntregados} entregados`} tone="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                    </div>

                    <ClienteFielCard cliente={data.clienteMasFiel} />

                    <CiudadesCard ciudades={data.ciudades} />

                    <ClientesTabla clientes={vm.clientesFiltrados} busqueda={vm.busqueda} setBusqueda={vm.setBusqueda} total={data.resumen.clientesDistintos} />

                    <div className="grid lg:grid-cols-2 gap-5">
                        <RepartidoresCard repartidores={data.repartidores} />
                        <CouriersCard couriers={data.couriers} envios={data.resumen.envios} entregados={data.resumen.enviosEntregados} />
                    </div>
                </>
            )}
        </div>
    );
}
