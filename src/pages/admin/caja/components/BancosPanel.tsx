import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import CuentasBancariasConfig from '@/pages/admin/empresa/CuentasBancariasConfig';
import {
    useCuentasBancariasStore,
    ICuentaSaldo,
    IMovimientosResp,
} from '@/zustand/cuentasBancarias';

const soles = (n: number) =>
    `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaCorta = (f: string) =>
    new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

const ORIGEN_META: Record<string, { label: string; icon: string; color: string }> = {
    COBRO: { label: 'Cobro', icon: 'solar:card-recive-bold-duotone', color: 'text-emerald-600' },
    DEPOSITO: { label: 'Depósito de caja', icon: 'solar:banknote-2-bold-duotone', color: 'text-emerald-600' },
    COMPRA: { label: 'Pago a proveedor', icon: 'solar:cart-cross-bold-duotone', color: 'text-red-600' },
    GASTO: { label: 'Gasto', icon: 'solar:bill-list-bold-duotone', color: 'text-red-600' },
};

const MovimientosModal: React.FC<{ cuentaId: number; onClose: () => void }> = ({ cuentaId, onClose }) => {
    const { obtenerMovimientos } = useCuentasBancariasStore();
    const [data, setData] = useState<IMovimientosResp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setData(await obtenerMovimientos(cuentaId));
            setLoading(false);
        })();
    }, [cuentaId]);

    const titulo = data?.cuenta
        ? data.cuenta.alias || `${data.cuenta.banco} · ${data.cuenta.numeroCuenta}`
        : 'Movimientos';

    return (
        <Modal isOpenModal closeModal={onClose} title={`Movimientos · ${titulo}`} width="720px">
            <div className="p-5">
                {loading ? (
                    <div className="py-10"><Loading /></div>
                ) : !data ? (
                    <p className="text-center text-gray-500 py-8">No se pudieron cargar los movimientos.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                                <p className="text-xs text-gray-400">Ingresos</p>
                                <p className="text-base font-bold text-emerald-600">{soles(data.ingresos)}</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                                <p className="text-xs text-gray-400">Egresos</p>
                                <p className="text-base font-bold text-red-600">{soles(data.egresos)}</p>
                            </div>
                            <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-900/10 p-3">
                                <p className="text-xs text-gray-400">Saldo</p>
                                <p className="text-base font-bold text-violet-700 dark:text-violet-300">{soles(data.saldo)}</p>
                            </div>
                        </div>

                        {data.movimientos.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Esta cuenta aún no tiene movimientos.</p>
                        ) : (
                            <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                                {data.movimientos.map((m) => {
                                    const meta = ORIGEN_META[m.origen] || ORIGEN_META.COBRO;
                                    const esIngreso = m.tipo === 'INGRESO';
                                    return (
                                        <div key={m.id} className="flex items-center gap-3 py-2.5">
                                            <Icon icon={meta.icon} className={`text-xl shrink-0 ${meta.color}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{m.concepto}</p>
                                                <p className="text-xs text-gray-400">
                                                    {fechaCorta(m.fecha)}{m.referencia ? ` · Op. ${m.referencia}` : ''}
                                                </p>
                                            </div>
                                            <span className={`text-sm font-bold shrink-0 ${esIngreso ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {esIngreso ? '+' : '−'} {soles(m.monto)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

const SaldoCard: React.FC<{ cuenta: ICuentaSaldo; onClick: () => void }> = ({ cuenta, onClick }) => (
    <button
        onClick={onClick}
        className="text-left rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all active:scale-[0.99]"
    >
        <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {cuenta.alias || cuenta.banco}
                </p>
                <p className="text-xs text-gray-400 truncate">{cuenta.banco} · {cuenta.numeroCuenta}</p>
            </div>
            {cuenta.medioPagoVinculado && (
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 uppercase">
                    {cuenta.medioPagoVinculado}
                </span>
            )}
        </div>
        <p className="text-xs text-gray-400">Saldo</p>
        <p className={`text-2xl font-extrabold tracking-tight ${cuenta.saldo >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
            {soles(cuenta.saldo)}
        </p>
        <div className="flex gap-4 mt-3 text-xs">
            <span className="text-emerald-600 font-semibold">+ {soles(cuenta.ingresos)}</span>
            <span className="text-red-600 font-semibold">− {soles(cuenta.egresos)}</span>
        </div>
    </button>
);

const BancosPanel: React.FC = () => {
    const { saldos, loadingSaldos, cargarSaldos } = useCuentasBancariasStore();
    const [cuentaSel, setCuentaSel] = useState<number | null>(null);

    useEffect(() => { cargarSaldos(); }, []);

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Saldo y movimientos de tus cuentas y billeteras. Los cobros por Yape/Plin y transferencia entran aquí; el efectivo se deposita desde la pestaña Depósitos.
            </p>

            {/* Saldos */}
            <div>
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Saldos por cuenta</h2>
                {loadingSaldos && saldos.length === 0 ? (
                    <Loading />
                ) : saldos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center text-gray-500 dark:text-gray-400">
                        Aún no tienes cuentas bancarias. Agrégalas abajo para empezar a ver su saldo y movimientos.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {saldos.map((c) => (
                            <SaldoCard key={c.id} cuenta={c} onClick={() => setCuentaSel(c.id)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Administrar cuentas (reutiliza el componente existente) */}
            <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Administrar cuentas</h2>
                <CuentasBancariasConfig />
            </div>

            {cuentaSel != null && (
                <MovimientosModal cuentaId={cuentaSel} onClose={() => setCuentaSel(null)} />
            )}
        </div>
    );
};

export default BancosPanel;
