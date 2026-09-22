import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';
import { usePagosStore } from '@/zustand/pagos';
import { useAuthStore } from '@/zustand/auth';
import { useUsersStore } from '@/zustand/users';
import { useCuentasBancariasStore } from '@/zustand/cuentasBancarias';
import PaymentReceipt from '@/components/PaymentReceipt';

// Mismo estilo de inputs que "Coordinar envío" (EditarDespachoModal).
const inp = "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-400";
const lbl = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

// Tiles de medio de pago con los mismos logos que el POS.
const MEDIOS_PAGO = [
    { value: 'EFECTIVO', label: 'Efectivo', logo: '/assets/pagos/efectivo.png' },
    { value: 'YAPE', label: 'Yape', logo: '/assets/pagos/yape.png' },
    { value: 'PLIN', label: 'Plin', logo: '/assets/pagos/plin.png' },
    { value: 'TRANSFERENCIA', label: 'Transferencia', logo: '/assets/pagos/transferencia.png' },
    { value: 'TARJETA', label: 'Tarjeta', logo: '/assets/pagos/tarjeta.png' },
];

const DIRIGIDO_OPTIONS = [
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'EMPRESA', label: 'Empresa (cuenta del negocio)' },
    { value: 'VENDEDOR', label: 'Vendedor' },
];

interface ModalRegistrarPagoProps {
    comprobante: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ModalRegistrarPago = ({ comprobante, onClose, onSuccess }: ModalRegistrarPagoProps) => {
    const { auth } = useAuthStore();
    const { registrarPagoComprobante, subirComprobantePago, loading } = usePagosStore();
    const { usuarios, getAllUsers } = useUsersStore();
    const { cuentas, listar: listarCuentas } = useCuentasBancariasStore();
    const [monto, setMonto] = useState('');
    const [medioPago, setMedioPago] = useState('EFECTIVO');
    const [cuentaBancariaId, setCuentaBancariaId] = useState<number | null>(null);
    const [observacion, setObservacion] = useState('');
    const [referencia, setReferencia] = useState('');
    const [dirigidoA, setDirigidoA] = useState('');
    const [vendedorId, setVendedorId] = useState<number | null>(null);
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<string>('');
    const [subiendoComprobante, setSubiendoComprobante] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [pagoRegistrado, setPagoRegistrado] = useState<any>(null);
    const [nuevoSaldoFinal, setNuevoSaldoFinal] = useState<number>(0);
    const [error, setError] = useState<string>('');

    // Cobranza con vendedores de campo: casuística activada por empresa (perfil).
    const cobranzaCampo = Boolean((auth as any)?.empresa?.cobranzaCampo);

    // Cargar vendedores (usuarios de la empresa) solo cuando la casuística está activa.
    useEffect(() => {
        if (cobranzaCampo) getAllUsers({ page: 1, limit: 100 });
    }, [cobranzaCampo, getAllUsers]);

    // Preseleccionar el vendedor de campo que ya tiene atribuido el comprobante,
    // para que la encargada no lo vuelva a elegir en cada cobro.
    useEffect(() => {
        if (cobranzaCampo && comprobante?.vendedorCampoId) {
            setVendedorId(Number(comprobante.vendedorCampoId));
        }
    }, [cobranzaCampo, comprobante?.vendedorCampoId]);

    // Cuenta bancaria de destino: se pide para medios que no son efectivo, así el
    // pago queda vinculado a un banco y aparece en Caja y Bancos.
    const medioUpper = medioPago.toUpperCase();
    const requiereBanco = medioUpper !== 'EFECTIVO';
    const bancoObligatorio = ['TRANSFERENCIA', 'TARJETA', 'DEPOSITO'].includes(medioUpper);
    const cuentasActivas = (cuentas || []).filter((c: any) => c.activo);
    const nombreCuenta = (c: any) =>
        `${c.banco}${c.alias ? ` · ${c.alias}` : ''} · ${c.numeroCuenta}`;

    useEffect(() => { listarCuentas(); }, [listarCuentas]);

    // Al elegir Yape/Plin, preseleccionar la cuenta vinculada de la empresa (a la
    // que abonan esos medios); al volver a Efectivo, limpiar la cuenta.
    useEffect(() => {
        if (medioUpper === 'EFECTIVO') { setCuentaBancariaId(null); return; }
        if (medioUpper === 'YAPE' || medioUpper === 'PLIN') {
            const vinc = cuentasActivas.find(
                (c: any) => (c.medioPagoVinculado || '').toUpperCase() === medioUpper,
            );
            if (vinc) setCuentaBancariaId(vinc.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [medioUpper, cuentas]);

    const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) { setError('El comprobante debe ser una imagen'); return; }
        setComprobanteFile(f);
        setComprobantePreview(URL.createObjectURL(f));
        setError('');
    };

    const quitarComprobante = () => {
        setComprobanteFile(null);
        if (comprobantePreview) URL.revokeObjectURL(comprobantePreview);
        setComprobantePreview('');
    };

    // Recalcular saldo si es crédito y tiene saldo 0 (mal guardado en BD)
    const calcularSaldoReal = () => {
        const saldoDB = Number(comprobante?.saldo || 0);
        const formaPagoUpper = (comprobante?.formaPagoTipo || '').toUpperCase();
        const esCredito = formaPagoUpper === 'CREDITO';

        // Si es crédito y saldo es 0 pero tiene total > 0, recalcular
        if (esCredito && saldoDB === 0 && Number(comprobante?.mtoImpVenta) > 0) {
            const montoDescontado = Number(comprobante?.montoDetraccion || 0);
            return Math.max(0, Number(comprobante?.mtoImpVenta) - montoDescontado);
        }
        return saldoDB;
    };

    const saldoActual = calcularSaldoReal();
    const montoNum = Number(monto) || 0;
    const nuevoSaldo = Math.max(0, saldoActual - montoNum);

    const handleSubmit = async () => {
        if (montoNum <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (montoNum > saldoActual) { setError(`El monto no puede exceder el saldo (S/ ${saldoActual.toFixed(2)})`); return; }
        if (cobranzaCampo && !vendedorId) { setError('Selecciona el vendedor de campo que envió el comprobante'); return; }
        if (cobranzaCampo && !dirigidoA) { setError('Indica a quién fue dirigido el pago'); return; }
        if (bancoObligatorio && cuentasActivas.length > 0 && !cuentaBancariaId) {
            setError('Selecciona la cuenta de destino del pago'); return;
        }
        setError('');

        const vendedorNombre = cobranzaCampo ? usuarios.find((u: any) => u.id === vendedorId)?.nombre : undefined;

        const result = await registrarPagoComprobante(comprobante.id, {
            monto: montoNum,
            medioPago,
            cuentaBancariaId: requiereBanco ? (cuentaBancariaId ?? undefined) : undefined,
            observacion: observacion || undefined,
            referencia: referencia || undefined,
            dirigidoA: cobranzaCampo ? (dirigidoA || undefined) : undefined,
            vendedorId: cobranzaCampo ? (vendedorId ?? undefined) : undefined,
            vendedorNombre,
        });

        if (!result.success) {
            setError(result.error || 'Error al registrar el pago');
            return;
        }

        // Subir el comprobante (opcional) al pago recién creado.
        if (comprobanteFile && result.pago?.id) {
            setSubiendoComprobante(true);
            const up = await subirComprobantePago(result.pago.id, comprobanteFile);
            setSubiendoComprobante(false);
            if (!up.success) {
                setError(up.error || 'El pago se registró, pero falló la subida del comprobante');
            }
        }

        setPagoRegistrado({
            ...result.pago,
            monto: montoNum,
            medioPago,
            observacion,
            referencia,
        });
        setNuevoSaldoFinal(result.nuevoSaldo ?? nuevoSaldo);
        setShowReceipt(true);
    };

    const handlePagarTodo = () => {
        setMonto(saldoActual.toFixed(2));
    };

    const handleCloseReceipt = () => {
        setShowReceipt(false);
        onSuccess();
    };

    // Mostrar el recibo usando el componente PaymentReceipt existente
    if (showReceipt && pagoRegistrado) {
        return (
            <PaymentReceipt
                comprobante={{
                    ...comprobante,
                    data: comprobante,
                }}
                saldo={nuevoSaldoFinal}
                payment={{
                    tipo: nuevoSaldoFinal === 0 ? 'PAGO_TOTAL' : 'PAGO_PARCIAL',
                    monto: montoNum,
                    medioPago,
                    observacion,
                    referencia,
                    dirigidoA,
                    vendedorNombre: usuarios.find((u: any) => u.id === vendedorId)?.nombre,
                }}
                numeroRecibo={`REC-${pagoRegistrado?.id || '0000'}`}
                nuevoSaldo={nuevoSaldoFinal}
                company={auth}
                detalles={comprobante?.detalles}
                cliente={comprobante?.cliente}
                onClose={handleCloseReceipt}
            />
        );
    }

    // Modal de Registro de Pago — mismo lenguaje visual que "Coordinar envío"
    // (header degradado, inputs `inp`, footer con botón degradado) y tiles de
    // medio de pago como en el POS.
    const totalComprobante = Number(comprobante?.mtoImpVenta || 0);
    const pagadoHasta = Math.max(0, totalComprobante - saldoActual);
    const pctPagado = totalComprobante > 0 ? Math.min(100, Math.round((pagadoHasta / totalComprobante) * 100)) : 0;
    const pctDespues = totalComprobante > 0 ? Math.min(100, Math.round(((totalComprobante - nuevoSaldo) / totalComprobante) * 100)) : 0;
    const numero = `${comprobante?.serie || ''}-${String(comprobante?.correlativo ?? '').padStart(8, '0')}`;
    const montoInvalido = montoNum > saldoActual;
    const puedeRegistrar = !loading && !subiendoComprobante && montoNum > 0 && !montoInvalido;
    const setMontoLimpio = (v: string) => { setMonto(v); setError(''); };

    const content = (
        <div className="fixed inset-0 z-[999999] top-[-30px] flex items-center justify-center p-4 font-jakarta">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" data-testid="modal-registrar-pago">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                <Icon icon="solar:hand-money-bold-duotone" className="text-white text-xl" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-white font-black text-lg leading-none">Registrar pago</h2>
                                <p className="text-indigo-200 text-xs mt-1 truncate">
                                    <span className="font-mono font-bold text-white/90">{numero}</span>
                                    <span className="mx-1.5 opacity-60">·</span>
                                    {comprobante?.cliente?.nombre || 'Sin cliente'}
                                    {comprobante?.cliente?.nroDoc ? <span className="opacity-70"> · {comprobante.cliente.nroDoc}</span> : null}
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0">
                            <Icon icon="solar:close-circle-bold" className="text-lg" />
                        </button>
                    </div>

                    {/* Resumen: total / pagado / saldo + barra de avance */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                            { k: 'Total', v: totalComprobante, cls: 'text-white' },
                            { k: 'Pagado', v: pagadoHasta, cls: 'text-emerald-200' },
                            { k: 'Saldo', v: saldoActual, cls: 'text-amber-200' },
                        ].map((c) => (
                            <div key={c.k} className="rounded-2xl bg-white/10 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">{c.k}</p>
                                <p className={`text-sm font-black tabular-nums ${c.cls}`}>S/ {c.v.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${pctPagado}%` }} />
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-5 flex-1">

                    {/* Monto */}
                    <div>
                        <label className={lbl}>Monto a abonar</label>
                        <div className={`relative rounded-2xl transition-all ${montoInvalido
                            ? 'bg-red-50 dark:bg-red-950/20 ring-1 ring-red-200 dark:ring-red-900'
                            : 'bg-slate-50 dark:bg-slate-800/60 focus-within:bg-indigo-50/50 dark:focus-within:bg-indigo-950/20'}`}>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">S/</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                autoFocus
                                value={monto}
                                onChange={(e) => setMontoLimpio(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min={0}
                                max={saldoActual}
                                data-testid="input-monto"
                                className="w-full h-14 pl-12 pr-32 bg-transparent border-0 text-2xl font-black text-slate-900 dark:text-white outline-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none placeholder:text-slate-300 dark:placeholder:text-slate-600 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button type="button" onClick={handlePagarTodo} data-testid="btn-pagar-todo"
                                className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 px-3 rounded-xl text-xs font-black transition-all ${Math.abs(montoNum - saldoActual) < 0.005
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}>
                                <Icon icon="solar:check-read-bold" className="inline -mt-0.5 mr-1" />
                                Pagar todo
                            </button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                            {montoInvalido
                                ? <span className="text-red-500 font-semibold">El monto supera el saldo pendiente (S/ {saldoActual.toFixed(2)})</span>
                                : <span className="text-slate-400">Máximo S/ {saldoActual.toFixed(2)}</span>}
                            {saldoActual > 0 && !montoInvalido && (
                                <div className="flex gap-1">
                                    {[0.25, 0.5].map((f) => (
                                        <button key={f} type="button" onClick={() => setMontoLimpio((saldoActual * f).toFixed(2))}
                                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/40 transition-colors">
                                            {f * 100}%
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Medio de pago — tiles como en el POS */}
                    <div>
                        <label className={lbl}>Medio de pago</label>
                        <div className="grid grid-cols-5 gap-2">
                            {MEDIOS_PAGO.map((m) => {
                                const activo = medioUpper === m.value;
                                return (
                                    <button key={m.value} type="button" onClick={() => { setMedioPago(m.value); setError(''); }}
                                        data-testid={`medio-${m.value.toLowerCase()}`}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-3 transition-all active:scale-[0.97] ${activo
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md shadow-indigo-500/15'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                        <img src={m.logo} alt={m.label} className="w-8 h-8 object-contain" />
                                        <span className={`text-[11px] font-bold ${activo ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cuenta de destino (medios no efectivo) */}
                    {requiereBanco && (
                        <div>
                            <label className={lbl}>Cuenta de destino{bancoObligatorio ? ' *' : ''}</label>
                            {cuentasActivas.length > 0 ? (
                                <div className="relative">
                                    <Icon icon="solar:card-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 text-lg pointer-events-none" />
                                    <select
                                        value={cuentaBancariaId ?? ''}
                                        onChange={(e) => { setCuentaBancariaId(Number(e.target.value) || null); setError(''); }}
                                        data-testid="select-cuenta"
                                        className={inp + ' pl-10 pr-9 appearance-none cursor-pointer'}>
                                        <option value="">{bancoObligatorio ? 'Selecciona la cuenta…' : 'Sin cuenta (opcional)'}</option>
                                        {cuentasActivas.map((c: any) => <option key={c.id} value={c.id}>{nombreCuenta(c)}</option>)}
                                    </select>
                                    <Icon icon="solar:alt-arrow-down-linear" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            ) : (
                                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5 border border-amber-200 dark:border-amber-900/40 flex items-start gap-2">
                                    <Icon icon="solar:info-circle-bold" className="text-base shrink-0 mt-px" />
                                    No tienes cuentas bancarias registradas. Agrégalas en Caja y Bancos para que este pago se refleje ahí.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Referencia + Observación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Referencia <span className="normal-case font-medium text-slate-400">(opcional)</span></label>
                            <div className="relative">
                                <Icon icon="solar:hashtag-square-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none" />
                                <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)}
                                    placeholder="N° operación, voucher…" className={inp + ' pl-9'} data-testid="input-referencia" />
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Observación <span className="normal-case font-medium text-slate-400">(opcional)</span></label>
                            <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)}
                                placeholder="Notas adicionales" className={inp} data-testid="input-observacion" />
                        </div>
                    </div>

                    {/* Cobranza con vendedores de campo (activada por empresa) */}
                    {cobranzaCampo && (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-4 space-y-4">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Icon icon="solar:users-group-rounded-bold-duotone" className="text-indigo-500 text-base" />
                                Cobranza en campo
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Vendedor que envió el comprobante *</label>
                                    <select value={vendedorId ?? ''} onChange={(e) => { setVendedorId(Number(e.target.value) || null); setError(''); }}
                                        className={inp + ' pr-9 appearance-none cursor-pointer'}>
                                        <option value="">Selecciona…</option>
                                        {(usuarios || []).map((u: any) => <option key={u.id} value={u.id}>{u.nombre || u.email || `Usuario ${u.id}`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>¿A quién fue dirigido el pago? *</label>
                                    <select value={dirigidoA} onChange={(e) => { setDirigidoA(e.target.value); setError(''); }}
                                        className={inp + ' pr-9 appearance-none cursor-pointer'}>
                                        <option value="">Selecciona…</option>
                                        {DIRIGIDO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={lbl}>Comprobante <span className="normal-case font-medium text-slate-400">(opcional)</span></label>
                                {comprobantePreview ? (
                                    <div className="relative inline-block">
                                        <img src={comprobantePreview} alt="Comprobante" className="h-28 rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
                                        <button type="button" onClick={quitarComprobante} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600">
                                            <Icon icon="mdi:close" className="text-sm" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                                        <Icon icon="solar:gallery-add-bold-duotone" className="text-2xl text-indigo-500 shrink-0" />
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Sube la imagen del comprobante que envió el vendedor</span>
                                        <input type="file" accept="image/*" onChange={handleComprobanteChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5 border border-red-200 dark:border-red-900/40 flex items-start gap-2" data-testid="error-pago">
                            <Icon icon="solar:danger-triangle-bold" className="text-base shrink-0 mt-px" />
                            {error}
                        </p>
                    )}
                </div>

                {/* Resultado + Footer */}
                <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {montoNum > 0 && !montoInvalido && (
                        <div className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm ${nuevoSaldo > 0.005
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'}`} data-testid="saldo-despues">
                            <span className="flex items-center gap-2 font-semibold">
                                <Icon icon={nuevoSaldo > 0.005 ? 'solar:hourglass-bold-duotone' : 'solar:check-circle-bold'} className="text-lg" />
                                {nuevoSaldo > 0.005 ? 'Quedará pendiente' : 'La venta quedará pagada'}
                            </span>
                            <span className="font-black tabular-nums">S/ {nuevoSaldo.toFixed(2)} <span className="text-[11px] font-bold opacity-60">({pctDespues}% pagado)</span></span>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} disabled={loading || subiendoComprobante}
                            className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSubmit} disabled={!puedeRegistrar} data-testid="btn-registrar"
                            className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                            <Icon icon={loading || subiendoComprobante ? 'eos-icons:loading' : 'solar:check-circle-bold'} className="text-lg" />
                            {loading || subiendoComprobante ? 'Procesando…' : `Registrar pago${montoNum > 0 && !montoInvalido ? ` · S/ ${montoNum.toFixed(2)}` : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

export default ModalRegistrarPago;
