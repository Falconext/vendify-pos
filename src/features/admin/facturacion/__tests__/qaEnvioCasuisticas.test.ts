/**
 * QA funcional del monto de Coordinación de Envío: 10 casuísticas de negocio.
 *
 * No reimplementa nada: usa las funciones que corren en producción
 * (`aplicacionEfectiva` y `lineasDeEnvio`) compuestas igual que en
 * useFacturacionViewModel, y verifica el comprobante que saldría.
 *
 * Nació de la boleta B0A1-269 de IMPORTEMOS JUNTOS: S/129 de producto que se
 * emitió en S/257.95 porque el adelanto del cliente se cobró como línea.
 */
import { aplicacionEfectiva, lineasDeEnvio } from '../aplicacionMontoEnvio';

interface Escenario {
    tipoDoc: '01' | '03' | 'NV';
    transportista: string;
    costoEnvio: number;
    /** Lo que el vendedor eligió a mano; undefined = no tocó el selector. */
    eleccion?: 'ADELANTO' | 'ITEM_ENVIO' | 'NEGOCIO';
    envioActivo?: boolean;
    productos: { descripcion: string; precio: number }[];
}

const INFORMALES = ['TICKET', 'NV', 'RH', 'CP', 'NP', 'OT'];
const ETIQUETAS: Record<string, string> = { PROPIOS: 'Reparto propio', SHALOM_PRO: 'Shalom', OLVA: 'Olva' };

/**
 * Emite el comprobante igual que el POS: resuelve la aplicación del monto,
 * arma las líneas y suma. Los precios son con IGV, como los manda el POS.
 */
const emitir = (e: Escenario) => {
    const esInformal = INFORMALES.includes(e.tipoDoc);
    const envioActivo = e.envioActivo ?? true;
    const aplicacion = aplicacionEfectiva(e.eleccion, {
        esInformal,
        esPropio: e.transportista === 'PROPIOS',
    });
    const lineasProducto = e.productos.map((p) => ({ descripcion: p.descripcion, nuevoValorUnitario: p.precio }));
    const lineasEnvio = lineasDeEnvio({
        envioActivo,
        costoEnvio: e.costoEnvio,
        aplicacion,
        etiquetaTransportista: ETIQUETAS[e.transportista] ?? e.transportista,
    });
    const detalles = [...lineasProducto, ...lineasEnvio];
    const adelanto = esInformal && envioActivo && Number(e.costoEnvio) > 0 && aplicacion === 'ADELANTO'
        ? Number(e.costoEnvio)
        : 0;
    const total = Number(detalles.reduce((a, l) => a + Number(l.nuevoValorUnitario), 0).toFixed(2));
    return {
        aplicacion,
        detalles,
        total,
        adelanto,
        saldo: Number((total - adelanto).toFixed(2)),
        descripciones: detalles.map((l) => l.descripcion),
    };
};

const AROMATIZADOR = { descripcion: 'AROMATIZADOR 5 EN 1', precio: 129 };

describe('QA funcional — 10 casuísticas de envío', () => {
    it('1. Venta de mostrador sin envío: la boleta sale limpia', () => {
        const r = emitir({ tipoDoc: '03', transportista: '', costoEnvio: 0, envioActivo: false, productos: [AROMATIZADOR] });
        expect(r.detalles).toHaveLength(1);
        expect(r.total).toBe(129);
        expect(r.descripciones).toEqual(['AROMATIZADOR 5 EN 1']);
    });

    it('2. B0A1-269 real: reparto propio, el cliente ya pagó todo por Yape', () => {
        // El vendedor escribe el adelanto y no toca el selector. Antes: 257.95.
        const r = emitir({ tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 128.95, productos: [AROMATIZADOR] });
        expect(r.aplicacion).toBe('NEGOCIO');
        expect(r.total).toBe(129);
        expect(r.descripciones).not.toContain('Servicio de envío (Reparto propio)');
    });

    it('3. Contraentrega: el motorizado cobra en la puerta, nada se agrega', () => {
        // El cobro en la puerta va por montoCOD, no por este campo.
        const r = emitir({ tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 0, productos: [AROMATIZADOR] });
        expect(r.detalles).toHaveLength(1);
        expect(r.total).toBe(129);
    });

    it('4. Reparto propio cobrando el delivery: el vendedor lo elige y se cobra', () => {
        const r = emitir({ tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 10, eleccion: 'ITEM_ENVIO', productos: [AROMATIZADOR] });
        expect(r.total).toBe(139);
        expect(r.descripciones).toContain('Servicio de envío (Reparto propio)');
    });

    it('5. Courier Shalom con flete al cliente: se sigue cobrando (no se tocó)', () => {
        const r = emitir({ tipoDoc: '03', transportista: 'SHALOM_PRO', costoEnvio: 25, productos: [AROMATIZADOR] });
        expect(r.aplicacion).toBe('ITEM_ENVIO');
        expect(r.total).toBe(154);
        expect(r.descripciones).toContain('Servicio de envío (Shalom)');
    });

    it('6. Promo "envío gratis": el negocio absorbe el flete del courier', () => {
        const r = emitir({ tipoDoc: '03', transportista: 'SHALOM_PRO', costoEnvio: 25, eleccion: 'NEGOCIO', productos: [AROMATIZADOR] });
        expect(r.total).toBe(129);
        expect(r.detalles).toHaveLength(1);
    });

    it('7. Nota de venta con adelanto: se registra como pago y queda saldo', () => {
        const r = emitir({ tipoDoc: 'NV', transportista: 'PROPIOS', costoEnvio: 50, productos: [{ descripcion: 'JUEGO DE OLLAS', precio: 200 }] });
        expect(r.aplicacion).toBe('ADELANTO');
        expect(r.total).toBe(200);
        expect(r.adelanto).toBe(50);
        expect(r.saldo).toBe(150);
        expect(r.detalles).toHaveLength(1);
    });

    it('8. Esa misma NV convertida en boleta: el adelanto NO se cobra de nuevo', () => {
        const r = emitir({ tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 50, eleccion: 'ADELANTO', productos: [{ descripcion: 'JUEGO DE OLLAS', precio: 200 }] });
        expect(r.aplicacion).toBe('NEGOCIO');
        expect(r.total).toBe(200);
        expect(r.adelanto).toBe(0);
    });

    it('9. Factura a empresa con reparto propio: misma protección que la boleta', () => {
        const r = emitir({ tipoDoc: '01', transportista: 'PROPIOS', costoEnvio: 300, productos: [{ descripcion: 'LOTE DE REPUESTOS', precio: 4500 }] });
        expect(r.aplicacion).toBe('NEGOCIO');
        expect(r.total).toBe(4500);
    });

    it('10. Varios productos con flete cobrado: una sola línea de envío, al final', () => {
        const r = emitir({
            tipoDoc: '03', transportista: 'OLVA', costoEnvio: 18.5,
            productos: [
                { descripcion: 'POLO', precio: 45 },
                { descripcion: 'GORRA', precio: 29.9 },
                { descripcion: 'MEDIAS', precio: 12.6 },
            ],
        });
        expect(r.detalles).toHaveLength(4);
        expect(r.descripciones[3]).toBe('Servicio de envío (Olva)');
        expect(r.descripciones.filter((d) => d.startsWith('Servicio de envío'))).toHaveLength(1);
        expect(r.total).toBe(106);
    });
});

describe('Lo que ninguna casuística puede violar', () => {
    const todas: Escenario[] = [
        { tipoDoc: '03', transportista: '', costoEnvio: 0, envioActivo: false, productos: [AROMATIZADOR] },
        { tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 128.95, productos: [AROMATIZADOR] },
        { tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 10, eleccion: 'ITEM_ENVIO', productos: [AROMATIZADOR] },
        { tipoDoc: '03', transportista: 'SHALOM_PRO', costoEnvio: 25, productos: [AROMATIZADOR] },
        { tipoDoc: '03', transportista: 'SHALOM_PRO', costoEnvio: 25, eleccion: 'NEGOCIO', productos: [AROMATIZADOR] },
        { tipoDoc: 'NV', transportista: 'PROPIOS', costoEnvio: 50, productos: [AROMATIZADOR] },
        { tipoDoc: '03', transportista: 'PROPIOS', costoEnvio: 50, eleccion: 'ADELANTO', productos: [AROMATIZADOR] },
        { tipoDoc: '01', transportista: 'PROPIOS', costoEnvio: 300, productos: [AROMATIZADOR] },
    ];

    it('el total nunca baja del precio de los productos', () => {
        for (const e of todas) {
            const r = emitir(e);
            const productos = e.productos.reduce((a, p) => a + p.precio, 0);
            expect(r.total).toBeGreaterThanOrEqual(productos);
        }
    });

    it('nunca sale más de una línea de envío', () => {
        for (const e of todas) {
            const envios = emitir(e).descripciones.filter((d) => d.startsWith('Servicio de envío'));
            expect(envios.length).toBeLessThanOrEqual(1);
        }
    });

    it('si hay línea de envío, el vendedor la eligió a mano o es courier', () => {
        for (const e of todas) {
            const r = emitir(e);
            const cobra = r.descripciones.some((d) => d.startsWith('Servicio de envío'));
            if (!cobra) continue;
            const eligioCobrar = e.eleccion === 'ITEM_ENVIO';
            const esCourier = e.transportista !== 'PROPIOS' && e.transportista !== '';
            expect(eligioCobrar || esCourier).toBe(true);
        }
    });

    it('en reparto propio nunca se cobra sin que el vendedor lo pida', () => {
        for (const e of todas) {
            if (e.transportista !== 'PROPIOS' || e.eleccion === 'ITEM_ENVIO') continue;
            const r = emitir(e);
            expect(r.descripciones.some((d) => d.startsWith('Servicio de envío'))).toBe(false);
        }
    });
});
