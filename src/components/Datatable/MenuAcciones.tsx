import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';

const PELIGROSA = /(elim|borra|anula|cancel|delet|rechaz)/;

/**
 * Las acciones de una fila detrás de un solo botón "⋯" (como el menú "More" de
 * Hearth). El menú va a <body> por portal: la tabla vive dentro de un
 * contenedor con scroll horizontal que lo recortaría.
 */
export default function MenuAcciones({ actions, row }: { actions: any[]; row: any }) {
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const visibles = actions.filter((a) => !(a.condition && !a.condition(row)) && !(a.hide && a.hide(row)));

    useEffect(() => {
        if (!pos) return;
        const cerrar = (e: Event) => {
            const t = e.target as Node;
            if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
            setPos(null);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPos(null); };
        const onScroll = () => setPos(null);
        document.addEventListener('mousedown', cerrar);
        window.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        return () => {
            document.removeEventListener('mousedown', cerrar);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [pos]);

    if (!visibles.length) return null;

    const abrir = () => {
        if (pos) { setPos(null); return; }
        const r = btnRef.current?.getBoundingClientRect();
        if (!r) return;
        setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={abrir}
                aria-haspopup="menu"
                aria-expanded={!!pos}
                aria-label="Acciones"
                className="inline-grid h-8 w-8 place-items-center rounded-[10px] text-[#6b645c] transition-colors hover:bg-[rgba(40,30,20,0.055)] hover:text-[#1d1915] aria-expanded:bg-[rgba(40,30,20,0.055)] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
            >
                <Icon icon="lucide:ellipsis" width={18} />
            </button>
            {createPortal(
                <AnimatePresence>
                    {pos && (
                        <motion.div
                            ref={menuRef}
                            role="menu"
                            className="fixed z-[999990] min-w-[220px] rounded-2xl border border-[rgba(40,30,20,0.09)] bg-[#fffdfa] p-1.5 shadow-[0_24px_60px_-18px_rgba(40,30,20,0.32),0_2px_6px_rgba(40,30,20,0.08)] dark:border-white/10 dark:bg-slate-800"
                            style={{ top: pos.top, right: pos.right }}
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {visibles.map((a, i) => {
                                const label = typeof a.tooltip === 'function' ? a.tooltip(row) : a.tooltip;
                                const icono = typeof a.icon === 'function' ? a.icon(row) : a.icon;
                                const peligrosa = PELIGROSA.test(String(label || '').toLowerCase());
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => { setPos(null); a.onClick(row); }}
                                        className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors [&_svg]:h-[18px] [&_svg]:w-[18px] ${peligrosa
                                            ? 'text-[#b53f19] hover:bg-[#fbe6dd] dark:text-orange-300 dark:hover:bg-orange-500/15'
                                            : 'text-[#1d1915] hover:bg-[rgba(40,30,20,0.055)] dark:text-slate-100 dark:hover:bg-white/5'}`}
                                    >
                                        <span className="grid w-5 shrink-0 place-items-center">{icono}</span>
                                        {label}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </>
    );
}
