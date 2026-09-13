/**
 * Formato de impresión de comprobantes configurado por la empresa en
 * Perfil → Configuración (`formatoImpresionDefault`).
 *
 * Es el que se preselecciona al imprimir un comprobante recién emitido y al
 * reimprimir desde la lista. Si la empresa nunca lo configuró se mantiene
 * TICKET, que es lo que el sistema usaba antes de existir esta opción.
 */

export type FormatoImpresion = 'TICKET' | 'A4' | 'A5';

export const FORMATOS_IMPRESION: FormatoImpresion[] = ['TICKET', 'A4', 'A5'];

/** Metadatos de cada formato, para pintar los selectores sin repetirlos. */
export const FORMATOS_IMPRESION_INFO: Array<{
    value: FormatoImpresion;
    label: string;
    sub: string;
    icon: string;
}> = [
    { value: 'A4', label: 'A4', sub: '210×297mm', icon: 'solar:document-bold-duotone' },
    { value: 'A5', label: 'A5', sub: '148×210mm', icon: 'solar:file-bold-duotone' },
    { value: 'TICKET', label: 'Ticket', sub: '80mm', icon: 'solar:receipt-bold-duotone' },
];

/**
 * Formato configurado por la empresa. `empresa` puede venir del store de auth o
 * del perfil; cualquier valor desconocido cae a TICKET.
 */
export const getFormatoImpresionDefault = (empresa: any): FormatoImpresion => {
    const v = String(empresa?.formatoImpresionDefault ?? '').toUpperCase();
    return (FORMATOS_IMPRESION as string[]).includes(v)
        ? (v as FormatoImpresion)
        : 'TICKET';
};
