import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useAuthStore } from '@/zustand/auth';
import {
    InventoryCard,
    InventoryEmptyState,
    InventoryHero,
    InventoryInfoPill,
    InventoryPage,
    InventorySearchBox,
    InventoryToolbar,
    InventoryToolbarButton,
} from '../shared/InventoryChrome';
import { TITULO, etiquetaVariante, stockEnSede, sugiereCompra, varianteQueFalta, type DetalleDocumento, type TipoDocumento } from './EntradasSalidasModel';
import { useEntradasSalidasViewModel, type EntradasSalidasVM } from './useEntradasSalidasViewModel';
import DocumentoInventarioPrint from './DocumentoInventarioPrint';

const campo =
    'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#6A5AF9] focus:ring-2 focus:ring-[#6A5AF9]/15 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100';

const ESTILO_TIPO: Record<TipoDocumento, { icono: string; chip: string }> = {
    ENTRADA: { icono: 'solar:import-bold-duotone', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    SALIDA: { icono: 'solar:export-bold-duotone', chip: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
};

export default function EntradasSalidasView() {
    const vm = useEntradasSalidasViewModel();
    const navigate = useNavigate();
    const { auth } = useAuthStore();
    const papel = useRef<HTMLDivElement>(null);
    const imprimir = useReactToPrint({
        // @ts-ignore la versión instalada recibe contentRef
        contentRef: papel,
        pageStyle: '@media print { @page { size: A4; margin: 0; } body { background: #fff; } }',
    });

    return (
        <InventoryPage>
            {vm.vista === 'lista' ? (
                <>
                    <InventoryHero
                        icon="solar:box-minimalistic-bold-duotone"
                        title="Entradas y salidas"
                        subtitle="Mueve varios productos de una vez cuando no es compra ni venta: inventario inicial, devoluciones, mermas, consumo propio."
                        actions={
                            <>
                                <InventoryToolbarButton icon="solar:import-bold" label="Nueva entrada" tone="primary" onClick={() => vm.nuevo('ENTRADA')} />
                                <InventoryToolbarButton icon="solar:export-bold" label="Nueva salida" onClick={() => vm.nuevo('SALIDA')} />
                            </>
                        }
                    />
                    <Historial vm={vm} />
                </>
            ) : null}

            {vm.vista === 'form' ? <Formulario vm={vm} onVolver={vm.volverALista} /> : null}

            {vm.vista === 'listo' && vm.detalle ? (
                <InventoryCard className="flex min-h-[380px] flex-col items-center justify-center p-10 text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-500 dark:border-emerald-800/30 dark:bg-emerald-900/20">
                        <Icon icon="solar:check-circle-bold" width={44} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white" data-testid="es-numero">
                        {vm.detalle.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} {vm.detalle.numero}
                    </h2>
                    <p className="mt-1 max-w-md text-sm text-slate-400">
                        {vm.detalle.items.length} producto(s) · {vm.detalle.motivoEtiqueta}. El stock ya se actualizó y quedó en el kardex.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <InventoryToolbarButton icon="solar:printer-minimalistic-bold" label="Imprimir" tone="primary" onClick={() => imprimir()} />
                        <InventoryToolbarButton icon="solar:add-circle-bold" label={TITULO[vm.detalle.tipo]} onClick={() => vm.nuevo(vm.detalle!.tipo)} />
                        <InventoryToolbarButton icon="solar:list-bold" label="Ver historial" onClick={vm.volverALista} />
                    </div>
                </InventoryCard>
            ) : null}

            {vm.vista === 'lista' && vm.detalle ? <DetalleModal doc={vm.detalle} onCerrar={vm.cerrarDetalle} onImprimir={() => imprimir()} /> : null}
            {vm.detalle ? <DocumentoInventarioPrint componentRef={papel} empresa={auth?.empresa} doc={vm.detalle} /> : null}
            {vm.eligiendoVariante ? <ElegirVariante vm={vm} /> : null}

            {vm.vista === 'lista' && !vm.docs.length && !vm.cargandoDocs && !vm.buscarDoc && !vm.filtroTipo ? (
                <p className="mt-4 text-center text-xs text-slate-400">
                    ¿Llegó mercadería con factura del proveedor? Regístrala en{' '}
                    <button className="font-bold text-[#6A5AF9]" onClick={() => navigate('/administrador/compras')}>
                        Compras
                    </button>
                    : ahí queda el costo y el IGV.
                </p>
            ) : null}
        </InventoryPage>
    );
}

function Historial({ vm }: { vm: EntradasSalidasVM }) {
    const pestañas: { valor: '' | TipoDocumento; label: string }[] = [
        { valor: '', label: 'Todas' },
        { valor: 'ENTRADA', label: 'Entradas' },
        { valor: 'SALIDA', label: 'Salidas' },
    ];
    return (
        <InventoryCard>
            <InventoryToolbar>
                <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900/60">
                    {pestañas.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => vm.setFiltroTipo(p.valor)}
                            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                                vm.filtroTipo === p.valor ? 'bg-white text-[#6A5AF9] shadow-sm dark:bg-slate-800' : 'text-slate-500'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <InventorySearchBox value={vm.buscarDoc} onChange={vm.setBuscarDoc} placeholder="Buscar por número (NE-12) o producto" className="sm:w-80" />
            </InventoryToolbar>
            {!vm.docs.length ? (
                <InventoryEmptyState
                    icon="solar:box-minimalistic-linear"
                    title={vm.cargandoDocs ? 'Cargando…' : vm.buscarDoc || vm.filtroTipo ? 'Nada con ese filtro' : 'Todavía no hay entradas ni salidas'}
                    subtitle="Con “Nueva entrada” o “Nueva salida” agregas los productos uno tras otro y guardas una sola vez."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                                <th className="px-5 py-3">Número</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Motivo</th>
                                <th className="px-4 py-3 text-right">Productos</th>
                                <th className="px-4 py-3 text-right">Unidades</th>
                                <th className="px-4 py-3">Responsable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vm.docs.map((d) => (
                                <tr
                                    key={d.id}
                                    onClick={() => vm.abrirDetalle(d.id)}
                                    className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
                                >
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs font-black ${ESTILO_TIPO[d.tipo].chip}`}>
                                            <Icon icon={ESTILO_TIPO[d.tipo].icono} width={14} />
                                            {d.numero}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{moment(d.fecha).format('DD/MM/YYYY HH:mm')}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                                        {d.motivoEtiqueta}
                                        {d.detalle ? <span className="block max-w-xs truncate text-xs font-normal text-slate-400">{d.detalle}</span> : null}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{d.productos}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{d.unidades}</td>
                                    <td className="px-4 py-3 text-slate-500">{d.responsable}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {vm.paginas > 1 ? (
                        <div className="flex items-center justify-end gap-2 px-5 py-3 text-sm">
                            <button disabled={vm.pagina <= 1} onClick={() => vm.setPagina(vm.pagina - 1)} className="rounded-lg px-3 py-1 font-bold text-slate-500 disabled:opacity-30">
                                Anterior
                            </button>
                            <span className="text-slate-400">
                                {vm.pagina} de {vm.paginas}
                            </span>
                            <button disabled={vm.pagina >= vm.paginas} onClick={() => vm.setPagina(vm.pagina + 1)} className="rounded-lg px-3 py-1 font-bold text-slate-500 disabled:opacity-30">
                                Siguiente
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </InventoryCard>
    );
}

function Formulario({ vm, onVolver }: { vm: EntradasSalidasVM; onVolver: () => void }) {
    const entrada = vm.tipo === 'ENTRADA';
    const buscador = useRef<HTMLInputElement>(null);
    const cantidades = useRef<Record<string, HTMLInputElement | null>>({});
    const verLotes = vm.ctx.lotePermitido || vm.lineas.some((l) => l.lotes.length > 0);

    useEffect(() => {
        buscador.current?.focus();
    }, []);

    // Agregado un producto, el cursor va a su cantidad; Enter vuelve al buscador.
    useEffect(() => {
        if (!vm.ultimaAgregada) return;
        const t = setTimeout(() => {
            const input = cantidades.current[vm.ultimaAgregada!];
            input?.focus();
            input?.select();
        }, 30);
        return () => clearTimeout(t);
    }, [vm.ultimaAgregada, vm.lineas.length]);

    return (
        <>
            <InventoryHero
                icon={ESTILO_TIPO[vm.tipo].icono}
                title={TITULO[vm.tipo]}
                subtitle={
                    entrada
                        ? 'Busca o escanea el producto, pon la cantidad y Enter para seguir con el siguiente.'
                        : 'Busca o escanea lo que sale, pon la cantidad y Enter para seguir con el siguiente.'
                }
                actions={
                    <>
                        <InventoryToolbarButton icon="solar:alt-arrow-left-linear" label="Volver" onClick={onVolver} />
                        <InventoryInfoPill icon="solar:shop-2-linear" label={vm.sedeActiva?.nombre || 'Sede'} />
                    </>
                }
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
                <InventoryCard className="h-fit space-y-4 p-5">
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Motivo</label>
                        <select data-testid="es-motivo" value={vm.motivo} onChange={(e) => vm.setMotivo(e.target.value)} className={`${campo} ${vm.intentoGuardar && !vm.motivo ? 'border-rose-400' : ''}`}>
                            <option value="">Elige el motivo…</option>
                            {vm.ctx.motivos[vm.tipo].map((m) => (
                                <option key={m.codigo} value={m.codigo}>
                                    {m.etiqueta}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Detalle {vm.motivo === 'OTRO' ? '(obligatorio)' : '(opcional)'}
                        </label>
                        <textarea
                            data-testid="es-detalle"
                            rows={3}
                            value={vm.detalleTexto}
                            onChange={(e) => vm.setDetalleTexto(e.target.value)}
                            placeholder={entrada ? 'Ej.: devolución de la boleta B001-120' : 'Ej.: muestras para la feria del sábado'}
                            className={`${campo} h-auto py-2 ${vm.intentoGuardar && vm.faltaDetalle ? 'border-rose-400' : ''}`}
                        />
                    </div>
                    {sugiereCompra(vm.tipo, vm.motivo) ? (
                        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
                            <Icon icon="solar:info-circle-bold" width={16} className="mt-0.5 shrink-0" />
                            <span>Si la mercadería llegó con factura del proveedor, regístrala en Compras: ahí queda el costo y el IGV para tu contador.</span>
                        </div>
                    ) : null}
                    {vm.ctx.loteObligatorio && entrada ? (
                        <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/10 dark:text-sky-300">
                            <Icon icon="solar:pill-bold" width={16} className="mt-0.5 shrink-0" />
                            <span>Cada producto entra con su lote. Si el lote es nuevo, pon también su vencimiento.</span>
                        </div>
                    ) : null}
                </InventoryCard>

                <InventoryCard className="flex min-h-[460px] flex-col">
                    <div className="relative border-b border-slate-100 p-4 dark:border-slate-800">
                        <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900/60">
                            <Icon icon={vm.buscando ? 'line-md:loading-twotone-loop' : 'solar:magnifer-linear'} className="text-xl text-slate-400" />
                            <input
                                ref={buscador}
                                data-testid="es-buscar"
                                value={vm.termino}
                                onChange={(e) => vm.setTermino(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        vm.alPresionarEnter();
                                    }
                                }}
                                placeholder="Nombre, código o escanea el código de barras"
                                className="w-full border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100"
                            />
                        </label>
                        {vm.resultados.length > 0 ? (
                            <div className="absolute left-4 right-4 z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-700 dark:bg-[#111827]" data-testid="es-resultados">
                                {vm.resultados.map((p) => {
                                    const variantes = p.variantes?.length ?? 0;
                                    const variante = p.productoPadreId ? varianteQueFalta(p.descripcion ?? '', p.valoresAtributos) : null;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => vm.agregar(p)}
                                            className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-2.5 text-left last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-indigo-900/20"
                                        >
                                            <Miniatura url={p.imagenUrl} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {p.descripcion}
                                                    {variante ? <span className="ml-1 text-[#6A5AF9]">· {variante}</span> : null}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    <span className="font-mono font-bold text-[#6A5AF9]">{p.codigo}</span>
                                                    {variantes ? ` · ${variantes} tallas/colores — elige cuál` : ` · Stock aquí: ${stockEnSede(p, vm.sedeActiva?.id)}`}
                                                </p>
                                            </div>
                                            <Icon icon={variantes ? 'solar:alt-arrow-right-linear' : 'solar:add-circle-linear'} className="text-slate-300" width={18} />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {!vm.lineas.length ? (
                            <InventoryEmptyState
                                icon="solar:cart-large-minimalistic-linear"
                                title="Sin productos todavía"
                                subtitle="Busca o escanea arriba. Si escaneas el mismo producto otra vez, se suma uno."
                            />
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-3 py-3 text-right">Stock aquí</th>
                                        {verLotes ? <th className="px-3 py-3">Lote</th> : null}
                                        <th className="w-28 px-3 py-3 text-center">Cantidad</th>
                                        {entrada ? <th className="w-28 px-3 py-3 text-center">Costo unit.</th> : null}
                                        <th className="px-3 py-3 text-right">Quedará</th>
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {vm.lineas.map((l) => {
                                        const aviso = vm.avisos[l.key];
                                        const queda = Math.round((l.stockSede + (entrada ? 1 : -1) * (Number(l.cantidad) || 0)) * 1000) / 1000;
                                        const loteNuevo = !!l.lote && !l.lotes.some((x) => x.lote === l.lote.toUpperCase());
                                        return (
                                            <tr key={l.key} data-testid="es-fila" className={`border-b border-slate-50 align-top dark:border-slate-800/60 ${aviso ? 'bg-rose-50/50 dark:bg-rose-900/5' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Miniatura url={l.imagenUrl} />
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{l.descripcion}</p>
                                                            <p className="text-[11px] text-slate-400">
                                                                <span className="font-mono font-bold text-[#6A5AF9]">{l.codigo}</span>
                                                                {l.variante ? <span className="ml-1 font-bold text-slate-600 dark:text-slate-300">· {l.variante}</span> : null}
                                                            </p>
                                                            {aviso ? (
                                                                <p className="mt-1 text-xs font-semibold text-rose-500" data-testid="es-aviso">
                                                                    {aviso}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right text-slate-500">
                                                    {l.stockSede} <span className="text-[10px]">{l.unidad}</span>
                                                </td>
                                                {verLotes ? (
                                                    <td className="px-3 py-3">
                                                        {entrada ? (
                                                            <div className="space-y-1.5">
                                                                <input
                                                                    list={`lotes-${l.key}`}
                                                                    value={l.lote}
                                                                    onChange={(e) => vm.cambiarLinea(l.key, { lote: e.target.value.toUpperCase() })}
                                                                    placeholder="N° de lote"
                                                                    className={`${campo} h-9 w-36`}
                                                                />
                                                                <datalist id={`lotes-${l.key}`}>
                                                                    {l.lotes.map((x) => (
                                                                        <option key={x.lote} value={x.lote}>{`vence ${moment.utc(x.fechaVencimiento).format('DD/MM/YYYY')}`}</option>
                                                                    ))}
                                                                </datalist>
                                                                {loteNuevo ? (
                                                                    <input
                                                                        type="date"
                                                                        value={l.vence}
                                                                        onChange={(e) => vm.cambiarLinea(l.key, { vence: e.target.value })}
                                                                        title="Vencimiento del lote nuevo"
                                                                        className={`${campo} h-9 w-36`}
                                                                    />
                                                                ) : null}
                                                            </div>
                                                        ) : l.lotes.some((x) => x.stockActual > 0) ? (
                                                            <select value={l.lote} onChange={(e) => vm.cambiarLinea(l.key, { lote: e.target.value })} className={`${campo} h-9 w-48`}>
                                                                <option value="">El que vence primero</option>
                                                                {l.lotes
                                                                    .filter((x) => x.stockActual > 0)
                                                                    .map((x) => {
                                                                        const vencido = moment.utc(x.fechaVencimiento).isBefore(moment(), 'day');
                                                                        return (
                                                                            <option key={x.lote} value={x.lote}>
                                                                                {`${x.lote} · ${x.stockActual} · ${vencido ? 'VENCIDO' : `vence ${moment.utc(x.fechaVencimiento).format('DD/MM/YY')}`}`}
                                                                            </option>
                                                                        );
                                                                    })}
                                                            </select>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                ) : null}
                                                <td className="px-3 py-3">
                                                    <input
                                                        ref={(el) => {
                                                            cantidades.current[l.key] = el;
                                                        }}
                                                        data-testid="es-cantidad"
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        value={Number.isFinite(l.cantidad) ? l.cantidad : ''}
                                                        onChange={(e) => vm.cambiarLinea(l.key, { cantidad: e.target.value === '' ? NaN : Number(e.target.value) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                buscador.current?.focus();
                                                            }
                                                        }}
                                                        className={`${campo} h-9 text-center ${aviso ? 'border-rose-300' : ''}`}
                                                    />
                                                </td>
                                                {entrada ? (
                                                    <td className="px-3 py-3">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="any"
                                                            value={l.costoUnitario}
                                                            onChange={(e) => vm.cambiarLinea(l.key, { costoUnitario: e.target.value })}
                                                            placeholder="Igual"
                                                            title="Costo por unidad. Vacío = se mantiene el costo que ya tiene."
                                                            className={`${campo} h-9 text-center`}
                                                        />
                                                    </td>
                                                ) : null}
                                                <td className={`px-3 py-3 text-right font-bold ${queda < 0 ? 'text-rose-500' : entrada ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>{queda}</td>
                                                <td className="px-2 py-3">
                                                    <button onClick={() => vm.quitarLinea(l.key)} title="Quitar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20">
                                                        <Icon icon="solar:trash-bin-trash-linear" width={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                        <div className="flex items-center gap-5 text-sm">
                            <span>
                                <b className="text-lg text-slate-800 dark:text-white">{vm.lineas.length}</b> <span className="text-slate-400">productos</span>
                            </span>
                            <span>
                                <b className="text-lg text-slate-800 dark:text-white">{vm.totalUnidades}</b> <span className="text-slate-400">unidades</span>
                            </span>
                            {vm.lineas.length ? (
                                <button onClick={vm.limpiar} className="text-xs font-bold text-rose-400 hover:text-rose-500">
                                    Vaciar lista
                                </button>
                            ) : null}
                        </div>
                        <button
                            data-testid="es-guardar"
                            onClick={vm.guardar}
                            disabled={vm.guardando}
                            className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white transition ${
                                vm.puedeGuardar ? 'bg-[#6A5AF9] hover:bg-[#5b4cf0]' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <Icon icon={vm.guardando ? 'line-md:loading-twotone-loop' : 'solar:diskette-bold'} width={18} />
                            {vm.guardando ? 'Guardando…' : `Guardar ${entrada ? 'entrada' : 'salida'}`}
                        </button>
                    </div>
                </InventoryCard>
            </div>
        </>
    );
}

function ElegirVariante({ vm }: { vm: EntradasSalidasVM }) {
    const p = vm.eligiendoVariante;
    return (
        <Fondo onCerrar={vm.cerrarVariantes}>
            <div className="mb-4">
                <p className="text-lg font-black text-slate-800 dark:text-white">{p.descripcion}</p>
                <p className="text-sm text-slate-400">Elige la talla o el color. Puedes agregar varias, una por una.</p>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3" data-testid="es-variantes">
                {(p.variantes ?? []).map((v: any) => (
                    <button
                        key={v.id}
                        onClick={() => vm.agregar(v, p)}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:border-[#6A5AF9] hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-900/20"
                    >
                        <p className="text-sm font-black text-slate-700 dark:text-slate-100">{etiquetaVariante(v.valoresAtributos) ?? v.descripcion}</p>
                        <p className="text-[11px] text-slate-400">Stock aquí: {stockEnSede(v, vm.sedeActiva?.id)}</p>
                    </button>
                ))}
            </div>
        </Fondo>
    );
}

function DetalleModal({ doc, onCerrar, onImprimir }: { doc: DetalleDocumento; onCerrar: () => void; onImprimir: () => void }) {
    return (
        <Fondo onCerrar={onCerrar} ancho="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-sm font-black ${ESTILO_TIPO[doc.tipo].chip}`}>
                        <Icon icon={ESTILO_TIPO[doc.tipo].icono} width={15} />
                        {doc.numero}
                    </span>
                    <p className="mt-2 text-base font-black text-slate-800 dark:text-white">{doc.motivoEtiqueta}</p>
                    <p className="text-xs text-slate-400">
                        {moment(doc.fecha).format('DD/MM/YYYY HH:mm')} · {doc.sede} · {doc.responsable}
                    </p>
                    {doc.detalle ? <p className="mt-1 text-sm text-slate-500">{doc.detalle}</p> : null}
                </div>
                <InventoryToolbarButton icon="solar:printer-minimalistic-bold" label="Imprimir" tone="primary" onClick={onImprimir} />
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                            <th className="py-2">Producto</th>
                            <th className="py-2">Lote</th>
                            <th className="py-2 text-right">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {doc.items.map((it, i) => (
                            <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60">
                                <td className="py-2">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                                        {it.descripcion}
                                        {it.variante ? <span className="text-[#6A5AF9]"> · {it.variante}</span> : null}
                                    </p>
                                    <p className="font-mono text-[11px] text-slate-400">{it.codigo}</p>
                                </td>
                                <td className="py-2 text-slate-500">{it.lote ?? '—'}</td>
                                <td className="py-2 text-right font-bold">
                                    {it.cantidad} <span className="text-[10px] font-normal text-slate-400">{it.unidad}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Fondo>
    );
}

function Fondo({ children, onCerrar, ancho = 'max-w-xl' }: { children: React.ReactNode; onCerrar: () => void; ancho?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onCerrar}>
            <div className={`relative w-full ${ancho} rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#111827]`} onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={onCerrar} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Icon icon="solar:close-circle-linear" width={20} />
                </button>
                {children}
            </div>
        </div>
    );
}

function Miniatura({ url }: { url?: string }) {
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon icon="solar:box-minimalistic-linear" className="text-slate-300" width={16} />}
        </div>
    );
}
