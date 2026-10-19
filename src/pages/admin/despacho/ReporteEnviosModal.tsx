import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import Modal from '@/components/Modal';
import { Calendar } from '@/components/Date';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

/**
 * Reporte de envíos por rango y courier.
 *
 * El botón "Exportar reparto" del panel sigue siendo la operación del día (la
 * plantilla de carga masiva del motorizado, un clic, sin preguntar nada). Este
 * modal es el eje analítico que pidió el empresario: a dónde manda más, mes a
 * mes, con Shalom y Olva incluidos — las mismas estadísticas que ya existían
 * solo para el reparto propio.
 */

type Courier = 'PROPIOS' | 'SHALOM' | 'OLVA' | 'TODOS';

const COURIERS: { key: Courier; label: string; icon: string }[] = [
    { key: 'SHALOM', label: 'Shalom', icon: 'solar:box-bold-duotone' },
    { key: 'OLVA', label: 'Olva', icon: 'solar:box-bold-duotone' },
    { key: 'PROPIOS', label: 'Reparto propio', icon: 'solar:scooter-bold-duotone' },
    { key: 'TODOS', label: 'Todos', icon: 'solar:chart-2-bold-duotone' },
];

type Grupo = {
    nombre: string;
    pedidos: number;
    montoCobrar: number;
    totalVenta: number;
    /** Lo que se le pagó al courier en ese grupo (gasto del negocio). */
    costoCourier?: number;
};

type Resumen = {
    totales: {
        pedidos: number;
        completos: number;
        contraentrega: number;
        montoCobrar: number;
        totalVenta: number;
        costoEnvio: number;
        costoCourier: number;
        entregados: number;
    };
    porMes?: Grupo[];
    porDestino?: Grupo[];
    porCourier?: Grupo[];
    porEstado?: Grupo[];
    porSede?: Grupo[];
    incompletos?: { documento: string; falta: string }[];
};

export function ReporteEnviosModal({ onClose }: { onClose: () => void }) {
    const { alert } = useAlertStore();
    const [courier, setCourier] = useState<Courier>('SHALOM');
    const [desde, setDesde] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [hasta, setHasta] = useState(moment().format('YYYY-MM-DD'));
    const [resumen, setResumen] = useState<Resumen | null>(null);
    const [cargando, setCargando] = useState(false);
    const [descargando, setDescargando] = useState(false);

    const params = useMemo(() => {
        const p = new URLSearchParams();
        p.set('fecha', desde);
        p.set('fechaFin', hasta);
        p.set('courier', courier);
        return p.toString();
    }, [desde, hasta, courier]);

    useEffect(() => {
        let vivo = true;
        setCargando(true);
        apiClient
            .get<any>(`/envio-despacho/reparto/resumen?${params}`)
            .then((resp) => {
                if (!vivo) return;
                const r = resp?.data?.data ?? resp?.data ?? null;
                setResumen(r && typeof r === 'object' && 'totales' in r ? r : null);
            })
            .catch(() => {
                if (vivo) setResumen(null);
            })
            .finally(() => {
                if (vivo) setCargando(false);
            });
        return () => {
            vivo = false;
        };
    }, [params]);

    const descargar = useCallback(async () => {
        if (descargando) return;
        setDescargando(true);
        try {
            const resp = await apiClient.get(`/envio-despacho/reparto/exportar?${params}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(resp.data as Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `envios_${courier.toLowerCase()}_${desde}_a_${hasta}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo descargar el reporte de envíos', 'error');
        } finally {
            setDescargando(false);
        }
    }, [params, courier, desde, hasta, descargando, alert]);

    const preset = (d: string, h: string) => {
        setDesde(d);
        setHasta(h);
    };

    const t = resumen?.totales;
    const sinDatos = !cargando && (!t || t.pedidos === 0);

    return (
        <Modal
            isOpenModal
            closeModal={onClose}
            title="Reporte de envíos"
            icon="solar:chart-2-bold-duotone"
            width="900px"
        >
            <div className="p-5">
                {/* Courier */}
                <div className="flex flex-wrap gap-2">
                    {COURIERS.map((c) => (
                        <button
                            key={c.key}
                            type="button"
                            onClick={() => setCourier(c.key)}
                            data-testid={`reporte-courier-${c.key}`}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                                courier === c.key
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
                            }`}
                        >
                            <Icon icon={c.icon} className="text-base" />
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Rango */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <Calendar
                        text="Desde"
                        name="desde"
                        value={moment(desde).format('DD/MM/YYYY')}
                        onChange={(date) => {
                            if (moment(date, 'DD/MM/YYYY', true).isValid())
                                setDesde(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
                        }}
                    />
                    <Calendar
                        text="Hasta"
                        name="hasta"
                        value={moment(hasta).format('DD/MM/YYYY')}
                        onChange={(date) => {
                            if (moment(date, 'DD/MM/YYYY', true).isValid())
                                setHasta(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
                        }}
                    />
                    <div className="flex flex-wrap gap-1.5 pb-1">
                        {[
                            {
                                label: 'Este mes',
                                d: moment().startOf('month').format('YYYY-MM-DD'),
                                h: moment().format('YYYY-MM-DD'),
                            },
                            {
                                label: 'Mes pasado',
                                d: moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
                                h: moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
                            },
                            {
                                label: 'Últimos 15 días',
                                d: moment().subtract(14, 'days').format('YYYY-MM-DD'),
                                h: moment().format('YYYY-MM-DD'),
                            },
                            {
                                label: 'Este año',
                                d: moment().startOf('year').format('YYYY-MM-DD'),
                                h: moment().format('YYYY-MM-DD'),
                            },
                        ].map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => preset(p.d, p.h)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Totales */}
                {cargando && (
                    <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                        <Icon icon="eos-icons:loading" /> Calculando…
                    </p>
                )}

                {sinDatos && (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                        <Icon
                            icon="solar:box-minimalistic-broken"
                            className="mx-auto text-3xl text-slate-400"
                        />
                        <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                            No hay envíos en ese rango
                        </p>
                        <p className="text-xs text-slate-500">
                            Prueba con otro courier o amplía las fechas.
                        </p>
                    </div>
                )}

                {!cargando && t && t.pedidos > 0 && (
                    <>
                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                                { label: 'Envíos', value: t.pedidos },
                                { label: 'Entregados', value: t.entregados },
                                { label: 'Venta (S/)', value: Number(t.totalVenta).toFixed(2) },
                                { label: 'Flete (S/)', value: Number(t.costoEnvio).toFixed(2) },
                                { label: 'Pagado al courier (S/)', value: Number(t.costoCourier ?? 0).toFixed(2) },
                            ].map((k) => (
                                <div
                                    key={k.label}
                                    className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                                >
                                    <p className="text-lg font-black leading-tight text-slate-900 dark:text-white">
                                        {k.value}
                                    </p>
                                    <p className="text-[11px] text-slate-500">{k.label}</p>
                                </div>
                            ))}
                        </div>

                        {Number(resumen?.incompletos?.length ?? 0) > 0 && (
                            <p className="mt-3 flex items-start gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                <Icon icon="solar:danger-triangle-bold" className="mt-0.5 shrink-0" />
                                <span>
                                    {resumen!.incompletos!.length} sin datos completos para la guía:{' '}
                                    {resumen!.incompletos!.slice(0, 4).map((i) => i.documento).join(', ')}
                                    {resumen!.incompletos!.length > 4 ? '…' : ''}
                                </span>
                            </p>
                        )}

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <Bloque
                                titulo="Mes a mes"
                                icono="solar:calendar-bold-duotone"
                                grupos={resumen?.porMes}
                                etiqueta={(n) =>
                                    moment(n, 'YYYY-MM', true).isValid()
                                        ? moment(n, 'YYYY-MM').format('MMM YYYY')
                                        : n
                                }
                            />
                            <Bloque
                                // Mismo criterio que el Excel: en "todos" el eje
                                // mezcla agencias y distritos, así que no se
                                // puede llamar "por agencia".
                                titulo={
                                    courier === 'PROPIOS'
                                        ? 'Por distrito'
                                        : courier === 'TODOS'
                                          ? 'Por destino'
                                          : 'Por agencia destino'
                                }
                                icono="solar:map-point-bold-duotone"
                                grupos={resumen?.porDestino}
                            />
                            {courier === 'TODOS' && (
                                <Bloque
                                    titulo="Por courier"
                                    icono="solar:delivery-bold-duotone"
                                    grupos={resumen?.porCourier}
                                />
                            )}
                            <Bloque
                                titulo="Por estado"
                                icono="solar:clipboard-check-bold-duotone"
                                grupos={resumen?.porEstado}
                            />
                        </div>
                    </>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={descargar}
                        disabled={descargando || sinDatos}
                        data-testid="btn-descargar-reporte-envios"
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        <Icon
                            icon={descargando ? 'eos-icons:loading' : 'solar:file-download-bold-duotone'}
                            className="text-base"
                        />
                        Descargar Excel
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function Bloque({
    titulo,
    icono,
    grupos,
    etiqueta,
}: {
    titulo: string;
    icono: string;
    grupos?: Grupo[];
    etiqueta?: (nombre: string) => string;
}) {
    if (!Array.isArray(grupos) || grupos.length === 0) return null;
    const max = Math.max(...grupos.map((g) => g.pedidos), 1);
    return (
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <Icon icon={icono} className="text-base" />
                {titulo}
            </p>
            <div className="mt-2 space-y-1.5">
                {grupos.slice(0, 8).map((g) => (
                    <div key={g.nombre}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                                {etiqueta ? etiqueta(g.nombre) : g.nombre}
                            </span>
                            <span className="shrink-0 font-black text-slate-900 dark:text-white">
                                {g.pedidos}
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${(g.pedidos / max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
