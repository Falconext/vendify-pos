import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import {
    curvaDeModelo,
    lineasDeCurva,
    totalDeCurva,
    type LineaOrden,
} from './curvaDeTallas';

interface Props {
    /** El modelo elegido del catálogo, con sus variantes. */
    producto: any | null;
    onCancelar: () => void;
    onAgregar: (lineas: LineaOrden[]) => void;
}

/**
 * La curva de tallas para pedirle al proveedor.
 *
 * Al calzado se le compra por curva —"2 de la 35, 3 de la 36"— y agregarlas de
 * a una obligaba a buscar el modelo una vez por talla. Acá se elige el modelo
 * una sola vez y se tipean las cantidades.
 *
 * Lo que sale son las mismas líneas de siempre, una por talla: la grilla es
 * solo la forma de cargar.
 *
 * Se monta sobre el `Modal` del proyecto y no sobre un portal propio: este
 * modal se abre ENCIMA del de la orden de compra, y hacerse uno a mano
 * significaba pelear con el apilamiento (el del proyecto va en z-[999999]) y
 * perder la tecla Escape y la animación.
 */
export const ModalCurvaTallas = ({ producto, onCancelar, onAgregar }: Props) => {
    const [cantidades, setCantidades] = useState<Record<number, string>>({});
    const [costos, setCostos] = useState<Record<number, string>>({});
    const [verCostos, setVerCostos] = useState(false);

    const curva = useMemo(() => (producto ? curvaDeModelo(producto) : []), [producto]);
    const total = totalDeCurva(cantidades);
    const lineas = producto ? lineasDeCurva(producto, cantidades, costos) : [];
    const importe = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);

    const cerrar = () => {
        setCantidades({});
        setCostos({});
        setVerCostos(false);
        onCancelar();
    };

    if (!producto) return null;

    const inputCls =
        'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

    return (
        <Modal
            isOpenModal
            closeModal={cerrar}
            title={`${producto?.descripcion ?? ''} · cuánto pedir de cada talla`}
            icon="solar:ruler-cross-pen-bold-duotone"
            width="620px"
            height="auto"
        >
            <div className="p-4">
                <table className="w-full text-left text-xs">
                    <thead className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        <tr className="border-b border-gray-100 dark:border-slate-800">
                            <th className="pb-2 pr-3 font-bold">Talla</th>
                            <th className="pb-2 pr-3 font-bold">Código</th>
                            <th className="pb-2 pr-3 text-right font-bold whitespace-nowrap">Stock hoy</th>
                            <th className="pb-2 pr-3 text-center font-bold">A pedir</th>
                            {verCostos && <th className="pb-2 text-center font-bold">Costo</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {curva.map((celda) => (
                            <tr key={celda.productoId} className="border-b border-gray-50 last:border-0 dark:border-slate-800/60">
                                <td className="py-2 pr-3 text-sm font-black text-gray-900 dark:text-white">{celda.talla}</td>
                                <td className="py-2 pr-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">{celda.codigo || '—'}</td>
                                <td className="py-2 pr-3 text-right">
                                    {/* Lo que queda hoy: es el dato con el que se decide cuánto reponer. */}
                                    <span className={`text-xs font-bold ${celda.stockActual > 0 ? 'text-gray-600 dark:text-gray-300' : 'text-rose-500'}`}>
                                        {celda.stockActual}
                                    </span>
                                </td>
                                <td className="w-24 py-2 pr-3">
                                    <input
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        value={cantidades[celda.productoId] ?? ''}
                                        onChange={(e) => setCantidades((p) => ({ ...p, [celda.productoId]: e.target.value }))}
                                        placeholder="0"
                                        className={inputCls}
                                        data-testid={`cant-${celda.productoId}`}
                                    />
                                </td>
                                {verCostos && (
                                    <td className="w-28 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={costos[celda.productoId] ?? ''}
                                            onChange={(e) => setCostos((p) => ({ ...p, [celda.productoId]: e.target.value }))}
                                            placeholder={celda.costo.toFixed(2)}
                                            className={inputCls}
                                            data-testid={`costo-${celda.productoId}`}
                                        />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button
                    type="button"
                    onClick={() => setVerCostos((v) => !v)}
                    className="mt-3 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                    {verCostos ? 'Ocultar costos' : 'Ajustar el costo por talla'}
                </button>

                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {total > 0
                            ? <>Se agregan <strong className="text-gray-900 dark:text-white">{lineas.length}</strong> {lineas.length === 1 ? 'talla ' : 'tallas '}
                                · <strong className="text-gray-900 dark:text-white">{total}</strong> unidades · S/ {importe.toFixed(2)}</>
                            : 'Escribe cuánto pedir en al menos una talla'}
                    </p>
                    <div className="flex gap-2">
                        <button type="button" onClick={cerrar} className="rounded-xl px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={lineas.length === 0}
                            onClick={() => { onAgregar(lineas); setCantidades({}); setCostos({}); setVerCostos(false); }}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Agregar al pedido
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ModalCurvaTallas;
