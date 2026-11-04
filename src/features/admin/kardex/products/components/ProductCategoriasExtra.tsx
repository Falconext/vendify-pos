import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { ICategoriaResumen } from '@/interfaces/products';

/** Igual que el backend (MAX_CATEGORIAS_EXTRA). */
export const MAX_CATEGORIAS_EXTRA = 10;

const normalizar = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type Props = {
    /** Todas las categorías de la empresa (la misma lista del select principal). */
    categories: ICategoriaResumen[];
    /** Categoría principal: no se ofrece como adicional. */
    categoriaPrincipalId?: number | string | null;
    value: number[];
    onChange: (ids: number[]) => void;
    /** Alta rápida desde el buscador. Devuelve la categoría creada o null. */
    onCreate?: (nombre: string) => Promise<ICategoriaResumen | null>;
};

/**
 * "Otras categorías": el producto también aparece en estas, además de la
 * principal. La principal sigue mandando en reportes; esto solo sirve para
 * encontrarlo (filtros del inventario, POS y tienda).
 */
export const ProductCategoriasExtra: React.FC<Props> = React.memo(({
    categories, categoriaPrincipalId, value, onChange, onCreate,
}) => {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [creando, setCreando] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    const principal = Number(categoriaPrincipalId) || null;

    // Si la principal pasa a ser una de las adicionales, deja de serlo: el
    // backend la descartaría igual, pero el usuario debe verlo aquí.
    useEffect(() => {
        if (principal && value.includes(principal)) onChange(value.filter((id) => id !== principal));
    }, [principal, value, onChange]);

    useEffect(() => {
        if (!abierto) return;
        const cerrar = (e: MouseEvent) => {
            if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener('mousedown', cerrar);
        return () => document.removeEventListener('mousedown', cerrar);
    }, [abierto]);

    const porId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
    const elegidas = useMemo(
        () => value.map((id) => porId.get(id)).filter((c): c is ICategoriaResumen => !!c),
        [value, porId],
    );
    const lleno = value.length >= MAX_CATEGORIAS_EXTRA;
    const termino = normalizar(busqueda);
    const opciones = useMemo(
        () => categories.filter((c) =>
            c.id !== principal && !value.includes(c.id) && (!termino || normalizar(c.nombre).includes(termino)),
        ),
        [categories, principal, value, termino],
    );
    const existeExacta = !!termino && categories.some((c) => normalizar(c.nombre) === termino);

    const agregar = (id: number) => {
        if (lleno || id === principal || value.includes(id)) return;
        onChange([...value, id]);
        setBusqueda('');
    };
    const quitar = (id: number) => onChange(value.filter((v) => v !== id));

    const crear = async () => {
        const nombre = busqueda.trim();
        if (!onCreate || !nombre || creando || lleno) return;
        setCreando(true);
        try {
            const nueva = await onCreate(nombre);
            if (nueva?.id) agregar(nueva.id);
        } finally {
            setCreando(false);
        }
    };

    return (
        <div ref={contenedor} className="relative w-full" data-testid="categorias-extra">
            <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Otras categorías <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                {value.length > 0 && (
                    <span className="text-[11px] text-gray-400">{value.length}/{MAX_CATEGORIAS_EXTRA}</span>
                )}
            </div>
            <div
                className="flex flex-wrap items-center gap-1.5 min-h-[40px] w-full px-2 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
                onClick={() => setAbierto(true)}
            >
                {elegidas.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {c.nombre}
                        <button
                            type="button"
                            aria-label={`Quitar ${c.nombre}`}
                            onClick={(e) => { e.stopPropagation(); quitar(c.id); }}
                            className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/50"
                        >
                            <Icon icon="mdi:close" className="text-xs" />
                        </button>
                    </span>
                ))}
                <input
                    value={busqueda}
                    disabled={lleno}
                    onFocus={() => setAbierto(true)}
                    onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (opciones[0]) agregar(opciones[0].id);
                            else if (!existeExacta) void crear();
                        } else if (e.key === 'Backspace' && !busqueda && value.length) {
                            quitar(value[value.length - 1]);
                        } else if (e.key === 'Escape') {
                            setAbierto(false);
                        }
                    }}
                    placeholder={lleno ? 'Máximo alcanzado' : elegidas.length ? 'Agregar otra…' : 'Ej. Ofertas, Regalos…'}
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none py-1"
                />
            </div>
            {abierto && !lleno && (opciones.length > 0 || (onCreate && termino && !existeExacta)) && (
                <ul role="listbox" className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
                    {opciones.slice(0, 50).map((c) => (
                        <li key={c.id}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => agregar(c.id)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                                {c.nombre}
                            </button>
                        </li>
                    ))}
                    {onCreate && termino && !existeExacta && (
                        <li>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => void crear()}
                                disabled={creando}
                                className="w-full text-left px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Icon icon={creando ? 'line-md:loading-twotone-loop' : 'solar:add-circle-linear'} className="text-sm" />
                                Crear “{busqueda.trim()}”
                            </button>
                        </li>
                    )}
                </ul>
            )}
            <p className="mt-1 text-[11px] text-gray-400">
                El producto también aparece al filtrar por estas categorías (inventario, POS y tienda).
            </p>
        </div>
    );
});
ProductCategoriasExtra.displayName = 'ProductCategoriasExtra';
