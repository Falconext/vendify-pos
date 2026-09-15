import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import type { ICategory } from '@/interfaces/categories';

interface Props {
    productoId: number;
    categoriaId: number | null;
    nombre: string;
    color: { bg: string; text: string };
    categories: ICategory[];
    onChange: (productoId: number, categoriaId: number | null) => Promise<boolean>;
}

const SIN_CATEGORIA = 'Sin categoría';

/**
 * Badge de categoría editable en la propia tabla de inventario: clic → lista
 * de categorías con buscador → se guarda al elegir (PATCH puntual). El menú
 * va por portal con posición fija porque la tabla vive dentro de un contenedor
 * con overflow (AutoScrollTable) que lo recortaría.
 */
export default function CategoriaInlineSelect({ productoId, categoriaId, nombre, color, categories, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState('');
    const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const MENU_W = 240;
    const MENU_H = 300;

    const place = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (!r) return;
        const spaceBelow = window.innerHeight - r.bottom;
        const up = spaceBelow < MENU_H && r.top > MENU_H;
        const left = Math.min(Math.max(8, r.left), window.innerWidth - MENU_W - 8);
        setPos({ top: up ? r.top - 6 : r.bottom + 6, left, up });
    };

    useLayoutEffect(() => {
        if (!open) return;
        place();
        // Sigue al badge si la tabla o la página se desplazan mientras está abierto.
        const onMove = () => place();
        window.addEventListener('scroll', onMove, true);
        window.addEventListener('resize', onMove);
        return () => {
            window.removeEventListener('scroll', onMove, true);
            window.removeEventListener('resize', onMove);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        const t = window.setTimeout(() => inputRef.current?.focus(), 0);
        const onDown = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(t);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const opciones = useMemo(() => {
        const q = query.trim().toLowerCase();
        const lista = (categories ?? []).filter(c => c.id != null);
        const filtradas = q ? lista.filter(c => c.nombre.toLowerCase().includes(q)) : lista;
        return [...filtradas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }, [categories, query]);

    const elegir = async (id: number | null) => {
        if (saving) return;
        if ((id ?? null) === (categoriaId ?? null)) { setOpen(false); return; }
        setSaving(true);
        const ok = await onChange(productoId, id);
        setSaving(false);
        if (ok) setOpen(false);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                disabled={saving}
                title="Clic para cambiar la categoría"
                style={{ backgroundColor: color.bg, color: color.text }}
                className={`group inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap uppercase transition-all hover:ring-2 hover:ring-offset-1 hover:ring-violet-300 dark:hover:ring-offset-slate-900 ${open ? 'ring-2 ring-offset-1 ring-violet-400 dark:ring-offset-slate-900' : ''} ${saving ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            >
                {nombre}
                <Icon
                    icon={saving ? 'svg-spinners:180-ring' : 'solar:alt-arrow-down-linear'}
                    width={12}
                    className={`opacity-60 group-hover:opacity-100 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: pos.up ? undefined : pos.top,
                        bottom: pos.up ? window.innerHeight - pos.top : undefined,
                        left: pos.left,
                        width: MENU_W,
                        zIndex: 1000,
                    }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden animate-[fadeIn_0.12s_ease-out]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width={14} />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && opciones.length > 0) { e.preventDefault(); elegir(opciones[0].id!); }
                                }}
                                placeholder="Buscar categoría…"
                                className="w-full h-8 pl-8 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-violet-300 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 outline-none"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        <button
                            type="button"
                            onClick={() => elegir(null)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${categoriaId == null ? 'text-violet-600 dark:text-violet-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <Icon icon="solar:close-circle-linear" width={14} />
                            <span className="flex-1">{SIN_CATEGORIA}</span>
                            {categoriaId == null && <Icon icon="solar:check-circle-bold" width={14} />}
                        </button>
                        {opciones.map(c => {
                            const activa = c.id === categoriaId;
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => elegir(c.id!)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/20 ${activa ? 'text-violet-600 dark:text-violet-300 font-bold bg-violet-50/60 dark:bg-violet-900/10' : 'text-slate-700 dark:text-slate-200'}`}
                                >
                                    <Icon icon="solar:tag-linear" width={14} className="shrink-0 opacity-70" />
                                    <span className="flex-1 truncate uppercase">{c.nombre}</span>
                                    {c._count?.productos != null && (
                                        <span className="text-[10px] text-slate-400 tabular-nums">{c._count.productos}</span>
                                    )}
                                    {activa && <Icon icon="solar:check-circle-bold" width={14} className="shrink-0" />}
                                </button>
                            );
                        })}
                        {opciones.length === 0 && (
                            <p className="px-3 py-3 text-center text-xs text-slate-400">
                                {categories?.length ? 'Sin coincidencias' : 'Aún no tienes categorías'}
                            </p>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
