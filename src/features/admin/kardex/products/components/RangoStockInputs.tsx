import { useEffect, useState } from 'react';
import type { StockFiltro } from '../ProductsModel';

const inputCls =
    'h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400' +
    ' focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1';

/** "Stock bajo", "Sin stock", "Stock de 5 a 6", "Stock desde 10"… */
export const describirFiltroStock = (filtro: StockFiltro, desde: string, hasta: string) => {
    if (filtro === 'BAJO') return 'Stock bajo';
    if (filtro === 'SIN_STOCK') return 'Sin stock';
    if (desde && hasta) return `Stock de ${desde} a ${hasta}`;
    if (desde) return `Stock desde ${desde}`;
    if (hasta) return `Stock hasta ${hasta}`;
    return 'Rango de stock';
};

interface Props {
    desde: string;
    hasta: string;
    onAplicar: (desde: string, hasta: string) => void;
}

/**
 * Desde/hasta del filtro por rango. Se aplica al salir del campo o con Enter,
 * no en cada tecla: escribir "15" no debe consultar primero por "1".
 */
export default function RangoStockInputs({ desde, hasta, onAplicar }: Props) {
    const [d, setD] = useState(desde);
    const [h, setH] = useState(hasta);
    useEffect(() => { setD(desde); setH(hasta); }, [desde, hasta]);

    const aplicar = () => {
        if (d !== desde || h !== hasta) onAplicar(d.trim(), h.trim());
    };
    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') aplicar(); };

    return (
        <div className="flex gap-2 px-3 pb-2 pt-1" data-testid="rango-stock">
            <div className="flex-1">
                <label className={labelCls} htmlFor="stockDesde">Desde</label>
                <input id="stockDesde" type="number" min={0} inputMode="decimal" className={inputCls}
                    value={d} onChange={(e) => setD(e.target.value)} onBlur={aplicar} onKeyDown={onKey} placeholder="0" />
            </div>
            <div className="flex-1">
                <label className={labelCls} htmlFor="stockHasta">Hasta</label>
                <input id="stockHasta" type="number" min={0} inputMode="decimal" className={inputCls}
                    value={h} onChange={(e) => setH(e.target.value)} onBlur={aplicar} onKeyDown={onKey} placeholder="∞" />
            </div>
        </div>
    );
}
