import { useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import ModalConfirm from '@/components/ModalConfirm';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

type Tipo = 'PRECIO' | 'VOLUMEN';
type Mayorista = { cantidadMinima: number; precio: number }[];

interface Fila {
    fila: number;
    codigo: string;
    estado: 'CAMBIA' | 'SIN_CAMBIO' | 'ERROR';
    mensaje?: string;
    descripcion?: string;
    precioActual?: number;
    precioNuevo?: number | null;
    mayoristaActual?: Mayorista;
    mayoristaNuevo?: Mayorista | null;
    sedesConPrecioPropio?: number;
}

interface Preview {
    tipo: Tipo;
    filas: Fila[];
    resumen: { total: number; cambian: number; sinCambio: number; errores: number };
}

const soles = (n: number | null | undefined) => (n == null ? '—' : `S/ ${Number(n).toFixed(2)}`);

/** "1–5: S/ 10 · 6+: S/ 9" a partir del precio normal y los escalones. */
const tramosTexto = (base: number | null | undefined, may: Mayorista | null | undefined) => {
    const escalones = [...(may || [])].sort((a, b) => a.cantidadMinima - b.cantidadMinima);
    const partes: string[] = [];
    if (base != null) partes.push(`${escalones[0] ? `1–${escalones[0].cantidadMinima - 1}` : '1+'}: ${soles(base)}`);
    escalones.forEach((e, i) => {
        const sig = escalones[i + 1];
        partes.push(`${sig ? `${e.cantidadMinima}–${sig.cantidadMinima - 1}` : `${e.cantidadMinima}+`}: ${soles(e.precio)}`);
    });
    return partes.length ? partes.join(' · ') : 'Sin precios por volumen';
};

const descargar = (blob: Blob, nombre: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

const FORMATOS: { tipo: Tipo; titulo: string; detalle: string; columnas: string; reglas: string[] }[] = [
    {
        tipo: 'PRECIO',
        titulo: 'Precio normal',
        detalle: 'Cambia el precio de venta de cada producto.',
        columnas: 'Código | Precio',
        reglas: [
            'Código: el código del producto en tu Kardex (o su código de barras).',
            'Precio: el nuevo precio de venta, con IGV si el producto es gravado. Ej: 12.50',
        ],
    },
    {
        tipo: 'VOLUMEN',
        titulo: 'Precios por volumen',
        detalle: 'Precio según cuántas unidades lleva el cliente.',
        columnas: 'Código | RangoInicial1 | RangoFinal1 | Precio1 | RangoInicial2 …',
        reglas: [
            'Cada tramo son 3 columnas: desde, hasta y precio. Agrega RangoInicial3, RangoFinal3, Precio3… si necesitas más.',
            'El tramo que empieza en 1 es el precio normal; los demás son el precio por cantidad.',
            'Los tramos van en orden y no se pisan: 1–5, 6–11, 12 en adelante.',
            'Deja "hasta" vacío solo en el último tramo (significa "en adelante").',
            'Los precios por volumen del archivo reemplazan a los que el producto tenía.',
        ],
    },
];

/**
 * Reprecio del Kardex con Excel. Igual que el reprecio por porcentaje, nada se
 * guarda hasta ver el antes y el después de cada fila; y al aplicar se descarga
 * un respaldo con los precios anteriores en el mismo formato, que se vuelve a
 * subir para deshacer.
 */
export default function ReprecioExcel() {
    const { alert } = useAlertStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [cargando, setCargando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const [soloErrores, setSoloErrores] = useState(false);

    const filas = useMemo(
        () => (preview?.filas || []).filter((f) => !soloErrores || f.estado === 'ERROR'),
        [preview, soloErrores],
    );

    const bajarPlantilla = async (tipo: Tipo) => {
        try {
            const res = await apiClient.get(`/reprecio-excel/plantilla?tipo=${tipo}`, { responseType: 'blob' });
            descargar(new Blob([res.data]), tipo === 'VOLUMEN' ? 'Plantilla_Precios_Por_Volumen.xlsx' : 'Plantilla_Precios.xlsx');
        } catch {
            alert('No se pudo descargar la plantilla', 'error');
        }
    };

    const formulario = (f: File) => {
        const fd = new FormData();
        fd.append('file', f);
        return fd;
    };

    const revisar = async (f: File) => {
        setArchivo(f);
        setPreview(null);
        setCargando(true);
        try {
            const res = await apiClient.post('/reprecio-excel/previsualizar', formulario(f), {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            const data: Preview = res.data?.data ?? res.data;
            setPreview(data);
            setSoloErrores(false);
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo leer el Excel', 'error');
            setArchivo(null);
        } finally {
            setCargando(false);
        }
    };

    const aplicar = async () => {
        if (!archivo) return;
        setConfirmar(false);
        setAplicando(true);
        try {
            const res = await apiClient.post('/reprecio-excel/aplicar', formulario(archivo), {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 180000,
            });
            const data = res.data?.data ?? res.data;
            const bytes = Uint8Array.from(atob(data.respaldoBase64), (c) => c.charCodeAt(0));
            const fecha = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
            descargar(new Blob([bytes]), `Respaldo_precios_${fecha}.xlsx`);
            alert(`Listo: ${data.actualizados} productos actualizados. Se descargó un respaldo con los precios anteriores.`, 'success');
            setPreview(null);
            setArchivo(null);
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo aplicar el reprecio', 'error');
        } finally {
            setAplicando(false);
        }
    };

    const badge = (f: Fila) =>
        f.estado === 'CAMBIA'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : f.estado === 'SIN_CAMBIO'
                ? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';

    return (
        <div className="space-y-4">
            {/* Guía */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon icon="solar:document-text-bold-duotone" className="text-violet-600" /> Cómo subir tus precios con Excel
                </h2>
                <ol className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-300">
                    {[
                        ['1', 'Descarga la plantilla', 'Elige precio normal o precios por volumen.'],
                        ['2', 'Llénala', 'Una fila por producto, con el código que tiene en tu Kardex.'],
                        ['3', 'Súbela y revisa', 'Ves el antes y el después de cada producto. Nada se guarda todavía.'],
                        ['4', 'Aplica', 'Se guardan los cambios y se descarga un respaldo para deshacer.'],
                    ].map(([n, t, d]) => (
                        <li key={n} className="flex gap-2 rounded-xl bg-gray-50 dark:bg-slate-800/40 p-3">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-[11px] font-black text-white">{n}</span>
                            <span><strong className="block text-gray-900 dark:text-white">{t}</strong>{d}</span>
                        </li>
                    ))}
                </ol>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {FORMATOS.map((f) => (
                        <div key={f.tipo} className="rounded-xl border border-gray-100 dark:border-slate-800 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{f.titulo}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{f.detalle}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => bajarPlantilla(f.tipo)}
                                    data-testid={`rx-plantilla-${f.tipo}`}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                                >
                                    <Icon icon="solar:download-minimalistic-bold" width={15} /> Plantilla
                                </button>
                            </div>
                            <p className="mt-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 px-2.5 py-1.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">{f.columnas}</p>
                            <ul className="mt-2 space-y-1">
                                {f.reglas.map((r) => (
                                    <li key={r} className="flex gap-1.5 text-[11px] leading-snug text-gray-600 dark:text-gray-400">
                                        <Icon icon="solar:check-circle-linear" className="mt-0.5 shrink-0 text-violet-500" width={13} /> {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                    El archivo se reconoce solo: si tiene columnas RangoInicial es de precios por volumen. Solo se lee la primera hoja.
                    Si una sede tiene su propio precio, ahí se sigue cobrando ese hasta que lo cambies en la sede.
                </p>
            </div>

            {/* Subir */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    data-testid="rx-archivo"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) revisar(f);
                    }}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={cargando || aplicando}
                    className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-6 text-center transition hover:border-violet-400 disabled:opacity-60"
                >
                    <Icon icon={cargando ? 'svg-spinners:180-ring' : 'solar:upload-minimalistic-bold-duotone'} className="text-violet-500" width={28} />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        {archivo ? archivo.name : 'Sube tu Excel de precios'}
                    </span>
                    <span className="text-xs text-gray-400">{archivo ? 'Clic para elegir otro archivo' : '.xlsx o .xls, máximo 10 MB'}</span>
                </button>
            </div>

            {/* Revisión */}
            {preview && (
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 p-5" data-testid="rx-preview">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                {preview.tipo === 'VOLUMEN' ? 'Precios por volumen' : 'Precio normal'}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{preview.resumen.cambian} cambian</span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-500 dark:bg-slate-800 dark:text-gray-400">{preview.resumen.sinCambio} sin cambio</span>
                            {preview.resumen.errores > 0 && (
                                <button type="button" onClick={() => setSoloErrores((v) => !v)} className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                    {preview.resumen.errores} con error {soloErrores ? '· ver todos' : '· ver solo estos'}
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={preview.resumen.cambian === 0 || aplicando}
                            onClick={() => setConfirmar(true)}
                            data-testid="rx-aplicar"
                            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Icon icon={aplicando ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={18} />
                            Aplicar {preview.resumen.cambian} {preview.resumen.cambian === 1 ? 'cambio' : 'cambios'}
                        </button>
                    </div>
                    {preview.resumen.errores > 0 && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Las filas con error no se aplican. Corrígelas en el Excel y vuelve a subirlo, o aplica solo las que están bien.</p>
                    )}

                    <div className="mt-3 max-h-[60vh] overflow-auto rounded-xl border border-gray-100 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-gray-400 dark:bg-[#111827]">
                                <tr className="border-b border-gray-100 dark:border-slate-800">
                                    <th className="px-3 py-2">Fila</th>
                                    <th className="px-3 py-2">Producto</th>
                                    <th className="px-3 py-2">Antes</th>
                                    <th className="px-3 py-2">Después</th>
                                    <th className="px-3 py-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((f) => (
                                    <tr key={f.fila} className="border-b border-gray-50 last:border-0 dark:border-slate-800/60 align-top">
                                        <td className="px-3 py-2 text-gray-400">{f.fila}</td>
                                        <td className="px-3 py-2">
                                            <p className="font-bold text-gray-900 dark:text-white">{f.descripcion || '—'}</p>
                                            <p className="text-[11px] text-gray-400">{f.codigo || 'sin código'}</p>
                                        </td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                            {f.estado === 'ERROR' && f.precioActual == null ? '—' : preview.tipo === 'VOLUMEN' ? tramosTexto(f.precioActual, f.mayoristaActual) : soles(f.precioActual)}
                                        </td>
                                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                                            {f.estado === 'ERROR' ? '—' : preview.tipo === 'VOLUMEN' ? tramosTexto(f.precioNuevo ?? f.precioActual, f.mayoristaNuevo) : soles(f.precioNuevo)}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${badge(f)}`}>
                                                {f.estado === 'CAMBIA' ? 'Cambia' : f.estado === 'SIN_CAMBIO' ? 'Sin cambio' : 'Error'}
                                            </span>
                                            {f.mensaje && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">{f.mensaje}</p>}
                                            {!!f.sedesConPrecioPropio && f.estado === 'CAMBIA' && (
                                                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">
                                                    {f.sedesConPrecioPropio === 1 ? '1 sede tiene' : `${f.sedesConPrecioPropio} sedes tienen`} su propio precio
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ModalConfirm
                isOpenModal={confirmar}
                setIsOpenModal={setConfirmar}
                title="Aplicar los nuevos precios"
                information={`Se actualizan ${preview?.resumen.cambian ?? 0} productos. Al terminar se descarga un Excel con los precios anteriores: si algo salió mal, súbelo aquí mismo y todo vuelve a como estaba.`}
                confirmSubmit={aplicar}
            />
        </div>
    );
}
