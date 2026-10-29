import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { post } from '@/utils/fetch';
import { generarGuiaShalomAuto, type ResultadoGuiaShalom } from '@/utils/guiaShalomAuto';
import type { PedidoTiendaAdmin } from '@/features/admin/tienda/usePedidosViewModel';

/**
 * Pedido de la tienda → nota de venta con su envío, en un clic.
 *
 * Pregunta lo único que el sistema no sabe (si el cliente ya pagó algo) y
 * ofrece dos caminos: generarla ya (backend `tienda/pedidos/:id/nota-venta`:
 * nota + pedido vinculado + despacho, y luego la guía Shalom si la empresa la
 * tiene automática) o revisarla en el punto de venta como antes.
 */

const MEDIOS = [
    { id: 'EFECTIVO', label: 'Efectivo', icon: 'solar:wallet-money-bold' },
    { id: 'YAPE', label: 'Yape', icon: 'solar:smartphone-2-bold' },
    { id: 'PLIN', label: 'Plin', icon: 'solar:smartphone-2-bold' },
    { id: 'TRANSFERENCIA', label: 'Transferencia', icon: 'solar:card-transfer-bold' },
    { id: 'TARJETA', label: 'Tarjeta', icon: 'solar:card-bold' },
] as const;
type Medio = (typeof MEDIOS)[number]['id'];
type Pago = 'NADA' | 'ADELANTO' | 'TODO';

const money = (v: number) => `S/ ${v.toFixed(2)}`;

/** El medio con que el cliente pagó en la tienda, en los del punto de venta. */
function medioDelPedido(medio?: string): Medio {
    const m = String(medio || '').toUpperCase();
    return (['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'] as string[]).includes(m) ? (m as Medio) : m ? 'TARJETA' : 'EFECTIVO';
}

interface Resultado {
    comprobante: { id: number; serie: string; correlativo: number; mtoImpVenta: number | string; saldo: number | string } | null;
    despacho: { id: number; transportista: string | null } | null;
    avisoDespacho: string | null;
}

interface Props {
    pedido: PedidoTiendaAdmin | null;
    onClose: () => void;
    onRevisarEnPos: (pedido: PedidoTiendaAdmin) => void;
    onVerNota: (comprobanteId: number) => void;
    onGenerada: () => void;
}

export default function ModalNotaVentaPedido({ pedido, onClose, onRevisarEnPos, onVerNota, onGenerada }: Props) {
    const [pago, setPago] = useState<Pago>('NADA');
    const [adelanto, setAdelanto] = useState('');
    const [medio, setMedio] = useState<Medio>('EFECTIVO');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [guia, setGuia] = useState<ResultadoGuiaShalom | 'cargando'>(null);

    // Arranca con lo que ya se sabe del pedido: lo pagado en la tienda.
    useEffect(() => {
        if (!pedido) return;
        const pagado = Number(pedido.montoPagado || 0);
        const total = Number(pedido.total || 0);
        setPago(pagado >= total - 0.009 && total > 0 ? 'TODO' : pagado > 0 ? 'ADELANTO' : 'NADA');
        setAdelanto(pagado > 0 && pagado < total ? pagado.toFixed(2) : '');
        setMedio(medioDelPedido(pedido.medioPago));
        setError(null);
        setResultado(null);
        setGuia(null);
    }, [pedido]);

    const total = Number(pedido?.total || 0);
    const montoAdelanto = pago === 'TODO' ? total : pago === 'ADELANTO' ? Number(adelanto || 0) : 0;
    const porCobrar = Math.max(0, total - montoAdelanto);
    const errorAdelanto = useMemo(() => {
        if (pago !== 'ADELANTO') return null;
        const n = Number(adelanto);
        if (!adelanto.trim() || !(n > 0)) return 'Escribe cuánto dejó de adelanto.';
        if (n >= total) return 'Si pagó todo, elige "Ya pagó todo".';
        return null;
    }, [pago, adelanto, total]);

    if (!pedido) return null;

    const envio =
        pedido.tipoEntrega !== 'ENVIO'
            ? { icon: 'solar:shop-2-bold', texto: 'Recojo en tienda · sin despacho' }
            : pedido.envioCourier
                ? { icon: 'solar:box-bold', texto: `Agencia ${pedido.envioCourier === 'OLVA' ? 'Olva' : 'Shalom'} · ${pedido.envioAgenciaNombre || '—'}${pedido.clienteDocumento ? ` · DNI ${pedido.clienteDocumento}` : ''}` }
                : { icon: 'solar:delivery-bold', texto: `A domicilio · ${pedido.clienteDireccion || 'dirección por coordinar'}` };

    const generar = async () => {
        if (errorAdelanto) return setError(errorAdelanto);
        setEnviando(true);
        setError(null);
        const resp: any = await post(`tienda/pedidos/${pedido.id}/nota-venta`, {
            adelanto: montoAdelanto,
            ...(montoAdelanto > 0 ? { medioPago: medio } : {}),
        });
        setEnviando(false);
        if (!resp?.success) return setError(resp?.error || 'No se pudo generar la nota de venta.');
        const r: Resultado = resp.data;
        setResultado(r);
        onGenerada();
        if (r.comprobante && r.despacho?.transportista) {
            setGuia('cargando');
            setGuia(await generarGuiaShalomAuto(r.comprobante.id, r.despacho.transportista));
        }
    };

    const numero = resultado?.comprobante
        ? `${resultado.comprobante.serie}-${String(resultado.comprobante.correlativo).padStart(8, '0')}`
        : '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={enviando ? undefined : onClose} />
            <div className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111827]" data-testid="modal-nv-pedido">
                {!resultado ? (
                    <>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Nota de venta con envío</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{pedido.codigoSeguimiento} · {pedido.clienteNombre}</p>
                            </div>
                            <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-800">
                                <Icon icon="solar:close-circle-bold-duotone" width={22} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="flex justify-between text-gray-600 dark:text-gray-300">
                                <span>{pedido.items.length} producto{pedido.items.length === 1 ? '' : 's'}{Number(pedido.costoEnvio) > 0 ? ` + envío ${money(Number(pedido.costoEnvio))}` : ''}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{money(total)}</span>
                            </div>
                            <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                                <Icon icon={envio.icon} className="mt-0.5 flex-none text-violet-500" />
                                <span>{envio.texto}</span>
                            </div>
                        </div>

                        <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">¿El cliente dejó un adelanto?</p>
                        <div className="mb-3 grid gap-2">
                            {([
                                { id: 'NADA', label: 'No, todo queda por cobrar', desc: 'Se cobra al entregar o al recoger.' },
                                { id: 'ADELANTO', label: 'Sí, dejó un adelanto', desc: 'El resto queda como saldo por cobrar.' },
                                { id: 'TODO', label: 'Ya pagó todo', desc: 'La nota sale pagada.' },
                            ] as const).map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    data-testid={`nv-pago-${o.id}`}
                                    onClick={() => { setPago(o.id); setError(null); }}
                                    className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${pago === o.id ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30' : 'border-gray-100 hover:border-gray-200 dark:border-slate-800'}`}
                                >
                                    <span className={`mt-0.5 h-4 w-4 flex-none rounded-full border-2 ${pago === o.id ? 'border-violet-600 bg-violet-600 ring-2 ring-inset ring-white dark:ring-[#111827]' : 'border-gray-300'}`} />
                                    <span>
                                        <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{o.label}</span>
                                        <span className="block text-[11px] text-gray-500 dark:text-gray-400">{o.desc}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        {pago === 'ADELANTO' && (
                            <label className="mb-3 block">
                                <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Monto del adelanto</span>
                                <div className="flex items-center rounded-xl border border-gray-200 px-3 focus-within:border-violet-400 dark:border-slate-700">
                                    <span className="text-sm text-gray-400">S/</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="0.01"
                                        value={adelanto}
                                        data-testid="nv-adelanto"
                                        onChange={(e) => { setAdelanto(e.target.value); setError(null); }}
                                        className="w-full bg-transparent px-2 py-2.5 text-sm text-gray-800 outline-none dark:text-gray-100"
                                        placeholder="0.00"
                                    />
                                </div>
                            </label>
                        )}

                        {pago !== 'NADA' && (
                            <div className="mb-3">
                                <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">¿Con qué pagó?</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {MEDIOS.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setMedio(m.id)}
                                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${medio === m.id ? 'border-violet-500 bg-violet-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-gray-300'}`}
                                        >
                                            <Icon icon={m.icon} className="text-sm" /> {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-4 flex justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                            <span>Queda por cobrar</span>
                            <span className="font-semibold">{money(porCobrar)}</span>
                        </div>

                        {error && (
                            <p className="mb-3 flex items-start gap-1.5 text-xs font-medium text-rose-600">
                                <Icon icon="solar:danger-circle-linear" className="mt-0.5 flex-none" /> {error}
                            </p>
                        )}

                        <div className="grid gap-2">
                            <button
                                type="button"
                                data-testid="nv-generar"
                                onClick={generar}
                                disabled={enviando}
                                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-700"
                            >
                                <Icon icon={enviando ? 'svg-spinners:180-ring' : 'solar:document-add-bold'} />
                                {enviando ? 'Generando…' : `Generar nota de venta${pedido.tipoEntrega === 'ENVIO' ? ' y despacho' : ''}`}
                            </button>
                            <button
                                type="button"
                                onClick={() => onRevisarEnPos(pedido)}
                                disabled={enviando}
                                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                            >
                                <Icon icon="solar:cart-large-2-linear" /> Revisar antes en el punto de venta
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center" data-testid="nv-resultado">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30">
                            <Icon icon="solar:check-circle-bold" width={28} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Nota de venta generada</h3>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{numero}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Total {money(Number(resultado.comprobante?.mtoImpVenta || 0))}
                            {Number(resultado.comprobante?.saldo || 0) > 0.009 ? ` · por cobrar ${money(Number(resultado.comprobante?.saldo || 0))}` : ' · pagada'}
                        </p>

                        <div className="mt-4 space-y-2 text-left text-xs">
                            {resultado.despacho && (
                                <div className="flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                                    <Icon icon="solar:delivery-bold" className="mt-0.5 flex-none" />
                                    <span>Despacho creado ({String(resultado.despacho.transportista || '').replace('_', ' ')}). Lo ves en Ventas → Con despacho.</span>
                                </div>
                            )}
                            {guia === 'cargando' && (
                                <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-gray-600 dark:bg-slate-900 dark:text-gray-300">
                                    <Icon icon="svg-spinners:180-ring" /> Generando la guía en Shalom…
                                </div>
                            )}
                            {guia && guia !== 'cargando' && guia.estado === 'generada' && (
                                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    <Icon icon="solar:box-bold" className="mt-0.5 flex-none" />
                                    <span>{guia.nroOrden ? `Guía ${guia.nroOrden} generada en Shalom.` : 'Envío registrado en Shalom.'}</span>
                                </div>
                            )}
                            {guia && guia !== 'cargando' && guia.estado === 'error' && (
                                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                    <Icon icon="solar:danger-triangle-bold" className="mt-0.5 flex-none" />
                                    <span>No se pudo generar la guía en Shalom: {guia.mensaje}. Puedes generarla desde Editar despacho.</span>
                                </div>
                            )}
                            {resultado.avisoDespacho && (
                                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                    <Icon icon="solar:danger-triangle-bold" className="mt-0.5 flex-none" />
                                    <span>{resultado.avisoDespacho}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 grid gap-2">
                            {resultado.comprobante && (
                                <button
                                    type="button"
                                    data-testid="nv-ver"
                                    onClick={() => onVerNota(resultado.comprobante!.id)}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-violet-600 dark:hover:bg-violet-700"
                                >
                                    <Icon icon="solar:document-text-bold" /> Ver nota de venta
                                </button>
                            )}
                            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800">
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
