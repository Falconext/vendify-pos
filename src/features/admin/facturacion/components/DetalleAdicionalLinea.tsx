import { useState } from 'react';
import { Icon } from '@iconify/react';
import { DETALLE_ADICIONAL_MAX } from '@/utils/detalleAdicional';

/**
 * Detalle multilínea de una línea del carrito (debajo del título). Editable
 * después de agregar la línea. Se imprime en cotización / nota de venta; en
 * factura y boleta no (el XML de SUNAT solo lleva el título).
 */
// Alto del textarea según el texto (incluye el ajuste de línea de la columna angosta
// del carrito, ~32 caracteres), para que el detalle se lea completo sin scroll.
const filasVisibles = (texto: string) =>
    Math.min(8, Math.max(2, texto.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 32)), 0)));

export const DetalleAdicionalLinea = ({
    value,
    onChange,
    esFiscal = false,
}: {
    value?: string | null;
    onChange: (texto: string) => void;
    esFiscal?: boolean;
}) => {
    const [abierto, setAbierto] = useState(false);
    const texto = value ?? '';

    if (!texto && !abierto) {
        return (
            <button
                type="button"
                onClick={() => setAbierto(true)}
                className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
            >
                <Icon icon="solar:document-add-linear" width={13} />
                Agregar descripción / detalle
            </button>
        );
    }

    return (
        <div className="mt-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                Descripción / detalle (opcional)
                {esFiscal && <span className="normal-case font-semibold"> · no se imprime en boleta/factura</span>}
            </label>
            <textarea
                value={texto}
                autoFocus={abierto && !texto}
                onChange={(e) => onChange(e.target.value)}
                rows={filasVisibles(texto)}
                maxLength={DETALLE_ADICIONAL_MAX}
                placeholder="Una idea por línea"
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-300 resize-y"
            />
        </div>
    );
};
