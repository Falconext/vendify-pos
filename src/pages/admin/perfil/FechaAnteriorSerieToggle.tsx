interface Props {
    checked: boolean;
    disabled: boolean;
    saving: boolean;
    onChange: (checked: boolean) => void;
}

/**
 * Opción por empresa (2026-11-02): deja emitir boleta/factura con fecha anterior
 * a la del último comprobante de su serie. Apagada por defecto; el backend la
 * respeta en validarOrdenCronologico.
 */
export function FechaAnteriorSerieToggle({ checked, disabled, saving, onChange }: Props) {
    return (
        <label className="mt-3 flex items-start gap-3 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-900/10 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                aria-label="Permitir fechas anteriores dentro de una serie"
                className="mt-1 w-4 h-4 text-amber-600 dark:text-amber-500 rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-amber-500"
            />
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Permitir fechas anteriores dentro de una serie</p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">
                    Deja emitir una boleta o factura con fecha anterior a la del último comprobante de su serie (por ejemplo, ventas de fin de mes emitidas al día siguiente). SUNAT las acepta, pero la serie queda fuera de orden y eso puede observarse en una fiscalización o al cuadrar el registro de ventas. Actívalo bajo tu responsabilidad.
                </p>
                {saving && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Guardando configuración...</p>}
            </div>
        </label>
    );
}
