// Formato del rótulo propio de despacho. Es por caja/navegador (la impresora
// es del equipo, no de la empresa): ticket térmico de 80 mm (alto variable),
// etiqueta adhesiva de 80×50 mm (pedido Navilook) o de 100×150 mm, el tamaño
// estándar de las etiqueteras para courier.

export type RotuloFormato = 'TICKET' | 'ETIQUETA_80X50' | 'ETIQUETA_100X150';

export const COURIER_LABEL: Record<string, string> = {
    SHALOM_PRO: 'Shalom PRO',
    SHALOM_COD: 'Shalom COD',
    OLVA: 'Olva Courier',
    PROPIOS: 'Reparto propio',
};

export const ROTULO_FORMATOS: { value: RotuloFormato; label: string; hint: string }[] = [
    { value: 'TICKET', label: 'Ticket 80 mm', hint: 'Impresora de tickets (alto según contenido)' },
    { value: 'ETIQUETA_80X50', label: 'Etiqueta 80×50 mm', hint: 'Impresora de etiquetas adhesivas' },
    { value: 'ETIQUETA_100X150', label: 'Etiqueta 100×150 mm', hint: 'Rótulo de envío para impresora de etiquetas de courier' },
];

const key = (empresaId: number | string | undefined) => `ROTULO_FORMATO_${empresaId ?? 'x'}`;

export const leerRotuloFormato = (empresaId: number | string | undefined): RotuloFormato => {
    try {
        const v = localStorage.getItem(key(empresaId));
        return v === 'ETIQUETA_80X50' || v === 'ETIQUETA_100X150' ? v : 'TICKET';
    } catch {
        return 'TICKET';
    }
};

export const guardarRotuloFormato = (empresaId: number | string | undefined, formato: RotuloFormato) => {
    try {
        localStorage.setItem(key(empresaId), formato);
    } catch {
        /* almacenamiento no disponible: se ignora */
    }
};

/** Estilo de página para react-to-print según el formato. */
export const rotuloPageStyle = (formato: RotuloFormato) => {
    if (formato === 'TICKET') return null;
    const tamano = formato === 'ETIQUETA_100X150' ? '100mm 150mm' : '80mm 50mm';
    return `@page { size: ${tamano}; margin: 0; }
           @media print { html, body { margin: 0 !important; padding: 0 !important; } }`;
};
