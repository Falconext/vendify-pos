import { useState } from 'react';
import { Icon } from '@iconify/react';
import { CompraSinProducto, formatCurrency, formatDate } from '../RentabilidadModel';

interface Props {
    compras: CompraSinProducto[];
    /** Solo el admin puede marcar; los demás ven la lista. */
    puedeMarcar: boolean;
    onMarcar: (compraId: number, soloCreditoIgv: boolean) => Promise<void>;
}

/**
 * Compras sin productos del catálogo del mes (gasolina, restaurantes…).
 *
 * KREZKA (02-11): las registra "para el tema de IGV" y el sistema las sumaba
 * como gasto: S/ 2,402 de gastos contra 1,578 operativos. Acá se ven una por
 * una y se marca la que la empresa no pagó: deja de restar en la ganancia y
 * en la caja, pero su IGV sigue siendo crédito fiscal.
 */
export default function ComprasSinProductoPanel({ compras, puedeMarcar, onMarcar }: Props) {
    const [guardando, setGuardando] = useState<number | null>(null);
    const cuentan = compras.filter((c) => !c.soloCreditoIgv);
    const soloIgv = compras.filter((c) => c.soloCreditoIgv);
    const suma = (l: CompraSinProducto[]) => l.reduce((a, c) => a + c.neto, 0);

    const marcar = async (c: CompraSinProducto) => {
        setGuardando(c.id);
        try {
            await onMarcar(c.id, !c.soloCreditoIgv);
        } finally {
            setGuardando(null);
        }
    };

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-slate-800 max-h-[420px] flex flex-col" data-testid="compras-sin-producto">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                    <Icon icon="solar:cart-large-minimalistic-bold-duotone" className="text-orange-600 dark:text-orange-400 text-xl" />
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Compras sin producto</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Gasolina, comida, útiles… registradas en Compras</p>
                </div>
            </div>
            <p className="mb-3 mt-2 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                Marca <strong>Solo IGV</strong> las facturas que la empresa no pagó: no restan de la ganancia ni de la caja, pero su IGV sigue contando como crédito fiscal.
            </p>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {compras.map((c) => (
                    <div key={c.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${c.soloCreditoIgv ? 'bg-gray-50 dark:bg-slate-800/40' : 'bg-orange-50/40 dark:bg-orange-900/10'}`} data-testid={`compra-sp-${c.id}`}>
                        <div className="min-w-0 flex-1">
                            <p className={`truncate text-[13px] font-semibold ${c.soloCreditoIgv ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800 dark:text-gray-100'}`}>{c.proveedor}</p>
                            <p className="text-[11px] text-gray-400">{c.documento} · {formatDate(c.fecha)}</p>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${c.soloCreditoIgv ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{formatCurrency(c.neto)}</span>
                        <label className={`flex items-center gap-1.5 text-[11px] font-semibold ${puedeMarcar ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} text-gray-600 dark:text-gray-300`} title={puedeMarcar ? 'La empresa no la pagó: solo se registra por su IGV' : 'Solo el administrador puede cambiarlo'}>
                            <input
                                type="checkbox"
                                checked={c.soloCreditoIgv}
                                disabled={!puedeMarcar || guardando === c.id}
                                onChange={() => marcar(c)}
                                aria-label={`Solo IGV: ${c.proveedor} ${c.documento}`}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Solo IGV
                        </label>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Cuentan como gasto ({cuentan.length})</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums" data-testid="compras-cuentan">{formatCurrency(suma(cuentan))}</span>
                </div>
                {soloIgv.length > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Solo IGV, no cuentan ({soloIgv.length})</span>
                        <span className="text-sm font-semibold text-gray-400 tabular-nums" data-testid="compras-solo-igv">{formatCurrency(suma(soloIgv))}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
