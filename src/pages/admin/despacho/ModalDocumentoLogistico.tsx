import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useReactToPrint } from 'react-to-print';
import apiClient from '@/utils/apiClient';
import { DocumentoLogisticoVista } from './DocumentosLogisticos';
import { codigoDocumento, unidadesDe, type DetalleOperaciones, type DocumentoLogistico } from './operacionesLogisticas';

interface Props {
    tipo: DocumentoLogistico;
    comprobanteIds: number[];
    onCambiarTipo: (t: DocumentoLogistico) => void;
    onClose: () => void;
}

const TIPOS: { id: DocumentoLogistico; label: string; icon: string; detalle: string }[] = [
    { id: 'PICKING', label: 'Picking', icon: 'solar:cart-large-4-bold-duotone', detalle: 'Qué sacar del almacén' },
    { id: 'PACKING', label: 'Packing', icon: 'solar:box-bold-duotone', detalle: 'Cómo armar cada paquete' },
];

/**
 * Vista previa del picking/packing antes de imprimir. En una tablet sirve tal
 * cual: las casillas se marcan tocando y el documento cuenta lo recogido.
 */
export function ModalDocumentoLogistico({ tipo, comprobanteIds, onCambiarTipo, onClose }: Props) {
    const [detalle, setDetalle] = useState<DetalleOperaciones | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [marcados, setMarcados] = useState<Set<string>>(new Set());
    const generado = useMemo(() => new Date(), []);
    const codigo = useMemo(() => codigoDocumento(tipo, generado), [tipo, generado]);
    const papelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let vivo = true;
        setDetalle(null);
        setError(null);
        apiClient
            .post('/envio-despacho/operaciones/detalle', { comprobanteIds })
            .then((r) => vivo && setDetalle((r.data?.data ?? r.data) as DetalleOperaciones))
            .catch((e) => vivo && setError(e?.response?.data?.message || 'No se pudo cargar los envíos'));
        return () => {
            vivo = false;
        };
    }, [comprobanteIds]);

    useEffect(() => {
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onClose]);

    const imprimir = useReactToPrint({
        // @ts-ignore la versión instalada usa contentRef
        contentRef: papelRef,
        documentTitle: `${tipo === 'PICKING' ? 'Picking' : 'Packing'}_${codigo}`,
        pageStyle: `@page { size: A4; margin: 0; }
            @media print { html, body { margin: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } button { cursor: default; } }`,
    });

    const marcar = (clave: string) =>
        setMarcados((prev) => {
            const next = new Set(prev);
            if (next.has(clave)) next.delete(clave);
            else next.add(clave);
            return next;
        });

    return createPortal(
        <div className="fixed inset-0 z-[1000000] flex flex-col bg-slate-950/70 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 text-white sm:px-6">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tipo === 'PICKING' ? 'bg-violet-500' : 'bg-sky-500'}`}>
                        <Icon icon={tipo === 'PICKING' ? 'solar:cart-large-4-bold-duotone' : 'solar:box-bold-duotone'} className="text-xl" />
                    </div>
                    <div>
                        <p className="text-sm font-black leading-tight">{tipo === 'PICKING' ? 'Picking list' : 'Packing list'}</p>
                        <p className="text-[11px] text-slate-400">
                            {detalle ? `${detalle.envios.length} pedidos · ${unidadesDe(detalle.envios)} unidades · ${codigo}` : 'Cargando…'}
                        </p>
                    </div>
                </div>

                <div className="mx-auto flex rounded-xl bg-white/10 p-1">
                    {TIPOS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onCambiarTipo(t.id)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                tipo === t.id ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            <Icon icon={t.icon} className="text-base" />
                            {t.label}
                            <span className={`hidden font-medium sm:inline ${tipo === t.id ? 'text-slate-500' : 'text-slate-400'}`}>· {t.detalle}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {marcados.size > 0 && (
                        <button type="button" onClick={() => setMarcados(new Set())} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">
                            Desmarcar todo
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => imprimir?.()}
                        disabled={!detalle?.envios.length}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 shadow transition hover:bg-slate-100 disabled:opacity-40"
                    >
                        <Icon icon="solar:printer-bold" className="text-lg" />
                        Imprimir / PDF
                    </button>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-3 py-6 sm:px-6">
                {error ? (
                    <div className="mx-auto mt-20 max-w-md rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-slate-900">
                        <Icon icon="solar:danger-triangle-bold-duotone" className="mx-auto text-4xl text-amber-500" />
                        <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">{error}</p>
                    </div>
                ) : !detalle ? (
                    <div className="mx-auto mt-24 flex w-fit items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-xl">
                        <Icon icon="svg-spinners:180-ring" className="text-xl text-violet-600" />
                        Armando el documento…
                    </div>
                ) : (
                    <div className="mx-auto w-fit overflow-hidden rounded-sm shadow-2xl ring-1 ring-black/5">
                        <div ref={papelRef}>
                            <DocumentoLogisticoVista
                                tipo={tipo}
                                detalle={detalle}
                                codigo={codigo}
                                generado={generado}
                                titulo={tipo === 'PICKING' ? 'PICKING' : 'PACKING'}
                                marcados={marcados}
                                onMarcar={marcar}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
