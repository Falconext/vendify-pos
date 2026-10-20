import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { get, post, put } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

interface ConfigAlertaStock {
    correo: boolean;
    whatsapp: boolean;
    correos: string;
    celular: string;
    ultimoEnvio: string | null;
    correosAdministradores: string[];
    whatsappConectado: boolean;
    plantilla?: { estado: string; detalle?: string };
}

interface ProductoStockBajo {
    productoId: number;
    descripcion: string;
    sedeNombre: string;
    stock: number;
    minimo: number;
    agotado: boolean;
}

interface ResultadoEnvio {
    productos: number;
    correo: { enviados: string[]; errores: string[] };
    whatsapp: { enviado: boolean; via?: string; error?: string };
}

const fechaHora = (iso: string) =>
    new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Resumen diario de stock bajo por correo y WhatsApp (Perfil → Configuración).
 * La campana del panel ya avisa; esto le llega al dueño aunque no entre.
 */
export default function AlertasStockConfig() {
    const [config, setConfig] = useState<ConfigAlertaStock | null>(null);
    const [productos, setProductos] = useState<ProductoStockBajo[] | null>(null);
    const [correos, setCorreos] = useState('');
    const [celular, setCelular] = useState('');
    const [guardando, setGuardando] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
    const [error, setError] = useState<string | null>(null);

    const alerta = (msg: string, tipo: 'success' | 'error' | 'warning') => useAlertStore.getState().alert(msg, tipo);

    const aplicar = (c: ConfigAlertaStock) => {
        setConfig(c);
        setCorreos(c.correos || '');
        setCelular(c.celular ? c.celular.replace(/^51(?=9\d{8}$)/, '') : '');
    };

    useEffect(() => {
        (async () => {
            const [c, p] = await Promise.all([
                get<ConfigAlertaStock>('notificaciones/alertas-stock'),
                get<ProductoStockBajo[]>('notificaciones/alertas-stock/productos'),
            ]);
            if (c.success && c.data) aplicar(c.data);
            else setError(c.error || 'No se pudo cargar la configuración');
            if (p.success && p.data) setProductos(p.data);
        })();
    }, []);

    const guardar = async (cambios: Partial<{ correo: boolean; whatsapp: boolean; correos: string; celular: string }>, clave: string) => {
        setGuardando(clave);
        const r = await put<ConfigAlertaStock>('notificaciones/alertas-stock', cambios);
        setGuardando(null);
        if (!r.success || !r.data) {
            alerta(r.error || 'No se pudo guardar', 'error');
            return false;
        }
        aplicar(r.data);
        if (r.data.plantilla?.estado === 'error') {
            alerta('Guardado. Ojo: no se pudo registrar el mensaje en tu WhatsApp Business; si el texto no llega, avísanos.', 'warning');
        } else {
            alerta('Configuración guardada', 'success');
        }
        return true;
    };

    const enviarAhora = async () => {
        setEnviando(true);
        setResultado(null);
        const r = await post<ResultadoEnvio>('notificaciones/alertas-stock/enviar', {});
        setEnviando(false);
        if (!r.success || !r.data) {
            alerta(r.error || 'No se pudo enviar', 'error');
            return;
        }
        setResultado(r.data);
    };

    if (error) return <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>;
    if (!config) return <div className="flex h-20 items-center justify-center"><Icon icon="eos-icons:loading" className="h-6 w-6 text-gray-300" /></div>;

    const agotados = (productos ?? []).filter((p) => p.agotado).length;
    const correosDirty = (correos || '').trim() !== (config.correos || '').trim();
    const celularGuardado = config.celular ? config.celular.replace(/^51(?=9\d{8}$)/, '') : '';
    const celularDirty = celular.trim() !== celularGuardado;
    const destinoCorreo = config.correos || config.correosAdministradores.join(', ') || 'sin correos';

    return (
        <div className="space-y-4" data-testid="alertas-stock">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Todos los días a las <strong>8 a. m.</strong> te mandamos la lista de productos que están en su <strong>stock mínimo o por debajo</strong>, por sede,
                con lo que falta para volver al mínimo y un Excel para armar tu pedido. Solo sale si hay algo que reponer.
                El mínimo de cada producto se pone en Kardex.
            </p>

            {productos && (
                <div className={`rounded-xl border p-3 text-sm ${productos.length ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'}`}>
                    {productos.length === 0 ? (
                        <span>Hoy no hay productos en su stock mínimo.</span>
                    ) : (
                        <>
                            <strong>Hoy {productos.length === 1 ? 'saldría 1 producto' : `saldrían ${productos.length} productos`}</strong>
                            {agotados > 0 && ` (${agotados} ${agotados === 1 ? 'agotado' : 'agotados'})`}:{' '}
                            {productos.slice(0, 4).map((p) => `${p.descripcion} (${p.stock})`).join(', ')}
                            {productos.length > 4 ? ` y ${productos.length - 4} más.` : '.'}
                        </>
                    )}
                </div>
            )}

            {/* Correo */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={config.correo}
                        disabled={guardando === 'correo'}
                        onChange={(e) => guardar({ correo: e.target.checked }, 'correo')}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        data-testid="alerta-correo"
                    />
                    <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                            <Icon icon="solar:letter-bold-duotone" className="text-violet-500" width={18} /> Por correo
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">Llega a: {destinoCorreo}</span>
                    </span>
                </label>
                <div className="mt-3 pl-7">
                    <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Otros correos (opcional, separados por coma)</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            value={correos}
                            onChange={(e) => setCorreos(e.target.value)}
                            placeholder={config.correosAdministradores.join(', ') || 'compras@minegocio.com'}
                            className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            data-testid="alerta-correos"
                        />
                        <button
                            type="button"
                            disabled={!correosDirty || guardando === 'correos'}
                            onClick={() => guardar({ correos }, 'correos')}
                            className="h-10 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            {guardando === 'correos' ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Vacío = a los administradores de la cuenta.</p>
                </div>
            </div>

            {/* WhatsApp: solo para quien ya tiene su número conectado (hoy, el plan
                con IA de Ventas). Al resto no se le ofrece algo que su plan no trae. */}
            {(config.whatsappConectado || config.whatsapp) && (
            <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                <label className={`flex items-start gap-3 ${config.whatsappConectado ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                    <input
                        type="checkbox"
                        checked={config.whatsapp}
                        disabled={!config.whatsappConectado || guardando === 'whatsapp'}
                        onChange={(e) => guardar({ whatsapp: e.target.checked, ...(e.target.checked && celularDirty ? { celular } : {}) }, 'whatsapp')}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        data-testid="alerta-whatsapp"
                    />
                    <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                            <Icon icon="mdi:whatsapp" className="text-[#25D366]" width={18} /> Por WhatsApp
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                            {config.whatsappConectado
                                ? 'Sale desde el número de WhatsApp de tu negocio hacia el celular que pongas.'
                                : 'Disponible cuando conectes el WhatsApp de tu negocio (Conectar mi WhatsApp). Mientras tanto, usa el correo.'}
                        </span>
                    </span>
                </label>
                {config.whatsappConectado && (
                    <div className="mt-3 pl-7">
                        <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Celular que recibe el aviso</label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                value={celular}
                                onChange={(e) => setCelular(e.target.value)}
                                placeholder="987654321"
                                inputMode="tel"
                                className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                data-testid="alerta-celular"
                            />
                            <button
                                type="button"
                                disabled={!celularDirty || guardando === 'celular'}
                                onClick={() => guardar({ celular }, 'celular')}
                                className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                            >
                                {guardando === 'celular' ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">Tiene que ser distinto al número del negocio.</p>
                    </div>
                )}
            </div>
            )}

            <div className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {config.ultimoEnvio ? `Último resumen automático: ${fechaHora(config.ultimoEnvio)}` : 'Aún no ha salido ningún resumen automático.'}
                </span>
                <button
                    type="button"
                    onClick={enviarAhora}
                    disabled={enviando}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300"
                    data-testid="alerta-enviar"
                >
                    <Icon icon="solar:plain-bold-duotone" width={16} />
                    {enviando ? 'Enviando…' : 'Enviarme el resumen ahora'}
                </button>
            </div>

            {resultado && (
                <div className="rounded-xl border border-gray-200 p-3 text-xs text-gray-600 dark:border-slate-700 dark:text-gray-300" data-testid="alerta-resultado">
                    <p><strong>{resultado.productos}</strong> {resultado.productos === 1 ? 'producto' : 'productos'} en la lista.</p>
                    {resultado.correo.enviados.length > 0 && <p className="text-emerald-700 dark:text-emerald-400">✓ Correo enviado a {resultado.correo.enviados.join(', ')}</p>}
                    {resultado.correo.errores.map((e) => <p key={e} className="text-rose-600">✗ Correo: {e}</p>)}
                    {resultado.whatsapp.enviado && <p className="text-emerald-700 dark:text-emerald-400">✓ WhatsApp enviado</p>}
                    {!resultado.whatsapp.enviado && config.whatsapp && resultado.whatsapp.error && (
                        <p className="text-rose-600">✗ WhatsApp: {resultado.whatsapp.error}</p>
                    )}
                </div>
            )}
        </div>
    );
}
