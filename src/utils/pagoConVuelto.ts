/**
 * Con cuánto pagó el cliente y cuánto se le devolvió, para verlo sin imprimir
 *. Misma regla que el ticket (comprobanteImprimir):
 * - venta normal: pagó con = total + vuelto;
 * - nota editada que ya estaba cobrada: lo pagado antes, lo recibido ahora y
 *   el vuelto sobre el saldo, o la devolución si el total bajó.
 *
 * Solo hay algo que decir cuando hubo vuelto o devolución. Si pagó justo (o la
 * cajera cobró con "Exacto"), el dato no agrega nada y no se muestra. Crédito y
 * pago mixto tampoco: el mixto ya lista cada medio con su monto.
 */

const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
};
const r2 = (x: number) => Math.round(x * 100 + Number.EPSILON) / 100;

const detalleDePago = (c: any) => {
    let pd = c?.paymentDetails;
    if (typeof pd === 'string') {
        try { pd = JSON.parse(pd); } catch { pd = null; }
    }
    return pd || {};
};

export function lineasPagoConVuelto(c: any, simbolo = 'S/'): string[] {
    if (!c) return [];
    const medio = String(c.medioPago ?? '').toUpperCase();
    const pd = detalleDePago(c);
    const esCredito = medio === 'CREDITO' || medio === 'CRÉDITO' || String(c.formaPagoTipo ?? '').toUpperCase() === 'CREDITO';
    if (esCredito || medio === 'MIXTO' || pd.mode === 'MIXTO') return [];

    const total = n(c.mtoImpVenta);
    const vuelto = r2(n(c.vuelto));
    const m = (x: number) => `${simbolo} ${x.toFixed(2)}`;

    const pagoAnterior = r2(n(pd.pagoAnterior));
    if (pagoAnterior > 0) {
        const devolucion = r2(n(pd.devolucion));
        if (devolucion > 0) return [`Se le devolvió ${m(devolucion)} (había pagado ${m(pagoAnterior)})`];
        const recibido = r2(n(pd.recibido));
        if (vuelto > 0 && recibido > 0) {
            return [`Había pagado ${m(pagoAnterior)}`, `Luego pagó con ${m(recibido)} · vuelto ${m(vuelto)}`];
        }
        return [];
    }

    if (vuelto <= 0 || total <= 0) return [];
    return [`Pagó con ${m(r2(total + vuelto))} · vuelto ${m(vuelto)}`];
}
