import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import Button from '@/components/Button';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import { useDebounce } from '@/hooks/useDebounce';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import type { Sede } from '@/interfaces/Sede';

const ACCENT = 'var(--accent, #7551FF)';

type Row = {
    id: number;
    codigo: string;
    descripcion: string;
    imagenUrlDisplay?: string | null;
    disponibleEnSede?: boolean;
    stockBase?: number;
    stock?: number;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    sedes: Sede[];
    defaultSedeId: number | null;
    catalogoPorSede: boolean;
    /** Se llama tras asignar/quitar para refrescar el inventario. */
    onChanged: () => void;
};

const PAGE_SIZE = 50;

/**
 * Asignación masiva de productos a una sede: lista TODO el catálogo (incluidos
 * los no asignados) y permite marcar/quitar varios de golpe. Es lo que hace
 * viable manejar cientos de productos sin editarlos uno por uno.
 */
export default function ModalAsignarSedes({ isOpen, onClose, sedes, defaultSedeId, catalogoPorSede, onChanged }: Props) {
    const [sedeId, setSedeId] = useState<number | null>(defaultSedeId);
    const [search, setSearch] = useState('');
    const debounced = useDebounce(search, 400);
    const [filtro, setFiltro] = useState<'todos' | 'no-asignados' | 'asignados'>('todos');
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
    // Productos con stock que no se pudieron quitar: se ofrece quitarlos poniendo
    // su stock en 0 (salida en kardex), con confirmación explícita.
    const [pendientesConStock, setPendientesConStock] = useState<{ id: number; descripcion: string; stock: number }[]>([]);

    const sedeActual = useMemo(() => sedes.find(s => Number(s.id) === Number(sedeId)) ?? null, [sedes, sedeId]);
    const sedesOptions = useMemo(() => sedes.map(s => ({ id: s.id, value: s.nombre })), [sedes]);

    useEffect(() => {
        if (!isOpen) return;
        setSedeId(defaultSedeId ?? (sedes[0]?.id ?? null));
        setSearch('');
        setFiltro('todos');
        setPage(1);
        setSeleccion(new Set());
    }, [isOpen, defaultSedeId, sedes]);

    const fetchRows = useCallback(async () => {
        if (!isOpen || !sedeId) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({
                page: String(page),
                limit: String(PAGE_SIZE),
                sedeId: String(sedeId),
                incluirOcultos: 'true',
                sort: 'descripcion',
                order: 'asc',
            });
            if (debounced.trim()) qs.set('search', debounced.trim());
            const resp: any = await get(`productos?${qs.toString()}`);
            const lista: Row[] = Array.isArray(resp?.data?.productos) ? resp.data.productos : [];
            setRows(lista);
            setTotal(Number(resp?.data?.total ?? lista.length));
        } catch {
            setRows([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [isOpen, sedeId, page, debounced]);

    useEffect(() => { void fetchRows(); }, [fetchRows]);
    useEffect(() => { setPage(1); }, [debounced, sedeId]);

    const visibles = useMemo(() => rows.filter(r => {
        if (filtro === 'no-asignados') return r.disponibleEnSede === false;
        if (filtro === 'asignados') return r.disponibleEnSede !== false;
        return true;
    }), [rows, filtro]);

    const todosMarcados = visibles.length > 0 && visibles.every(r => seleccion.has(r.id));
    const toggleTodos = () => {
        const next = new Set(seleccion);
        if (todosMarcados) visibles.forEach(r => next.delete(r.id));
        else visibles.forEach(r => next.add(r.id));
        setSeleccion(next);
    };
    const toggleUno = (id: number) => {
        const next = new Set(seleccion);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSeleccion(next);
    };

    const aplicar = async (disponible: boolean, ids?: number[], ajustarStockACero = false) => {
        const productoIds = ids ?? Array.from(seleccion);
        if (!sedeId || productoIds.length === 0 || saving) return;
        setSaving(true);
        try {
            const resp: any = await patch('productos/sedes/asignar', {
                sedeId,
                productoIds,
                disponible,
                ...(ajustarStockACero ? { ajustarStockACero: true } : {}),
            });
            if (!resp?.success) {
                useAlertStore.getState().alert(resp?.error || 'No se pudo actualizar la asignación', 'error');
                return;
            }
            const omitidos: { id: number; descripcion: string; stock: number }[] = resp?.data?.omitidos ?? [];
            const n = Number(resp?.data?.actualizados ?? 0);
            const ajustados = Number(resp?.data?.ajustados ?? 0);
            const msg = disponible
                ? `${n} producto${n === 1 ? '' : 's'} asignado${n === 1 ? '' : 's'} a ${sedeActual?.nombre ?? 'la sede'}`
                : `${n} producto${n === 1 ? '' : 's'} quitado${n === 1 ? '' : 's'} de ${sedeActual?.nombre ?? 'la sede'}${ajustados > 0 ? ` (${ajustados} con stock puesto en 0, salida en kardex)` : ''}`;
            if (omitidos.length > 0) {
                // Se quitaron los que no tenían stock; los demás quedan pendientes de confirmación.
                if (n > 0) useAlertStore.getState().alert(msg, 'success');
                setPendientesConStock(omitidos);
            } else {
                useAlertStore.getState().alert(msg, 'success');
            }
            setSeleccion(new Set());
            await fetchRows();
            onChanged();
        } finally {
            setSaving(false);
        }
    };
    const confirmarQuitarConStock = async () => {
        const ids = pendientesConStock.map((p) => p.id);
        setPendientesConStock([]);
        await aplicar(false, ids, true);
    };
    const totalStockPendiente = pendientesConStock.reduce((s, p) => s + Number(p.stock || 0), 0);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <>
        <ModalConfirm
            isOpenModal={pendientesConStock.length > 0}
            setIsOpenModal={(v: boolean) => { if (!v) setPendientesConStock([]); }}
            confirmSubmit={() => void confirmarQuitarConStock()}
            confirmText="Quitar y poner stock en 0"
            confirmLoading={saving}
            title={`${pendientesConStock.length} producto${pendientesConStock.length === 1 ? '' : 's'} con stock en ${sedeActual?.nombre ?? 'la sede'}`}
            information={`No se quitaron porque tienen stock aquí (${totalStockPendiente} unidades en total): ${pendientesConStock.slice(0, 5).map(p => `${p.descripcion} (${p.stock})`).join(', ')}${pendientesConStock.length > 5 ? `, y ${pendientesConStock.length - 5} más` : ''}. Si ese stock está físicamente en otra sede, usa Traslado. Si se cargó por error en ${sedeActual?.nombre ?? 'esta sede'}, puedes quitarlos ahora: se registrará una SALIDA en el kardex por cada uno y dejarán de aparecer en esta sede.`}
        />
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Asignar productos a sede"
            icon="solar:shop-2-bold-duotone"
            width="900px"
            position="right"
            height="full"
        >
            <div className="px-4 pt-3 pb-4 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {catalogoPorSede
                        ? 'Tu catálogo es independiente por sede. Elige la sede, marca los productos y asígnalos (o quítalos). Un producto con stock en la sede no se puede quitar.'
                        : 'Tu catálogo es compartido (todo está en todas las sedes). Aquí puedes quitar productos de una sede para que no aparezcan en su inventario ni en su POS, o volver a asignarlos.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select
                        label="Sede"
                        name="sedeAsignar"
                        error=""
                        options={sedesOptions}
                        value={sedeActual?.nombre ?? ''}
                        onChange={(id: any) => setSedeId(Number(id))}
                    />
                    <div className="md:col-span-2">
                        <InputPro
                            autocomplete="off"
                            type="text"
                            isLabel
                            label="Buscar producto"
                            name="searchAsignar"
                            placeholder="Nombre, código o código de barras"
                            value={search}
                            onChange={(e: any) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {([
                        { id: 'todos', label: 'Todos' },
                        { id: 'no-asignados', label: 'Solo no asignados' },
                        { id: 'asignados', label: 'Solo asignados' },
                    ] as const).map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFiltro(f.id)}
                            style={filtro === f.id ? { background: ACCENT, borderColor: 'transparent' } : undefined}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${filtro === f.id
                                ? 'text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                        {seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'} · {total} producto{total === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--accent)]" aria-label="Seleccionar todos" />
                        <span className="flex-1">Producto</span>
                        <span className="w-24 text-right">Stock aquí</span>
                        <span className="w-28 text-right">Estado</span>
                    </div>
                    <div className="max-h-[52vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {loading && (
                            <div className="px-3 py-6 text-center text-xs text-slate-400"><Icon icon="svg-spinners:ring-resize" className="inline mr-1" /> Cargando…</div>
                        )}
                        {!loading && visibles.length === 0 && (
                            <div className="px-3 py-6 text-center text-xs text-slate-400">Sin productos para mostrar.</div>
                        )}
                        {!loading && visibles.map(r => {
                            const disponible = r.disponibleEnSede !== false;
                            const stock = Number(r.stockBase ?? r.stock ?? 0);
                            return (
                                <label key={r.id} className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                    <input type="checkbox" checked={seleccion.has(r.id)} onChange={() => toggleUno(r.id)} className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--accent)]" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{r.descripcion}</p>
                                        <p className="text-[10px] text-slate-400">{r.codigo}</p>
                                    </div>
                                    <span className="w-24 text-right font-semibold text-slate-700 dark:text-slate-200">{stock}</span>
                                    <span className="w-28 text-right">
                                        {disponible ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><Icon icon="mdi:check" width={11} /> Asignado</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300"><Icon icon="mdi:eye-off-outline" width={11} /> No asignado</span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 disabled:opacity-40"><Icon icon="mdi:chevron-left" /></button>
                        Página {page} de {totalPages}
                        <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 disabled:opacity-40"><Icon icon="mdi:chevron-right" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button outline color="danger" disabled={saving || seleccion.size === 0 || !sedeId} onClick={() => void aplicar(false)}>
                            <Icon icon="mdi:eye-off-outline" className="mr-1" /> Quitar de {sedeActual?.nombre ?? 'la sede'}
                        </Button>
                        <Button color="primary" disabled={saving || seleccion.size === 0 || !sedeId} onClick={() => void aplicar(true)}>
                            <Icon icon={saving ? 'svg-spinners:ring-resize' : 'mdi:check-all'} className="mr-1" /> Asignar a {sedeActual?.nombre ?? 'la sede'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
        </>
    );
}
