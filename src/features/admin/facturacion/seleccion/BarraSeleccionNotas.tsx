import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { documentoCorto, type NotaElegida } from './seleccionNotas';

export interface AccionSeleccion {
    key: string;
    label: string;
    descripcion: string;
    icon: string;
    onClick: () => void;
    /** Motivo por el que no aplica a esta selección (se muestra y no se puede pulsar). */
    deshabilitada?: string | null;
    cargando?: boolean;
    grupo?: string;
}

interface Props {
    notas: NotaElegida[];
    principal: AccionSeleccion;
    acciones: AccionSeleccion[];
    onQuitar: () => void;
}

/**
 * Barra que aparece al elegir notas en la lista. Una acción principal a la
 * vista y el resto en "Más acciones", agrupadas: así cada acción nueva entra
 * en el menú sin rediseñar la barra.
 */
export default function BarraSeleccionNotas({ notas, principal, acciones, onQuitar }: Props) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const caja = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuAbierto) return;
        const cerrar = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setMenuAbierto(false); };
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAbierto(false); };
        document.addEventListener('mousedown', cerrar);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('mousedown', cerrar); document.removeEventListener('keydown', escape); };
    }, [menuAbierto]);

    const docs = notas.map((n) => documentoCorto(n.documento));
    const resumenDocs = docs.length > 4 ? `${docs.slice(0, 4).join(' · ')} y ${docs.length - 4} más` : docs.join(' · ');
    const grupos = [...new Set(acciones.map((a) => a.grupo ?? ''))];

    const boton = (a: AccionSeleccion) => (
        <button
            key={a.key}
            type="button"
            role="menuitem"
            disabled={Boolean(a.deshabilitada) || a.cargando}
            onClick={() => { setMenuAbierto(false); a.onClick(); }}
            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-slate-700/60"
        >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                <Icon icon={a.cargando ? 'svg-spinners:180-ring' : a.icon} className="text-lg" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{a.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{a.deshabilitada || a.descripcion}</span>
            </span>
        </button>
    );

    return (
        <AnimatePresence>
            {notas.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-[70] mx-auto max-w-3xl md:bottom-28"
                    data-testid="barra-orden-compra"
                >
                    <div ref={caja} className="relative">
                        <AnimatePresence>
                            {menuAbierto && (
                                <motion.div
                                    role="menu"
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ duration: 0.14 }}
                                    className="absolute bottom-full right-0 mb-2 max-h-[60vh] w-full overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl sm:w-80 dark:border-slate-700 dark:bg-slate-800"
                                    data-testid="menu-acciones-notas"
                                >
                                    {grupos.map((g, i) => (
                                        <div key={g || i} className={i > 0 ? 'mt-1 border-t border-gray-100 pt-1 dark:border-slate-700' : ''}>
                                            {g && <p className="px-3 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-wide text-gray-400">{g}</p>}
                                            {acciones.filter((a) => (a.grupo ?? '') === g).map(boton)}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col gap-3 rounded-2xl bg-gray-900/95 p-3 text-white shadow-2xl shadow-gray-900/30 ring-1 ring-white/10 backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:pl-3 sm:pr-2.5 dark:bg-slate-800/95">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-base font-black tabular-nums">
                                    {notas.length}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold leading-tight">{notas.length === 1 ? 'nota elegida' : 'notas elegidas'}</p>
                                    <p className="mt-0.5 truncate text-xs text-gray-400">{resumenDocs}</p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onQuitar}
                                    title="Quitar la selección"
                                    className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
                                >
                                    <Icon icon="solar:close-circle-linear" className="text-lg" />
                                    <span className="sm:hidden lg:inline">Quitar</span>
                                </button>
                                <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={menuAbierto}
                                    onClick={() => setMenuAbierto((v) => !v)}
                                    className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/10 ${menuAbierto ? 'bg-white/10' : ''}`}
                                >
                                    Más acciones
                                    <Icon icon="solar:alt-arrow-up-linear" className={`text-base transition-transform ${menuAbierto ? '' : 'rotate-180'}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={principal.onClick}
                                    disabled={Boolean(principal.deshabilitada)}
                                    title={principal.deshabilitada || principal.descripcion}
                                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-sm font-bold shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 sm:flex-none"
                                >
                                    <Icon icon={principal.icon} className="text-lg" />
                                    {principal.label}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
