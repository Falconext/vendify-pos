// Formato del rótulo propio de despacho. Es por caja/navegador (la impresora
// es del equipo, no de la empresa): ticket térmico de 80 mm (alto variable),
// etiqueta adhesiva de 80×50 mm (pedido Navilook) o de 100×150 mm, el tamaño
// estándar de las etiqueteras para courier.

export type RotuloFormato = 'TICKET' | 'TICKET_ENVIO' | 'ETIQUETA_80X50' | 'ETIQUETA_100X150';

export const COURIER_LABEL: Record<string, string> = {
    SHALOM_PRO: 'Shalom PRO',
    SHALOM_COD: 'Shalom COD',
    OLVA: 'Olva Courier',
    PROPIOS: 'Reparto propio',
};

export const ROTULO_FORMATOS: { value: RotuloFormato; label: string; hint: string }[] = [
    { value: 'TICKET', label: 'Ticket 80 mm', hint: 'Impresora de tickets (alto según contenido)' },
    { value: 'TICKET_ENVIO', label: 'Ticket 80 mm con logo', hint: 'Diseño de envío con logo y destino resaltado (alto según contenido)' },
    { value: 'ETIQUETA_80X50', label: 'Etiqueta 80×50 mm', hint: 'Impresora de etiquetas adhesivas' },
    { value: 'ETIQUETA_100X150', label: 'Etiqueta 100×150 mm', hint: 'Rótulo de envío para impresora de etiquetas de courier' },
];

const key = (empresaId: number | string | undefined) => `ROTULO_FORMATO_${empresaId ?? 'x'}`;

export const leerRotuloFormato = (empresaId: number | string | undefined): RotuloFormato => {
    try {
        const v = localStorage.getItem(key(empresaId));
        return v === 'TICKET_ENVIO' || v === 'ETIQUETA_80X50' || v === 'ETIQUETA_100X150' ? v : 'TICKET';
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

/** Por debajo de este alto el rótulo quedaría más ancho que alto. */
const ALTO_MINIMO_TICKET_MM = 90;

/**
 * Alto de página para el ticket: el del rótulo más largo, más un margen para
 * que el redondeo no empuje el final a una hoja nueva. Con un alto fijo de
 * 330 mm la impresora botaba papel en blanco tras cada rótulo. Nunca baja del
 * mínimo: una página más ancha que alta se imprime en horizontal y el rótulo se
 * parte en dos hojas (POS-80 de Pierre). Sin medida (nada pintado) devuelve null.
 */
export const altoTicketMm = (contenedor: HTMLElement | null): number | null => {
    const altos = Array.from(contenedor?.querySelectorAll<HTMLElement>('[data-testid="rotulo-ticket"], [data-testid="rotulo-ticket-envio"]') ?? []).map((el) => el.offsetHeight);
    const mayor = Math.max(0, ...altos);
    return mayor > 0 ? Math.max(Math.ceil((mayor * 25.4) / 96) + 2, ALTO_MINIMO_TICKET_MM) : null;
};

/** El ticket se mide antes de imprimir: `display: none` daría alto 0. */
export const FUERA_DE_PANTALLA = { position: 'fixed', left: '-10000px', top: 0, visibility: 'hidden' } as const;

/** Estilo de página para react-to-print según el formato. */
export const rotuloPageStyle = (formato: RotuloFormato, altoTicket?: number | null) => {
    if (formato === 'TICKET' || formato === 'TICKET_ENVIO') {
        return `@page { size: 80mm ${altoTicket ?? 200}mm; margin: 0; }
           @media print { html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`;
    }
    const tamano = formato === 'ETIQUETA_100X150' ? '100mm 150mm' : '80mm 50mm';
    return `@page { size: ${tamano}; margin: 0; }
           @media print { html, body { margin: 0 !important; padding: 0 !important; } }`;
};
