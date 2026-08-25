import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/zustand/auth';
import { useCajaStore } from '@/zustand/caja';
import useAlertStore from '@/zustand/alert';

/**
 * Candado de "caja obligatoria" en el POS: si la empresa configuró
 * requiereCajaParaEmitir y el usuario no tiene su caja abierta, este modal se
 * muestra ANTES que cualquier otro del flujo de venta y permite abrirla ahí
 * mismo (o volver, o seguir solo para cotizar — las cotizaciones están
 * exentas, igual que en el backend).
 *
 * `onResuelto(soloCotizar)` se dispara cuando ya se puede continuar:
 * caja abierta/no requerida (false) o el usuario eligió solo cotizar (true).
 */
interface Props {
    onResuelto: (soloCotizar: boolean) => void;
}

const ModalAbrirCajaObligatoria: React.FC<Props> = ({ onResuelto }) => {
    const navigate = useNavigate();
    const { auth } = useAuthStore();
    const { estadoCaja, obtenerEstadoCaja, abrirCaja } = useCajaStore();
    const { alert } = useAlertStore();

    const requiereCaja = Boolean((auth as any)?.empresa?.requiereCajaParaEmitir);
    const [verificando, setVerificando] = useState(requiereCaja);
    const [mostrar, setMostrar] = useState(false);
    const [montoInicial, setMontoInicial] = useState('');
    const [abriendo, setAbriendo] = useState(false);

    useEffect(() => {
        if (!requiereCaja) {
            onResuelto(false);
            return;
        }
        (async () => {
            await obtenerEstadoCaja();
            setVerificando(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requiereCaja]);

    useEffect(() => {
        if (!requiereCaja || verificando || !estadoCaja) return;
        if (estadoCaja.estado === 'ABIERTA') {
            setMostrar(false);
            onResuelto(false);
        } else {
            setMostrar(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verificando, estadoCaja?.estado, requiereCaja]);

    const handleAbrir = async () => {
        const monto = Number(montoInicial);
        if (montoInicial === '' || isNaN(monto) || monto < 0) {
            alert('Ingresa el monto inicial de la caja (puede ser 0)', 'warning');
            return;
        }
        setAbriendo(true);
        const result = await abrirCaja({ montoInicial: monto });
        setAbriendo(false);
        if (result.success) {
            alert(result.message || 'Caja abierta', 'success');
            setMostrar(false);
            onResuelto(false);
        } else {
            alert(result.message || 'No se pudo abrir la caja', 'error');
        }
    };

    if (!mostrar) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl">
                        <Icon icon="solar:cash-out-bold-duotone" className="text-3xl" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Abre tu caja para vender</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Tu empresa exige tener la caja abierta antes de emitir comprobantes.
                        </p>
                    </div>
                </div>

                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Monto inicial (fondo de caja) *
                </label>
                <input
                    type="number"
                    min={0}
                    step="0.01"
                    autoFocus
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAbrir(); }}
                    placeholder="Ej: 100.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                />

                <button
                    onClick={handleAbrir}
                    disabled={abriendo}
                    className="mt-4 w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {abriendo
                        ? <Icon icon="eos-icons:loading" />
                        : <Icon icon="solar:play-circle-bold" />}
                    Abrir caja y continuar
                </button>

                <div className="mt-3 flex items-center justify-between text-xs">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
                    >
                        ← Volver
                    </button>
                    <button
                        onClick={() => { setMostrar(false); onResuelto(true); }}
                        className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                        title="Las cotizaciones no requieren caja abierta"
                    >
                        Solo voy a cotizar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalAbrirCajaObligatoria;
