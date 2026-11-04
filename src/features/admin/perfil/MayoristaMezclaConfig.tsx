import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import { useEmpresasStore } from '@/zustand/empresas';

interface CategoriaOpcion {
    id: number;
    nombre: string;
    _count?: { productos?: number };
}

/**
 * Precio por mayor mezclando productos (Perfil → Configuración).
 *
 * Encendido, el POS suma las unidades de los productos elegidos —todos o los
 * de ciertas categorías— y cada uno toma su escala de precio por mayor según
 * ese total. La regla vive en facturacion/mayoristaMezcla.ts.
 */
export default function MayoristaMezclaConfig() {
    const empresa: any = useAuthStore((s) => s.auth?.empresa);
    const activo = Boolean(empresa?.mayoristaMezclaActivo);
    const guardadas: number[] = useMemo(
        () => (Array.isArray(empresa?.mayoristaMezclaCategoriaIds) ? empresa.mayoristaMezclaCategoriaIds.map(Number) : []),
        [empresa?.mayoristaMezclaCategoriaIds],
    );

    const [categorias, setCategorias] = useState<CategoriaOpcion[] | null>(null);
    const [alcance, setAlcance] = useState<'TODOS' | 'CATEGORIAS'>(guardadas.length ? 'CATEGORIAS' : 'TODOS');
    const [elegidas, setElegidas] = useState<number[]>(guardadas);
    const [busqueda, setBusqueda] = useState('');
    const [guardando, setGuardando] = useState<string | null>(null);

    useEffect(() => {
        setElegidas(guardadas);
        setAlcance(guardadas.length ? 'CATEGORIAS' : 'TODOS');
    }, [guardadas]);

    useEffect(() => {
        (async () => {
            const r = await get<CategoriaOpcion[]>('categoria/listar');
            const lista = Array.isArray(r.data) ? r.data : [];
            setCategorias([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        })();
    }, []);

    const guardar = async (cambios: { mayoristaMezclaActivo?: boolean; mayoristaMezclaCategoriaIds?: number[] }, clave: string) => {
        setGuardando(clave);
        try {
            await useEmpresasStore.getState().actualizarMiEmpresa(cambios as any);
            useAlertStore.getState().alert('Configuración actualizada', 'success');
            return true;
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo guardar', 'error');
            return false;
        } finally {
            setGuardando(null);
        }
    };

    const filtradas = (categorias ?? []).filter((c) =>
        c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
    );
    const cambioPendiente =
        alcance === 'TODOS'
            ? guardadas.length > 0
            : elegidas.length !== guardadas.length || elegidas.some((id) => !guardadas.includes(id));
    const alternar = (id: number) =>
        setElegidas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    return (
        <div className="space-y-3" data-testid="mayorista-mezcla-config">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-900/10 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <input
                    type="checkbox"
                    checked={activo}
                    disabled={guardando === 'activo'}
                    onChange={(e) => guardar({ mayoristaMezclaActivo: e.target.checked }, 'activo')}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-emerald-500"
                />
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Sumar productos distintos para el precio por mayor</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Si tu precio por mayor es "desde 6 unidades", el cliente puede juntar 6 productos <span className="font-semibold">iguales o distintos</span>:
                        el POS suma las unidades y cada producto pasa a su precio por mayor. Ej.: 2 perfumes A + 2 B + 2 C = 6 → los tres a precio por mayor.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Cada producto usa sus propias escalas (las de "Precios por mayor" en su ficha); el que no tiene escalas suma unidades pero mantiene su precio.
                        Apagado, cada producto cuenta solo sus propias unidades.
                    </p>
                    {guardando === 'activo' && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Guardando configuración...</p>}
                </div>
            </label>

            {activo && (
                <div className="rounded-lg border border-gray-100 dark:border-slate-700 p-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">¿Qué productos se suman entre sí?</p>
                    <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Alcance de la mezcla">
                        {([['TODOS', 'Todos los productos'], ['CATEGORIAS', 'Solo algunas categorías']] as const).map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                role="radio"
                                aria-checked={alcance === id}
                                onClick={() => setAlcance(id)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${alcance === id
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {alcance === 'TODOS' ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Cualquier producto de la venta suma. Si también vendes cosas que no deberían contar (ej. estuches o bolsas), elige "Solo algunas categorías".
                        </p>
                    ) : (
                        <div className="mt-3">
                            <div className="relative">
                                <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar categoría"
                                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100"
                                />
                            </div>
                            {categorias === null ? (
                                <p className="text-xs text-gray-400 mt-2">Cargando categorías…</p>
                            ) : categorias.length === 0 ? (
                                <p className="text-xs text-gray-500 mt-2">Aún no tienes categorías. Créalas en Kardex → Categorías.</p>
                            ) : (
                                <div className="mt-2 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                                    {filtradas.map((c) => (
                                        <label key={c.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-gray-100 dark:border-slate-700 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={elegidas.includes(c.id)}
                                                onChange={() => alternar(c.id)}
                                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                            />
                                            <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-200">{c.nombre}</span>
                                            {c._count?.productos != null && (
                                                <span className="text-[11px] text-gray-400">{c._count.productos}</span>
                                            )}
                                        </label>
                                    ))}
                                    {!filtradas.length && <p className="text-xs text-gray-400 col-span-full">Ninguna categoría coincide.</p>}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Cuentan los productos que tengan una de estas categorías, como principal o adicional.
                            </p>
                        </div>
                    )}

                    {cambioPendiente && (
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                disabled={guardando === 'alcance' || (alcance === 'CATEGORIAS' && elegidas.length === 0)}
                                onClick={() => guardar({ mayoristaMezclaCategoriaIds: alcance === 'TODOS' ? [] : elegidas }, 'alcance')}
                                className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {guardando === 'alcance' ? 'Guardando…' : 'Guardar'}
                            </button>
                            {alcance === 'CATEGORIAS' && elegidas.length === 0 && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">Elige al menos una categoría.</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
