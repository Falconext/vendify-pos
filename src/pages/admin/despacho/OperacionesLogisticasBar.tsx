import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import type { VentaPanelItem } from './usePanelVentasViewModel';
import { ModalDocumentoLogistico } from './ModalDocumentoLogistico';
import {
    enviosDelAlcance,
    kpisOperaciones,
    type AlcanceOperaciones,
    type DocumentoLogistico,
    type FormatoExport,
} from './operacionesLogisticas';

interface Props {
    /** Las filas que se ven en la tabla (pestaña, búsqueda y filtros aplicados). */
    items: VentaPanelItem[];
    /** "Sale el 29/10" o "29/10": de qué día son los envíos. */
    diaLabel: string;
    rotulosDisponibles: number;
    onRotulos: () => void;
}

const ACCIONES: {
    id: DocumentoLogistico | 'ROTULOS';
    titulo: string;
    detalle: string;
    icon: string;
    fondo: string;
}[] = [
    { id: 'PICKING', titulo: 'Picking', detalle: 'Qué sacar del almacén', icon: 'solar:cart-large-4-bold-duotone', fondo: 'from-violet-600 to-fuchsia-500' },
    { id: 'PACKING', titulo: 'Packing', detalle: 'Armar cada pedido', icon: 'solar:box-bold-duotone', fondo: 'from-sky-600 to-cyan-500' },
    { id: 'ROTULOS', titulo: 'Rótulos', detalle: 'Etiqueta por paquete', icon: 'solar:tag-horizontal-bold-duotone', fondo: 'from-amber-500 to-orange-500' },
];

const EXPORTS: { id: FormatoExport; titulo: string; detalle: string; marca: string; color: string }[] = [
    { id: 'SHALOM', titulo: 'Shalom', detalle: 'Carga masiva', marca: 'S', color: 'bg-red-600' },
    { id: 'DINSIDES', titulo: 'Dinsides', detalle: 'Motorizado', marca: 'D', color: 'bg-slate-700' },
    { id: 'EVA', titulo: 'Eva Courier', detalle: 'Formulario', marca: 'E', color: 'bg-indigo-700' },
    { id: 'GENERAL', titulo: 'Excel general', detalle: 'Para registro', marca: 'X', color: 'bg-emerald-600' },
];

async function mensajeDeBlob(e: any): Promise<string> {
    const data = e?.response?.data;
    if (data instanceof Blob) {
        try {
            const j = JSON.parse(await data.text());
            return j?.message || 'No se pudo exportar';
        } catch {
            return 'No se pudo exportar';
        }
    }
    return e?.response?.data?.message || 'No se pudo exportar';
}

/**
 * Operaciones del día sobre lo que se ve en la tabla: picking, packing y
 * rótulos para preparar, y la plantilla de cada courier para cargar los envíos
 * en su portal.
 */
export function OperacionesLogisticasBar({ items, diaLabel, rotulosDisponibles, onRotulos }: Props) {
    const { alert } = useAlertStore();
    const [alcance, setAlcance] = useState<AlcanceOperaciones>('POR_PREPARAR');
    const [documento, setDocumento] = useState<DocumentoLogistico | null>(null);
    const [exportando, setExportando] = useState<FormatoExport | null>(null);

    const kpis = useMemo(() => kpisOperaciones(items), [items]);
    const elegidos = useMemo(() => enviosDelAlcance(items, alcance), [items, alcance]);
    const ids = useMemo(() => elegidos.map((i) => i.comprobanteId as number), [elegidos]);
    const [idsDocumento, setIdsDocumento] = useState<number[]>([]);

    if (!kpis.envios) return null;

    const abrir = (tipo: DocumentoLogistico) => {
        if (!ids.length) {
            alert(alcance === 'POR_PREPARAR' ? 'No hay envíos por preparar en la vista. Cambia a "Todos".' : 'No hay envíos en la vista.', 'warning');
            return;
        }
        setIdsDocumento(ids);
        setDocumento(tipo);
    };

    const exportar = async (formato: FormatoExport) => {
        if (!ids.length || exportando) return;
        setExportando(formato);
        try {
            const resp = await apiClient.post(
                '/envio-despacho/operaciones/exportar',
                { comprobanteIds: ids, formato },
                { responseType: 'blob', timeout: 60_000 },
            );
            // El navegador no deja leer Content-Disposition (CORS): el nombre se arma acá.
            const titulo = { SHALOM: 'Shalom', DINSIDES: 'Dinsides', EVA: 'EvaCourier', GENERAL: 'Envios' }[formato];
            const hoy = new Date().toLocaleDateString('en-CA');
            const nombre = `${titulo}_${hoy}.xlsx`;
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert(`Excel ${EXPORTS.find((x) => x.id === formato)?.titulo} descargado`, 'success');
        } catch (e) {
            alert(await mensajeDeBlob(e), 'warning');
        } finally {
            setExportando(null);
        }
    };

    const stats = [
        { label: 'Envíos', valor: kpis.envios, icon: 'solar:box-minimalistic-bold-duotone', tono: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200' },
        { label: 'Por preparar', valor: kpis.porPreparar, icon: 'solar:clock-circle-bold-duotone', tono: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300' },
        { label: 'En tránsito', valor: kpis.enTransito, icon: 'solar:delivery-bold-duotone', tono: 'text-sky-700 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-300' },
        { label: 'Entregados', valor: kpis.entregados, icon: 'solar:check-circle-bold-duotone', tono: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300' },
    ];

    return (
        <section
            data-testid="operaciones-logisticas"
            className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-violet-50/40 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                        <Icon icon="solar:routing-3-bold-duotone" className="text-lg" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">Operaciones logísticas</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {diaLabel} · trabaja sobre <span className="font-bold text-slate-700 dark:text-slate-200">{elegidos.length} envío{elegidos.length !== 1 ? 's' : ''}</span> de la vista
                        </p>
                    </div>
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
                    {([
                        ['POR_PREPARAR', 'Por preparar', kpis.porPreparar],
                        ['TODOS', 'Todos', kpis.envios],
                    ] as const).map(([id, label, n]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={alcance === id}
                            onClick={() => setAlcance(id)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                alcance === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            {label}
                            <span className={`rounded-full px-1.5 text-[10px] ${alcance === id ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                {n}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 p-4 xl:grid-cols-[1.15fr_1.35fr_auto]">
                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Preparar</p>
                    <div className="grid grid-cols-3 gap-2">
                        {ACCIONES.map((a) => {
                            const deshabilitado = a.id === 'ROTULOS' ? rotulosDisponibles === 0 : elegidos.length === 0;
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    disabled={deshabilitado}
                                    onClick={() => (a.id === 'ROTULOS' ? onRotulos() : abrir(a.id))}
                                    className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${a.fondo} p-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none`}
                                >
                                    <Icon icon={a.icon} className="absolute -right-2 -top-2 text-6xl opacity-15 transition group-hover:scale-110" />
                                    <Icon icon={a.icon} className="text-2xl" />
                                    <p className="mt-2 text-sm font-black leading-tight">{a.titulo}</p>
                                    <p className="text-[10.5px] font-medium leading-tight text-white/80">{a.detalle}</p>
                                    <span className="absolute right-2 top-2 rounded-full bg-white/20 px-1.5 text-[10px] font-black">
                                        {a.id === 'ROTULOS' ? rotulosDisponibles : elegidos.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Exportar masivamente</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {EXPORTS.map((x) => (
                            <button
                                key={x.id}
                                type="button"
                                disabled={!elegidos.length || !!exportando}
                                onClick={() => exportar(x.id)}
                                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-sm disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                            >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${x.color} text-sm font-black text-white`}>
                                    {exportando === x.id ? <Icon icon="svg-spinners:180-ring" className="text-base" /> : x.marca}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-xs font-black text-slate-800 dark:text-white">{x.titulo}</span>
                                    <span className="flex items-center gap-1 text-[10.5px] text-slate-500">
                                        <Icon icon="solar:file-download-linear" className="text-xs" />
                                        {x.detalle}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Resumen</p>
                    <div className="grid grid-cols-4 gap-2 xl:grid-cols-2">
                        {stats.map((s) => (
                            <div key={s.label} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${s.tono}`}>
                                <Icon icon={s.icon} className="text-lg" />
                                <div className="leading-tight">
                                    <p className="text-base font-black">{s.valor}</p>
                                    <p className="text-[10px] font-semibold opacity-80">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {kpis.porCobrar > 0 && (
                        <p className="mt-2 text-right text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            Por cobrar en ruta: S/ {kpis.porCobrar.toFixed(2)}
                        </p>
                    )}
                </div>
            </div>

            {documento && (
                <ModalDocumentoLogistico
                    tipo={documento}
                    comprobanteIds={idsDocumento}
                    onCambiarTipo={setDocumento}
                    onClose={() => setDocumento(null)}
                />
            )}
        </section>
    );
}
