/**
 * Que la moneda NUNCA se pierda al convertir una cotización.
 *
 * El caso real (INPRA, COT1-11): 30 unidades a $38 = $1,140, guardados en
 * dólares. Al convertir a factura el POS arrancaba en soles y emitía S/1,140
 * con los mismos números. Con el tipo de cambio en 3.362 eso es cobrar S/2,693
 * de menos en una sola factura, y 7 de sus 11 cotizaciones están en dólares.
 *
 * Al revisar en profundidad apareció un SEGUNDO punto de conversión —la lista
 * de Comprobantes— que tenía el mismo defecto. Por eso acá no se prueba solo la
 * función: se recorren TODOS los puntos que convierten, para que agregar uno
 * nuevo sin la moneda haga fallar la prueba.
 */
import * as fs from 'fs';
import * as path from 'path';
import { monedaDeCotizacion } from '../monedaCotizacion';

const raiz = path.join(__dirname, '..', '..', '..', '..');
const leer = (rel: string) => fs.readFileSync(path.join(raiz, rel), 'utf-8');

// ─────────────────────────────────────────────────────────────────────────────
// RONDA 1 · Casuística de datos
// ─────────────────────────────────────────────────────────────────────────────

describe('Ronda 1 · La factura dice lo mismo que vio el cliente', () => {
    // El PDF de la cotización decide con `cotizMoneda`:
    //   cotizEsUSD = String(cotizMoneda || 'PEN').toUpperCase() === 'USD'
    // Esta función replica esa comparación, así que el papel y el comprobante
    // no pueden separarse.

    it('cotizada en dólares → se factura en dólares', () => {
        expect(monedaDeCotizacion({ cotizMoneda: 'USD' })).toBe('USD');
    });

    it('cotizada en soles → se factura en soles', () => {
        expect(monedaDeCotizacion({ cotizMoneda: 'PEN' })).toBe('PEN');
    });

    it('manda cotizMoneda aunque tipoMoneda diga otra cosa', () => {
        // Caso real: REPRESENTACIONES FORKLIFT COT1-1 tiene tipoMoneda PEN y
        // cotizMoneda USD. Su PDF se imprimió en DÓLARES, así que la factura
        // tiene que salir en dólares: es lo que el cliente recibió.
        expect(monedaDeCotizacion({ cotizMoneda: 'USD', tipoMoneda: 'PEN' })).toBe('USD');
        expect(monedaDeCotizacion({ cotizMoneda: 'PEN', tipoMoneda: 'USD' })).toBe('PEN');
    });

    it('las etiquetas de pantalla guardadas por error dan soles, como su PDF', () => {
        // En producción hay 6 cotizaciones con el rótulo en vez del código.
        // Ninguna es exactamente "USD", así que su PDF salió en soles; puede no
        // ser lo que el usuario quiso, pero es lo que su cliente recibió.
        expect(monedaDeCotizacion({ cotizMoneda: 'SOLES (S/)' })).toBe('PEN');
        expect(monedaDeCotizacion({ cotizMoneda: 'DÓLARES (US$)' })).toBe('PEN');
    });

    it('sin cotizMoneda asume soles, igual que el PDF', () => {
        // El PDF hace `cotizMoneda || 'PEN'`. Caer a tipoMoneda acá volvería a
        // separar el papel del comprobante.
        expect(monedaDeCotizacion({ tipoMoneda: 'USD' })).toBe('PEN');
        expect(monedaDeCotizacion({ cotizMoneda: null, tipoMoneda: 'USD' })).toBe('PEN');
        expect(monedaDeCotizacion({ cotizMoneda: '', tipoMoneda: 'USD' })).toBe('PEN');
    });
});

describe('Ronda 1 · Datos sucios no inventan dólares', () => {
    it('sin ningún dato, soles', () => {
        // Equivocarse hacia soles no infla un importe; hacia dólares lo
        // multiplica por el tipo de cambio.
        for (const caso of [{}, null, undefined, { cotizMoneda: '' }, { cotizMoneda: '   ' }]) {
            expect(monedaDeCotizacion(caso)).toBe('PEN');
        }
    });

    it('una moneda que no manejamos no se toma por dólares', () => {
        for (const m of ['EUR', 'CLP', 'BRL', 'usd$', 'dolares', '$', 'X']) {
            expect(monedaDeCotizacion({ cotizMoneda: m })).toBe('PEN');
        }
    });

    it('minúsculas y espacios sí se reconocen', () => {
        for (const m of ['usd', ' USD ', 'Usd', '\tusd\n']) {
            expect(monedaDeCotizacion({ cotizMoneda: m })).toBe('USD');
        }
    });

    it('no revienta con tipos raros', () => {
        for (const v of [0, false, [], {}, NaN]) {
            expect(monedaDeCotizacion({ cotizMoneda: v })).toBe('PEN');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// RONDA 2 · La cadena completa, de la cotización al comprobante emitido
// ─────────────────────────────────────────────────────────────────────────────

describe('Ronda 2 · La moneda sobrevive los tres saltos', () => {
    const pos = leer('features/admin/facturacion/useFacturacionViewModel.ts');

    /**
     * Salto 2: el POS lee `cotizMoneda` del prefill.
     * Se verifica contra el fuente para que esto falle si alguien lo cambia.
     */
    it('el POS aplica cotizMoneda al precargar', () => {
        expect(pos).toMatch(/cotizConfig\.cotizMoneda !== undefined.*setQuotationCurrency\(cotizConfig\.cotizMoneda\)/);
    });

    /** Salto 3: al emitir, `quotationCurrency` define la moneda del documento. */
    it('al emitir, la moneda sale de quotationCurrency', () => {
        expect(pos).toMatch(/tipoMoneda:\s*String\(quotationCurrency\)\.toUpperCase\(\) === 'USD' \? 'USD' : 'PEN'/);
    });

    /** Los tres saltos encadenados, con la función real en el primero. */
    const monedaEmitida = (cotizacion: any): string => {
        const delPrefill = monedaDeCotizacion(cotizacion);              // salto 1 (real)
        const quotationCurrency = delPrefill !== undefined ? delPrefill : 'PEN'; // salto 2
        return String(quotationCurrency).toUpperCase() === 'USD' ? 'USD' : 'PEN'; // salto 3
    };

    it('una cotización en dólares termina emitiendo en dólares', () => {
        expect(monedaEmitida({ cotizMoneda: 'USD', tipoMoneda: 'USD' })).toBe('USD');
    });

    it('una en soles termina en soles', () => {
        expect(monedaEmitida({ cotizMoneda: 'PEN' })).toBe('PEN');
    });

    it('el caso exacto de INPRA: COT1-11 emite en dólares', () => {
        const COT1_11 = { cotizMoneda: 'USD', tipoMoneda: 'USD', tipoCambio: 3.362, mtoImpVenta: 1140 };
        expect(monedaEmitida(COT1_11)).toBe('USD');
    });

    it('el caso de FORKLIFT COT1-1: su PDF salió en dólares, la factura también', () => {
        expect(monedaEmitida({ cotizMoneda: 'USD', tipoMoneda: 'PEN', tipoCambio: 1 })).toBe('USD');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// RONDA 3 · Los precios no se convierten dos veces
// ─────────────────────────────────────────────────────────────────────────────

describe('Ronda 3 · Los precios llegan tal cual, sin doble conversión', () => {
    const pos = leer('features/admin/facturacion/useFacturacionViewModel.ts');

    /** El efecto de precarga, acotado por sus propias fronteras en el archivo. */
    const bloquePrecarga = (): string => {
        const lineas = pos.split('\n');
        const inicio = lineas.findIndex((l) => l.includes('// Loading from Quotation Convert / Edit'));
        expect(inicio).toBeGreaterThan(-1);
        // El efecto termina donde arranca la siguiente declaración de primer nivel.
        // Se arranca después del `useEffect(` que abre este mismo efecto.
        let fin = inicio + 2;
        while (fin < lineas.length && !/^    (const |useEffect\(|\/\/ Loading from Nota)/.test(lineas[fin])) fin++;
        return lineas.slice(inicio, fin).join('\n');
    };

    it('el prefill usa setQuotationCurrency, no el cambio manual de moneda', () => {
        // `handleChangeQuotationCurrency` convierte el carrito con el tipo de
        // cambio. Los precios de la cotización YA están en dólares, así que
        // pasarlos por ahí los dividiría una segunda vez: $38 quedarían en $11.30.
        const bloque = bloquePrecarga();
        expect(bloque).toContain('setQuotationCurrency');
        expect(bloque).not.toContain('handleChangeQuotationCurrency');
        expect(bloque).not.toContain('convertirCarritoAMoneda');
    });

    it('el precio del producto se toma de la cotización, no del catálogo', () => {
        // Si tomara el precio del catálogo (en soles) y lo rotulara en dólares,
        // el importe saldría mal aunque la moneda fuera la correcta.
        expect(bloquePrecarga()).toContain('mapDetalleToInvoiceProduct');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// RONDA 5 · Ningún punto de conversión puede quedarse sin la moneda
// ─────────────────────────────────────────────────────────────────────────────

describe('Ronda 5 · Todos los puntos que convierten mandan la moneda', () => {
    /** Los archivos que navegan al POS con datos de una cotización. */
    const ARCHIVOS = [
        'features/admin/cotizaciones/useCotizacionesViewModel.ts',
        'pages/admin/facturacion/Comprobantes.tsx',
    ];

    /** Cada bloque `quotationData: { ... }` del archivo. */
    const bloques = (fuente: string): string[] => {
        const out: string[] = [];
        let i = fuente.indexOf('quotationData: {');
        while (i >= 0) {
            out.push(fuente.slice(i, fuente.indexOf('}', fuente.indexOf('observaciones', i))));
            i = fuente.indexOf('quotationData: {', i + 1);
        }
        return out;
    };

    it.each(ARCHIVOS)('%s: cada conversión lleva la moneda', (archivo) => {
        // El defecto original estaba en un archivo; al revisar apareció en otro.
        // Esta prueba recorre los dos y falla si aparece un tercero sin moneda.
        const sinMoneda = bloques(leer(archivo)).filter((b) => !b.includes('Moneda'));
        expect(sinMoneda).toEqual([]);
    });

    it('la conversión desde Cotizaciones usa la función, no una copia', () => {
        const fuente = leer(ARCHIVOS[0]);
        for (const h of ['AFactura', 'ABoleta', 'ANotaVenta']) {
            const i = fuente.indexOf(`const handleConvertir${h} =`);
            expect(i).toBeGreaterThan(-1);
            expect(fuente.slice(i, fuente.indexOf('};', i))).toContain('monedaDeCotizacion');
        }
    });

    it('la conversión desde Comprobantes también', () => {
        const fuente = leer(ARCHIVOS[1]);
        const i = fuente.indexOf('const handleConvertirAFactura =');
        expect(i).toBeGreaterThan(-1);
        expect(fuente.slice(i, fuente.indexOf('};', i))).toContain('monedaDeCotizacion');
    });
});
