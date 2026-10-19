// Desglose de un pago MIXTO (p. ej. S/ 20 en efectivo + S/ 16 por Yape).
//
// Al emitir, el POS trae las líneas en `splitPayments`. Al reimprimir o consultar
// un comprobante ya guardado esas líneas no vienen sueltas: están en
// `paymentDetails.splitPayments` y, en documentos viejos sin ese detalle, solo en
// las filas de `Pago` (`pagos`, o `cobros` en el Panel de Ventas). Antes la
// reimpresión miraba únicamente `splitPayments` y el ticket salía "MIXTO" sin
// montos (DEMENVER NV01-6474 y NV01-6503).

export interface LineaPagoMixto {
    method: string;
    amount: number;
    [extra: string]: any;
}

const parsear = (pd: any) => {
    if (typeof pd !== 'string') return pd;
    try { return JSON.parse(pd); } catch { return null; }
};

const normalizar = (lineas: any[]): LineaPagoMixto[] =>
    lineas
        .map((l) => ({ ...l, method: String(l?.method ?? l?.medioPago ?? '').toUpperCase(), amount: Number(l?.amount ?? l?.monto ?? 0) }))
        .filter((l) => l.method && l.amount > 0);

/** Agrupa filas de cobro por medio: dos abonos en efectivo se muestran como uno. */
const agruparPorMedio = (filas: any[]): LineaPagoMixto[] => {
    const porMedio = new Map<string, number>();
    for (const f of normalizar(filas)) porMedio.set(f.method, (porMedio.get(f.method) ?? 0) + f.amount);
    return [...porMedio].map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 }));
};

export function lineasPagoMixto(doc: any): LineaPagoMixto[] {
    if (!doc) return [];
    if (Array.isArray(doc.splitPayments) && doc.splitPayments.length > 0) return normalizar(doc.splitPayments);
    const pd = parsear(doc.paymentDetails);
    if (Array.isArray(pd?.splitPayments) && pd.splitPayments.length > 0) return normalizar(pd.splitPayments);
    const filas = Array.isArray(doc.pagos) ? doc.pagos : Array.isArray(doc.cobros) ? doc.cobros : [];
    return agruparPorMedio(filas);
}

const ETIQUETAS: Record<string, string> = {
    EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta',
};

export const etiquetaMedioPago = (m: string) => ETIQUETAS[String(m).toUpperCase()] ?? m;

/** "Efectivo S/ 20.00 · Yape S/ 16.00" */
export const resumenPagoMixto = (lineas: LineaPagoMixto[], simbolo = 'S/') =>
    lineas.map((l) => `${etiquetaMedioPago(l.method)} ${simbolo} ${l.amount.toFixed(2)}`).join(' · ');
