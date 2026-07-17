import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { createPortal } from 'react-dom';
import { usePagosStore } from '@/zustand/pagos';

interface ModalHistorialPagosProps {
    comprobante: any;
    onClose: () => void;
}

const medioPagoIcon: Record<string, string> = {
    EFECTIVO: 'solar:banknote-bold-duotone',
    YAPE: 'solar:smartphone-bold-duotone',
    PLIN: 'solar:smartphone-bold-duotone',
    TRANSFERENCIA: 'solar:transfer-horizontal-bold-duotone',
    TARJETA: 'solar:card-bold-duotone',
};

const ModalHistorialPagos = ({ comprobante, onClose }: ModalHistorialPagosProps) => {
    const { getHistorialPagos } = usePagosStore();
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPagado, setTotalPagado] = useState(0);

    useEffect(() => {
        const fetchPagos = async () => {
            try {
                setLoading(true);
                const result = await getHistorialPagos(comprobante.id);
                if (result.success) {
                    setPagos(result.pagos || []);
                    setTotalPagado(result.totalPagado || 0);
                }
            } finally {
                setLoading(false);
            }
        };
        if (comprobante?.id) fetchPagos();
    }, [comprobante?.id, getHistorialPagos]);

    const totalComprobante = Number(comprobante?.mtoImpVenta || 0);
    // comprobante.saldo viene del panel y ya descuenta adelanto + pagos anteriores.
    // totalPagado viene de los Pago records fetched ahora.
    // Math.min asegura que si el adelanto no generó un Pago record,
    // el saldo del panel (que sí lo descuenta) sea el techo correcto.
    const saldoPendiente = Math.min(
        Number(comprobante?.saldo ?? 0),
        Math.max(0, totalComprobante - totalPagado),
    );

    const content = (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl max-w-md w-full overflow-hidden max-h-[85vh] flex flex-col border dark:border-transparent">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                            <Icon icon="solar:history-bold-duotone" className="text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Historial de Pagos</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {comprobante?.serie}-{String(comprobante?.correlativo).padStart(8, '0')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                {/* Resumen */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Cliente</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{comprobante?.cliente?.nombre || 'Sin cliente'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Total comprobante</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">S/ {totalComprobante.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Total pagado</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">S/ {totalPagado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400 dark:text-gray-500">Saldo pendiente</span>
                        <span className={`text-lg font-black ${saldoPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            S/ {saldoPendiente.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Lista de pagos */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-300" />
                        </div>
                    ) : pagos.length === 0 ? (
                        <div className="text-center py-10">
                            <Icon icon="solar:wallet-money-linear" className="text-4xl text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Sin pagos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pagos.map((pago: any, index: number) => (
                                <div key={pago.id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                            <Icon
                                                icon={medioPagoIcon[pago.medioPago] || 'solar:card-bold-duotone'}
                                                className="text-gray-500 dark:text-gray-400 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                Pago #{pagos.length - index}
                                                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">{pago.medioPago}</span>
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{moment(pago.fecha).format('DD/MM/YYYY HH:mm')}</p>
                                            {pago.referencia && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Ref: {pago.referencia.toUpperCase()}</p>
                                            )}
                                            {pago.observacion && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{pago.observacion}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">S/ {Number(pago.monto).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

export default ModalHistorialPagos;
