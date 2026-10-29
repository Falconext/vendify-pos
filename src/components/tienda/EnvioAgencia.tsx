import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

/**
 * Envío por agencia (Shalom / Olva) en el checkout de la tienda.
 *
 * Hay ~45 plantillas y cada una dibuja su propio formulario, pero todas
 * confirman con el mismo `ConfirmOrderModal`. Por eso la elección de la
 * agencia vive ahí: el checkout (`Checkout.tsx`) pone este contexto y el
 * modal lo lee. Una plantilla nueva lo tiene sin hacer nada.
 *
 * Sin contexto (vista previa del editor) o sin agencias encendidas en la
 * tienda, el modal se ve como siempre.
 */

export type CourierTienda = 'SHALOM' | 'OLVA';

export const NOMBRE_COURIER: Record<CourierTienda, string> = {
    SHALOM: 'Shalom',
    OLVA: 'Olva Courier',
};

export interface AgenciaTienda {
    id: string;
    nombre: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion?: string;
}

export interface EnvioAgenciaValor {
    /** DOMICILIO = a la dirección del cliente; si no, el courier elegido. */
    modo: 'DOMICILIO' | CourierTienda;
    agenciaId: string;
    agenciaNombre: string;
    documento: string;
}

export const ENVIO_AGENCIA_INICIAL: EnvioAgenciaValor = { modo: 'DOMICILIO', agenciaId: '', agenciaNombre: '', documento: '' };

interface Ctx {
    couriers: CourierTienda[];
    tipoEntrega: 'RECOJO' | 'ENVIO';
    valor: EnvioAgenciaValor;
    setValor: (v: EnvioAgenciaValor) => void;
    direccion: string;
    setDireccion: (d: string) => void;
    cargarAgencias: (c: CourierTienda) => Promise<AgenciaTienda[]>;
}

export const EnvioAgenciaContext = createContext<Ctx | null>(null);

/** El modal muestra la sección solo si hay algo que elegir. */
export function useEnvioAgencia() {
    const ctx = useContext(EnvioAgenciaContext);
    const activo = !!ctx && ctx.tipoEntrega === 'ENVIO' && ctx.couriers.length > 0;
    return { ctx, activo };
}

/** Qué falta para poder confirmar, o null si está completo. */
export function faltaEnvioAgencia(v: EnvioAgenciaValor, direccion: string): string | null {
    if (v.modo === 'DOMICILIO') return direccion.trim() ? null : 'Escribe la dirección de entrega.';
    if (!v.agenciaNombre) return 'Elige la agencia donde recogerás tu pedido.';
    if (![8, 9, 11].includes(v.documento.replace(/\D/g, '').length)) {
        return 'Ingresa tu DNI: la agencia lo pide para entregarte el paquete.';
    }
    return null;
}

/** Lo que viaja al servidor con el pedido. Vacío si va a domicilio. */
export function payloadEnvioAgencia(v: EnvioAgenciaValor, tipoEntrega: string) {
    if (tipoEntrega !== 'ENVIO' || v.modo === 'DOMICILIO') return {};
    return {
        envioCourier: v.modo,
        envioAgenciaId: v.agenciaId || undefined,
        envioAgenciaNombre: v.agenciaNombre,
        clienteDocumento: v.documento.replace(/\D/g, ''),
    };
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function EnvioAgenciaSeccion({ color, error }: { color: string; error?: string | null }) {
    const { ctx, activo } = useEnvioAgencia();
    const [agencias, setAgencias] = useState<AgenciaTienda[] | null>(null);
    const [cargando, setCargando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const modo = ctx?.valor.modo ?? 'DOMICILIO';

    useEffect(() => {
        if (!ctx || modo === 'DOMICILIO') return;
        let vivo = true;
        setAgencias(null);
        setCargando(true);
        ctx.cargarAgencias(modo)
            .then((r) => vivo && setAgencias(r))
            .catch(() => vivo && setAgencias([]))
            .finally(() => vivo && setCargando(false));
        return () => {
            vivo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modo]);

    const filtradas = useMemo(() => {
        const q = normalizar(busqueda.trim());
        const lista = agencias ?? [];
        const r = q
            ? lista.filter((a) => normalizar(`${a.nombre} ${a.distrito} ${a.provincia} ${a.departamento}`).includes(q))
            : lista;
        return r.slice(0, 60);
    }, [agencias, busqueda]);

    if (!activo || !ctx) return null;
    const { valor, setValor } = ctx;
    const opciones: { id: EnvioAgenciaValor['modo']; label: string; icon: string }[] = [
        { id: 'DOMICILIO', label: 'A mi dirección', icon: 'solar:home-2-linear' },
        ...ctx.couriers.map((c) => ({ id: c, label: `Agencia ${NOMBRE_COURIER[c]}`, icon: 'solar:box-linear' })),
    ];

    return (
        <div className="mb-5 space-y-3 text-left">
            <p className="text-sm font-bold text-gray-900">¿Cómo te lo enviamos?</p>
            <div className="grid gap-2">
                {opciones.map((o) => {
                    const activa = valor.modo === o.id;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                                if (activa) return;
                                setBusqueda('');
                                setValor({ ...valor, modo: o.id, agenciaId: '', agenciaNombre: '' });
                            }}
                            className="flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition"
                            style={{ borderColor: activa ? color : '#E5E7EB', background: activa ? `${color}0D` : '#fff' }}
                        >
                            <Icon icon={o.icon} className="h-5 w-5 flex-none" style={{ color: activa ? color : '#6B7280' }} />
                            <span className="flex-1 text-gray-800">{o.label}</span>
                            {activa && <Icon icon="solar:check-circle-bold" className="h-5 w-5" style={{ color }} />}
                        </button>
                    );
                })}
            </div>

            {valor.modo === 'DOMICILIO' ? (
                <input
                    type="text"
                    value={ctx.direccion}
                    onChange={(e) => ctx.setDireccion(e.target.value)}
                    placeholder="Dirección de entrega *"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />
            ) : (
                <>
                    {valor.agenciaNombre ? (
                        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                            <Icon icon="solar:map-point-bold" className="mt-0.5 h-4 w-4 flex-none" style={{ color }} />
                            <span className="flex-1 text-sm text-gray-800">{valor.agenciaNombre}</span>
                            <button
                                type="button"
                                onClick={() => setValor({ ...valor, agenciaId: '', agenciaNombre: '' })}
                                className="text-xs font-semibold text-gray-500 underline"
                            >
                                Cambiar
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-gray-200">
                            <input
                                type="search"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Busca tu ciudad o distrito"
                                className="w-full rounded-t-xl border-0 border-b border-gray-100 px-3 py-2.5 text-sm outline-none"
                            />
                            <div className="max-h-48 overflow-y-auto">
                                {cargando && <p className="px-3 py-3 text-xs text-gray-500">Cargando agencias…</p>}
                                {!cargando && agencias && !filtradas.length && (
                                    <p className="px-3 py-3 text-xs text-gray-500">
                                        {agencias.length ? 'No encontramos agencias con ese nombre.' : 'No pudimos cargar las agencias. Intenta de nuevo.'}
                                    </p>
                                )}
                                {filtradas.map((a) => {
                                    const nombre = [a.nombre, a.provincia, a.departamento].filter(Boolean).join(' - ');
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => setValor({ ...valor, agenciaId: a.id, agenciaNombre: nombre })}
                                            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                                        >
                                            <span className="block text-sm font-medium text-gray-800">{nombre}</span>
                                            {a.direccion && <span className="block text-xs text-gray-500">{a.direccion}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <input
                        type="text"
                        inputMode="numeric"
                        value={valor.documento}
                        maxLength={11}
                        onChange={(e) => setValor({ ...valor, documento: e.target.value.replace(/\D/g, '') })}
                        placeholder="Tu DNI (lo pide la agencia al entregar) *"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                    />
                </>
            )}
            {error && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                    <Icon icon="solar:danger-circle-linear" className="h-4 w-4" /> {error}
                </p>
            )}
        </div>
    );
}
