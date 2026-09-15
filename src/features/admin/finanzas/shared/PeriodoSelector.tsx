import { Icon } from '@iconify/react';
import type { PeriodoVM } from './usePeriodo';

function SegmentedButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
        >
            {children}
        </button>
    );
}

const inputClass = 'h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm';
const arrowClass = 'w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30';

/**
 * Selector Día · Mes · Rango con su navegación (flechas para día/mes, dos
 * fechas para rango). Mismo look que el de Productos/Rentabilidad; se usa en
 * las demás pestañas de Análisis Financiero para que todas filtren igual.
 */
export function PeriodoSelector({ vm }: { vm: PeriodoVM }) {
    return (
        <>
            <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 gap-1">
                <SegmentedButton active={vm.periodo === 'dia'} onClick={() => vm.setPeriodo('dia')}>Día</SegmentedButton>
                <SegmentedButton active={vm.periodo === 'mes'} onClick={() => vm.setPeriodo('mes')}>Mes</SegmentedButton>
                <SegmentedButton active={vm.periodo === 'rango'} onClick={() => vm.setPeriodo('rango')}>Rango</SegmentedButton>
            </div>
            {vm.periodo === 'rango' && (
                <>
                    <input type="date" value={vm.fechaInicio} max={vm.hoy} onChange={(e) => vm.setFechaInicio(e.target.value)} className={inputClass} />
                    <input type="date" value={vm.fechaFin} max={vm.hoy} onChange={(e) => vm.setFechaFin(e.target.value)} className={inputClass} />
                </>
            )}
            {vm.periodo === 'dia' && (
                <>
                    <button type="button" onClick={() => vm.navegarDia(-1)} className={arrowClass} title="Día anterior">
                        <Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <input type="date" value={vm.dia} max={vm.hoy} onChange={(e) => vm.setDia(e.target.value)} className={inputClass} />
                    <button type="button" onClick={() => vm.navegarDia(1)} disabled={vm.esHoy} className={arrowClass} title="Día siguiente">
                        <Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" />
                    </button>
                </>
            )}
            {vm.periodo === 'mes' && (
                <>
                    <button type="button" onClick={() => vm.navegarMes(-1)} className={arrowClass} title="Mes anterior">
                        <Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <button type="button" onClick={() => vm.navegarMes(1)} disabled={vm.isCurrentOrFuture} className={arrowClass} title="Mes siguiente">
                        <Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" />
                    </button>
                </>
            )}
        </>
    );
}

/** Título del período ("Septiembre 2026", "07/09/2026", "01/09/2026 - 07/09/2026") con la etiqueta Hoy/En curso. */
export function PeriodoTitulo({ vm, className = '' }: { vm: PeriodoVM; className?: string }) {
    const enCurso = (vm.periodo === 'mes' && vm.isCurrentOrFuture) || (vm.periodo === 'dia' && vm.esHoy);
    return (
        <h2 className={`text-xl font-bold text-gray-900 dark:text-white ${className}`}>
            {vm.label}
            {enCurso && (
                <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {vm.periodo === 'dia' ? 'Hoy' : 'En curso'}
                </span>
            )}
        </h2>
    );
}
