/**
 * Notas de venta elegidas en la lista y lo que se puede hacer con ellas
 * (orden de compra, cobrar, exportar, WhatsApp). Sin React, para probarlo.
 */
export interface NotaElegida {
    id: number;
    documento: string;
    tipoDoc: string;
    clienteId: number | null;
    cliente: string;
    telefono: string;
    total: number;
    saldo: number;
    moneda: 'PEN' | 'USD';
    fecha: string;
    nroDoc: string;
    /** Boleta/factura en que ya terminó (null = sin convertir). */
    convertidoA: string | null;
    /** La nota tal como vino de la lista (detalles, pago…), para facturarla. */
    origen?: any;
}

export const notaElegidaDe = (item: any): NotaElegida => ({
    id: Number(item.id),
    documento: `${item.serie}-${String(item.correlativo).padStart(8, '0')}`,
    tipoDoc: String(item.tipoDoc ?? ''),
    clienteId: item.clienteId ?? item.cliente?.id ?? null,
    cliente: String(item.cliente?.nombre ?? '').trim(),
    telefono: String(item.cliente?.telefono ?? '').trim(),
    total: Number(item.mtoImpVenta) || 0,
    saldo: Number(item.saldo) || 0,
    moneda: String(item.tipoMoneda ?? 'PEN').toUpperCase() === 'USD' ? 'USD' : 'PEN',
    fecha: String(item.fechaEmision ?? ''),
    nroDoc: String(item.cliente?.nroDoc ?? '').trim(),
    convertidoA: item.convertidoA ?? null,
    origen: item,
});

/** "NV01-00000085" → "NV01-85", como se dice en el mostrador. */
export const documentoCorto = (documento: string) => documento.replace(/-0+(?=\d)/, '-');

export const simbolo = (moneda: 'PEN' | 'USD') => (moneda === 'USD' ? 'US$' : 'S/');

const redondear = (n: number) => Math.round(n * 100) / 100;

export interface ResumenSeleccion {
    cantidad: number;
    mismoCliente: boolean;
    mismaMoneda: boolean;
    moneda: 'PEN' | 'USD';
    cliente: string;
    telefono: string;
    total: number;
    saldo: number;
    conSaldo: number;
}

export function resumirSeleccion(notas: NotaElegida[]): ResumenSeleccion {
    const clientes = new Set(notas.map((n) => n.clienteId ?? `nombre:${n.cliente.toUpperCase()}`));
    const monedas = new Set(notas.map((n) => n.moneda));
    return {
        cantidad: notas.length,
        mismoCliente: clientes.size === 1,
        mismaMoneda: monedas.size === 1,
        moneda: notas[0]?.moneda ?? 'PEN',
        cliente: notas[0]?.cliente ?? '',
        telefono: notas.find((n) => n.telefono)?.telefono ?? '',
        total: redondear(notas.reduce((s, n) => s + n.total, 0)),
        saldo: redondear(notas.reduce((s, n) => s + Math.max(0, n.saldo), 0)),
        conSaldo: notas.filter((n) => n.saldo > 0).length,
    };
}

/** Por qué no se puede cobrar junto (null = sí se puede). */
export function motivoNoCobrar(r: ResumenSeleccion): string | null {
    if (!r.mismoCliente) return 'Elige notas de un mismo cliente';
    if (!r.mismaMoneda) return 'Hay notas en soles y en dólares';
    if (r.saldo <= 0) return 'Las notas elegidas ya están pagadas';
    return null;
}

/** Celular peruano para wa.me: 9 dígitos → 51XXXXXXXXX. Vacío si no sirve. */
export function telefonoWhatsApp(valor: string): string {
    const d = String(valor ?? '').replace(/\D/g, '');
    if (/^9\d{8}$/.test(d)) return `51${d}`;
    if (/^519\d{8}$/.test(d)) return d;
    if (d.length >= 10 && d.length <= 15 && !d.startsWith('0')) return d;
    return '';
}

const fechaCorta = (iso: string) => {
    const f = new Date(iso);
    return Number.isNaN(f.getTime()) ? '' : f.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', timeZone: 'America/Lima' });
};

/**
 * Nombre para saludar. RENIEC lo devuelve "APELLIDOS, NOMBRES": se toma el
 * primer nombre después de la coma. Empresas y "Clientes varios" no llevan
 * nombre (un "Hola Constructora" suena raro).
 */
export function nombreDePila(nombreCompleto: string): string {
    const n = String(nombreCompleto ?? '').trim();
    if (!n || /^clientes? varios$/i.test(n)) return '';
    if (/\b(S\.?A\.?C?|E\.?I\.?R\.?L|S\.?R\.?L|S\.?A\.?A|SOCIEDAD|EMPRESA|CORPORACI[OÓ]N|INVERSIONES|COMERCIAL)\b/i.test(n) || /\d/.test(n)) return '';
    const pila = (n.includes(',') ? n.split(',')[1] : n).trim().split(/\s+/)[0] ?? '';
    return pila ? pila.charAt(0).toUpperCase() + pila.slice(1).toLowerCase() : '';
}

/** Estado de cuenta para mandar por WhatsApp. */
export function mensajeEstadoCuenta(notas: NotaElegida[], negocio: string): string {
    const r = resumirSeleccion(notas);
    const s = simbolo(r.moneda);
    const ordenadas = [...notas].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const lineas = ordenadas.map((n) => {
        const f = fechaCorta(n.fecha);
        const estado = n.saldo > 0
            ? (n.saldo < n.total ? `debe ${s} ${n.saldo.toFixed(2)}` : 'pendiente')
            : 'pagada';
        return `• ${documentoCorto(n.documento)}${f ? ` (${f})` : ''}: ${s} ${n.total.toFixed(2)} — ${estado}`;
    });
    const nombre = r.mismoCliente ? nombreDePila(r.cliente) : '';
    const saludo = nombre ? `Hola ${nombre},` : 'Hola,';
    return [
        `${saludo} te comparto tu estado de cuenta${negocio ? ` en ${negocio}` : ''}:`,
        '',
        ...lineas,
        '',
        `Total: ${s} ${r.total.toFixed(2)}`,
        r.saldo > 0 ? `*Pendiente de pago: ${s} ${r.saldo.toFixed(2)}*` : '*Todo está pagado. ¡Gracias!*',
    ].join('\n');
}
