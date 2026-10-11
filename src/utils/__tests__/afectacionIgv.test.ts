/**
 * El valor inicial de la afectación IGV en el panel.
 *
 * Espeja a `backend/src/producto/afectacion-igv.ts`. Se prueba aparte porque el
 * formulario de producto y el "Ítem libre" del POS usan la misma regla y no
 * pueden separarse: si el producto nace exonerado pero el delivery nace
 * gravado, la factura sale mezclada sin que nadie lo haya pedido.
 */
import {
    AFECTACION_EXONERADO,
    AFECTACION_GRAVADO,
    afectacionPorDefecto,
    nombreAfectacionPorDefecto,
} from '../afectacionIgv';

describe('Una empresa normal no cambia de comportamiento', () => {
    it('sin Ley de Amazonía arranca en gravado', () => {
        expect(afectacionPorDefecto({ leyAmazonia: false })).toBe(AFECTACION_GRAVADO);
        expect(nombreAfectacionPorDefecto({ leyAmazonia: false }))
            .toBe('Gravado – Operación Onerosa');
    });

    it('sin empresa cargada todavía, gravado', () => {
        // El panel monta antes de que llegue el perfil; el default no puede
        // depender de quién llegó primero.
        expect(afectacionPorDefecto(null)).toBe('10');
        expect(afectacionPorDefecto(undefined)).toBe('10');
    });
});

describe('Bajo la Ley de Amazonía', () => {
    it('arranca exonerado', () => {
        expect(afectacionPorDefecto({ leyAmazonia: true })).toBe(AFECTACION_EXONERADO);
    });

    it('el nombre acompaña al código, no quedan desalineados', () => {
        expect(nombreAfectacionPorDefecto({ leyAmazonia: true })).toBe('Exonerado');
    });
});
