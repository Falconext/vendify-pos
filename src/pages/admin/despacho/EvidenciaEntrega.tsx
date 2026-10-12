/**
 * D3 — la prueba de que el pedido llegó.
 *
 * El reclamo "no me llegó" se resolvía de palabra: el negocio reenvía y pierde
 * el margen, o discute y pierde al cliente. Acá se sube la foto del paquete
 * entregado, queda con su hora y se puede mandar al cliente en un toque.
 */
import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import { prepararFoto } from '@/utils/fotoParaSubir';

const ACCENT = 'var(--accent, #7551FF)';

export interface Evidencia {
    id: number;
    url: string;
    tipo?: string | null;
    nota?: string | null;
    tomadaEn: string;
    usuarioNombre?: string | null;
}

interface Props {
    comprobanteId: number;
    evidencias: Evidencia[];
    /** Para ofrecer "marcar entregado" solo cuando todavía no lo está. */
    yaEntregado: boolean;
    onCambio: (evidencias: Evidencia[]) => void;
    /** Avisa que el despacho cambió de estado, para refrescar la ficha. */
    onEntregado?: () => void;
}

const MAXIMO = 6;

const TIPO_LABEL: Record<string, string> = {
    FOTO_PAQUETE: 'Paquete entregado',
    FOTO_RECEPTOR: 'Quien recibió',
    FIRMA: 'Firma',
    DOCUMENTO: 'Documento',
};

export function EvidenciaEntrega({
    comprobanteId,
    evidencias,
    yaEntregado,
    onCambio,
    onEntregado,
}: Props) {
    const { alert } = useAlertStore();
    const rol = useAuthStore((s) => s.auth?.rol);
    const puedeAnular = rol === 'ADMIN_EMPRESA' || rol === 'ADMIN_SISTEMA';

    const inputRef = useRef<HTMLInputElement>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [ampliada, setAmpliada] = useState<Evidencia | null>(null);
    // Marcar entregado al subir solo tiene sentido si todavía no lo está.
    const [marcarEntregado, setMarcarEntregado] = useState(!yaEntregado);

    const quedan = MAXIMO - evidencias.length;

    const elegir = () => inputRef.current?.click();

    const subir = async (archivos: FileList | null) => {
        if (!archivos?.length) return;
        const seleccionados = Array.from(archivos).slice(0, Math.max(0, quedan));
        if (!seleccionados.length) {
            alert(`Esta entrega ya tiene ${MAXIMO} fotos.`, 'warning');
            return;
        }

        setSubiendo(true);
        try {
            // Se convierte y reduce acá: el HEIC del iPhone no lo acepta el
            // servidor, y una foto de 12 MP por datos móviles no sube.
            const listas = await Promise.all(seleccionados.map((f) => prepararFoto(f)));

            const form = new FormData();
            for (const f of listas) form.append('fotos', f);
            if (marcarEntregado && !yaEntregado) form.append('marcarEntregado', 'true');

            const { data } = await apiClient.post<any>(
                `/envio-despacho/comprobante/${comprobanteId}/evidencias`,
                form,
            );
            const payload = data?.data ?? data;
            onCambio(payload?.evidencias ?? []);
            if (payload?.despacho) onEntregado?.();
            alert(
                listas.length === 1 ? 'Evidencia guardada' : `${listas.length} evidencias guardadas`,
                'success',
            );
        } catch (e: any) {
            alert(
                e?.response?.data?.message ?? 'No se pudo guardar la evidencia',
                'error',
            );
        } finally {
            setSubiendo(false);
            // Sin esto, volver a elegir la misma foto no dispara el evento.
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const anular = async (ev: Evidencia) => {
        try {
            await apiClient.delete(`/envio-despacho/evidencias/${ev.id}`);
            onCambio(evidencias.filter((x) => x.id !== ev.id));
            setAmpliada(null);
            alert('Evidencia anulada', 'success');
        } catch (e: any) {
            alert(e?.response?.data?.message ?? 'No se pudo anular', 'error');
        }
    };

    return (
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Icon
                    icon="solar:camera-bold-duotone"
                    className="text-sm"
                    style={{ color: ACCENT }}
                />
                Evidencia de entrega
                {evidencias.length > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">· {evidencias.length}</span>
                )}
            </p>

            {evidencias.length === 0 ? (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 mb-3">
                    <Icon icon="solar:info-circle-bold-duotone" className="text-slate-400 text-lg mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Sin foto de la entrega. Si el cliente reclama que no le llegó, no hay nada que mostrarle.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {evidencias.map((ev) => (
                        <button
                            key={ev.id}
                            type="button"
                            onClick={() => setAmpliada(ev)}
                            title={`${TIPO_LABEL[ev.tipo ?? ''] ?? 'Evidencia'} · ${moment(ev.tomadaEn).format('DD/MM HH:mm')}`}
                            className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                        >
                            <img
                                src={ev.url}
                                alt={TIPO_LABEL[ev.tipo ?? ''] ?? 'Evidencia de entrega'}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] font-bold py-0.5 text-center">
                                {moment(ev.tomadaEn).format('DD/MM HH:mm')}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {quedan > 0 && (
                <>
                    {!yaEntregado && (
                        <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={marcarEntregado}
                                onChange={(e) => setMarcarEntregado(e.target.checked)}
                                className="w-4 h-4 rounded accent-emerald-500"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                Marcar como <b>entregado</b> y avisar al cliente
                            </span>
                        </label>
                    )}

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        // En el celular abre la cámara directo: el repartidor
                        // registra en la puerta, no al volver al local.
                        capture="environment"
                        multiple
                        hidden
                        onChange={(e) => subir(e.target.files)}
                    />
                    <button
                        type="button"
                        onClick={elegir}
                        disabled={subiendo}
                        className="w-full h-11 rounded-2xl border-2 border-dashed font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                        style={{ borderColor: ACCENT, color: ACCENT }}
                    >
                        <Icon
                            icon={subiendo ? 'eos-icons:loading' : 'solar:camera-add-bold-duotone'}
                            className={`text-lg ${subiendo ? 'animate-spin' : ''}`}
                        />
                        {subiendo ? 'Subiendo…' : 'Tomar o subir foto'}
                    </button>
                </>
            )}

            {ampliada && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setAmpliada(null)} />
                    <div className="relative max-w-md w-full">
                        <img
                            src={ampliada.url}
                            alt="Evidencia de entrega"
                            className="w-full rounded-2xl shadow-2xl"
                        />
                        <div className="mt-3 flex items-center gap-2 text-white text-xs">
                            <Icon icon="solar:clock-circle-bold-duotone" className="text-base" />
                            <span className="font-bold">
                                {moment(ampliada.tomadaEn).format('DD/MM/YYYY HH:mm')}
                            </span>
                            {ampliada.usuarioNombre && <span className="opacity-70">· {ampliada.usuarioNombre}</span>}
                            <a
                                href={ampliada.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto underline font-bold"
                            >
                                Abrir
                            </a>
                            {puedeAnular && (
                                <button
                                    type="button"
                                    onClick={() => anular(ampliada)}
                                    className="text-red-300 font-bold hover:text-red-200"
                                >
                                    Anular
                                </button>
                            )}
                        </div>
                        {ampliada.nota && <p className="mt-1 text-white/70 text-xs italic">{ampliada.nota}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
