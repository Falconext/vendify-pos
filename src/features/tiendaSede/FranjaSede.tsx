import { memo, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { readableText } from '@/templates/shared/color';
import { useSedeTiendaStore, type SedeTienda } from './sedeTienda';

/** Alto de la franja: los encabezados fijos (StoreHeader, XtraHeader) se corren eso. */
export const ALTO_FRANJA_SEDE = 36;

interface Props {
    sede: SedeTienda;
    color: string;
    onAbrir: () => void;
}

/**
 * "📍 Comprando en: <sede> ▾", arriba del encabezado de cualquier plantilla.
 * Discreta: una línea con el color de la tienda, y se va con el scroll.
 */
function FranjaSede({ sede, color, onAbrir }: Props) {
    const texto = readableText(color);
    return (
        <div
            data-testid="franja-sede"
            className="relative z-[101] w-full"
            style={{ backgroundColor: color, color: texto, height: ALTO_FRANJA_SEDE }}
        >
            <div className="mx-auto flex h-full max-w-screen-xl items-center justify-center px-4">
                <button
                    type="button"
                    onClick={onAbrir}
                    aria-haspopup="dialog"
                    className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] leading-none transition hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                    style={{ outlineColor: texto }}
                >
                    <Icon icon="solar:map-point-bold" className="h-3.5 w-3.5 flex-none" aria-hidden />
                    <span className="flex-none opacity-80">Comprando en:</span>
                    <strong className="min-w-0 truncate font-semibold">{sede.nombre}</strong>
                    <Icon icon="solar:alt-arrow-down-linear" className="h-3.5 w-3.5 flex-none" aria-hidden />
                    <span className="sr-only">Cambiar de sede</span>
                </button>
            </div>
        </div>
    );
}

export default memo(FranjaSede);

/**
 * Para encabezados `fixed top-0`: cuánto bajarse para no tapar la franja.
 * Mientras se hace scroll el valor va de 36 a 0 y ahí se queda (React no
 * vuelve a pintar si el número no cambia).
 */
export function useDesfaseFranjaSede(): number {
    const visible = useSedeTiendaStore((s) => s.franjaVisible);
    const [desplazado, setDesplazado] = useState(0);
    useEffect(() => {
        if (!visible) return;
        const medir = () => setDesplazado(Math.min(ALTO_FRANJA_SEDE, Math.max(0, window.scrollY)));
        medir();
        window.addEventListener('scroll', medir, { passive: true });
        return () => window.removeEventListener('scroll', medir);
    }, [visible]);
    return visible ? ALTO_FRANJA_SEDE - desplazado : 0;
}
