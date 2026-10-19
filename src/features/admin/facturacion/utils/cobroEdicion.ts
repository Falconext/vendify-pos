/**
 * Cobro al EDITAR un comprobante informal que ya estaba (total o parcialmente)
 * pagado.
 *
 * Caso real (DEMENVER): nota de venta de S/ 20.80 cobrada en efectivo. El
 * cliente cambia de idea, se quitan los productos y se agregan 10 × S/ 4.50 =
 * S/ 45.00. El modal arrancaba con 20.80 en "recibido" (lo ya pagado) y, cuando
 * el cajero escribía el billete que le daban (50), calculaba el vuelto contra el
 * TOTAL: 50 − 45 = 5.00. Lo correcto es contra el SALDO: el cliente ya había
 * dado 20.80, debe 24.20, entrega 50 → vuelto 25.80. La caja quedaba con 20.80
 * de menos en el vuelto entregado.
 *
 * Acá vive toda la aritmética para que la pantalla, el ticket y lo que se manda
 * al backend no puedan discrepar:
 * - `pagoPrevioDeNota`: cuánto y con qué medios ya se cobró la nota.
 * - `calcularCobro`: saldo a cobrar, a devolver, recibido, vuelto y faltante.
 *   Con pago previo 0 da exactamente lo mismo que el cálculo de una venta nueva.
 * - `armarPagoEdicion`: el pago COMPLETO que se guarda (lo previo + lo nuevo).
 *   El backend reemplaza los pagos de la nota con lo que recibe, así que hay
 *   que mandarle ambos; cada línea va por lo efectivamente APLICADO (sin el
 *   vuelto), para que la caja sume 24.20 más y no 45 de nuevo ni 50.
 */

export interface LineaCobro {
    method: string;
    amount: number;
    referencia?: string;
    cuentaBancariaId?: number | null;
    cuentaBancariaLabel?: string;
    tarjetaMarca?: string;
    tarjetaTipo?: string;
    tarjetaUltimos4?: string;
}

export interface PagoPrevio {
    monto: number;
    lineas: LineaCobro[];
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;

const upper = (s?: string | null) => String(s ?? '').trim().toUpperCase();
const esEfectivo = (m?: string) => upper(m) === 'EFECTIVO';
const suma = (lineas: LineaCobro[]) => round2(lineas.reduce((s, l) => s + (Number(l.amount) || 0), 0));

const parsear = (pd: any) => {
    if (typeof pd !== 'string') return pd;
    try { return JSON.parse(pd); } catch { return null; }
};

/**
 * Le quita `exceso` a las líneas: primero al efectivo (el vuelto o la
 * devolución salen del cajón) y, si no alcanza, desde la última línea.
 */
export function recortarLineas(lineas: LineaCobro[], exceso: number): LineaCobro[] {
    let resta = round2(Math.max(0, exceso));
    const out = lineas.map((l) => ({ ...l, amount: round2(Number(l.amount) || 0) }));
    const orden = [
        ...out.map((l, i) => i).filter((i) => esEfectivo(out[i].method)).reverse(),
        ...out.map((l, i) => i).filter((i) => !esEfectivo(out[i].method)).reverse(),
    ];
    for (const i of orden) {
        if (resta <= 0) break;
        const quita = Math.min(resta, out[i].amount);
        out[i].amount = round2(out[i].amount - quita);
        resta = round2(resta - quita);
    }
    return out.filter((l) => l.amount > 0);
}

/**
 * Lo ya cobrado de la nota: el monto sale de `mtoImpVenta − saldo` (lo que el
 * backend considera pagado); los medios, del detalle de pago guardado. En
 * efectivo ese detalle puede traer el billete entregado (con vuelto), por eso
 * se ajusta al monto real.
 */
export function pagoPrevioDeNota(nota: any): PagoPrevio {
    const total = Number(nota?.mtoImpVenta || 0);
    const monto = round2(Math.max(0, total - Number(nota?.saldo || 0)));
    if (!(monto > 0)) return { monto: 0, lineas: [] };

    const pd = parsear(nota?.paymentDetails) || {};
    const crudas: any[] = Array.isArray(pd?.splitPayments) ? pd.splitPayments : [];
    const lineas: LineaCobro[] = crudas
        .map((l) => ({
            method: upper(l?.method) || 'EFECTIVO',
            amount: round2(Number(l?.amount || 0)),
            referencia: l?.referencia || undefined,
            cuentaBancariaId: l?.cuentaBancariaId ?? null,
            cuentaBancariaLabel: l?.cuentaBancariaLabel || undefined,
        }))
        .filter((l) => l.amount > 0);

    if (lineas.length > 0) {
        const sum = suma(lineas);
        if (sum > monto) return { monto, lineas: recortarLineas(lineas, sum - monto) };
        if (sum < monto) {
            // Detalle incompleto (documentos viejos): lo que falta se atribuye al
            // primer medio, para que el total siga siendo el que registró el backend.
            lineas[0] = { ...lineas[0], amount: round2(lineas[0].amount + monto - sum) };
        }
        return { monto, lineas };
    }

    const medio = upper(pd?.method) || upper(nota?.medioPago);
    return {
        monto,
        lineas: [{
            method: !medio || medio === 'MIXTO' || medio === 'CREDITO' || medio === 'CRÉDITO' ? 'EFECTIVO' : medio,
            amount: monto,
            referencia: pd?.referencia || undefined,
            cuentaBancariaId: pd?.cuentaBancariaId ?? null,
            cuentaBancariaLabel: pd?.cuentaBancariaLabel || undefined,
        }],
    };
}

export interface CobroCalculado {
    /** Lo que falta cobrar sobre lo ya pagado (el total si no hay pago previo). */
    aCobrar: number;
    /** Lo pagado de más cuando el nuevo total quedó por debajo de lo ya cobrado. */
    aDevolver: number;
    /** Lo que el cliente entrega AHORA. */
    montoRecibido: number;
    vuelto: number;
    /** Efectivo simple con un monto recibido menor al saldo. */
    faltante: number;
}

export function calcularCobro(p: {
    total: number;
    pagoPrevio?: number;
    esMixto: boolean;
    esEfectivo: boolean;
    pay: number;
    splitTotal: number;
}): CobroCalculado {
    const total = round2(Math.max(0, p.total));
    const previo = round2(Math.max(0, p.pagoPrevio || 0));
    const aCobrar = round2(Math.max(0, total - previo));
    const aDevolver = round2(Math.max(0, previo - total));
    const montoRecibido = p.esMixto
        ? round2(p.splitTotal)
        : p.esEfectivo && p.pay > 0
            ? round2(p.pay)
            : aCobrar;
    const vuelto = round2(Math.max(0, montoRecibido - aCobrar));
    const faltante = !p.esMixto && p.esEfectivo && p.pay > 0
        ? round2(Math.max(0, aCobrar - montoRecibido))
        : 0;
    return { aCobrar, aDevolver, montoRecibido, vuelto, faltante };
}

export interface PagoEdicion {
    medioPago: string;
    paymentDetails: Record<string, any>;
    /** Líneas a registrar (solo si queda más de un medio). */
    splitPayments?: LineaCobro[];
    pagoAnterior: number;
    recibido: number;
    vuelto: number;
    devolucion: number;
}

/**
 * Pago completo de la nota editada = lo cobrado antes + lo cobrado ahora, por
 * monto aplicado. Las líneas del mismo medio (y misma cuenta) se juntan: si
 * todo fue en efectivo, sigue siendo un pago simple en efectivo.
 */
export function armarPagoEdicion(p: { total: number; previas: LineaCobro[]; nuevas: LineaCobro[] }): PagoEdicion {
    const total = round2(Math.max(0, p.total));
    const pagoAnterior = suma(p.previas);
    const devolucion = round2(Math.max(0, pagoAnterior - total));
    const previas = devolucion > 0 ? recortarLineas(p.previas, devolucion) : p.previas.filter((l) => l.amount > 0);
    const aCobrar = round2(Math.max(0, total - pagoAnterior));
    const nuevasValidas = aCobrar > 0 ? p.nuevas.filter((l) => Number(l.amount) > 0) : [];
    const recibido = suma(nuevasValidas);
    const vuelto = round2(Math.max(0, recibido - aCobrar));
    const nuevas = vuelto > 0 ? recortarLineas(nuevasValidas, vuelto) : nuevasValidas;

    const juntas: LineaCobro[] = [];
    for (const l of [...previas, ...nuevas]) {
        const method = upper(l.method) || 'EFECTIVO';
        const cuenta = l.cuentaBancariaId ? Number(l.cuentaBancariaId) : null;
        const igual = juntas.find((j) => j.method === method && (j.cuentaBancariaId ?? null) === cuenta);
        if (igual) {
            igual.amount = round2(igual.amount + Number(l.amount));
            if (!igual.referencia && l.referencia) igual.referencia = l.referencia;
        } else {
            // Sin los campos vacíos del formulario (referencia '', tarjeta '', …).
            const limpia = Object.fromEntries(Object.entries(l).filter(([, v]) => v !== '' && v !== undefined)) as unknown as LineaCobro;
            juntas.push({ ...limpia, method, cuentaBancariaId: cuenta, amount: round2(Number(l.amount)) });
        }
    }

    const meta = { pagoAnterior, recibido, devolucion };
    if (juntas.length <= 1) {
        const unica = juntas[0] ?? { method: 'EFECTIVO', amount: 0, cuentaBancariaId: null };
        return {
            medioPago: unica.method,
            paymentDetails: { mode: 'SIMPLE', ...unica, ...meta },
            pagoAnterior, recibido, vuelto, devolucion,
        };
    }
    return {
        medioPago: 'MIXTO',
        paymentDetails: { mode: 'MIXTO', splitPayments: juntas, ...meta },
        splitPayments: juntas,
        pagoAnterior, recibido, vuelto, devolucion,
    };
}
