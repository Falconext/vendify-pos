/**
 * Fechar un comprobante hacia atrás.
 *
 * El caso que lo motiva: Joshi (IMPORTEMOS JUNTOS) atiende sola los fines de
 * semana y carga sus ventas el lunes. Emite NOTAS DE VENTA, y ahí el campo de
 * fecha no aparecía, así que sus ventas del sábado quedaban fechadas el lunes y
 * cobraban comisión de día de semana: S/6 en vez de S/11.
 *
 * Lo que más importa de estas pruebas es que los plazos de SUNAT NO se muevan.
 * Ampliar el de la factura o la boleta dejaría a la empresa emitiendo fuera de
 * plazo, que es un problema bastante peor que el que vino a resolver esto.
 */
import {
    DIAS_BOLETA,
    DIAS_FACTURA,
    DIAS_INFORMAL,
    TIPOS_INFORMALES,
    diasEmisionRetroactiva,
    fechaFueraDePlazo,
    fechaMinima,
    permiteFechaRetroactiva,
} from '../fechaEmisionRetroactiva';

describe('Los plazos de SUNAT no se tocan', () => {
    it('la factura sigue en 3 días', () => {
        expect(diasEmisionRetroactiva('01')).toBe(3);
        expect(DIAS_FACTURA).toBe(3);
    });

    it('la boleta sigue en 5 días', () => {
        expect(diasEmisionRetroactiva('03')).toBe(5);
        expect(DIAS_BOLETA).toBe(5);
    });

    it('al informal no se le da más margen que a la boleta', () => {
        // Una nota de venta se convierte después en boleta: darle más margen
        // crearía notas que no se pueden convertir en plazo.
        expect(DIAS_INFORMAL).toBeLessThanOrEqual(DIAS_BOLETA);
    });
});

describe('Los informales ahora sí se pueden fechar', () => {
    it('la nota de venta deja de estar en cero', () => {
        // Este era el defecto: caía al valor por defecto y el campo ni aparecía.
        expect(diasEmisionRetroactiva('NV')).toBeGreaterThan(0);
        expect(permiteFechaRetroactiva('NV')).toBe(true);
    });

    it('alcanza para cargar el lunes lo vendido el sábado', () => {
        // Sábado → lunes son 2 días. Viernes → lunes, 3.
        expect(diasEmisionRetroactiva('NV')).toBeGreaterThanOrEqual(3);
    });

    it('vale para todos los documentos internos, no solo la nota de venta', () => {
        for (const tipo of TIPOS_INFORMALES) {
            expect(permiteFechaRetroactiva(tipo)).toBe(true);
        }
    });
});

describe('Lo que no debe permitir fecha hacia atrás', () => {
    it('la cotización no: no es una venta', () => {
        expect(diasEmisionRetroactiva('COT')).toBe(0);
        expect(permiteFechaRetroactiva('COT')).toBe(false);
    });

    it('un tipo desconocido no abre la puerta por las dudas', () => {
        expect(diasEmisionRetroactiva('XX')).toBe(0);
        expect(diasEmisionRetroactiva(undefined)).toBe(0);
        expect(diasEmisionRetroactiva(null)).toBe(0);
        expect(diasEmisionRetroactiva('')).toBe(0);
    });
});

describe('No se cae con datos sucios', () => {
    it('acepta minúsculas y espacios', () => {
        expect(diasEmisionRetroactiva(' nv ')).toBe(DIAS_INFORMAL);
        expect(diasEmisionRetroactiva('ticket')).toBe(DIAS_INFORMAL);
    });
});

describe('Cambiar de documento no puede dejar una fecha fuera de plazo', () => {
    // Se importa la función REAL que usa el POS, no una copia de la regla.
    const HOY = new Date(2026, 9, 5);           // lunes 5/10/2026
    const haceDias = (n: number) => {
        const d = new Date(HOY);
        d.setDate(d.getDate() - n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    it('5 días atrás es válido en nota de venta', () => {
        expect(fechaFueraDePlazo(haceDias(5), 'NV', HOY)).toBe(false);
    });

    it('esa misma fecha queda FUERA al pasar a factura', () => {
        // Sin el candado se emitiría una factura 5 días atrás, fuera de plazo.
        expect(fechaFueraDePlazo(haceDias(5), '01', HOY)).toBe(true);
    });

    it('2 días atrás sobrevive el paso a factura', () => {
        expect(fechaFueraDePlazo(haceDias(2), '01', HOY)).toBe(false);
    });

    it('cualquier fecha atrás queda fuera en cotización', () => {
        expect(fechaFueraDePlazo(haceDias(1), 'COT', HOY)).toBe(true);
        expect(fechaFueraDePlazo(haceDias(0), 'COT', HOY)).toBe(false);
    });

    it('una fecha futura nunca se admite', () => {
        const manana = new Date(HOY);
        manana.setDate(manana.getDate() + 1);
        const txt = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
        expect(fechaFueraDePlazo(txt, '03', HOY)).toBe(true);
    });

    it('el mínimo de la nota de venta es 5 días atrás', () => {
        expect(fechaMinima('NV', HOY)).toBe(haceDias(5));
        expect(fechaMinima('01', HOY)).toBe(haceDias(3));
    });
});
