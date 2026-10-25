import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import ModalConfirm from '@/components/ModalConfirm';
import {
    useListasPrecioStore,
    type IFilaReprecio,
    type ILoteReprecio,
    type ModoReprecio,
    type OperacionReprecio,
} from '@/zustand/listasPrecio';
import { useCategoriesStore } from '@/zustand/categories';

/**
 * Reprecio masivo de una lista.
 *
 * El caso: al proveedor le suben los precios y hay que mover 200 productos.
 * Antes se entraba producto por producto; acá se hace de una pasada.
 *
 * La pantalla está construida alrededor de una idea: NADA se guarda hasta que
 * el empresario ve el antes y el después de cada fila. Por eso previsualizar y
 * aplicar son dos pasos, y por eso cada reprecio se puede deshacer.
 */

const OPERACIONES: { v: OperacionReprecio; label: string; detalle: string }[] = [
    { v: 'AUMENTAR', label: 'Aumentar', detalle: 'Sube el precio actual' },
    { v: 'DISMINUIR', label: 'Disminuir', detalle: 'Baja el precio actual' },
    { v: 'REEMPLAZAR', label: 'Reemplazar', detalle: 'Fija un precio o una utilidad' },
];

const soles = (n: number | null | undefined) =>
    n == null ? '—' : `S/ ${Number(n).toFixed(2)}`;

const pct = (n: number | null | undefined) =>
    n == null ? '—' : `${Number(n).toFixed(1)}%`;

const ReprecioMasivo = () => {
    const {
        listas, listar,
        previsualizarReprecio, aplicarReprecio, lotesReprecio, revertirReprecio,
    } = useListasPrecioStore();
    const { categories, getAllCategories } = useCategoriesStore();

    const [listaPrecioId, setListaPrecioId] = useState<number | null>(null);
    const [categoriaId, setCategoriaId] = useState<number>(0);
    const [search, setSearch] = useState('');
    const [operacion, setOperacion] = useState<OperacionReprecio>('AUMENTAR');
    const [modo, setModo] = useState<ModoReprecio>('PORCENTAJE');
    const [valor, setValor] = useState('');

    const [filas, setFilas] = useState<IFilaReprecio[] | null>(null);
    const [cargando, setCargando] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const [lotes, setLotes] = useState<ILoteReprecio[]>([]);
    const [aDeshacer, setADeshacer] = useState<ILoteReprecio | null>(null);

    useEffect(() => {
        listar();
        getAllCategories({});
        lotesReprecio().then(setLotes);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (listaPrecioId == null && listas.length > 0) setListaPrecioId(listas[0].id);
    }, [listas, listaPrecioId]);

    // Cualquier cambio en los parámetros invalida la vista previa: mostrar
    // números viejos junto a parámetros nuevos es cómo alguien aplica algo que
    // no es lo que está leyendo.
    useEffect(() => { setFilas(null); }, [listaPrecioId, categoriaId, search, operacion, modo, valor]);

    const filtro = useMemo(() => ({
        categoriaId: categoriaId || undefined,
        search: search.trim() || undefined,
    }), [categoriaId, search]);

    const valorNum = Number(valor);
    const valorValido = valor.trim() !== '' && Number.isFinite(valorNum) && valorNum > 0;
    const puedeCalcular = listaPrecioId != null && valorValido;

    const resumen = useMemo(() => {
        if (!filas) return null;
        const aplican = filas.filter(f => f.seAplica);
        // Los packs repiten el costo de su unidad: se cuentan una sola vez.
        const sinCosto = filas.filter(f => f.sinCosto && !f.presentacionCodigo).length;
        const enPerdida = aplican.filter(f => f.utilidadNueva != null && f.utilidadNueva < 0).length;
        const packs = aplican.filter(f => !!f.presentacionCodigo).length;
        return { total: filas.length, aplican: aplican.length, sinCosto, enPerdida, packs };
    }, [filas]);

    const handlePrevisualizar = async () => {
        if (!puedeCalcular) return;
        setCargando(true);
        const r = await previsualizarReprecio(filtro, {
            listaPrecioId, operacion, modo, valor: valorNum,
        });
        setFilas(r);
        setCargando(false);
    };

    const handleAplicar = async () => {
        setConfirmar(false);
        setCargando(true);
        const r = await aplicarReprecio(filtro, { listaPrecioId, operacion, modo, valor: valorNum });
        setCargando(false);
        if (r) {
            setFilas(null);
            setValor('');
            lotesReprecio().then(setLotes);
        }
    };

    const handleDeshacer = async () => {
        if (!aDeshacer) return;
        const ok = await revertirReprecio(aDeshacer.id);
        setADeshacer(null);
        if (ok) { setFilas(null); lotesReprecio().then(setLotes); }
    };

    const etiquetaValor = modo === 'MONTO'
        ? (operacion === 'REEMPLAZAR' ? 'Nuevo precio (S/)' : 'Monto (S/)')
        : (operacion === 'REEMPLAZAR' ? 'Utilidad objetivo (%)' : 'Porcentaje (%)');

    return (
        <div className="min-h-screen px-4 pb-10 bg-gray-50 dark:bg-[#0A0D14]">
            <div className="pt-4 mb-5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Icon icon="solar:calculator-minimalistic-bold-duotone" className="text-violet-600 dark:text-violet-400" />
                    Reprecio masivo
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
                    Cambia el precio de muchos productos de una sola vez en una lista.
                    Primero ves el antes y el después de cada uno; nada se guarda hasta que lo confirmes,
                    y cualquier reprecio se puede deshacer.
                </p>
            </div>

            {/* Parámetros */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Lista a repreciar</label>
                        <select value={listaPrecioId ?? ''} onChange={(e) => setListaPrecioId(Number(e.target.value))}
                            className="w-full border-0 rounded-xl bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-gray-800 dark:text-white outline-none">
                            {listas.map(l => (
                                <option key={l.id} value={l.id}>{l.nombre}{l.esPorDefecto ? ' (general)' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
                        <select value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}
                            className="w-full border-0 rounded-xl bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-800 dark:text-white outline-none">
                            <option value={0}>Todas</option>
                            {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Buscar por nombre</label>
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Opcional"
                            className="w-full border-0 rounded-xl bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-800 dark:text-white outline-none" />
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Qué hacer</span>
                        <div className="flex gap-1.5">
                            {OPERACIONES.map(o => (
                                <button key={o.v} type="button" onClick={() => setOperacion(o.v)} title={o.detalle}
                                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${operacion === o.v
                                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                                        : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Cómo</span>
                        <div className="flex gap-1.5">
                            {(['PORCENTAJE', 'MONTO'] as ModoReprecio[]).map(m => (
                                <button key={m} type="button" onClick={() => setModo(m)}
                                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${modo === m
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                        : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}>
                                    {m === 'PORCENTAJE' ? '%' : 'S/'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="min-w-[180px]">
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{etiquetaValor}</label>
                        <input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)}
                            className="w-full border-0 rounded-xl bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-gray-800 dark:text-white outline-none" />
                    </div>
                    <button type="button" onClick={handlePrevisualizar} disabled={!puedeCalcular || cargando}
                        className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        {cargando ? 'Calculando…' : 'Previsualizar'}
                    </button>
                </div>

                {operacion === 'REEMPLAZAR' && modo === 'PORCENTAJE' && (
                    <p className="mt-3 text-xs text-violet-600 dark:text-violet-400">
                        Fija la <b>utilidad sobre el costo</b>: con un costo de S/ 10 y 40%, el precio queda en S/ 14.
                        Los productos sin costo cargado se quedan como están.
                    </p>
                )}
                {operacion === 'REEMPLAZAR' && modo === 'MONTO' && (
                    <p className="mt-3 text-xs text-violet-600 dark:text-violet-400">
                        El precio fijo es para la unidad: los packs con precio propio en la lista (six pack, caja) no cambian.
                    </p>
                )}
                {operacion !== 'REEMPLAZAR' && modo === 'MONTO' && (
                    <p className="mt-3 text-xs text-violet-600 dark:text-violet-400">
                        El monto es por unidad: un pack de 6 con precio propio en la lista se mueve 6 veces ese monto.
                    </p>
                )}
            </div>

            {/* Vista previa */}
            {filas && (
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-slate-800">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {resumen?.aplican === 0
                                ? <span className="font-semibold text-amber-600">Ningún precio cambia con esos valores.</span>
                                : <>Van a cambiar <b className="text-gray-900 dark:text-white">{resumen?.aplican}</b> de {resumen?.total} precios.</>}
                            {!!resumen?.packs && (
                                <span className="ml-2 text-xs text-violet-600">· incluye {resumen.packs} pack(s)</span>
                            )}
                            {!!resumen?.sinCosto && (
                                <span className="ml-2 text-xs text-gray-400">· {resumen.sinCosto} sin costo cargado</span>
                            )}
                            {!!resumen?.enPerdida && (
                                <span className="ml-2 text-xs font-bold text-rose-600">· {resumen.enPerdida} quedarían bajo el costo</span>
                            )}
                        </div>
                        <button type="button" onClick={() => setConfirmar(true)} disabled={!resumen?.aplican || cargando}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-all">
                            Aplicar a {resumen?.aplican} precio(s)
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-[480px]">
                        <table className="w-full min-w-[860px]">
                            <thead className="sticky top-0 bg-white dark:bg-[#111827]">
                                <tr className="border-b border-gray-100 dark:border-slate-800">
                                    {['Código', 'Producto', 'Costo c/IGV', 'Precio actual', 'Precio nuevo', 'Utilidad'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map(f => (
                                    <tr key={`${f.productoId}|${f.presentacionCodigo || ''}`} className={`border-b border-gray-50 dark:border-slate-800/60 ${f.seAplica ? '' : 'opacity-45'}`}>
                                        <td className="px-3 py-2 text-xs text-gray-500 tabular-nums">{f.presentacionCodigo ? '' : f.codigo}</td>
                                        <td className="px-3 py-2 text-sm text-gray-800 dark:text-white max-w-[260px] truncate">
                                            {f.presentacionCodigo ? (
                                                <span className="pl-4 inline-flex items-center gap-1.5">
                                                    <span className="text-gray-300">↳</span>
                                                    <span className="rounded-md bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                                                        {f.presentacion}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{f.unidades} unid.</span>
                                                </span>
                                            ) : f.descripcion}
                                        </td>
                                        <td className="px-3 py-2 text-xs tabular-nums text-gray-500">
                                            {f.sinCosto ? <span className="text-amber-600 font-semibold">sin costo</span> : soles(f.costoConIgv)}
                                        </td>
                                        <td className="px-3 py-2 text-sm tabular-nums text-gray-500">{soles(f.precioActual)}</td>
                                        <td className="px-3 py-2 text-sm tabular-nums font-bold">
                                            {f.precioNuevo == null
                                                ? <span className="text-gray-300">{f.packPrecioFijo ? 'no cambia (precio fijo)' : 'no cambia'}</span>
                                                : <span className={f.precioNuevo > f.precioActual ? 'text-emerald-600' : 'text-rose-600'}>{soles(f.precioNuevo)}</span>}
                                        </td>
                                        <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                                            <span className="text-gray-400">{pct(f.utilidadActual)}</span>
                                            {f.seAplica && (
                                                <>
                                                    <span className="mx-1 text-gray-300">→</span>
                                                    <span className={`font-bold ${(f.utilidadNueva ?? 0) < 0 ? 'text-rose-600' : 'text-gray-800 dark:text-white'}`}>
                                                        {pct(f.utilidadNueva)}
                                                    </span>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Historial con deshacer */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Últimos reprecios</h2>
                <p className="text-xs text-gray-400 mb-3">Si te equivocaste de lista o de porcentaje, deshacer devuelve cada producto a su precio anterior.</p>
                {lotes.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">Todavía no hiciste ningún reprecio masivo.</p>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
                        {lotes.map(l => (
                            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                                <div className="text-sm">
                                    <span className="font-semibold text-gray-800 dark:text-white">{l.listaNombre}</span>
                                    <span className="mx-2 text-gray-400">·</span>
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {l.operacion.toLowerCase()} {l.modo === 'MONTO' ? `S/ ${l.valor}` : `${l.valor}%`}
                                    </span>
                                    <span className="mx-2 text-gray-400">·</span>
                                    <span className="text-xs text-gray-500">{l.totalItems} precios</span>
                                    <span className="ml-2 text-xs text-gray-400">{new Date(l.creadoEn).toLocaleString('es-PE')}</span>
                                </div>
                                {l.revertidoEn ? (
                                    <span className="text-[11px] font-bold uppercase text-gray-400">Deshecho</span>
                                ) : (
                                    <button type="button" onClick={() => setADeshacer(l)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20">
                                        <Icon icon="solar:undo-left-round-bold" width={14} /> Deshacer
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {confirmar && (
                <ModalConfirm isOpenModal={confirmar} setIsOpenModal={setConfirmar}
                    title="Aplicar el reprecio"
                    information={`Se van a cambiar ${resumen?.aplican} precios en "${listas.find(l => l.id === listaPrecioId)?.nombre}". Podrás deshacerlo desde el historial.`}
                    confirmSubmit={handleAplicar} />
            )}
            {aDeshacer && (
                <ModalConfirm isOpenModal={!!aDeshacer} setIsOpenModal={() => setADeshacer(null)}
                    title="Deshacer el reprecio"
                    information={`Los ${aDeshacer.totalItems} precios vuelven a como estaban antes de este cambio.`}
                    confirmSubmit={handleDeshacer} />
            )}
        </div>
    );
};

export default ReprecioMasivo;
