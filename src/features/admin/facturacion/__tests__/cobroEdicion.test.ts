/**
 * Cobro al editar una nota ya pagada (DEMENVER): el vuelto se calcula contra el
 * SALDO, no contra el total, y lo que se guarda es el pago completo aplicado.
 */
import * as fs from 'fs';
import * as path from 'path';
import { armarPagoEdicion, calcularCobro, pagoPrevioDeNota } from '../utils/cobroEdicion';

const efectivo = (pay: number, pagoPrevio = 0, total = 45) =>
    calcularCobro({ total, pagoPrevio, esMixto: false, esEfectivo: true, pay, splitTotal: 0 });

describe('calcularCobro', () => {
    it('DEMENVER: pagó 20.80, nuevo total 45, entrega 50 → vuelto 25.80 (no 5.00)', () => {
        const c = efectivo(50, 20.8);
        expect(c).toMatchObject({ aCobrar: 24.2, montoRecibido: 50, vuelto: 25.8, faltante: 0, aDevolver: 0 });
    });

    it('"Exacto" es el saldo: 24.20 → vuelto 0, sin faltante', () => {
        expect(efectivo(24.2, 20.8)).toMatchObject({ vuelto: 0, faltante: 0 });
    });

    it('entrega menos que el saldo → Falta la diferencia', () => {
        expect(efectivo(20, 20.8)).toMatchObject({ faltante: 4.2, vuelto: 0 });
    });

    it('campo vacío → se asume el saldo exacto', () => {
        expect(efectivo(0, 20.8)).toMatchObject({ montoRecibido: 24.2, vuelto: 0, faltante: 0 });
    });

    it('nuevo total menor que lo pagado → a devolver, nada que cobrar', () => {
        expect(efectivo(0, 20.8, 15)).toMatchObject({ aCobrar: 0, aDevolver: 5.8, vuelto: 0, faltante: 0 });
    });

    it('sin pago previo es idéntico a una venta nueva', () => {
        expect(efectivo(50)).toMatchObject({ aCobrar: 45, montoRecibido: 50, vuelto: 5, faltante: 0 });
        expect(efectivo(40)).toMatchObject({ faltante: 5 });
        expect(calcularCobro({ total: 45, esMixto: true, esEfectivo: false, pay: 0, splitTotal: 50 }))
            .toMatchObject({ montoRecibido: 50, vuelto: 5 });
        expect(calcularCobro({ total: 45, esMixto: false, esEfectivo: false, pay: 0, splitTotal: 0 }))
            .toMatchObject({ montoRecibido: 45, vuelto: 0 });
    });
});

describe('pagoPrevioDeNota', () => {
    it('efectivo simple: el monto sale de total − saldo, no del billete guardado', () => {
        const p = pagoPrevioDeNota({ mtoImpVenta: 20.8, saldo: 0, medioPago: 'EFECTIVO', paymentDetails: { mode: 'SIMPLE', method: 'EFECTIVO', amount: 50 } });
        expect(p).toEqual({ monto: 20.8, lineas: [expect.objectContaining({ method: 'EFECTIVO', amount: 20.8 })] });
    });

    it('mixto guardado como texto, con vuelto en efectivo dentro de las líneas', () => {
        const p = pagoPrevioDeNota({
            mtoImpVenta: 20.8, saldo: 0, medioPago: 'MIXTO',
            paymentDetails: JSON.stringify({ mode: 'MIXTO', splitPayments: [{ method: 'EFECTIVO', amount: 20 }, { method: 'YAPE', amount: 5.8 }] }),
        });
        expect(p.monto).toBe(20.8);
        expect(p.lineas.map((l) => [l.method, l.amount])).toEqual([['EFECTIVO', 15], ['YAPE', 5.8]]);
    });

    it('nota pendiente de pago → sin pago previo', () => {
        expect(pagoPrevioDeNota({ mtoImpVenta: 20.8, saldo: 20.8 })).toEqual({ monto: 0, lineas: [] });
    });
});

describe('armarPagoEdicion — lo que se guarda (y suma en caja)', () => {
    const previas = [{ method: 'EFECTIVO', amount: 20.8 }];

    it('mismo medio: un solo pago en efectivo por 45, con el vuelto fuera', () => {
        const r = armarPagoEdicion({ total: 45, previas, nuevas: [{ method: 'EFECTIVO', amount: 50 }] });
        expect(r.medioPago).toBe('EFECTIVO');
        expect(r.paymentDetails).toMatchObject({ mode: 'SIMPLE', method: 'EFECTIVO', amount: 45, pagoAnterior: 20.8, recibido: 50, devolucion: 0 });
        expect(r.vuelto).toBe(25.8);
    });

    it('cambio de medio: efectivo 20.80 + Yape 24.20 → mixto', () => {
        const r = armarPagoEdicion({ total: 45, previas, nuevas: [{ method: 'YAPE', amount: 24.2, cuentaBancariaId: 3 }] });
        expect(r.medioPago).toBe('MIXTO');
        expect(r.splitPayments!.map((l) => [l.method, l.amount, l.cuentaBancariaId])).toEqual([['EFECTIVO', 20.8, null], ['YAPE', 24.2, 3]]);
    });

    it('mixto nuevo con exceso: el vuelto sale del efectivo aunque esté primero', () => {
        const r = armarPagoEdicion({ total: 45, previas, nuevas: [{ method: 'EFECTIVO', amount: 20 }, { method: 'YAPE', amount: 10 }] });
        // saldo 24.20; recibido 30; vuelto 5.80 sale del efectivo (20 → 14.20)
        expect(r.vuelto).toBe(5.8);
        expect(r.splitPayments!.map((l) => [l.method, l.amount])).toEqual([['EFECTIVO', 35], ['YAPE', 10]]);
        expect(r.splitPayments!.reduce((s, l) => s + l.amount, 0)).toBeCloseTo(45, 2);
    });

    it('nuevo total menor: se devuelve del efectivo y no se cobra nada', () => {
        const r = armarPagoEdicion({ total: 15, previas, nuevas: [{ method: 'EFECTIVO', amount: 99 }] });
        expect(r.paymentDetails).toMatchObject({ mode: 'SIMPLE', method: 'EFECTIVO', amount: 15, devolucion: 5.8, recibido: 0 });
    });

    it('nuevo total igual a lo pagado: queda el pago previo tal cual', () => {
        const r = armarPagoEdicion({ total: 20.8, previas, nuevas: [] });
        expect(r.paymentDetails).toMatchObject({ amount: 20.8, pagoAnterior: 20.8, recibido: 0, devolucion: 0 });
        expect(r.vuelto).toBe(0);
    });
});

describe('cableado en el POS', () => {
    const raiz = path.join(__dirname, '..', '..', '..', '..');
    const leer = (rel: string) => fs.readFileSync(path.join(raiz, rel), 'utf-8');
    const VM = leer('features/admin/facturacion/useFacturacionViewModel.ts');
    const POS = leer('features/admin/facturacion/components/POSCalculations.tsx');

    it('al editar una nota cobrada ya no se prellena "recibido" con lo pagado', () => {
        expect(VM).toContain('pagoPrevioDeNota(nvData)');
        expect(VM).toMatch(/if \(previoEdicion && previoEdicion\.monto > 0\) \{[\s\S]{0,300}setPay\(0\);/);
    });

    it('"Exacto", el placeholder y el mixto usan el saldo', () => {
        expect(POS).toContain('vm.setPay(Number(cobroObjetivo.toFixed(2)))');
        expect(POS).toContain('placeholder={`Recibido ${cobroObjetivo.toFixed(2)}`}');
        expect(POS).toContain('const splitRemaining = Math.max(0, cobroObjetivo - splitTotal);');
    });
});
