/**
 * La moneda sobrevive la conversión de cotización a comprobante.
 *
 * El caso real que lo motiva (INPRA, COT1-11): 30 unidades a $38 = $1,140,
 * guardados en dólares. Al convertir a factura el POS arrancaba en soles y
 * emitía S/1,140 con los mismos números. Con el tipo de cambio en 3.362 eso es
 * cobrar S/2,693 de menos en una sola factura, y 7 de sus 11 cotizaciones están
 * en dólares.
 */
import * as fs from 'fs';
import * as path from 'path';
import { monedaDeCotizacion } from '../monedaCotizacion';

describe('La moneda de la cotización', () => {
    it('una cotización en dólares abre el POS en dólares', () => {
        expect(monedaDeCotizacion({ cotizMoneda: 'USD', tipoMoneda: 'USD' })).toBe('USD');
    });

    it('una en soles abre en soles', () => {
        expect(monedaDeCotizacion({ cotizMoneda: 'PEN', tipoMoneda: 'PEN' })).toBe('PEN');
    });

    it('las viejas, sin cotizMoneda, caen a tipoMoneda', () => {
        expect(monedaDeCotizacion({ tipoMoneda: 'USD' })).toBe('USD');
        expect(monedaDeCotizacion({ cotizMoneda: null, tipoMoneda: 'USD' })).toBe('USD');
    });

    it('cotizMoneda manda sobre tipoMoneda', () => {
        expect(monedaDeCotizacion({ cotizMoneda: 'USD', tipoMoneda: 'PEN' })).toBe('USD');
    });
});

describe('Ante la duda, soles', () => {
    it('sin datos no inventa dólares', () => {
        // Equivocarse hacia soles no infla un importe; hacia dólares sí.
        expect(monedaDeCotizacion({})).toBe('PEN');
        expect(monedaDeCotizacion(null)).toBe('PEN');
        expect(monedaDeCotizacion(undefined)).toBe('PEN');
        expect(monedaDeCotizacion({ cotizMoneda: '' })).toBe('PEN');
    });

    it('una moneda desconocida no se toma por dólares', () => {
        expect(monedaDeCotizacion({ cotizMoneda: 'EUR' })).toBe('PEN');
    });

    it('acepta minúsculas y espacios', () => {
        expect(monedaDeCotizacion({ cotizMoneda: ' usd ' })).toBe('USD');
    });
});

describe('Los tres conversores la mandan', () => {
    const fuente = fs.readFileSync(
        path.join(__dirname, '..', 'useCotizacionesViewModel.ts'), 'utf-8',
    );

    /** El trozo de cada handler, para mirarlo por separado. */
    const cuerpo = (nombre: string) => {
        const i = fuente.indexOf(`const handleConvertir${nombre} =`);
        return i < 0 ? '' : fuente.slice(i, fuente.indexOf('};', i));
    };

    it.each(['AFactura', 'ABoleta', 'ANotaVenta'])(
        'handleConvertir%s manda la moneda', (nombre) => {
            // Sin esto el POS arranca en soles y factura dólares como soles.
            expect(cuerpo(nombre)).toContain('monedaDeCotizacion');
        });

    it('ninguno se quedó pasando solo cliente, productos y observaciones', () => {
        for (const n of ['AFactura', 'ABoleta', 'ANotaVenta']) {
            expect(cuerpo(n)).toMatch(/cotizMoneda/);
        }
    });
});
