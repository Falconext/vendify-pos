import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { post } from '@/utils/fetch';
import Modal from '@/components/Modal';
import { cantidadAPedir, type LineaDesdeVentas, type ResumenDesdeVentas } from './ordenDesdeVentas';

interface Props {
    comprobanteIds: number[];
    onClose: () => void;
    /** Líneas ya decididas: se abre la orden con ellas precargadas. */
    onContinuar: (resumen: ResumenDesdeVentas, lineas: { linea: LineaDesdeVentas; cantidad: number }[]) => void;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, ''));

/**
 * Notas de venta → Orden de compra, paso 1: qué se vendió en las notas
 * elegidas, cuánto hay en stock y cuánto pedir. Recién al continuar se abre
 * la orden (proveedor, precios, IGV) con estas líneas.
 */
export default function ModalOrdenDesdeVentas({ comprobanteIds, onClose, onContinuar }: Props) {
    const [resumen, setResumen] = useState<ResumenDesdeVentas | null>(null);
    const [error, setError] = useState('');
    const [descontarStock, setDescontarStock] = useState(false);
    // Cantidad que el usuario escribió a mano, por índice de línea.
    const [editadas, setEditadas] = useState<Record<number, string>>({});

    useEffect(() => {
        (async () => {
            const resp: any = await post('compras/ordenes/desde-ventas', { comprobanteIds });
            if (resp.success && resp.data) setResumen(resp.data);
            else setError(resp.error || 'No se pudieron leer las notas elegidas');
        })();
    }, [comprobanteIds]);

    const cantidades = useMemo(
        () => (resumen?.lineas ?? []).map((l, i) => {
            const escrita = editadas[i];
            return escrita !== undefined ? Math.max(0, Number(escrita) || 0) : cantidadAPedir(l, descontarStock);
        }),
        [resumen, editadas, descontarStock],
    );
    const aPedir = cantidades.filter((c) => c > 0).length;
    const yaPedidas = (resumen?.notas ?? []).filter((n) => n.ordenes.length > 0);

    const continuar = () => {
        if (!resumen) return;
        onContinuar(
            resumen,
            resumen.lineas.map((linea, i) => ({ linea, cantidad: cantidades[i] })).filter((x) => x.cantidad > 0),
        );
    };

    return (
        <Modal isOpenModal closeModal={onClose} title="Orden de compra desde notas de venta" icon="solar:clipboard-list-bold-duotone" width="860px" position="right">
            <div className="space-y-4 p-4" data-testid="oc-desde-ventas">
                {!resumen && !error && (
                    <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
                        <Icon icon="svg-spinners:180-ring" className="text-lg" /> Sumando lo vendido…
                    </div>
                )}
                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}

                {resumen && (
                    <>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {resumen.notas.length} nota{resumen.notas.length === 1 ? '' : 's'}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {resumen.notas.map((n) => (
                                    <span key={n.id} className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-gray-200">
                                        {n.documento}{n.cliente ? ` · ${n.cliente}` : ''}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {yaPedidas.length > 0 && (
                            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" data-testid="oc-ya-pedidas">
                                <Icon icon="solar:danger-triangle-bold" width={16} className="mt-px shrink-0" />
                                <span>
                                    Ojo, ya se pidieron al proveedor: {yaPedidas.map((n) => `${n.documento} (${n.ordenes.join(', ')})`).join(' · ')}.
                                    Si las incluyes de nuevo, esos productos se compran dos veces.
                                </span>
                            </p>
                        )}
                        {resumen.descartadas.length > 0 && (
                            <p className="text-xs text-gray-500">
                                No entran: {resumen.descartadas.map((d) => `${d.documento} (${d.motivo.toLowerCase()})`).join(' · ')}.
                            </p>
                        )}
                        {resumen.omitidas.length > 0 && (
                            <p className="text-xs text-gray-500">
                                Servicios que no se compran: {resumen.omitidas.join(', ')}.
                            </p>
                        )}

                        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-gray-200 p-3 text-sm dark:border-slate-700">
                            <input type="checkbox" checked={descontarStock} onChange={(e) => { setDescontarStock(e.target.checked); setEditadas({}); }} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <span>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">Pedir solo lo que falta</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">Descuenta el stock que ya tienes en esta sede. Si no lo marcas, se pide todo lo vendido.</span>
                            </span>
                        </label>

                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-[11px] font-black uppercase tracking-wide text-gray-500 dark:bg-slate-900 dark:text-gray-400">
                                    <tr>
                                        <th className="px-3 py-2">Producto</th>
                                        <th className="px-3 py-2 text-right">Vendido</th>
                                        <th className="px-3 py-2 text-right">Stock</th>
                                        <th className="px-3 py-2 text-right">A pedir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {resumen.lineas.map((l, i) => (
                                        <tr key={`${l.productoId ?? 't'}-${l.descripcion}`} className={cantidades[i] > 0 ? '' : 'opacity-50'}>
                                            <td className="px-3 py-2">
                                                <p className="font-semibold text-gray-800 dark:text-gray-100">{l.descripcion}</p>
                                                <p className="text-[11px] text-gray-500" title={l.origenes.map((o) => `${o.documento}: ${fmt(o.cantidad)}`).join('\n')}>
                                                    {l.productoId === null ? 'Ítem libre · ' : l.codigo ? `${l.codigo} · ` : ''}
                                                    {l.origenes.map((o) => `${o.documento.replace(/-0+/, '-')} ×${fmt(o.cantidad)}`).join(', ')}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmt(l.cantidadVendida)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-gray-500">{l.productoId === null ? '—' : fmt(l.stock)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    aria-label={`Cantidad a pedir de ${l.descripcion}`}
                                                    value={editadas[i] ?? String(cantidades[i])}
                                                    onChange={(e) => setEditadas((prev) => ({ ...prev, [i]: e.target.value }))}
                                                    className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-right text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-gray-500">En el siguiente paso eliges el proveedor y revisas los precios. Nada se guarda hasta ahí.</p>
                            <button type="button" onClick={continuar} disabled={aPedir === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50">
                                Continuar con {aPedir} producto{aPedir === 1 ? '' : 's'}
                                <Icon icon="solar:arrow-right-linear" className="text-lg" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
