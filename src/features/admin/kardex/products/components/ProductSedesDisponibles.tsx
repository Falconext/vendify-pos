import React from 'react';
import { Icon } from '@iconify/react';
import { useProductModalViewModel } from '../useProductModalViewModel';

type ViewProps = ReturnType<typeof useProductModalViewModel>;

const ACCENT = 'var(--accent, #7551FF)';

/**
 * "Disponible en": en qué sedes existe el producto (inventario + POS).
 * Solo aparece cuando la empresa tiene 2+ sedes. Una sede con stock no se
 * puede desmarcar (primero trasladar/ajustar), igual que valida el backend.
 */
export const ProductSedesDisponibles: React.FC<{ vm: ViewProps }> = ({ vm }) => {
    const { tieneVariasSedes, catalogoPorSede, sedesProducto, sedesDisponibles, toggleSedeDisponible, sedeActiva, isEdit } = vm;
    if (!tieneVariasSedes || !Array.isArray(sedesDisponibles) || sedesProducto.length === 0) return null;

    return (
        <div className="col-span-1 md:col-span-2">
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/60 dark:to-slate-900/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Icon icon="solar:shop-2-bold-duotone" width={16} height={16} style={{ color: ACCENT }} />
                            Disponible en
                        </h5>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            {catalogoPorSede
                                ? `Tu catálogo es independiente por sede: ${isEdit ? 'marca las sedes donde se vende este producto.' : `el producto nuevo queda solo en ${sedeActiva?.nombre ?? 'tu sede'}; marca otras si también lo venderás ahí.`}`
                                : 'Tu catálogo es compartido: el producto está en todas las sedes. Desmarca una sede para que no aparezca en su inventario ni en su POS.'}
                        </p>
                    </div>
                    <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: ACCENT }}
                    >
                        {sedesDisponibles.length}/{sedesProducto.length} sedes
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sedesProducto.map((sede) => {
                        const marcada = sedesDisponibles.includes(sede.sedeId);
                        const bloqueada = marcada && sede.stock > 0;
                        return (
                            <label
                                key={sede.sedeId}
                                title={bloqueada ? `Tiene ${sede.stock} en stock: traslada o ajusta antes de quitarlo` : undefined}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-colors ${
                                    marcada
                                        ? 'border-slate-200 bg-white text-gray-800 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100'
                                        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-gray-400'
                                } ${bloqueada ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={marcada}
                                    disabled={bloqueada}
                                    onChange={() => toggleSedeDisponible(sede.sedeId)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--accent)]"
                                />
                                <span className="truncate">{sede.nombre}</span>
                                {sede.esPrincipal && (
                                    <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Principal</span>
                                )}
                                {sede.stock > 0 && (
                                    <span className={`${sede.esPrincipal ? '' : 'ml-auto'} shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400`}>
                                        {sede.stock} und
                                    </span>
                                )}
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
