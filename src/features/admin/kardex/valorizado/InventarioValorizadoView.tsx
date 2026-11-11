import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Select from '@/components/Select';
import { useInventarioValorizadoViewModel } from './useInventarioValorizadoViewModel';
import { FILTROS, OrdenValorizado, formatPct, formatSoles, formatStock } from './InventarioValorizadoModel';

function Kpi({ titulo, valor, sub, icon, tono }: { titulo: string; valor: string; sub?: string; icon: string; tono: 'violet' | 'blue' | 'emerald' | 'amber' }) {
    const tonos = {
        violet: 'text-violet-600 bg-violet-500',
        blue: 'text-blue-600 bg-blue-500',
        emerald: 'text-emerald-600 bg-emerald-500',
        amber: 'text-amber-600 bg-amber-500',
    }[tono].split(' ');
    return (
        <div className="bg-white dark:bg-[#131620] rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between min-w-0">
            <div className="flex justify-between items-start gap-2 mb-4">
                <h3 className={`${tonos[0]} text-[13px] font-bold tracking-wide`}>{titulo}</h3>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] ${tonos[1]} flex items-center justify-center text-white shrink-0`}>
                    <Icon icon={icon} className="text-xl" />
                </div>
            </div>
            <div className="min-w-0">
                <h2 className="text-xl sm:text-[26px] leading-none font-extrabold text-gray-900 dark:text-white mb-2 truncate">{valor}</h2>
                {sub && <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{sub}</span>}
            </div>
        </div>
    );
}

export default function InventarioValorizadoView() {
    const vm = useInventarioValorizadoViewModel();
    const r = vm.data?.resumen;
    const conIgv = r?.baseGanancia === 'CON_IGV';

    if (!vm.puedeVerCostos) {
        return (
            <div className="max-w-xl mx-auto mt-16 text-center px-4">
                <Icon icon="solar:eye-closed-bold-duotone" className="text-5xl text-gray-300 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">No tienes permiso para ver costos</h2>
                <p className="text-sm text-gray-500 mt-1">Pídele a tu administrador este reporte.</p>
            </div>
        );
    }

    const Th = ({ col, children, left }: { col?: OrdenValorizado; children: React.ReactNode; left?: boolean }) => (
        <th className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap ${left ? 'text-left' : 'text-right'}`}>
            {col ? (
                <button type="button" onClick={() => vm.ordenarPor(col)} className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                    {children}
                    {vm.orden === col && <Icon icon={vm.asc ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} />}
                </button>
            ) : children}
        </th>
    );
    const td = 'px-3 py-2.5 whitespace-nowrap tabular-nums text-right';

    return (
        <div className="min-h-screen pb-8 max-w-8xl mx-auto px-4 pt-2 font-inter bg-[#f8fafc] dark:bg-[#0A0D14]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <Link to="/administrador/kardex/dashboard" className="text-xs font-semibold text-gray-400 hover:text-violet-600 inline-flex items-center gap-1 mb-1">
                        <Icon icon="solar:arrow-left-linear" /> Dashboard de Inventario
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Inventario valorizado</h1>
                    <p className="text-[15px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Cuánto tienes invertido en stock, cuánto vale a precio de venta y cuánto ganarías al venderlo
                    </p>
                </div>
                <div className="flex flex-wrap items-end gap-2 w-full md:w-auto">
                    {vm.puedeElegirSede && (
                        <div className="w-full sm:w-[220px]">
                            <Select
                                onChange={vm.setSedeElegida}
                                label="Sede"
                                name="sedeId"
                                options={vm.sedesOptions}
                                error=""
                                defaultValue={vm.sedeNombre}
                            />
                        </div>
                    )}
                    <button
                        onClick={vm.exportar}
                        disabled={vm.exportando || vm.loading || !vm.data}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Icon icon={vm.exportando ? 'line-md:loading-twotone-loop' : 'vscode-icons:file-type-excel'} className="text-lg" />
                        Exportar Excel
                    </button>
                    <button
                        onClick={vm.cargar}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <Icon icon="solar:refresh-linear" className="text-lg text-blue-500" />
                        Actualizar
                    </button>
                </div>
            </div>

            {vm.loading ? (
                <div className="flex justify-center items-center py-20">
                    <Icon icon="line-md:loading-twotone-loop" className="text-4xl text-violet-600" />
                    <span className="ml-3 text-gray-500 font-medium">Calculando inventario...</span>
                </div>
            ) : vm.error || !r ? (
                <div className="text-center py-16">
                    <Icon icon="mingcute:exclamation-triangle-fill" width={44} className="text-red-400 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800 dark:text-white">{vm.error || 'No se pudo cargar el inventario'}</p>
                    <button onClick={vm.cargar} className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Reintentar</button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 mb-4">
                        <Kpi titulo="Invertido en stock" valor={formatSoles(r.valorTotalInventario)} sub="a costo de compra, con IGV" icon="solar:wallet-money-bold" tono="violet" />
                        <Kpi titulo="Valor a precio de venta" valor={formatSoles(r.valorVentaInventario)} sub="si vendieras todo a precio de lista" icon="solar:tag-price-bold" tono="blue" />
                        <Kpi titulo="Ganancia potencial" valor={formatSoles(r.gananciaPotencial)} sub={`margen ${formatPct(r.margenPotencial)} · ${conIgv ? 'con' : 'sin'} IGV`} icon="solar:graph-up-bold" tono="emerald" />
                        <Kpi titulo="Productos" valor={r.totalProductos.toLocaleString('es-PE')} sub={`${r.productosStockCero} sin stock · ${r.productosStockCritico} en stock crítico`} icon="solar:box-bold" tono="amber" />
                    </div>

                    {(r.productosSinCosto > 0 || r.productosSinPrecio > 0 || r.productosStockNegativo > 0) && (
                        <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                            <Icon icon="solar:danger-triangle-bold-duotone" className="text-lg shrink-0 mt-0.5" />
                            <p>
                                {[
                                    r.productosSinCosto > 0 && `${r.productosSinCosto} con stock y sin costo`,
                                    r.productosSinPrecio > 0 && `${r.productosSinPrecio} con stock y sin precio`,
                                    r.productosStockNegativo > 0 && `${r.productosStockNegativo} con stock negativo`,
                                ].filter(Boolean).join(' · ')}
                                . Los productos sin costo o sin precio no suman a la ganancia potencial; regístrales una compra o un precio para que el cálculo sea exacto.
                            </p>
                        </div>
                    )}

                    <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                            <div className="flex flex-wrap gap-1.5">
                                {FILTROS.map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => vm.setFiltro(f.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                            vm.filtro === f.id
                                                ? 'bg-violet-600 text-white border-violet-600'
                                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-violet-400'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={vm.busqueda}
                                    onChange={(e) => vm.setBusqueda(e.target.value)}
                                    placeholder="Buscar producto, código o categoría"
                                    className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                                />
                            </div>
                        </div>

                        {vm.filas.length === 0 ? (
                            <p className="text-sm text-gray-400 py-10 text-center">No hay productos con este filtro.</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-xl border border-gray-100 dark:border-slate-800">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-slate-900">
                                            <tr>
                                                <Th col="descripcion" left>Producto</Th>
                                                <Th col="stock">Stock</Th>
                                                <Th>Costo unit.</Th>
                                                <Th col="valorTotal">Invertido</Th>
                                                <Th>Precio venta</Th>
                                                <Th col="valorVenta">Valor venta</Th>
                                                <Th col="gananciaPotencial">Ganancia</Th>
                                                <Th col="margenPotencial">Margen</Th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-gray-300">
                                            {vm.visibles.map((p) => (
                                                <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
                                                    <td className="px-3 py-2.5 min-w-[220px]">
                                                        <p className="font-semibold text-gray-900 dark:text-white leading-tight">{p.descripcion}</p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                                            {[p.codigo, p.categoria?.nombre].filter(Boolean).join(' · ')}
                                                            {p.sinCosto && <span className="ml-1.5 font-bold text-amber-600">sin costo</span>}
                                                            {p.sinPrecio && <span className="ml-1.5 font-bold text-amber-600">sin precio</span>}
                                                        </p>
                                                    </td>
                                                    <td className={`${td} ${p.stock < 0 ? 'text-rose-600 font-bold' : ''}`}>
                                                        {formatStock(p.stock)} <span className="text-[11px] text-gray-400">{p.unidadMedida?.codigo}</span>
                                                    </td>
                                                    <td className={td}>{formatSoles(p.costoDeBolsillo)}</td>
                                                    <td className={`${td} font-semibold`}>{formatSoles(p.valorTotal)}</td>
                                                    <td className={td}>{formatSoles(p.precioVenta)}</td>
                                                    <td className={td}>{formatSoles(p.valorVenta)}</td>
                                                    <td className={`${td} font-bold ${p.gananciaPotencial < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {p.sinCosto || p.sinPrecio ? '—' : formatSoles(p.gananciaPotencial)}
                                                    </td>
                                                    <td className={td}>{p.sinCosto || p.sinPrecio || !(p.stock > 0) ? '—' : formatPct(p.margenPotencial)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 text-xs text-gray-500">
                                    <span>
                                        {vm.filas.length.toLocaleString('es-PE')} productos · Totales del inventario completo arriba
                                    </span>
                                    {vm.totalPaginas > 1 && (
                                        <div className="flex items-center gap-2">
                                            <button disabled={vm.pagina <= 1} onClick={() => vm.setPagina(vm.pagina - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40">Anterior</button>
                                            <span>Página {vm.pagina} de {vm.totalPaginas}</span>
                                            <button disabled={vm.pagina >= vm.totalPaginas} onClick={() => vm.setPagina(vm.pagina + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40">Siguiente</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                        {vm.sedeNombre ? `${vm.sedeNombre}. ` : ''}Costo = costo promedio de compra (con IGV si el producto es gravado). Precio de venta = precio de lista{vm.sedeElegida ? ' de la sede' : ' de cada sede'}.
                        {' '}La ganancia va {conIgv ? 'con IGV' : 'sin IGV'}, según el criterio de IGV de tu empresa (Perfil → Configuración → Análisis financiero).
                    </p>
                </>
            )}
        </div>
    );
}
