import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import { post } from '@/utils/fetch';
import { useCuentasBancariasStore } from '@/zustand/cuentasBancarias';
import { documentoCorto, resumirSeleccion, simbolo, type NotaElegida } from './seleccionNotas';

interface Props {
    notas: NotaElegida[];
    onClose: () => void;
    onCobrado: (mensaje: string) => void;
}

const MEDIOS = [
    { key: 'Efectivo', icon: 'solar:wad-of-money-bold-duotone' },
    { key: 'Yape', icon: 'solar:smartphone-2-bold-duotone' },
    { key: 'Plin', icon: 'solar:smartphone-2-bold-duotone' },
    { key: 'Transferencia', icon: 'solar:card-transfer-bold-duotone' },
    { key: 'Tarjeta', icon: 'solar:card-bold-duotone' },
    { key: 'Otro', icon: 'solar:refresh-circle-bold-duotone' },
];

const centimos = (n: number) => Math.round((Number(n) || 0) * 100);

/** Mismo reparto que el backend (cobro-varias.ts): de la más antigua a la más nueva. */
function vistaReparto(notas: NotaElegida[], monto: number) {
    let resto = centimos(monto);
    return [...notas]
        .filter((n) => n.saldo > 0)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
        .map((n) => {
            const aplica = Math.max(0, Math.min(resto, centimos(n.saldo)));
            resto -= aplica;
            return { nota: n, aplica: aplica / 100, quedaDebiendo: (centimos(n.saldo) - aplica) / 100 };
        });
}

/** Notas de venta → elegir varias del mismo cliente → Cobrar. */
export default function ModalCobrarVarias({ notas, onClose, onCobrado }: Props) {
    const r = resumirSeleccion(notas);
    const s = simbolo(r.moneda);
    const [monto, setMonto] = useState(r.saldo.toFixed(2));
    const [medio, setMedio] = useState('Efectivo');
    const [referencia, setReferencia] = useState('');
    const [observacion, setObservacion] = useState('');
    const [cuentaId, setCuentaId] = useState<number | undefined>();
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const { cuentas, listar } = useCuentasBancariasStore();
    const cuentasActivas = cuentas.filter((c: any) => c.activo);

    useEffect(() => { if (cuentas.length === 0) listar(); }, [cuentas.length, listar]);
    useEffect(() => {
        if (medio === 'Transferencia' && !cuentaId && cuentasActivas.length) setCuentaId(cuentasActivas[0].id);
        if (medio !== 'Transferencia') setCuentaId(undefined);
    }, [medio, cuentasActivas.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const montoNum = Number(monto) || 0;
    const reparto = useMemo(() => vistaReparto(notas, montoNum), [notas, montoNum]);
    const invalido = montoNum <= 0 ? 'Escribe el monto que paga el cliente'
        : centimos(montoNum) > centimos(r.saldo) ? `No puede pasar de lo que debe (${s} ${r.saldo.toFixed(2)})` : '';
    const pagadas = notas.length - r.conSaldo;

    const cobrar = async () => {
        if (invalido || enviando) return;
        setEnviando(true);
        setError('');
        const resp: any = await post('comprobante/cobrar-varias', {
            ids: notas.map((n) => n.id),
            monto: montoNum,
            medioPago: medio,
            referencia: referencia || undefined,
            observacion: observacion || undefined,
            cuentaBancariaId: cuentaId ?? null,
        });
        setEnviando(false);
        if (resp.success) {
            const d = resp.data;
            onCobrado(d.saldoRestante > 0
                ? `Cobrado ${s} ${Number(d.cobrado).toFixed(2)} en ${d.aplicados.length} nota(s). Queda debiendo ${s} ${Number(d.saldoRestante).toFixed(2)}`
                : `Cobrado ${s} ${Number(d.cobrado).toFixed(2)}: ${d.aplicados.length} nota(s) pagadas`);
        } else {
            setError(resp.error || 'No se pudo registrar el cobro');
        }
    };

    const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

    return (
        <Modal isOpenModal closeModal={onClose} title="Cobrar notas" icon="solar:wallet-money-bold-duotone" width="560px" position="right">
            <div className="space-y-4 p-4" data-testid="modal-cobrar-varias">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-800/60">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{r.cliente || 'Cliente'}</p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-gray-900 dark:text-white">{s} {r.saldo.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                        pendiente en {r.conSaldo} nota{r.conSaldo === 1 ? '' : 's'}{pagadas > 0 ? ` · ${pagadas} ya pagada${pagadas === 1 ? '' : 's'} (no se tocan)` : ''}
                    </p>
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-gray-500">Monto que paga</label>
                    <div className="flex gap-2">
                        <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={`${inputCls} text-lg font-bold tabular-nums`} aria-label="Monto que paga" />
                        <button type="button" onClick={() => setMonto(r.saldo.toFixed(2))} className="whitespace-nowrap rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200">Todo</button>
                    </div>
                    {invalido && <p className="mt-1 text-xs text-rose-600">{invalido}</p>}
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-gray-500">Medio de pago</label>
                    <div className="grid grid-cols-3 gap-2">
                        {MEDIOS.map((m) => (
                            <button key={m.key} type="button" onClick={() => setMedio(m.key)} aria-pressed={medio === m.key}
                                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-sm font-semibold transition ${medio === m.key ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200'}`}>
                                <Icon icon={m.icon} className="text-base" />{m.key}
                            </button>
                        ))}
                    </div>
                </div>

                {medio === 'Transferencia' && (
                    <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-gray-500">Cuenta destino</label>
                        {cuentasActivas.length === 0 ? (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">No hay cuentas bancarias registradas. Agrégalas en Mi Negocio → Cuentas Bancarias.</p>
                        ) : (
                            <select value={cuentaId ?? ''} onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : undefined)} className={inputCls}>
                                <option value="">Sin especificar</option>
                                {cuentasActivas.map((c: any) => <option key={c.id} value={c.id}>{c.alias || c.banco} — {c.numeroCuenta} ({c.moneda})</option>)}
                            </select>
                        )}
                    </div>
                )}
                {(medio === 'Transferencia' || medio === 'Tarjeta' || medio === 'Yape' || medio === 'Plin') && (
                    <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="N° de operación (opcional)" className={inputCls} />
                )}
                <input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observación (opcional)" className={inputCls} />

                <div>
                    <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-gray-500">Cómo se aplica (de la más antigua a la más nueva)</p>
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-slate-800 dark:border-slate-800">
                        {reparto.map(({ nota, aplica, quedaDebiendo }) => (
                            <div key={nota.id} className={`flex items-center justify-between px-3 py-2 text-sm ${aplica > 0 ? '' : 'opacity-50'}`}>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">{documentoCorto(nota.documento)}</span>
                                <span className="text-right tabular-nums">
                                    <span className="font-bold text-gray-900 dark:text-white">{s} {aplica.toFixed(2)}</span>
                                    <span className="block text-[11px] text-gray-500">{quedaDebiendo > 0 ? `queda ${s} ${quedaDebiendo.toFixed(2)}` : 'pagada'}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}

                <button type="button" onClick={cobrar} disabled={Boolean(invalido) || enviando}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50">
                    <Icon icon={enviando ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} className="text-lg" />
                    Cobrar {s} {montoNum.toFixed(2)}
                </button>
            </div>
        </Modal>
    );
}
