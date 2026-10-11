import {
    aplicacionPorDefecto,
    aplicacionEfectiva,
    opcionesDeAplicacion,
    etiquetaDelMonto,
    avisoDeAplicacion,
} from '../aplicacionMontoEnvio';

const boletaRepartoPropio = { esInformal: false, esPropio: true };
const boletaCourier = { esInformal: false, esPropio: false };
const notaVentaPropio = { esInformal: true, esPropio: true };

describe('el caso de IMPORTEMOS JUNTOS (boleta B0A1-269)', () => {
    it('un adelanto en una boleta NO se convierte en cobro', () => {
        // Lo que pasaba: el estado arrancaba en ADELANTO, el vendedor escribía
        // el adelanto en reparto propio y al emitir se volvía ITEM_ENVIO.
        expect(aplicacionEfectiva('ADELANTO', boletaRepartoPropio)).toBe('NEGOCIO');
        expect(aplicacionEfectiva('ADELANTO', boletaRepartoPropio)).not.toBe('ITEM_ENVIO');
    });

    it('con reparto propio, el monto no toca el comprobante por defecto', () => {
        expect(aplicacionPorDefecto(boletaRepartoPropio)).toBe('NEGOCIO');
    });

    it('el aviso de cobro es de alerta y dice que sube el total', () => {
        const aviso = avisoDeAplicacion('ITEM_ENVIO', 128.95, boletaRepartoPropio);
        expect(aviso?.tono).toBe('alerta');
        expect(aviso?.texto).toContain('128.95');
        expect(aviso?.texto).toMatch(/sube el total/i);
    });

    it('el aviso le dice al vendedor qué elegir si la plata ya se pagó', () => {
        const aviso = avisoDeAplicacion('ITEM_ENVIO', 128.95, boletaRepartoPropio);
        expect(aviso?.texto).toMatch(/Negocio absorbe/i);
    });
});

describe('aplicacionPorDefecto', () => {
    it('informal arranca en adelanto', () => {
        expect(aplicacionPorDefecto(notaVentaPropio)).toBe('ADELANTO');
        expect(aplicacionPorDefecto({ esInformal: true, esPropio: false })).toBe('ADELANTO');
    });

    it('con courier se le sigue cobrando el flete al cliente', () => {
        expect(aplicacionPorDefecto(boletaCourier)).toBe('ITEM_ENVIO');
    });
});

describe('aplicacionEfectiva', () => {
    it('respeta lo que el vendedor eligió a mano', () => {
        expect(aplicacionEfectiva('ITEM_ENVIO', boletaRepartoPropio)).toBe('ITEM_ENVIO');
        expect(aplicacionEfectiva('NEGOCIO', boletaCourier)).toBe('NEGOCIO');
    });

    it('en informal, el adelanto sí vale', () => {
        expect(aplicacionEfectiva('ADELANTO', notaVentaPropio)).toBe('ADELANTO');
    });

    it('sin valor guardado cae al defecto de su contexto', () => {
        expect(aplicacionEfectiva(undefined, boletaRepartoPropio)).toBe('NEGOCIO');
        expect(aplicacionEfectiva(null, boletaCourier)).toBe('ITEM_ENVIO');
        expect(aplicacionEfectiva('', notaVentaPropio)).toBe('ADELANTO');
    });

    it('un valor desconocido no se cuela: cae al defecto', () => {
        expect(aplicacionEfectiva('CUALQUIER_COSA', boletaRepartoPropio)).toBe('NEGOCIO');
    });

    it('acepta el valor en minúsculas (dato viejo)', () => {
        expect(aplicacionEfectiva('item_envio', boletaCourier)).toBe('ITEM_ENVIO');
    });

    it('reparto propio con adelanto guardado: al pasar a formal no se cobra de nuevo', () => {
        // La plata ya entró; al convertir la NV en boleta no puede volverse cobro.
        expect(aplicacionEfectiva('ADELANTO', { esInformal: false, esPropio: true })).toBe('NEGOCIO');
    });

    it('con courier, el flete se le sigue cobrando al cliente (no se cambia lo que ya andaba)', () => {
        expect(aplicacionEfectiva('ADELANTO', { esInformal: false, esPropio: false })).toBe('ITEM_ENVIO');
    });
});

describe('opcionesDeAplicacion', () => {
    it('formal no ofrece adelanto', () => {
        expect(opcionesDeAplicacion({ esInformal: false }).map((o) => o.value)).toEqual(['ITEM_ENVIO', 'NEGOCIO']);
    });

    it('informal ofrece las tres', () => {
        expect(opcionesDeAplicacion({ esInformal: true }).map((o) => o.value)).toEqual(['ADELANTO', 'ITEM_ENVIO', 'NEGOCIO']);
    });
});

describe('etiquetaDelMonto', () => {
    it('si se cobra, la etiqueta dice que se cobra', () => {
        expect(etiquetaDelMonto('ITEM_ENVIO', { esPropio: true })).toBe('Cobro extra al cliente (S/)');
        expect(etiquetaDelMonto('ITEM_ENVIO', { esPropio: false })).toBe('Cobro extra al cliente (S/)');
    });

    it('si no se cobra, en reparto propio sigue siendo el adelanto', () => {
        expect(etiquetaDelMonto('NEGOCIO', { esPropio: true })).toBe('Adelanto ya pagado (S/)');
        expect(etiquetaDelMonto('ADELANTO', { esPropio: true })).toBe('Adelanto ya pagado (S/)');
    });
});

describe('avisoDeAplicacion', () => {
    it('sin monto no hay aviso', () => {
        expect(avisoDeAplicacion('ITEM_ENVIO', 0, boletaCourier)).toBeNull();
        expect(avisoDeAplicacion('ITEM_ENVIO', NaN, boletaCourier)).toBeNull();
    });

    it('negocio absorbe: avisa que no toca el comprobante', () => {
        const aviso = avisoDeAplicacion('NEGOCIO', 20, boletaRepartoPropio);
        expect(aviso?.tono).toBe('neutro');
        expect(aviso?.texto).toMatch(/No se agrega al comprobante/i);
    });

    it('adelanto: avisa que queda saldo', () => {
        const aviso = avisoDeAplicacion('ADELANTO', 50, notaVentaPropio);
        expect(aviso?.tono).toBe('info');
        expect(aviso?.texto).toMatch(/saldo pendiente/i);
    });
});

describe('La línea de envío en el comprobante — reconstrucción de B0A1-269', () => {
    const { lineasDeEnvio } = require('../aplicacionMontoEnvio');

    /** Los datos exactos del despacho 1861 que generó la boleta mala. */
    const josé = {
        envioActivo: true,
        costoEnvio: 128.95,
        etiquetaTransportista: 'Reparto propio',
    };

    it('ANTES: cobrándolo, la boleta sale con dos líneas y S/257.95', () => {
        const lineas = lineasDeEnvio({ ...josé, aplicacion: 'ITEM_ENVIO' });
        expect(lineas).toHaveLength(1);
        const total = 129 + lineas.reduce((a: number, l: any) => a + l.nuevoValorUnitario, 0);
        expect(Number(total.toFixed(2))).toBe(257.95);
    });

    it('AHORA: con el adelanto absorbido, la boleta queda solo con el producto', () => {
        const lineas = lineasDeEnvio({ ...josé, aplicacion: 'NEGOCIO' });
        expect(lineas).toEqual([]);
        const total = 129 + lineas.reduce((a: number, l: any) => a + l.nuevoValorUnitario, 0);
        expect(total).toBe(129);
    });

    it('un adelanto en documento informal tampoco agrega línea', () => {
        expect(lineasDeEnvio({ ...josé, aplicacion: 'ADELANTO' })).toEqual([]);
    });

    it('la línea lleva el monto y el nombre del transportista', () => {
        const [linea] = lineasDeEnvio({ envioActivo: true, costoEnvio: 25, aplicacion: 'ITEM_ENVIO', etiquetaTransportista: 'Shalom' });
        expect(linea).toEqual({
            productoId: null,
            descripcion: 'Servicio de envío (Shalom)',
            cantidad: 1,
            nuevoValorUnitario: 25,
            descuento: 0,
        });
    });

    it('sin transportista, la descripción no queda con paréntesis vacíos', () => {
        const [linea] = lineasDeEnvio({ envioActivo: true, costoEnvio: 25, aplicacion: 'ITEM_ENVIO' });
        expect(linea.descripcion).toBe('Servicio de envío');
    });

    it('sin envío activo no hay línea aunque haya monto', () => {
        expect(lineasDeEnvio({ envioActivo: false, costoEnvio: 50, aplicacion: 'ITEM_ENVIO' })).toEqual([]);
    });

    it('monto en cero, vacío o basura no agrega línea', () => {
        for (const costoEnvio of [0, -5, null, undefined, '', 'abc']) {
            expect(lineasDeEnvio({ envioActivo: true, costoEnvio, aplicacion: 'ITEM_ENVIO' })).toEqual([]);
        }
    });

    it('un monto que viene como texto se cobra igual (lo que escribe el input)', () => {
        const [linea] = lineasDeEnvio({ envioActivo: true, costoEnvio: '15.50', aplicacion: 'ITEM_ENVIO' });
        expect(linea.nuevoValorUnitario).toBe(15.5);
    });
});
