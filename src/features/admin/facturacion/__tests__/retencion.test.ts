/**
 * La retención del 3% en el POS.
 *
 * El cambio que prueban estos casos: la marca de agente de retención pasó de la
 * EMPRESA al CLIENTE. Antes, prenderla hacía que toda factura de S/700 o más
 * saliera con 3% retenido, incluidas las de clientes que no son agentes.
 */
import {
    PORCENTAJE_RETENCION,
    UMBRAL_RETENCION,
    aplicaRetencion,
    calcularRetencion,
    importeNetoACobrar,
} from '../retencion';

const aUnAgente = (extra: Record<string, unknown> = {}) => ({
    esFactura: true,
    total: 3100,
    clienteEsAgenteRetencion: true,
    ...extra,
});

describe('A quién le retiene el POS', () => {
    it('al cliente marcado como agente de retención', () => {
        expect(aplicaRetencion(aUnAgente())).toBe(true);
    });

    it('a un cliente común NO, por grande que sea la factura', () => {
        expect(aplicaRetencion({ esFactura: true, total: 50000 })).toBe(false);
        expect(aplicaRetencion(aUnAgente({ clienteEsAgenteRetencion: false }))).toBe(false);
    });

    it('el interruptor viejo por empresa se respeta', () => {
        // Nadie lo tiene prendido hoy, pero si alguien lo prendiera seguiría
        // funcionando igual que antes.
        expect(aplicaRetencion({
            esFactura: true, total: 3100, empresaEsAgenteRetencion: true,
        })).toBe(true);
    });
});

describe('Cuándo no corresponde', () => {
    it('S/700 exactos no se retiene, S/700.01 sí', () => {
        expect(aplicaRetencion(aUnAgente({ total: UMBRAL_RETENCION }))).toBe(false);
        expect(aplicaRetencion(aUnAgente({ total: 700.01 }))).toBe(true);
    });

    it('en boleta no se retiene: no da crédito fiscal', () => {
        expect(aplicaRetencion(aUnAgente({ esFactura: false }))).toBe(false);
    });

    it('con detracción no se retiene: se excluyen', () => {
        expect(aplicaRetencion(aUnAgente({ tieneDetraccion: true }))).toBe(false);
    });

    it('sin cliente elegido todavía, no retiene', () => {
        // El POS arranca sin cliente; no puede asumir que es agente.
        expect(aplicaRetencion({ esFactura: true, total: 3100, clienteEsAgenteRetencion: undefined })).toBe(false);
    });
});

describe('El monto, como en la factura de referencia', () => {
    it('S/3,100 → S/93 retenidos, y se cobran S/3,007', () => {
        const retenido = calcularRetencion(3100);
        expect(retenido).toBe(93);
        expect(importeNetoACobrar(3100, retenido)).toBe(3007);
    });

    it('la base es el total con IGV', () => {
        // Con el gravado (2,627.12) saldrían 78.81 y el agente la rechazaría.
        expect(calcularRetencion(2627.12)).not.toBe(93);
    });

    it('el porcentaje por defecto es 3', () => {
        expect(PORCENTAJE_RETENCION).toBe(3);
        expect(calcularRetencion(1180)).toBe(35.4);
    });
});
