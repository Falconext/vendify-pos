import type { MouseEvent } from 'react';

interface Props {
    marcada: boolean;
    /** Algunas marcadas (casilla de "todas"). */
    parcial?: boolean;
    onCambiar: () => void;
    etiqueta: string;
    className?: string;
}

/**
 * Casilla de selección de filas. El checkbox nativo se veía chico y con el
 * azul del navegador; esta sigue la paleta del panel y tiene un área de toque
 * de 32 px aunque el cuadro mida 20.
 */
export default function CasillaSeleccion({ marcada, parcial = false, onCambiar, etiqueta, className = '' }: Props) {
    const activa = marcada || parcial;
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={parcial ? 'mixed' : marcada}
            aria-label={etiqueta}
            title={etiqueta}
            onClick={(e: MouseEvent) => { e.stopPropagation(); onCambiar(); }}
            className={`group/casilla -m-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${className}`}
        >
            <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150 ${
                    activa
                        ? 'border-blue-600 bg-blue-600 shadow-sm shadow-blue-600/30'
                        : 'border-gray-300 bg-white group-hover/casilla:border-blue-400 dark:border-slate-600 dark:bg-slate-900'
                }`}
            >
                {parcial ? (
                    <span className="h-0.5 w-2.5 rounded-full bg-white" />
                ) : (
                    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 text-white transition-transform duration-150 ${marcada ? 'scale-100' : 'scale-0'}`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                )}
            </span>
        </button>
    );
}
