import { memo, useState } from 'react';
import { Icon } from '@iconify/react';
import type { FichaSede } from './sedeTienda';

interface Props {
    ficha: FichaSede;
    sedeNombre: string;
    color: string;
    onCambiar: (sedeId: number) => void;
}

/** ¿Hay que avisar que el producto está en otra sede? (agotado o no vendible aquí) */
export function debeAvisarOtraSede(ficha: FichaSede | null): ficha is FichaSede {
    return !!ficha && ficha.disponibleEn.length > 0 && (!ficha.vendible || !(ficha.stock > 0));
}

/**
 * Aviso común de la ficha, para todas las plantillas: "Agotado en Centro ·
 * Disponible en Norte". Cada plantilla tiene su propia ficha; este aviso
 * flota abajo a la izquierda (el botón de WhatsApp vive a la derecha).
 */
function AvisoOtraSede({ ficha, sedeNombre, color, onCambiar }: Props) {
    const [cerrado, setCerrado] = useState(false);
    if (cerrado) return null;
    const otras = ficha.disponibleEn.slice(0, 3);
    return (
        <div
            role="status"
            data-testid="aviso-otra-sede"
            className="fixed bottom-3 left-3 z-[95] w-[min(22rem,calc(100%-5.5rem))] rounded-2xl border border-gray-100 bg-white p-3 text-gray-800 shadow-xl sm:bottom-5 sm:left-5"
        >
            <div className="flex items-start gap-2">
                <Icon icon="solar:map-point-wave-linear" className="mt-0.5 h-4 w-4 flex-none" style={{ color }} />
                <p className="min-w-0 flex-1 text-[12.5px] leading-5">
                    <strong className="font-semibold">{ficha.vendible ? 'Agotado' : 'No disponible'} en {sedeNombre}</strong>
                    <span className="text-gray-500"> · Disponible en {otras.map((o) => o.nombre).join(', ')}</span>
                </p>
                <button type="button" aria-label="Cerrar aviso" onClick={() => setCerrado(true)} className="-mr-1 -mt-1 rounded-full p-1 text-gray-400 hover:bg-gray-100">
                    <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                {otras.map((o) => (
                    <button
                        key={o.sedeId}
                        type="button"
                        data-testid={`aviso-cambiar-${o.sedeId}`}
                        onClick={() => onCambiar(o.sedeId)}
                        className="rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition hover:bg-gray-50"
                        style={{ borderColor: color, color }}
                    >
                        Comprar en {o.nombre}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default memo(AvisoOtraSede);
