import { Icon } from '@iconify/react';
import { PnlResponse, OtroIngreso, formatCurrency, formatPercent, getCategoriaLabel, getCategoriaIcon, TIPOS_INGRESO, CATEGORIA_COMPRAS } from '../RentabilidadModel';

interface PnlTableProps {
    pnl: PnlResponse;
}

interface PnlRowProps {
    label: string;
    icon?: string;
    value: number;
    reference: number;
    indent?: boolean;
    isSeparator?: boolean;
    isResult?: boolean;
    margin?: number;
    colorClass?: string;
    barColor?: string;
}

function PnlRow({ label, icon, value, reference, indent, isResult, margin, colorClass, barColor }: PnlRowProps) {
    const barWidth = reference > 0 ? Math.min(100, (Math.abs(value) / reference) * 100) : 0;
    const effectiveBarColor = barColor ?? 'bg-indigo-400';

    return (
        <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${isResult ? (colorClass ?? '') : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'} ${isResult ? 'mt-1' : ''}`}>
            {/* Icon or indent */}
            <div className="w-6 flex justify-center flex-shrink-0">
                {icon ? (
                    <Icon icon={icon} className={`text-base ${isResult ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                ) : indent ? (
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600 inline-block mt-0.5" />
                ) : null}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${isResult ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {label}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-28 hidden sm:block flex-shrink-0">
                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isResult ? 'bg-white/40' : effectiveBarColor}`}
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            </div>

            {/* Margin % if applicable */}
            <div className="w-14 text-right flex-shrink-0">
                {margin !== undefined ? (
                    <span className={`text-xs font-semibold ${isResult ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                        {formatPercent(margin)}
                    </span>
                ) : (
                    <span className="text-xs text-transparent select-none">0.0%</span>
                )}
            </div>

            {/* Amount */}
            <div className="w-28 text-right flex-shrink-0">
                <span className={`text-sm font-semibold tabular-nums ${isResult ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrency(value)}
                </span>
            </div>
        </div>
    );
}

function Divider() {
    return <div className="my-1 border-t border-dashed border-gray-200 dark:border-slate-700" />;
}

function getTipoIngresoIcon(tipo: string): string {
    return TIPOS_INGRESO.find(t => t.key === tipo)?.icon ?? 'solar:wallet-money-bold-duotone';
}

function getTipoIngresoLabel(tipo: string): string {
    return TIPOS_INGRESO.find(t => t.key === tipo)?.label ?? tipo;
}

export default function PnlTable({ pnl }: PnlTableProps) {
    const otrosIngresos = pnl.otrosIngresos ?? 0;
    const comprasConsumo = pnl.gastosPorCategoria.filter((g) => g.categoria === CATEGORIA_COMPRAS);
    const gastosOperativos = pnl.gastosPorCategoria.filter((g) => g.categoria !== CATEGORIA_COMPRAS);
    const otrosIngresosDetalle: OtroIngreso[] = pnl.otrosIngresosDetalle ?? [];
    const ingresosTotales = pnl.ventasNetas + otrosIngresos;
    const igvVentas = pnl.igvVentas ?? 0;
    const productosSinCosto = pnl.productosSinCosto ?? [];
    // La barra se referencia al monto más grande de la tabla (venta con IGV si aplica).
    const ref = Math.max(ingresosTotales, pnl.ventasConIgv ?? 0) || 1;

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-slate-800 h-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <Icon icon="solar:chart-2-bold-duotone" className="text-indigo-600 dark:text-indigo-400 text-xl" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Estado de Resultados</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Waterfall P&amp;L</p>
                </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 mb-1">
                <div className="w-6 flex-shrink-0" />
                <div className="flex-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Concepto</div>
                <div className="w-28 hidden sm:block flex-shrink-0 text-xs text-right font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Distribución</div>
                <div className="w-14 text-right flex-shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">%</div>
                <div className="w-28 text-right flex-shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Monto</div>
            </div>

            <Divider />

            {/* Ventas: si hubo Facturas/Boletas se muestra el total cobrado y el
                IGV que se le entrega a SUNAT, para que se entienda de dónde sale
                la venta neta (sin IGV) con la que se calcula la ganancia. */}
            {igvVentas > 0 && (
                <>
                    <PnlRow
                        label="Ventas totales (con IGV)"
                        icon="solar:cart-large-4-bold-duotone"
                        value={pnl.ventasConIgv ?? pnl.ventasNetas + igvVentas}
                        reference={ref}
                        barColor="bg-indigo-300"
                    />
                    <PnlRow
                        label={pnl.criterioIgv === 'TODOS'
                            ? '− IGV incluido en las ventas (todos los documentos)'
                            : '− IGV de facturas, boletas y notas de crédito/débito'}
                        value={igvVentas}
                        reference={ref}
                        indent
                        barColor="bg-slate-400"
                    />
                </>
            )}
            {pnl.criterioIgvLabel && (
                <p className="px-1 pb-1 text-[11px] text-gray-400 dark:text-gray-500">
                    Criterio: {pnl.criterioIgvLabel}. Se cambia en Configuración → Análisis financiero.
                </p>
            )}
            <PnlRow
                label={igvVentas > 0 ? 'Ventas Netas (sin IGV)' : 'Ventas Netas'}
                icon={igvVentas > 0 ? undefined : 'solar:cart-large-4-bold-duotone'}
                value={pnl.ventasNetas}
                reference={ref}
                barColor="bg-indigo-500"
            />

            {/* Otros Ingresos (manuales operacionales) */}
            {otrosIngresos > 0 && (
                <>
                    <div className="mt-1 mb-0.5 px-3">
                        <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">Otros Ingresos</span>
                    </div>
                    {otrosIngresosDetalle.map((i, idx) => (
                        <PnlRow
                            key={idx}
                            label={`${getTipoIngresoLabel(i.tipo)} — ${i.concepto}`}
                            icon={getTipoIngresoIcon(i.tipo)}
                            value={i.monto}
                            reference={ref}
                            indent
                            barColor="bg-emerald-400"
                        />
                    ))}
                    <PnlRow
                        label="Total Ingresos"
                        icon="solar:wallet-money-bold-duotone"
                        value={ingresosTotales}
                        reference={ref}
                        isResult
                        colorClass="bg-teal-500 dark:bg-teal-600 rounded-xl"
                        barColor="bg-teal-300"
                    />
                </>
            )}

            {/* Costo de mercadería */}
            <PnlRow
                label="Costo Real de Productos"
                icon="solar:box-bold-duotone"
                value={pnl.costoMercaderia}
                reference={ref}
                indent
                barColor="bg-rose-400"
            />
            <PnlRow
                label="Costo base vendido"
                value={pnl.costoBaseProductos ?? 0}
                reference={ref}
                indent
                barColor="bg-slate-400"
            />
            <PnlRow
                label="Costos fijos (envío/empaque)"
                value={pnl.costosFijosProducto ?? 0}
                reference={ref}
                indent
                barColor="bg-amber-400"
            />

            {/* Productos vendidos sin costo en su ficha: su línea entró con costo 0,
                así que la ganancia mostrada está inflada. Aviso para corregirlos. */}
            {productosSinCosto.length > 0 && (
                <div className="mx-3 mt-1 mb-1 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-500 text-base mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                {productosSinCosto.length === 1
                                    ? '1 producto vendido sin costo registrado'
                                    : `${productosSinCosto.length} productos vendidos sin costo registrado`}
                            </p>
                            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                                Entran al cálculo con costo S/ 0, así que la ganancia real es menor. Regístrales una compra o un costo en su ficha.
                            </p>
                            <ul className="mt-1.5 space-y-0.5">
                                {productosSinCosto.slice(0, 5).map(p => (
                                    <li key={p.productoId} className="flex items-center justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                                        <span className="truncate">{p.nombre}</span>
                                        <span className="flex-shrink-0 tabular-nums text-amber-700/80 dark:text-amber-400/80">
                                            {p.unidades} und · {formatCurrency(p.ingreso)}
                                        </span>
                                    </li>
                                ))}
                                {productosSinCosto.length > 5 && (
                                    <li className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                                        y {productosSinCosto.length - 5} más…
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <Divider />

            {/* Ganancia Bruta */}
            <PnlRow
                label="Ganancia Bruta"
                icon="solar:chart-bold-duotone"
                value={pnl.gananciaBruta}
                reference={ref}
                isResult
                margin={pnl.margenBruto}
                colorClass="bg-blue-500 dark:bg-blue-600 rounded-xl"
                barColor="bg-blue-300"
            />

            {/* Gastos por categoría (sin las compras de consumo, que van en su bloque) */}
            {gastosOperativos.length > 0 && (
                <>
                    <div className="mt-2 mb-1 px-3">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Gastos Operativos</span>
                    </div>
                    {gastosOperativos.map((g, i) => (
                        <PnlRow
                            key={i}
                            label={g.etiqueta ? `${getCategoriaLabel(g.categoria)} — ${g.etiqueta}` : getCategoriaLabel(g.categoria)}
                            icon={getCategoriaIcon(g.categoria)}
                            value={g.monto}
                            reference={ref}
                            indent
                            barColor="bg-amber-400"
                        />
                    ))}
                </>
            )}

            {/* Compras de consumo propio (Compras marcadas como gasto): netas, sin IGV.
                Antes no entraban al P&L (Compras = inventario) y la ganancia salía inflada. */}
            {comprasConsumo.length > 0 && (
                <>
                    <div className="mt-3 mb-1 px-3 flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Compras de consumo (sin IGV)</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {pnl.comprasConsumoCantidad ?? comprasConsumo.length} compra{(pnl.comprasConsumoCantidad ?? comprasConsumo.length) === 1 ? '' : 's'}
                            {(pnl.comprasConsumoIgv ?? 0) > 0 && <> · IGV {formatCurrency(pnl.comprasConsumoIgv ?? 0)} es crédito fiscal, no se resta</>}
                        </span>
                    </div>
                    {comprasConsumo.map((g, i) => (
                        <PnlRow
                            key={`c-${i}`}
                            label={g.etiqueta ? `Compra — ${g.etiqueta}` : 'Compra'}
                            icon={getCategoriaIcon(g.categoria)}
                            value={g.monto}
                            reference={ref}
                            indent
                            barColor="bg-orange-400"
                        />
                    ))}
                </>
            )}

            <Divider />

            {/* Ganancia Neta */}
            <PnlRow
                label="Ganancia Neta"
                icon={pnl.gananciaNeta >= 0 ? 'solar:graph-up-bold-duotone' : 'solar:graph-down-bold-duotone'}
                value={pnl.gananciaNeta}
                reference={ref}
                isResult
                margin={pnl.margenNeto}
                colorClass={pnl.gananciaNeta >= 0
                    ? 'bg-emerald-500 dark:bg-emerald-600 rounded-xl'
                    : 'bg-rose-500 dark:bg-rose-600 rounded-xl'}
                barColor={pnl.gananciaNeta >= 0 ? 'bg-emerald-300' : 'bg-rose-300'}
            />

            {/* IGV del mes frente a SUNAT. La ganancia de arriba ya está sin IGV a ambos
                lados, así que el ahorro por pedir facturas queda "escondido" dentro de ella;
                este bloque lo hace visible: cuánto cobraste, cuánto crédito juntaste y
                cuánto pagas (o te queda a favor). */}
            {pnl.igvSunat && (pnl.igvSunat.cobrado > 0 || pnl.igvSunat.creditoCompras > 0) && (
                <div className="mt-4 rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/20 p-4" data-testid="pnl-igv-sunat">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide flex items-center gap-1.5">
                            <Icon icon="solar:shield-check-bold-duotone" width={15} />
                            IGV del mes con SUNAT
                        </span>
                        <span className="text-[11px] text-sky-600/80 dark:text-sky-400/80">No afecta la ganancia: es el impuesto</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-600 dark:text-gray-300">IGV cobrado en facturas y boletas</span>
                            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(pnl.igvSunat.cobrado)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-600 dark:text-gray-300">
                                – Crédito fiscal de compras con factura
                                <span className="ml-1 text-[11px] text-gray-400">({pnl.igvSunat.comprasConFactura} factura{pnl.igvSunat.comprasConFactura === 1 ? '' : 's'})</span>
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">–{formatCurrency(pnl.igvSunat.creditoCompras)}</span>
                        </div>
                        <div className="flex justify-between gap-3 pt-1.5 border-t border-sky-200/70 dark:border-sky-900/50">
                            <span className="font-bold text-gray-900 dark:text-white">
                                {pnl.igvSunat.aPagar > 0 ? 'IGV a pagar este mes' : 'IGV a pagar este mes'}
                            </span>
                            <span className={`font-black tabular-nums ${pnl.igvSunat.aPagar > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {formatCurrency(pnl.igvSunat.aPagar)}
                            </span>
                        </div>
                    </div>
                    <p className="mt-2.5 text-xs text-sky-800 dark:text-sky-200 leading-snug">
                        {pnl.igvSunat.ahorro > 0
                            ? <>Sin las facturas de compra habrías pagado <b>{formatCurrency(pnl.igvSunat.cobrado)}</b> de IGV; con ellas pagas <b>{formatCurrency(pnl.igvSunat.aPagar)}</b>: te ahorraste <b>{formatCurrency(pnl.igvSunat.ahorro)}</b>.</>
                            : <>Este mes no registraste compras con factura: pagas todo el IGV que cobraste.</>}
                        {pnl.igvSunat.saldoAFavor > 0 && <> Te quedan <b>{formatCurrency(pnl.igvSunat.saldoAFavor)}</b> de crédito a favor para el siguiente mes.</>}
                        {' '}Los gastos con factura (alquiler, servicios) aún no se cuentan aquí.
                    </p>
                </div>
            )}

            {/* Empty state for gastos */}
            {pnl.gastosPorCategoria.length === 0 && otrosIngresos === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                    Sin gastos operativos registrados este mes
                </p>
            )}
        </div>
    );
}
