import { useState } from 'react';
import { Icon } from '@iconify/react';
import { EnvioAgenciaSeccion, faltaEnvioAgencia, useEnvioAgencia } from './EnvioAgencia';

interface ConfirmOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    total: number;
    loading?: boolean;
}

export default function ModaConfirmOrderModal({
    isOpen,
    onClose,
    onConfirm,
    total,
    loading = false,
}: ConfirmOrderModalProps) {
    // La plantilla Moda tiene su propio modal: la agencia (Shalom/Olva) se
    // elige acá igual que en ConfirmOrderModal. Ver EnvioAgencia.tsx.
    const { ctx, activo: conAgencia } = useEnvioAgencia();
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    if (!isOpen) return null;
    const confirmar = () => {
        if (conAgencia && ctx) {
            const falta = faltaEnvioAgencia(ctx.valor, ctx.direccion);
            setErrorEnvio(falta);
            if (falta) return;
        }
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className={`bg-white rounded-none ${conAgencia ? 'max-w-md max-h-[92vh] overflow-y-auto overflow-x-hidden' : 'max-w-sm'} w-full border border-gray-200 p-8 shadow-2xl relative`}>

                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-6 border border-gray-900 flex items-center justify-center">
                        <Icon icon="solar:cart-large-minimalistic-linear" className="w-6 h-6 text-gray-900" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-gray-900 tracking-tight uppercase mb-2">
                        Confirmar Pedido
                    </h3>

                    <p className="text-center text-gray-500 text-sm mb-6">
                        Completarás tu compra por un total de:
                        <br />
                        <span className="text-2xl font-black text-gray-900 mt-2 block tracking-tight">
                            S/ {total.toFixed(2)}
                        </span>
                    </p>

                    <div className="w-full">
                        <EnvioAgenciaSeccion color="#111827" error={errorEnvio} />
                    </div>

                    <div className="bg-gray-50 border border-gray-100 p-4 mb-8 w-full">
                        <p className="text-xs text-gray-500 text-center leading-relaxed">
                            Al confirmar, tu pedido será registrado y pasará a preparación.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={confirmar}
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Icon icon="line-md:loading-loop" className="w-5 h-5" />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <span>Sí, Confirmar</span>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="w-full py-3.5 px-4 border border-gray-200 text-gray-900 text-sm font-bold tracking-wide uppercase hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
