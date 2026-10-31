import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import Casilla from '@/components/Casilla';
import { get } from '@/utils/fetch';
import { lineasDePedidoMarca, type FilaPedidoMarca, type LineaPedidoMarca } from './pedidoPorMarca';

interface Marca { id: number; nombre: string }
interface Proveedor { id: number; nombre: string; nroDoc?: string }

interface Props {
    onCancelar: () => void;
    onAgregar: (lineas: LineaPedidoMarca[], proveedor: Proveedor | null, marca: string) => void;
    /** 1.18 si la orden está en "Precios con IGV incluido". */
    factorCosto?: number;
}

const PERIODOS = [15, 30, 60, 90];

/**
 * Pedido por marca: la tienda multimarca le pide a cada línea (Ésika, Avon,
 * L'Bel…) en cada campaña. Se elige la marca y aparecen todos sus productos,
 * cada tono en su fila, con stock, mínimo y lo vendido; la cantidad sugerida ya
 * viene escrita y se corrige donde haga falta.
 *
 * Igual que la curva de tallas, lo que sale son las líneas de siempre de la
 * orden: esto es solo una forma más rápida de cargarlas.
 */
export default function ModalPedidoPorMarca({ onCancelar, onAgregar, factorCosto = 1 }: Props) {
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [marcaId, setMarcaId] = useState<number | null>(null);
    const [dias, setDias] = useState(30);
    const [filas, setFilas] = useState<FilaPedidoMarca[]>([]);
    const [proveedor, setProveedor] = useState<Proveedor | null>(null);
    const [cantidades, setCantidades] = useState<Record<number, string>>({});
    const [cargando, setCargando] = useState(false);
    const [soloSugeridos, setSoloSugeridos] = useState(false);
    const [filtro, setFiltro] = useState('');

    useEffect(() => {
        (async () => {
            const resp: any = await get('marca/listar');
            const lista = Array.isArray(resp?.data) ? resp.data : [];
            setMarcas([...lista].sort((a: Marca, b: Marca) => a.nombre.localeCompare(b.nombre, 'es')));
        })();
    }, []);

    useEffect(() => {
        if (!marcaId) { setFilas([]); return; }
        let vigente = true;
        setCargando(true);
        (async () => {
            const resp: any = await get(`compras/ordenes/sugerido-por-marca?marcaId=${marcaId}&dias=${dias}`);
            if (!vigente) return;
            const items: FilaPedidoMarca[] = Array.isArray(resp?.data?.items) ? resp.data.items : [];
            setFilas(items);
            setProveedor(resp?.data?.proveedorSugerido ?? null);
            setCantidades(Object.fromEntries(items.filter((f) => f.sugerido > 0).map((f) => [f.productoId, String(f.sugerido)])));
            setCargando(false);
        })();
        return () => { vigente = false; };
    }, [marcaId, dias]);

    const visibles = useMemo(() => {
        const q = filtro.trim().toLowerCase();
        return filas.filter((f) =>
            (!soloSugeridos || f.sugerido > 0)
            && (!q || `${f.descripcion} ${f.variante ?? ''}`.toLowerCase().includes(q)));
    }, [filas, filtro, soloSugeridos]);

    const lineas = lineasDePedidoMarca(filas, cantidades, factorCosto);
    const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
    const importe = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const marca = marcas.find((m) => m.id === marcaId);

    const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

    return (
        <Modal isOpenModal closeModal={onCancelar} title="Pedir por marca" icon="solar:star-bold-duotone" width="820px" height="auto">
            <div className="p-4">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_180px]" data-testid="pm-filtros">
                    <Select
                        name="marca"
                        label="Marca o línea"
                        withLabel
                        isSearch
                        error={() => { }}
                        placeholder="Elige la marca…"
                        value={marca?.nombre ?? ''}
                        options={marcas.map((m) => ({ id: m.id, value: m.nombre }))}
                        onChange={(id: any) => { if (id !== '' && id != null) setMarcaId(Number(id)); }}
                    />
                    <Select
                        name="dias"
                        label="Ventas de los últimos"
                        withLabel
                        error={() => { }}
                        value={`${dias} días`}
                        options={PERIODOS.map((d) => ({ id: d, value: `${d} días` }))}
                        onChange={(id: any) => { if (id) setDias(Number(id)); }}
                    />
                </div>

                {!marcaId ? (
                    <p className="mt-6 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500 dark:bg-slate-800/50 dark:text-gray-400">
                        Elige una marca para ver todos sus productos con lo que te queda y lo que vendiste.
                    </p>
                ) : cargando ? (
                    <div className="mt-6 flex justify-center py-8 text-blue-500"><Icon icon="svg-spinners:180-ring" width={28} /></div>
                ) : filas.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500 dark:bg-slate-800/50 dark:text-gray-400">
                        {marca?.nombre ?? 'Esta marca'} no tiene productos activos.
                    </p>
                ) : (
                    <>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="sm:w-72">
                                <InputPro name="filtro" placeholder="Filtrar producto o tono…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                <Casilla checked={soloSugeridos} onChange={setSoloSugeridos} label="Solo lo que hace falta pedir" />
                                Solo lo que hace falta pedir
                            </label>
                        </div>
                        <div className="mt-3 max-h-[52vh] overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 z-10 bg-white text-[10px] uppercase tracking-wide text-gray-400 dark:bg-slate-900 dark:text-gray-500">
                                    <tr className="border-b border-gray-100 dark:border-slate-800">
                                        <th className="px-3 py-2 font-bold">Producto</th>
                                        <th className="px-2 py-2 text-right font-bold">Stock</th>
                                        <th className="px-2 py-2 text-right font-bold">Mín.</th>
                                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap">Vendidos {dias}d</th>
                                        <th className="w-24 px-3 py-2 text-center font-bold">A pedir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibles.map((f) => (
                                        <tr key={f.productoId} className="border-b border-gray-50 last:border-0 dark:border-slate-800/60">
                                            <td className="px-3 py-2">
                                                <p className="font-bold text-gray-900 dark:text-white">{f.descripcion}</p>
                                                {f.variante && <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">{f.variante}</p>}
                                            </td>
                                            <td className={`px-2 py-2 text-right font-bold ${f.stock > 0 ? 'text-gray-600 dark:text-gray-300' : 'text-rose-500'}`}>{f.stock}</td>
                                            <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400">{f.stockMinimo || '—'}</td>
                                            <td className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">{f.vendidos}</td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    value={cantidades[f.productoId] ?? ''}
                                                    onChange={(e) => setCantidades((p) => ({ ...p, [f.productoId]: e.target.value }))}
                                                    placeholder="0"
                                                    className={inputCls}
                                                    data-testid={`pm-cant-${f.productoId}`}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {visibles.length === 0 && (
                                        <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Nada que mostrar con ese filtro.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-400">
                            Sugerido = lo vendido en el periodo (o el mínimo, si es mayor) menos el stock de hoy. Corrígelo donde quieras.
                        </p>
                        {proveedor && (
                            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Icon icon="solar:history-bold-duotone" width={14} />
                                El último pedido de esta marca fue a {proveedor.nombre}: se pone como proveedor si aún no elegiste uno.
                            </p>
                        )}
                    </>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {lineas.length > 0
                            ? <>Se agregan <strong className="text-gray-900 dark:text-white">{lineas.length}</strong> {lineas.length === 1 ? 'producto' : 'productos'}
                                {' · '}<strong className="text-gray-900 dark:text-white">{unidades}</strong> unidades · S/ {importe.toFixed(2)}</>
                            : 'Escribe cuánto pedir en al menos un producto'}
                    </p>
                    <div className="flex gap-2">
                        <button type="button" onClick={onCancelar} className="rounded-xl px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">Cancelar</button>
                        <button
                            type="button"
                            disabled={lineas.length === 0}
                            onClick={() => onAgregar(lineas, proveedor, marca?.nombre ?? '')}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            data-testid="pm-agregar"
                        >
                            Agregar al pedido
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
