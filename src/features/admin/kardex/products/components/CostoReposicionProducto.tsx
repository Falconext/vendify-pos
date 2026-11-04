/**
 * En la ficha de un producto comprado en dólares: lo que costó, lo que cuesta
 * reponerlo al dólar de hoy y el precio que deja el margen buscado (Compras →
 * Dólar y márgenes). Sin compras en US$ no muestra nada.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { dolarMargenesService, RUTA_DOLAR_MARGENES, type FilaReposicion } from '@/services/dolarMargenes.service';
import { ESTADOS, dolares, enMoneda, pct, soles, tc } from '@/features/admin/compras/dolar-margenes/dolarMargenesModel';

interface Props {
    productoId: number;
    /** Pone el precio sugerido (con IGV, en la moneda del producto) en el formulario. */
    onUsarPrecio: (precio: number) => void;
}

export default function CostoReposicionProducto({ productoId, onUsarPrecio }: Props) {
    const [info, setInfo] = useState<{ tcHoy: number; margenObjetivo: number; fila: FilaReposicion } | null>(null);

    useEffect(() => {
        let vivo = true;
        dolarMargenesService
            .deProducto(productoId)
            .then((r) => vivo && setInfo(r ? { tcHoy: r.tcHoy, margenObjetivo: r.config.margenObjetivoPct, fila: r.fila } : null))
            .catch(() => vivo && setInfo(null));
        return () => {
            vivo = false;
        };
    }, [productoId]);

    if (!info) return null;
    const { fila: f, tcHoy } = info;
    const estado = ESTADOS[f.estado];

    return (
        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2.5 text-[12px] dark:border-violet-900/40 dark:bg-violet-900/10" data-testid="costo-reposicion">
            <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-white">
                    <Icon icon="solar:dollar-minimalistic-bold-duotone" className="text-violet-500" /> Comprado en dólares
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${estado.chip}`}>{estado.label}</span>
            </div>
            <dl className="mt-1.5 space-y-1 text-gray-600 dark:text-gray-300">
                <div className="flex items-baseline justify-between gap-3">
                    <dt>Última compra</dt>
                    <dd className="text-right">
                        <span className="whitespace-nowrap tabular-nums">{soles(f.costoCompraSoles)}</span>
                        <span className="block whitespace-nowrap text-[11px] text-gray-500">{dolares(f.costoUsd)} × {tc(f.tcCompra)}</span>
                    </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                    <dt>Reponer hoy</dt>
                    <dd className="text-right">
                        <span className="whitespace-nowrap font-semibold tabular-nums text-gray-900 dark:text-white">{soles(f.costoReposicionSoles)}</span>
                        <span className="block whitespace-nowrap text-[11px] text-gray-500">{dolares(f.costoUsd)} × {tc(tcHoy)}</span>
                    </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                    <dt>Margen al dólar de hoy</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">{pct(f.margenReposicionPct)} <span className="text-gray-400">(buscas {pct(info.margenObjetivo)})</span></dd>
                </div>
            </dl>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-violet-100 pt-2 dark:border-violet-900/40">
                <span className="text-gray-700 dark:text-gray-200">
                    Precio sugerido <b className="tabular-nums">{enMoneda(f.precioSugerido, f.moneda)}</b>
                </span>
                <span className="flex gap-3">
                    <button type="button" className="font-semibold text-violet-700 hover:underline dark:text-violet-300" onClick={() => onUsarPrecio(f.precioSugerido)}>
                        Usar este precio
                    </button>
                    <Link to={RUTA_DOLAR_MARGENES} className="text-gray-500 hover:underline">Ver todos</Link>
                </span>
            </div>
        </div>
    );
}
