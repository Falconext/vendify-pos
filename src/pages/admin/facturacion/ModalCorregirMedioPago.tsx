import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useCuentasBancariasStore } from '@/zustand/cuentasBancarias';

/**
 * Corregir el método de un cobro ya registrado (pedido MEDICA DEL SUR
 * 2026-11-04). Es una corrección, no un cobro: el monto y la fecha no cambian y
 * el pago sigue en el turno de caja en que entró.
 */

const METODOS = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'TARJETA'];
const CON_CUENTA = ['YAPE', 'PLIN', 'TRANSFERENCIA'];
const LOGOS: Record<string, string> = {
    EFECTIVO: '/assets/pagos/efectivo.png',
    YAPE: '/assets/pagos/yape.png',
    PLIN: '/assets/pagos/plin.png',
    TRANSFERENCIA: '/assets/pagos/transferencia.png',
    TARJETA: '/assets/pagos/tarjeta.png',
};
const titulo = (m: string) => m.charAt(0) + m.slice(1).toLowerCase();

interface PagoCorregible {
    id: number;
    monto: number;
    fecha: string;
    medioPago: string;
    cuentaBancariaId: number | null;
    referencia: string;
    turnoCerrado: { fechaCierre: string; usuario: string | null } | null;
}

interface Linea {
    medioPago: string;
    cuentaBancariaId: number | null;
    referencia: string;
}

interface Props {
    comprobanteId: number;
    onClose: () => void;
    /** Recibe la nota ya corregida (importe, saldo, medio y detalle de pago). */
    onCorregido?: (nota: any) => void;
}

const lineaDe = (p: PagoCorregible): Linea => ({
    medioPago: p.medioPago,
    cuentaBancariaId: p.cuentaBancariaId ?? null,
    referencia: p.referencia || '',
});

export default function ModalCorregirMedioPago({ comprobanteId, onClose, onCorregido }: Props) {
    const { cuentas, listar } = useCuentasBancariasStore();
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [numero, setNumero] = useState('');
    const [bloqueo, setBloqueo] = useState<string | null>(null);
    const [pagos, setPagos] = useState<PagoCorregible[]>([]);
    const [lineas, setLineas] = useState<Record<number, Linea>>({});
    const [confirmaCaja, setConfirmaCaja] = useState(false);

    useEffect(() => {
        let vivo = true;
        listar();
        (async () => {
            const res: any = await get(`comprobante/${comprobanteId}/medio-pago`);
            if (!vivo) return;
            if (res?.success === false) {
                setBloqueo(res.error || 'No se pudo cargar el cobro.');
            } else {
                const d = res?.data ?? {};
                setNumero(d.numero || '');
                setBloqueo(d.motivoBloqueo || null);
                setPagos(d.pagos || []);
                setLineas(Object.fromEntries((d.pagos || []).map((p: PagoCorregible) => [p.id, lineaDe(p)])));
            }
            setCargando(false);
        })();
        return () => { vivo = false; };
    }, [comprobanteId]); // eslint-disable-line react-hooks/exhaustive-deps

    const activas = cuentas.filter((c: any) => c.activo !== false);
    const cuentaPorDefecto = (metodo: string): number | null => {
        if (!CON_CUENTA.includes(metodo)) return null;
        const vinculada = activas.find((c: any) => String(c.medioPagoVinculado || '').toUpperCase() === metodo);
        return vinculada?.id ?? activas[0]?.id ?? null;
    };
    const etiqueta = (c: any) => {
        const fin = String(c.numeroCuenta ?? '').replace(/\D/g, '').slice(-4);
        return c.alias?.trim() || `${c.banco || ''}${fin ? ` ····${fin}` : ''}`.trim();
    };

    const cambiar = (id: number, parcial: Partial<Linea>) =>
        setLineas((actual) => ({ ...actual, [id]: { ...actual[id], ...parcial } }));
    const elegirMetodo = (p: PagoCorregible, metodo: string) => {
        const volvio = metodo === p.medioPago;
        cambiar(p.id, {
            medioPago: metodo,
            cuentaBancariaId: volvio ? p.cuentaBancariaId ?? null : cuentaPorDefecto(metodo),
            referencia: volvio ? p.referencia || '' : '',
        });
    };

    const cambio = (p: PagoCorregible) => {
        const l = lineas[p.id];
        if (!l) return false;
        const original = lineaDe(p);
        return l.medioPago !== original.medioPago
            || l.cuentaBancariaId !== original.cuentaBancariaId
            || l.referencia.trim() !== original.referencia;
    };
    const cambiados = pagos.filter(cambio);
    const enCajaCerrada = cambiados.filter((p) => p.turnoCerrado);
    const faltaCuenta = cambiados.some((p) => lineas[p.id].medioPago === 'TRANSFERENCIA' && activas.length > 0 && !lineas[p.id].cuentaBancariaId);
    const puedeGuardar = cambiados.length > 0 && !faltaCuenta && !guardando && (enCajaCerrada.length === 0 || confirmaCaja);

    const guardar = async () => {
        if (!puedeGuardar) return;
        setGuardando(true);
        const res: any = await patch(`comprobante/${comprobanteId}/medio-pago`, {
            lineas: cambiados.map((p) => ({
                pagoId: p.id,
                medioPago: lineas[p.id].medioPago,
                cuentaBancariaId: lineas[p.id].cuentaBancariaId,
                referencia: lineas[p.id].referencia.trim(),
            })),
            confirmarCajaCerrada: confirmaCaja,
        });
        setGuardando(false);
        if (res?.success === false) {
            useAlertStore.getState().alert(res.error || 'No se pudo corregir el método de pago', 'error');
            return;
        }
        useAlertStore.getState().alert('Método de pago corregido', 'success');
        onCorregido?.(res?.data?.nota);
        onClose();
    };

    return createPortal(
        <div data-krk-modal className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 font-jakarta" data-testid="modal-corregir-medio-pago">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
                <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 flex-shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black leading-tight text-slate-900 dark:text-white">Corregir método de pago</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {numero && <span className="font-mono font-bold">{numero} · </span>}
                            El monto y la fecha no cambian: no entra plata nueva.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Icon icon="solar:close-circle-bold" className="text-lg" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
                    {cargando ? (
                        <div className="flex justify-center py-10"><Icon icon="eos-icons:loading" className="text-3xl text-indigo-400" /></div>
                    ) : bloqueo ? (
                        <p data-testid="corregir-bloqueo" className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
                            {bloqueo}
                        </p>
                    ) : pagos.map((p) => {
                        const l = lineas[p.id];
                        if (!l) return null;
                        return (
                            <div key={p.id} data-testid="corregir-pago" className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{moment(p.fecha).format('DD/MM/YYYY HH:mm')}</span>
                                    <span className="text-base font-black tabular-nums text-slate-900 dark:text-white">S/ {Number(p.monto).toFixed(2)}</span>
                                </div>
                                <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Método de pago">
                                    {METODOS.map((m) => {
                                        const activo = l.medioPago === m;
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                role="radio"
                                                aria-checked={activo}
                                                data-metodo={m}
                                                onClick={() => elegirMetodo(p, m)}
                                                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-bold transition ${activo
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                            >
                                                <img src={LOGOS[m]} alt="" className="h-6 w-6 object-contain" />
                                                <span className="max-w-full truncate">{m === 'TRANSFERENCIA' ? 'Transf.' : titulo(m)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {CON_CUENTA.includes(l.medioPago) && activas.length > 0 && (
                                    <label className="mt-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        Cuenta destino
                                        <select
                                            value={l.cuentaBancariaId ?? ''}
                                            onChange={(e) => cambiar(p.id, { cuentaBancariaId: e.target.value ? Number(e.target.value) : null })}
                                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="">Elegir cuenta</option>
                                            {activas.map((c: any) => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
                                        </select>
                                    </label>
                                )}
                                {l.medioPago !== 'EFECTIVO' && (
                                    <label className="mt-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        N° de operación (opcional)
                                        <input
                                            value={l.referencia}
                                            onChange={(e) => cambiar(p.id, { referencia: e.target.value })}
                                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </label>
                                )}
                            </div>
                        );
                    })}

                    {enCajaCerrada.length > 0 && (
                        <div data-testid="corregir-caja-cerrada" className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30 p-3">
                            <p className="text-xs font-bold leading-snug text-amber-900 dark:text-amber-100">
                                Este cobro está en un turno de caja ya cerrado
                                {enCajaCerrada[0].turnoCerrado?.fechaCierre ? ` el ${moment(enCajaCerrada[0].turnoCerrado.fechaCierre).format('DD/MM/YYYY HH:mm')}` : ''}
                                {enCajaCerrada[0].turnoCerrado?.usuario ? ` por ${enCajaCerrada[0].turnoCerrado.usuario}` : ''}.
                            </p>
                            <p className="mt-1 text-xs leading-snug text-amber-800 dark:text-amber-200">
                                Lo declarado en ese cierre no cambia, pero el reporte del turno mostrará el método nuevo, así que puede salir una diferencia. Revísalo con quien cerró.
                            </p>
                            <label className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-100">
                                <input type="checkbox" data-testid="corregir-confirma-caja" checked={confirmaCaja} onChange={(e) => setConfirmaCaja(e.target.checked)} />
                                Entiendo, corregir igual
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex-shrink-0">
                    <button type="button" onClick={onClose} className="h-11 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Cancelar
                    </button>
                    {!bloqueo && !cargando && (
                        <button
                            type="button"
                            data-testid="corregir-guardar"
                            disabled={!puedeGuardar}
                            onClick={guardar}
                            className="h-11 px-5 rounded-2xl bg-violet-600 text-sm font-black text-white disabled:opacity-40"
                        >
                            {guardando ? 'Guardando…' : 'Guardar corrección'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
