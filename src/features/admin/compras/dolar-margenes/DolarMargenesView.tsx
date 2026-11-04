/**
 * Dólar y márgenes (pedido 2026-11-03): el empresario compra en dólares y el
 * costo queda en soles al TC de la compra. Si el dólar sube, vende con un costo
 * que ya no es el de reponer y pierde margen sin darse cuenta. Esta pantalla
 * compara lo que pagó con lo que costaría volver a comprarlo hoy y sugiere el
 * precio que deja su margen.
 */
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import ModalConfirm from '@/components/ModalConfirm';
import type { FilaReposicion } from '@/services/dolarMargenes.service';
import { useDolarMargenesViewModel } from './useDolarMargenesViewModel';
import { ESTADOS, dolares, enMoneda, fechaCorta, pct, soles, tc, type FiltroEstado } from './dolarMargenesModel';

type VM = ReturnType<typeof useDolarMargenesViewModel>;

const tarjeta = 'rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]';
const inputNum =
    'h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm tabular-nums text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-violet-900/40';

function CampoConfig({ label, ayuda, sufijo, prefijo, value, step, onChange }: {
    label: string; ayuda: string; sufijo?: string; prefijo?: string; value: number; step: number; onChange: (n: number) => void;
}) {
    return (
        <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
            <div className="mt-1 flex items-center gap-1.5">
                {prefijo && <span className="text-sm text-gray-500">{prefijo}</span>}
                <input type="number" step={step} min={0} className={inputNum} value={Number.isFinite(value) ? value : ''}
                    onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
                {sufijo && <span className="text-sm text-gray-500">{sufijo}</span>}
            </div>
            <span className="mt-1 block text-[11px] leading-snug text-gray-500 dark:text-gray-400">{ayuda}</span>
        </label>
    );
}

function Variacion({ v }: { v: number }) {
    if (Math.abs(v) < 0.05) return <span className="text-xs text-gray-400">igual</span>;
    const sube = v > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${sube ? 'text-red-600 dark:text-red-400' : 'text-sky-600 dark:text-sky-400'}`}>
            <Icon icon={sube ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} width={12} />
            {pct(Math.abs(v))}
        </span>
    );
}

function Fila({ f, vm }: { f: FilaReposicion; vm: VM }) {
    const estado = ESTADOS[f.estado];
    const marcado = vm.seleccion.has(f.productoId);
    const escrito = vm.editados[f.productoId];
    return (
        <tr className={`border-t border-gray-100 align-top dark:border-slate-800 ${marcado ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''}`}>
            <td className="px-3 py-3">
                <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={marcado} onChange={() => vm.actions.alternar(f.productoId)}
                    aria-label={`Elegir ${f.descripcion}`} />
            </td>
            <td className="px-3 py-3">
                <p className="font-semibold text-gray-900 dark:text-white">{f.descripcion}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{f.codigo} · stock {f.stock.toLocaleString('es-PE')}</p>
                <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${estado.chip}`} title={estado.ayuda}>
                    <Icon icon={estado.icon} width={12} /> {estado.label}
                </span>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
                <p className="tabular-nums text-gray-900 dark:text-white">{dolares(f.costoUsd)} <span className="text-gray-400">×</span> {tc(f.tcCompra)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{f.documentoCompra} · {fechaCorta(f.fechaCompra)}</p>
                <p className="mt-1 text-xs tabular-nums text-gray-600 dark:text-gray-300">Pagaste {soles(f.costoCompraSoles)}</p>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
                <p className="font-semibold tabular-nums text-gray-900 dark:text-white">{soles(f.costoReposicionSoles)}</p>
                <Variacion v={f.variacionTcPct} />
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
                <p className="tabular-nums text-gray-900 dark:text-white">{soles(f.precioActualSoles)}</p>
                {f.moneda === 'USD' && <p className="text-xs text-gray-500">precio en dólares</p>}
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Margen {pct(f.margenCompraPct)} <Icon icon="solar:arrow-right-linear" className="inline" width={11} />{' '}
                    <b className={f.margenReposicionPct !== null && f.margenReposicionPct < (vm.datos?.config.margenObjetivoPct ?? 0) ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {pct(f.margenReposicionPct)}
                    </b>
                </p>
            </td>
            <td className="px-3 py-3 min-w-[140px]">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">{f.moneda === 'USD' ? 'US$' : 'S/'}</span>
                    <input type="number" step="0.1" min={0} className={inputNum} value={escrito ?? f.precioSugerido}
                        onChange={(e) => vm.actions.editarPrecio(f.productoId, e.target.value)}
                        onFocus={() => !marcado && vm.actions.alternar(f.productoId)} aria-label={`Precio nuevo de ${f.descripcion}`} />
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {escrito !== undefined ? `Sugerido ${enMoneda(f.precioSugerido, f.moneda)}` : f.gravado ? 'con IGV' : 'sin IGV (exonerado)'}
                </p>
                {f.sugeridoSobre === 'compra' && (
                    <p className="mt-0.5 text-[11px] leading-snug text-sky-700 dark:text-sky-300">
                        Sobre lo que pagaste: aún tienes stock comprado más caro.
                    </p>
                )}
            </td>
        </tr>
    );
}

export default function DolarMargenesView() {
    const vm = useDolarMargenesViewModel();
    const { datos, config, actions } = vm;

    const chips: { id: FiltroEstado; label: string; n: number }[] = datos
        ? [
            { id: 'riesgo', label: 'En riesgo', n: datos.resumen.riesgo },
            { id: 'margen-bajo', label: 'Margen bajo', n: datos.resumen.margenBajo },
            { id: 'bajo', label: 'Dólar bajó', n: datos.resumen.bajo },
            { id: 'todos', label: 'Todos', n: datos.resumen.total },
        ]
        : [];

    return (
        <div className="min-h-screen bg-gray-50 px-3 pb-44 dark:bg-[#0A0D14] sm:px-2 sm:pb-24">
            <div className="mb-4 flex flex-col gap-1 sm:mb-6">
                <Link to="/administrador/compras" className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
                    <Icon icon="solar:arrow-left-linear" /> Compras
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">Dólar y márgenes</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Lo que compraste en dólares, cuánto te costaría reponerlo hoy y a cuánto venderlo para mantener tu margen.
                </p>
            </div>

            {vm.cargando && !datos ? (
                <div className={`${tarjeta} flex items-center justify-center gap-2 p-10 text-sm text-gray-500`}>
                    <Icon icon="line-md:loading-loop" width={20} /> Calculando con el dólar de hoy…
                </div>
            ) : vm.error ? (
                <div className={`${tarjeta} p-6 text-sm`}>
                    <p className="font-semibold text-red-600">{vm.error}</p>
                    <Button className="mt-3" size="sm" outline onClick={actions.cargar}>Reintentar</Button>
                </div>
            ) : datos && config ? (
                <>
                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                        <div className={`${tarjeta} p-5`}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dólar hoy (SUNAT venta)</p>
                            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">S/ {tc(datos.tcHoy)}</p>
                            <p className="text-xs text-gray-500">{fechaCorta(datos.tcFecha)}</p>
                            {config.colchonTc > 0 && (
                                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                    Precios sugeridos a <b>{tc(datos.tcHoy + datos.config.colchonTc)}</b> (con colchón)
                                </p>
                            )}
                        </div>
                        <div className={`${tarjeta} p-5`}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <CampoConfig label="Margen que buscas" sufijo="%" step={1} value={config.margenObjetivoPct}
                                    ayuda="Sobre el precio de venta: 30% = de cada S/ 100 vendidos te quedan S/ 30."
                                    onChange={(n) => actions.setConfig({ ...config, margenObjetivoPct: n })} />
                                <CampoConfig label="Avisarme si el dólar se mueve" sufijo="%" step={0.5} value={config.umbralPct}
                                    ayuda="Desde el TC de tu última compra. Te llega un aviso a la campana."
                                    onChange={(n) => actions.setConfig({ ...config, umbralPct: n })} />
                                <CampoConfig label="Colchón sobre el TC" prefijo="S/" step={0.01} value={config.colchonTc}
                                    ayuda="Se suma al dólar de hoy al sugerir precios, por si sube antes de tu próxima compra."
                                    onChange={(n) => actions.setConfig({ ...config, colchonTc: n })} />
                            </div>
                            {vm.configCambiada && (
                                <div className="mt-4 flex justify-end">
                                    <Button size="sm" color="secondary" className="!bg-violet-600 !text-white" onClick={actions.guardarConfig} disabled={vm.guardandoConfig}>
                                        {vm.guardandoConfig ? 'Guardando…' : 'Guardar y recalcular'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {datos.resumen.total === 0 ? (
                        <div className={`${tarjeta} p-10 text-center`}>
                            <Icon icon="solar:dollar-minimalistic-bold-duotone" className="mx-auto text-violet-400" width={44} />
                            <p className="mt-2 font-semibold text-gray-900 dark:text-white">Todavía no hay compras en dólares</p>
                            <p className="mt-1 text-sm text-gray-500">Cuando registres una compra en US$ (Nueva compra → moneda US$), sus productos aparecen aquí.</p>
                        </div>
                    ) : (
                        <div className={tarjeta}>
                            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-wrap gap-2">
                                    {chips.map((c) => (
                                        <button key={c.id} type="button" onClick={() => actions.setFiltro(c.id)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${vm.filtro === c.id
                                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'}`}>
                                            {c.label} <span className="tabular-nums opacity-70">{c.n}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="relative md:w-72">
                                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={vm.busqueda} onChange={(e) => actions.setBusqueda(e.target.value)} placeholder="Buscar producto o código"
                                        className={`${inputNum} pl-9`} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead className="bg-gray-50/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                                        <tr>
                                            <th className="px-3 py-2.5">
                                                <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={vm.todasVisiblesMarcadas}
                                                    onChange={actions.alternarVisibles} aria-label="Elegir todos los visibles" />
                                            </th>
                                            <th className="px-3 py-2.5">Producto</th>
                                            <th className="px-3 py-2.5">Última compra</th>
                                            <th className="px-3 py-2.5">Reponer hoy</th>
                                            <th className="px-3 py-2.5">Precio actual</th>
                                            <th className="px-3 py-2.5">Precio nuevo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vm.filas.map((f) => <Fila key={f.productoId} f={f} vm={vm} />)}
                                        {vm.filas.length === 0 && (
                                            <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-500">Nada en este filtro.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="border-t border-gray-100 px-4 py-3 text-[11px] leading-relaxed text-gray-500 dark:border-slate-800 dark:text-gray-400">
                                Precio nuevo = costo US$ × (dólar de hoy + colchón) ÷ (1 − margen), más IGV si el producto es gravado; redondeado hacia arriba a los 10 céntimos. Si el dólar bajó pero aún tienes stock comprado más caro, se calcula sobre lo que pagaste, para no venderlo con menos margen.
                                El margen se muestra sobre lo que pagaste <Icon icon="solar:arrow-right-linear" className="inline" width={11} /> sobre lo que cuesta reponer hoy.
                                Tu costo contable no cambia: solo cambias el precio de venta.
                            </p>
                        </div>
                    )}

                    {(vm.seleccion.size > 0 || vm.respaldo) && (
                        <div className="fixed inset-x-3 bottom-24 z-30 sm:bottom-3 mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                                {vm.seleccion.size > 0
                                    ? <><b>{vm.seleccion.size}</b> producto{vm.seleccion.size === 1 ? '' : 's'} elegido{vm.seleccion.size === 1 ? '' : 's'}</>
                                    : 'Precios actualizados.'}
                            </p>
                            <div className="flex gap-2">
                                {vm.respaldo && (
                                    <Button size="sm" outline onClick={actions.deshacer} disabled={vm.aplicando}>
                                        <Icon icon="solar:undo-left-round-linear" className="mr-1" /> Deshacer último cambio
                                    </Button>
                                )}
                                {vm.seleccion.size > 0 && (
                                    <Button size="sm" color="secondary" className="!bg-violet-600 !text-white" disabled={vm.aplicando || vm.hayPrecioInvalido}
                                        onClick={() => actions.setConfirmando(true)}>
                                        Aplicar precio nuevo
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    <ModalConfirm
                        isOpenModal={vm.confirmando}
                        setIsOpenModal={actions.setConfirmando}
                        confirmSubmit={actions.aplicar}
                        confirmLoading={vm.aplicando}
                        title="¿Cambiar el precio de venta?"
                        information={`Se cambia el precio de ${vm.itemsAAplicar.length} producto${vm.itemsAAplicar.length === 1 ? '' : 's'}. Las ventas ya hechas no cambian, y puedes deshacerlo desde esta pantalla.`}
                        confirmText="Sí, cambiar precios"
                    />
                </>
            ) : null}
        </div>
    );
}
