import { Fragment } from 'react';
import { Icon } from '@iconify/react';
import { GastoOperativo, formatCurrency, formatMonto, formatDate, getCategoriaLabel, getCategoriaIcon, MEDIOS_PAGO_GASTO, esGastoDeCaja } from '../RentabilidadModel';

/** Convierte un gasto a soles: si es USD usa su tipo de cambio; si no, el monto tal cual. */
function gastoEnSoles(gasto: GastoOperativo): number {
    if (gasto.moneda === 'USD' && gasto.tipoCambio) {
        return Number(gasto.monto) * Number(gasto.tipoCambio);
    }
    return Number(gasto.monto);
}

function medioPagoLabel(key?: string | null): string | null {
    if (!key) return null;
    return MEDIOS_PAGO_GASTO.find(m => m.key === key)?.label ?? key;
}

interface GastosPanelProps {
    gastos: GastoOperativo[];
    onAgregar: () => void;
    onEditar: (gasto: GastoOperativo) => void;
    onEliminar: (id: number) => void;
}

export default function GastosPanel({ gastos, onAgregar, onEditar, onEliminar }: GastosPanelProps) {
    // Dos orígenes distintos que suman al mismo total: los operativos se
    // registran y editan acá; los de caja chica salen del cajón y son solo
    // lectura (se corrigen en Caja, donde se registraron).
    const operativos = gastos.filter(g => !esGastoDeCaja(g));
    const deCaja = gastos.filter(esGastoDeCaja);
    const listaOrdenada = [...operativos, ...deCaja];
    const primerIndiceCaja = deCaja.length > 0 ? operativos.length : -1;
    const totalOperativos = operativos.reduce((sum, g) => sum + gastoEnSoles(g), 0);
    const totalCaja = deCaja.reduce((sum, g) => sum + gastoEnSoles(g), 0);

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-slate-800 max-h-[360px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <Icon icon="solar:bill-list-bold-duotone" className="text-amber-600 dark:text-amber-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Gastos Operativos</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {operativos.length} operativos
                            {deCaja.length > 0 && ` · ${deCaja.length} de caja`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onAgregar}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900/20"
                >
                    <Icon icon="solar:add-circle-bold" className="text-base" />
                    Agregar gasto
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
                {listaOrdenada.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Icon icon="solar:bill-list-bold-duotone" className="text-3xl text-gray-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sin gastos registrados</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Agrega tus gastos operativos de este mes</p>
                        <button
                            onClick={onAgregar}
                            className="mt-4 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-semibold transition-colors"
                        >
                            <Icon icon="solar:add-circle-bold" />
                            Registrar primer gasto
                        </button>
                    </div>
                ) : (
                    listaOrdenada.map((gasto, idx) => (
                        <Fragment key={`${gasto.origen ?? 'OPERATIVO'}-${gasto.id}`}>
                        {idx === primerIndiceCaja && (
                            <div className="flex items-center gap-2 pt-3 pb-1">
                                <Icon icon="solar:wallet-money-bold-duotone" className="text-amber-500 text-sm" />
                                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    Gastos de caja chica
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">· solo lectura, se editan en Caja</span>
                                <div className="flex-1 border-t border-dashed border-gray-200 dark:border-slate-700" />
                            </div>
                        )}
                        <div
                            className="group flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                        >
                            {/* Category icon */}
                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                <Icon
                                    icon={getCategoriaIcon(gasto.categoria)}
                                    className="text-base text-amber-500 dark:text-amber-400"
                                />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {gasto.etiqueta
                                        ? gasto.etiqueta
                                        : getCategoriaLabel(gasto.categoria)
                                    }
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {gasto.etiqueta && (
                                        <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                                            {getCategoriaLabel(gasto.categoria)}
                                        </span>
                                    )}
                                    {(gasto.fecha || gasto.fechaInicio) && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                            {gasto.recurrenteDiario
                                                ? `Desde ${formatDate(gasto.fechaInicio ?? gasto.fecha ?? '')}`
                                                : formatDate(gasto.fecha ?? '')}
                                        </span>
                                    )}
                                    {gasto.recurrenteDiario && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                            Diario
                                        </span>
                                    )}
                                    {gasto.recurrenteDiario && gasto.fechaFin && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            hasta {formatDate(gasto.fechaFin)}
                                        </span>
                                    )}
                                    {medioPagoLabel(gasto.medioPago) && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {medioPagoLabel(gasto.medioPago)}
                                        </span>
                                    )}
                                    {gasto.proveedor && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 truncate max-w-[140px]">
                                            {gasto.proveedor}
                                        </span>
                                    )}
                                    {gasto.numeroDocumento && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[110px]">
                                            Doc: {gasto.numeroDocumento}
                                        </span>
                                    )}
                                    {gasto.numeroOperacion && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[110px]">
                                            Op: {gasto.numeroOperacion}
                                        </span>
                                    )}
                                    {gasto.descripcion && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                                            {gasto.descripcion}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="flex-shrink-0 text-right">
                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                    {formatMonto(Number(gasto.monto), gasto.moneda)}
                                </span>
                                {gasto.moneda === 'USD' && gasto.tipoCambio && (
                                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                                        ≈ {formatCurrency(gastoEnSoles(gasto))}
                                    </p>
                                )}
                                {gasto.recurrenteDiario && (
                                    <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-300">por día</p>
                                )}
                            </div>

                            {/* Actions — los gastos de caja no se tocan desde acá */}
                            {esGastoDeCaja(gasto) ? (
                                <span
                                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
                                    title={`Registrado en Caja${gasto.sedeNombre ? ` · ${gasto.sedeNombre}` : ''}${gasto.usuarioNombre ? ` · ${gasto.usuarioNombre}` : ''}`}
                                >
                                    <Icon icon="solar:lock-keyhole-minimalistic-bold" className="text-xs" />
                                    Caja
                                </span>
                            ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                    onClick={() => onEditar(gasto)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    title="Editar"
                                >
                                    <Icon icon="solar:pen-bold" className="text-sm" />
                                </button>
                                <button
                                    onClick={() => onEliminar(gasto.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                    title="Eliminar"
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" className="text-sm" />
                                </button>
                            </div>
                            )}
                        </div>
                        </Fragment>
                    ))
                )}
            </div>

            {/* Footer: cada origen por separado y el total real del periodo */}
            {listaOrdenada.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Gastos operativos</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                            {formatCurrency(totalOperativos)}
                        </span>
                    </div>
                    {deCaja.length > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Gastos de caja chica</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                                {formatCurrency(totalCaja)}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 dark:border-slate-800">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total del periodo</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                            {formatCurrency(totalOperativos + totalCaja)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
