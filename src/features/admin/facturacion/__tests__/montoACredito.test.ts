/**
 * Boleta al crédito con pago inicial (demo ropa, 21-10): 5 polerones de S/ 45
 * = S/ 225, paga S/ 100 ahora, envío por Shalom cobrado al cliente.
 */
import { montoACredito } from '../montoACredito';

const base = {
    totalProductos: 225,
    envioActivo: false,
    costoEnvio: 0,
    aplicacionGuardada: undefined,
    esInformal: false,
    esPropio: false,
    inicial: 100,
};

it('sin envío: la cuota es lo que falta (125)', () => {
    expect(montoACredito(base)).toEqual({ totalConEnvio: 225, inicial: 100, totalCredito: 125 });
});

it('con Shalom cobrado al cliente: la cuota incluye el flete (143)', () => {
    expect(montoACredito({ ...base, envioActivo: true, costoEnvio: 18, aplicacionGuardada: 'ITEM_ENVIO' }))
        .toEqual({ totalConEnvio: 243, inicial: 100, totalCredito: 143 });
});

it('si el negocio absorbe el flete, no suma', () => {
    expect(montoACredito({ ...base, envioActivo: true, costoEnvio: 18, aplicacionGuardada: 'NEGOCIO' }).totalCredito).toBe(125);
});

it('reparto propio en boleta: el "adelanto ya pagado" no se cobra como ítem', () => {
    expect(montoACredito({ ...base, envioActivo: true, costoEnvio: 18, esPropio: true }).totalCredito).toBe(125);
});

it('sin pago inicial: todo a crédito, envío incluido', () => {
    expect(montoACredito({ ...base, inicial: 0, envioActivo: true, costoEnvio: 18, aplicacionGuardada: 'ITEM_ENVIO' }).totalCredito).toBe(243);
});

it('un inicial mayor al total no deja crédito negativo', () => {
    expect(montoACredito({ ...base, inicial: 500 })).toEqual({ totalConEnvio: 225, inicial: 225, totalCredito: 0 });
});
