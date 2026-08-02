import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResellerDashboardViewModel } from '@/features/reseller/useResellerViewModel';
import { useResellerPanelStore } from '@/zustand/reseller-panel';
import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { THEAD_TR, BODY_TR, EntityCell, EstadoPill } from './resellerTableUi';

const ACCENT = 'var(--accent, #7551FF)'; // indigo — acento del panel reseller
const SERIES = ['#7551FF', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

// Referencia de precios reseller Vendify (ajustable).
const VENDIFY_PLANES_REFERENCIA = [
    { plan: 'Emprendedor', precioPublico: 19.90, resellerMensual: 15, gananciaPublico: 4.90, resellerAnual: 150, gananciaAnual: 88.80 },
    { plan: 'Negocio',     precioPublico: 49.90, resellerMensual: 30, gananciaPublico: 19.90, resellerAnual: 300, gananciaAnual: 298.80 },
    { plan: 'Corporativo', precioPublico: 89.90, resellerMensual: 45, gananciaPublico: 44.90, resellerAnual: 450, gananciaAnual: 628.80 },
];

const VENDIFY_VOLUME_TIERS = [
    { label: '1 a 5 clientes',   emprendedor: 15, negocio: 30, corporativo: 45, start: 1 },
    { label: '6 a 15 clientes',  emprendedor: 14, negocio: 29, corporativo: 44, start: 6 },
    { label: '16 a 30 clientes', emprendedor: 13, negocio: 28, corporativo: 43, start: 16 },
    { label: '31+ clientes',     emprendedor: 12, negocio: 27, corporativo: 42, start: 31 },
];

// Simulador estilo partners: una tarjeta por plan con costo por volumen (tramos),
// precio de venta editable, margen y clientes por plan.
const SIM_PLANS = [
    { key: 'Emprendedor', desc: 'Tienda online + boletas', publico: 19.90, defaultPrice: 39, defaultClients: 35, icon: 'solar:rocket-bold-duotone',
      tiers: [{ min: 1, cost: 15 }, { min: 6, cost: 14 }, { min: 16, cost: 13 }, { min: 31, cost: 12 }] },
    { key: 'Negocio', desc: 'Facturas + multi-sede', publico: 49.90, defaultPrice: 69, defaultClients: 34, icon: 'solar:shop-bold-duotone',
      tiers: [{ min: 1, cost: 30 }, { min: 6, cost: 29 }, { min: 16, cost: 28 }, { min: 31, cost: 27 }] },
    { key: 'Corporativo', desc: 'Reportes + API + prioridad', publico: 89.90, defaultPrice: 99, defaultClients: 31, icon: 'solar:buildings-3-bold-duotone',
      tiers: [{ min: 1, cost: 45 }, { min: 6, cost: 44 }, { min: 16, cost: 43 }, { min: 31, cost: 42 }] },
];

const costFor = (tiers: { min: number; cost: number }[], clients: number) => {
    let c = tiers[0].cost;
    for (const t of tiers) if (clients >= t.min) c = t.cost;
    return c;
};
const tierLabel = (tiers: { min: number }[], i: number) => {
    const min = tiers[i].min;
    const next = tiers[i + 1];
    return next ? `${min}–${next.min - 1}` : `${min}+`;
};

function getCurrentTierIndex(clientesActivos: number): number {
    if (clientesActivos <= 5) return 0;
    if (clientesActivos <= 15) return 1;
    if (clientesActivos <= 30) return 2;
    return 3;
}

const isFlagship = ['default', 'vendify'].includes(String(BRAND.key || '').toLowerCase());
const money = (v: number) => `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (v: number) => (Math.abs(v) >= 1000 ? `S/ ${(v / 1000).toFixed(1)}K` : money(v));

export default function ResellerDashboard() {
    const navigate = useNavigate();
    const { auth, stats, clientes, proyeccion } = useResellerDashboardViewModel();

    const latestClientes = useMemo(() => clientes.slice(0, 5), [clientes]);
    const activos = stats.clientesActivos || 0;
    const currentTierIndex = getCurrentTierIndex(activos);
    const currentTier = VENDIFY_VOLUME_TIERS[currentTierIndex];
    const nextTier = currentTierIndex < 3 ? VENDIFY_VOLUME_TIERS[currentTierIndex + 1] : null;

    const ganancia = Number(stats.gananciaMensual ?? 0);
    const ingreso = Number(stats.ingresoMensual ?? 0);
    const margen = Number(stats.margenPct ?? 0);
    const saldo = Number(stats.saldo ?? 0);

    // Proyección / renovaciones (inteligencia del backend)
    const res = proyeccion?.resumen;
    const renovaciones = proyeccion?.proximasRenovaciones ?? [];
    const gananciaProxMes = Number(res?.gananciaProyectadaProximoMes ?? 0);
    const costoRenovaciones = Number(res?.costoRenovacionesProximas ?? 0);
    const clientesPorRenovar = Number(res?.clientesPorRenovar ?? renovaciones.length);
    const urgentes = renovaciones.filter((r) => r.diasRestantes <= 7 || r.vencida);
    // El RUC no viene en proximasRenovaciones → se cruza con la lista de clientes por empresaId.
    const rucByEmpresa = useMemo(() => new Map((clientes || []).map((c: any) => [c.id, c.ruc])), [clientes]);

    // Progreso al siguiente nivel de volumen (gamificación, solo flagship)
    const bandStart = currentTier.start;
    const nextStart = nextTier?.start ?? activos;
    const faltanParaSiguiente = nextTier ? Math.max(0, nextStart - activos) : 0;
    const tierProgress = nextTier ? Math.min(100, Math.max(0, ((activos - bandStart) / (nextStart - bandStart)) * 100)) : 100;

    // Ganancia promedio por cliente → cuánto suma cada cliente nuevo
    const gananciaPorCliente = activos > 0 ? ganancia / activos : 15;

    // ── Simulador de ganancias estilo partners (una tarjeta por plan) ──
    const { updatePreciosPlan } = useResellerPanelStore();
    const [savingPrecios, setSavingPrecios] = useState(false);
    const [simRows, setSimRows] = useState<{ price: number; clients: number }[]>(
        SIM_PLANS.map((p) => ({ price: p.defaultPrice ?? p.publico, clients: p.defaultClients }))
    );
    // Inicializa/actualiza los precios desde lo configurado por el reseller.
    useEffect(() => {
        setSimRows(SIM_PLANS.map((p) => ({
            price: Number((stats.preciosPlan || {})[p.key] ?? p.defaultPrice ?? p.publico),
            clients: p.defaultClients,
        })));
    }, [stats.preciosPlan]);

    const preciosConfigurados = !!(stats.preciosPlan && Object.keys(stats.preciosPlan).length > 0);
    const updateRow = (i: number, patch: Partial<{ price: number; clients: number }>) =>
        setSimRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const simGross = SIM_PLANS.reduce((s, p, i) => {
        const r = simRows[i]; if (!r) return s;
        return s + Math.max(0, r.price - costFor(p.tiers, r.clients)) * r.clients;
    }, 0);
    const simTotalClients = simRows.reduce((s, r) => s + (r?.clients || 0), 0);
    const simYear = simGross * 12;

    const handleGuardarPrecios = async () => {
        if (!auth?.resellerId) return;
        setSavingPrecios(true);
        const precios: Record<string, number> = {};
        SIM_PLANS.forEach((p, i) => { precios[p.key] = simRows[i]?.price || p.publico; });
        await updatePreciosPlan(auth.resellerId, precios);
        setSavingPrecios(false);
    };

    // Distribución de clientes por plan (donut)
    const clientesPorPlan = useMemo(() => {
        const src = proyeccion?.clientes ?? [];
        if (src.length === 0) {
            const wl = Number(stats.clientesWhiteLabel ?? 0);
            const std = Number(stats.clientesEstandar ?? 0);
            const arr = [];
            if (std > 0) arr.push({ name: 'Estándar', value: std });
            if (wl > 0) arr.push({ name: 'Marca propia', value: wl });
            return arr;
        }
        const map = new Map<string, number>();
        src.forEach((c) => map.set(c.plan || 'Sin plan', (map.get(c.plan || 'Sin plan') || 0) + 1));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [proyeccion, stats.clientesWhiteLabel, stats.clientesEstandar]);
    const totalPlan = clientesPorPlan.reduce((a, c) => a + c.value, 0);

    const saldoBajo = saldo < Math.max(50, costoRenovaciones);

    const openSupportChat = () => {
        const msg = encodeURIComponent(`Hola ${BRAND.name}, necesito recargar saldo como reseller`);
        window.open(`https://wa.me/51991065217?text=${msg}`, '_blank');
    };

    // Tarjetas "Requiere tu atención"
    const atencion: { key: string; icon: string; label: string; value: string; hint: string; tone: string; onClick: () => void }[] = [];
    if (clientesPorRenovar > 0) atencion.push({ key: 'renov', icon: 'solar:calendar-mark-bold-duotone', label: 'Renovaciones próximas', value: String(clientesPorRenovar), hint: `${money(costoRenovaciones)} por asegurar`, tone: 'amber', onClick: () => navigate('/reseller/ganancias') });
    if ((stats.clientesSuspendidos || 0) > 0) atencion.push({ key: 'susp', icon: 'solar:user-block-bold-duotone', label: 'Clientes suspendidos', value: String(stats.clientesSuspendidos), hint: `Recupéralos: +${money(gananciaPorCliente * (stats.clientesSuspendidos || 0))}/mes`, tone: 'rose', onClick: () => navigate('/reseller/clientes') });
    if (saldoBajo) atencion.push({ key: 'saldo', icon: 'solar:wallet-money-bold-duotone', label: 'Saldo bajo', value: money(saldo), hint: 'Recarga para no suspender clientes', tone: 'violet', onClick: openSupportChat });

    const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
    };

    const kpis = [
        { label: 'Ganancia mensual', value: moneyShort(ganancia), sub: `Margen ${margen.toFixed(0)}%`, icon: 'solar:money-bag-bold-duotone', accent: true },
        { label: 'Ingreso recurrente (MRR)', value: moneyShort(ingreso), sub: `${activos} clientes activos`, icon: 'solar:chart-2-bold-duotone' },
        { label: 'Clientes activos', value: String(activos), sub: `${stats.totalClientes || 0} en total`, icon: 'solar:users-group-rounded-bold-duotone' },
        { label: 'Saldo disponible', value: money(saldo), sub: saldoBajo ? 'Saldo bajo — recarga' : 'Disponible', icon: 'solar:wallet-money-bold-duotone', warn: saldoBajo },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Hola, {auth?.nombre} 👋</h1>
                    <p className="text-slate-500">Tu negocio como Distribuidor {BRAND.name}</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={openSupportChat} className="h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                        <Icon icon="solar:wallet-money-bold-duotone" className="text-lg text-indigo-500" /> Recargar saldo
                    </button>
                    <button onClick={() => navigate('/reseller/clientes')} className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all" style={{ background: ACCENT }}>
                        <Icon icon="solar:user-plus-bold" className="text-lg" /> Registrar cliente
                    </button>
                </div>
            </div>

            {/* KPIs hero */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((c) => (
                    <div key={c.label} className={`rounded-3xl bg-white p-5 shadow-sm border ${c.warn ? 'border-rose-200' : 'border-slate-100'} transition-transform hover:-translate-y-1 duration-300`}>
                        <div className={`h-11 w-11 grid place-items-center rounded-2xl ${c.warn ? 'bg-rose-50 text-rose-600' : c.accent ? 'bg-violet-50 text-violet-600' : 'bg-slate-50 text-slate-500'}`}>
                            <Icon icon={c.icon} className="text-2xl" />
                        </div>
                        <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">{c.label}</p>
                        <p className={`mt-0.5 text-2xl font-extrabold ${c.accent ? 'text-violet-600' : c.warn ? 'text-rose-600' : 'text-slate-800'}`}>{c.value}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400 truncate">{c.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Crece tu negocio ── */}
            <div>
                <div className="flex items-center gap-2 mb-2.5">
                    <Icon icon="solar:rocket-2-bold-duotone" className="text-indigo-500 text-lg" />
                    <h2 className="text-sm font-extrabold text-slate-700">Crece tu negocio</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Progreso al siguiente nivel (flagship) o potencial por cliente */}
                    {isFlagship && nextTier ? (
                        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25">
                            <div className="flex items-center gap-2 text-sm font-bold"><Icon icon="solar:chart-square-bold-duotone" /> Siguiente nivel de volumen</div>
                            <p className="mt-2 text-3xl font-extrabold">Te faltan {faltanParaSiguiente} cliente{faltanParaSiguiente !== 1 ? 's' : ''}</p>
                            <p className="text-sm text-violet-100 mt-1">para bajar tu costo por cliente y ganar más margen.</p>
                            <div className="mt-4 h-2.5 w-full rounded-full bg-white/25 overflow-hidden">
                                <div className="h-full rounded-full bg-white" style={{ width: `${tierProgress}%` }} />
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-violet-100">
                                <span>Ahora: {money(currentTier.negocio)}/cliente</span>
                                <span>Meta: {money(nextTier.negocio)}/cliente</span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25">
                            <div className="flex items-center gap-2 text-sm font-bold"><Icon icon="solar:tag-price-bold-duotone" /> Cada cliente suma</div>
                            <p className="mt-2 text-3xl font-extrabold">+{money(gananciaPorCliente)}<span className="text-lg font-bold text-violet-100">/mes</span></p>
                            <p className="text-sm text-violet-100 mt-1">es tu ganancia promedio por cliente activo. Suma más y crece tu ingreso recurrente.</p>
                            <button onClick={() => navigate('/reseller/clientes')} className="mt-4 w-full py-2.5 bg-white text-violet-700 font-bold rounded-xl hover:shadow-md transition-all active:scale-95">
                                Registrar un cliente
                            </button>
                        </div>
                    )}

                    {/* Proyección próximo mes */}
                    <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Icon icon="solar:graph-up-bold-duotone" className="text-emerald-500" /> Proyección próximo mes</div>
                        <p className="mt-2 text-3xl font-extrabold text-slate-800">{moneyShort(gananciaProxMes || ganancia)}</p>
                        <p className="text-sm text-slate-400 mt-1">ganancia proyectada si mantienes tus clientes activos.</p>
                        {gananciaProxMes > ganancia && (
                            <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1">
                                <Icon icon="solar:alt-arrow-up-bold" /> +{money(gananciaProxMes - ganancia)} vs este mes
                            </p>
                        )}
                    </div>

                    {/* Distribución por plan */}
                    <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1"><Icon icon="solar:pie-chart-2-bold-duotone" className="text-indigo-500" /> Clientes por plan</div>
                        {totalPlan > 0 ? (
                            <div className="flex items-center gap-3">
                                <div className="relative h-28 w-28 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={clientesPorPlan} dataKey="value" nameKey="name" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
                                                {clientesPorPlan.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: any, n: any) => [`${v} clientes`, n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-extrabold text-slate-800">{totalPlan}</span>
                                        <span className="text-[10px] text-slate-400">clientes</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {clientesPorPlan.map((c, i) => (
                                        <div key={c.name} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 min-w-0"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: SERIES[i % SERIES.length] }} /><span className="truncate text-slate-600 font-medium">{c.name}</span></span>
                                            <span className="font-bold text-slate-500">{c.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-400">Aún no tienes clientes activos</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Simulador de ganancias + precios de venta ── */}
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7551FF] to-[#9f7bff] text-white shadow-md shadow-violet-500/25">
                        <Icon icon="solar:calculator-minimalistic-bold-duotone" width="22" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-extrabold text-slate-800">Simulador · ¿Cuánto puedes ganar?</h3>
                        <p className="text-xs text-slate-400">Define cuánto cobras por plan y proyecta tu ganancia real.</p>
                    </div>
                </div>

                <div className="p-5">
                    {!preciosConfigurados && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <Icon icon="solar:danger-triangle-bold-duotone" width="20" className="mt-0.5 shrink-0 text-amber-500" />
                            <p>Ajusta tu precio de venta por plan y guarda. Se usa para simular tu ganancia real y como precio por defecto al registrar clientes.</p>
                        </div>
                    )}

                    {/* Una tarjeta por plan (estilo partners) */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        {SIM_PLANS.map((p, i) => {
                            const row = simRows[i] || { price: p.publico, clients: p.defaultClients };
                            const cost = costFor(p.tiers, row.clients);
                            const margin = Math.max(0, row.price - cost);
                            const negative = row.price > 0 && row.price - cost <= 0;
                            const earn = margin * row.clients;
                            return (
                                <div key={p.key} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7551FF]/10 text-[#7551FF]"><Icon icon={p.icon} width="18" /></div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-slate-800">{p.key}</p>
                                            <p className="truncate text-[11px] text-slate-400">{p.desc}</p>
                                        </div>
                                    </div>

                                    {/* Costo por volumen */}
                                    <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Costo por volumen</p>
                                    <div className="mt-1.5 grid grid-cols-4 gap-1">
                                        {p.tiers.map((t, ti) => (
                                            <div key={t.min} className={`rounded-lg border px-1 py-1 text-center ${t.cost === cost ? 'border-[#7551FF] bg-[#7551FF]/[0.06]' : 'border-slate-100 bg-slate-50'}`}>
                                                <div className="text-[9px] font-bold text-slate-400">{tierLabel(p.tiers, ti)}</div>
                                                <div className={`text-[11px] font-black tabular-nums ${t.cost === cost ? 'text-[#7551FF]' : 'text-slate-600'}`}>{t.cost}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500">Con <b className="tabular-nums">{row.clients}</b> te cuesta <b className="tabular-nums">{money(cost)}</b> c/u</p>

                                    {/* Precio de venta */}
                                    <label className="mt-3 block text-[11px] font-bold text-slate-600">Tu precio de venta</label>
                                    <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-[#7551FF] focus-within:ring-2 focus-within:ring-[#7551FF]/20">
                                        <span className="pl-3 text-sm font-bold text-[#7551FF]">S/</span>
                                        <input
                                            type="number" min={0} step="0.10"
                                            value={row.price}
                                            onChange={(e) => updateRow(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                                            className="h-10 w-full appearance-none border-0 bg-transparent px-2 text-sm font-bold text-slate-800 outline-none focus:outline-none focus:ring-0 tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="pr-3 text-xs text-slate-400">/mes</span>
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">Ref. público S/ {p.publico.toFixed(2)}/mes</p>

                                    {/* Margen */}
                                    <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-bold ${negative ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {negative ? 'Sube tu precio · margen ' : 'Margen '}<span className="tabular-nums">{money(margin)}</span> por cliente
                                    </div>

                                    {/* Stepper clientes */}
                                    <label className="mt-3 block text-[11px] font-bold text-slate-600">Clientes en este plan</label>
                                    <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1">
                                        <button type="button" onClick={() => updateRow(i, { clients: Math.max(0, row.clients - 1) })} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-[#7551FF]"><Icon icon="solar:minus-square-linear" width="18" /></button>
                                        <input
                                            type="number" min={0} value={row.clients}
                                            onChange={(e) => updateRow(i, { clients: Math.max(0, Number(e.target.value) || 0) })}
                                            onFocus={(e) => e.target.select()}
                                            className="w-14 appearance-none border-0 bg-transparent text-center text-lg font-black text-slate-800 outline-none focus:outline-none focus:ring-0 tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button type="button" onClick={() => updateRow(i, { clients: row.clients + 1 })} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-[#7551FF]"><Icon icon="solar:add-square-linear" width="18" /></button>
                                    </div>

                                    {/* Ganas */}
                                    <div className="mt-auto pt-3">
                                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                                            <span className="text-xs font-semibold text-emerald-700">Ganas </span>
                                            <span className="text-lg font-black tabular-nums text-emerald-600">{money(earn)}</span>
                                            <span className="text-xs font-semibold text-emerald-700">/mes</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Total */}
                    <div className="mt-4 grid gap-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/25 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-100">Tu ganancia recurrente</p>
                            <p className="mt-1 text-4xl font-black leading-none tabular-nums">{money(simGross)}<span className="ml-1 text-base font-bold text-emerald-100">/mes</span></p>
                            <p className="mt-1.5 text-lg font-extrabold text-emerald-50">≈ <span className="tabular-nums">{money(simYear)}</span> al año, y creciendo</p>
                        </div>
                        <p className="text-sm leading-relaxed text-emerald-50 sm:border-l sm:border-white/20 sm:pl-5">
                            Con <b className="tabular-nums">{simTotalClients}</b> clientes en {SIM_PLANS.length} planes. Tu ganancia es el <b>margen</b> (tu precio − costo) por cada cliente, cada mes. Y mientras <b>más clientes</b> tengas, <b>menos te cuesta</b> cada plan — tu margen crece solo.
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            onClick={handleGuardarPrecios}
                            disabled={savingPrecios}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#7551FF]/30 bg-[#7551FF]/[0.06] px-5 py-2.5 text-sm font-black text-[#7551FF] transition-all hover:bg-[#7551FF]/10 active:scale-95 disabled:opacity-60"
                        >
                            <Icon icon={savingPrecios ? 'svg-spinners:ring-resize' : 'solar:diskette-bold-duotone'} width="18" /> Guardar mis precios
                        </button>
                        <button
                            onClick={() => navigate('/reseller/clientes')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7551FF] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition-all hover:brightness-105 active:scale-95"
                        >
                            <Icon icon="solar:user-plus-bold" width="18" /> Registrar clientes ahora
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Requiere tu atención ── */}
            {atencion.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2.5">
                        <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-500 text-lg" />
                        <h2 className="text-sm font-extrabold text-slate-700">Requiere tu atención</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {atencion.map((a) => {
                            const t = toneMap[a.tone];
                            return (
                                <button key={a.key} onClick={a.onClick} className={`group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm border border-slate-100 ring-1 ${t.ring} hover:shadow-md transition-all`}>
                                    <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-xl ${t.bg} ${t.text}`}><Icon icon={a.icon} className="text-2xl" /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-lg font-extrabold ${t.text}`}>{a.value}</p>
                                        <p className="text-xs font-semibold text-slate-600 leading-tight">{a.label}</p>
                                        <p className="text-[11px] text-slate-400 leading-tight">{a.hint}</p>
                                    </div>
                                    <Icon icon="solar:alt-arrow-right-linear" className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Próximas renovaciones + recargar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Próximas renovaciones</h3>
                        <button onClick={() => navigate('/reseller/ganancias')} className="text-sm text-violet-600 font-semibold hover:underline">Ver todas</button>
                    </div>
                    <div className="overflow-x-auto font-inter">
                        {renovaciones.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-400">No hay renovaciones próximas. ¡Todo al día!</p>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead><tr className={THEAD_TR}>
                                    <th className="py-3.5 pl-5 pr-3">Empresa</th>
                                    <th className="py-3.5 px-3">Plan</th>
                                    <th className="py-3.5 px-3">Vence</th>
                                    <th className="py-3.5 px-3 text-right">Te cuesta</th>
                                    <th className="py-3.5 px-3 pr-5 text-right">Tu ganancia</th>
                                </tr></thead>
                                <tbody>
                                    {renovaciones.slice(0, 6).map((rn) => {
                                        const urgente = rn.diasRestantes <= 7 || rn.vencida;
                                        return (
                                            <tr key={rn.empresaId} className={BODY_TR}>
                                                <td className="py-3.5 pl-5 pr-3"><EntityCell name={rn.razonSocial} sub={rucByEmpresa.get(rn.empresaId)} /></td>
                                                <td className="py-3.5 px-3 text-sm text-slate-500 truncate max-w-[160px]">{rn.plan}</td>
                                                <td className="py-3.5 px-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${rn.vencida ? 'bg-rose-50 text-rose-600' : urgente ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>{rn.vencida ? 'Vencida' : `${rn.diasRestantes}d`}</span></td>
                                                <td className="py-3.5 px-3 text-right font-semibold text-rose-500 whitespace-nowrap">{money(rn.costo)}</td>
                                                <td className="py-3.5 px-3 pr-5 text-right font-bold text-emerald-600 whitespace-nowrap">{money(rn.ganancia)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {urgentes.length > 0 && (
                        <p className="mt-3 text-xs text-amber-600 font-semibold flex items-center gap-1">
                            <Icon icon="solar:bell-bing-bold-duotone" /> {urgentes.length} vencen esta semana — contáctalos para asegurar la renovación.
                        </p>
                    )}
                </div>
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg shadow-violet-500/30 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">Recargar saldo</h3>
                    <p className="text-violet-100 text-sm mb-6">Mantén tu saldo positivo para que tus clientes nunca se suspendan.</p>
                    <div className="mt-auto space-y-4">
                        <div className="rounded-2xl bg-white/10 p-3 text-center">
                            <p className="text-xs text-violet-100">Saldo actual</p>
                            <p className="text-2xl font-extrabold">{money(saldo)}</p>
                        </div>
                        <button className="w-full py-3 bg-white text-violet-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95" onClick={openSupportChat}>
                            Contactar soporte
                        </button>
                        <p className="text-xs text-center opacity-70">Recargas vía transferencia · WhatsApp 991 065 217</p>
                    </div>
                </div>
            </div>

            {/* ── Últimos clientes ── */}
            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Últimos clientes registrados</h3>
                    <button onClick={() => navigate('/reseller/clientes')} className="text-sm text-violet-600 font-semibold hover:underline">Ver todos</button>
                </div>
                <div className="overflow-x-auto font-inter">
                    {latestClientes.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">Aún no has registrado clientes. ¡Registra el primero!</p>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[560px]">
                            <thead><tr className={THEAD_TR}>
                                <th className="py-3.5 pl-5 pr-3">Empresa</th>
                                <th className="py-3.5 px-3">Plan</th>
                                <th className="py-3.5 px-3">Costo reseller</th>
                                <th className="py-3.5 px-3 pr-5">Estado</th>
                            </tr></thead>
                            <tbody>
                                {latestClientes.map((c: any) => (
                                    <tr key={c.id} className={BODY_TR}>
                                        <td className="py-3.5 pl-5 pr-3"><EntityCell name={c.razonSocial} sub={c.ruc} /></td>
                                        <td className="py-3.5 px-3 text-sm text-slate-500 truncate max-w-[160px]">{c?.plan?.nombre || `Plan ID ${c.planId}`}</td>
                                        <td className="py-3.5 px-3 font-bold text-slate-800 text-sm whitespace-nowrap">{money(Number(c.costoActivacionReseller ?? c?.plan?.costo ?? 0))}</td>
                                        <td className="py-3.5 px-3 pr-5"><EstadoPill estado={c.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Estructura de precios (flagship) ── */}
            {isFlagship && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 p-6">
                        <div className="flex flex-col gap-1 mb-5">
                            <div className="flex items-center gap-2 text-violet-600 text-sm font-semibold"><Icon icon="solar:tag-price-bold-duotone" width="20" /> Estructura de precios</div>
                            <p className="text-sm text-slate-500">Referencia de precios públicos vs. lo que tú pagas. Tú defines cuánto cobras a tu cliente.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50/60 text-slate-500 text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Plan</th>
                                        <th className="px-4 py-3 font-semibold">Precio público</th>
                                        <th className="px-4 py-3 font-semibold">Tu precio (mensual)</th>
                                        <th className="px-4 py-3 font-semibold text-emerald-600">Ganancia si cobras público</th>
                                        <th className="px-4 py-3 font-semibold">Tu precio (anual)</th>
                                        <th className="px-4 py-3 font-semibold text-emerald-600">Ganancia anual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {VENDIFY_PLANES_REFERENCIA.map((row) => (
                                        <tr key={row.plan} className="hover:bg-slate-50/40">
                                            <td className="px-4 py-3.5 font-semibold text-slate-800">{row.plan}</td>
                                            <td className="px-4 py-3.5 tabular-nums text-slate-500">{money(row.precioPublico)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-violet-700">{money(row.resellerMensual)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-emerald-600">+{money(row.gananciaPublico)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-violet-700">{money(row.resellerAnual)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-emerald-600">+{money(row.gananciaAnual)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 p-6">
                        <div className="flex flex-col gap-1 mb-5">
                            <div className="flex items-center gap-2 text-violet-600 text-sm font-semibold"><Icon icon="solar:layers-minimalistic-bold-duotone" width="20" /> Tu costo según volumen de clientes</div>
                            <p className="text-sm text-slate-500">Mientras más clientes activos tienes, menos pagas por cada uno. Tu nivel actual está resaltado.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50/60 text-slate-500 text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Clientes activos</th>
                                        <th className="px-4 py-3 font-semibold">Emprendedor</th>
                                        <th className="px-4 py-3 font-semibold">Negocio</th>
                                        <th className="px-4 py-3 font-semibold">Corporativo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {VENDIFY_VOLUME_TIERS.map((tier, idx) => {
                                        const isCurrentTier = idx === currentTierIndex;
                                        return (
                                            <tr key={tier.label} className={isCurrentTier ? 'bg-violet-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50/40'}>
                                                <td className={`px-4 py-3.5 font-semibold ${isCurrentTier ? 'text-violet-700' : 'text-slate-700'}`}>
                                                    {tier.label}
                                                    {isCurrentTier && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600 text-white">TU NIVEL</span>}
                                                </td>
                                                <td className={`px-4 py-3.5 tabular-nums font-semibold ${isCurrentTier ? 'text-violet-700' : 'text-slate-700'}`}>{money(tier.emprendedor)}</td>
                                                <td className={`px-4 py-3.5 tabular-nums font-semibold ${isCurrentTier ? 'text-violet-700' : 'text-slate-700'}`}>{money(tier.negocio)}</td>
                                                <td className={`px-4 py-3.5 tabular-nums font-semibold ${isCurrentTier ? 'text-violet-700' : 'text-slate-700'}`}>{money(tier.corporativo)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
