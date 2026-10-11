/**
 * Qué se hace con el monto que se escribe en Coordinación de envío.
 *
 * Son tres cosas distintas y el campo sirve para las tres:
 *  - ADELANTO   → el cliente YA pagó esa plata. Se registra como pago.
 *  - ITEM_ENVIO → se le COBRA al cliente: entra como línea y sube el total.
 *  - NEGOCIO    → lo paga el negocio. No toca el comprobante.
 *
 * Bug de IMPORTEMOS JUNTOS (boleta B0A1-269): en reparto propio el campo se
 * llama "Adelanto ya pagado", pero en un documento formal la aplicación por
 * defecto era ITEM_ENVIO. Un adelanto de S/128.95 terminó cobrado otra vez y
 * la boleta salió en S/257.95 en vez de S/129. Había que anularla con nota
 * de crédito.
 *
 * La regla de fondo: un monto que el cliente ya pagó NUNCA puede convertirse
 * solo en un cobro. Si no se puede registrar como adelanto, no se toca el
 * comprobante.
 */

export type AplicacionMonto = 'ADELANTO' | 'ITEM_ENVIO' | 'NEGOCIO';

export interface ContextoEnvio {
    /** Nota de venta, ticket y demás informales: aceptan adelanto. */
    esInformal: boolean;
    /** Reparto propio (motorizado del negocio), no un courier. */
    esPropio: boolean;
}

/**
 * Cómo arranca el selector.
 *
 * En courier cobrarle el flete al cliente es lo normal, así que ahí sigue
 * siendo ITEM_ENVIO. En reparto propio el campo pide un adelanto: en formal
 * se absorbe antes que cobrar de más.
 */
export const aplicacionPorDefecto = ({ esInformal, esPropio }: ContextoEnvio): AplicacionMonto => {
    if (esInformal) return 'ADELANTO';
    return esPropio ? 'NEGOCIO' : 'ITEM_ENVIO';
};

/** Las opciones que tiene sentido ofrecer según el documento. */
export const opcionesDeAplicacion = ({ esInformal }: Pick<ContextoEnvio, 'esInformal'>) =>
    esInformal
        ? ([
            { value: 'ADELANTO' as const, label: 'Adelanto' },
            { value: 'ITEM_ENVIO' as const, label: 'Item envío' },
            { value: 'NEGOCIO' as const, label: 'Negocio absorbe' },
        ])
        : ([
            { value: 'ITEM_ENVIO' as const, label: 'Item envío' },
            { value: 'NEGOCIO' as const, label: 'Negocio absorbe' },
        ]);

/**
 * La aplicación que realmente rige, resolviendo lo que viene guardado.
 *
 * Un ADELANTO guardado en una nota de venta que después se convierte en
 * boleta cae a NEGOCIO, no a ITEM_ENVIO: esa plata ya entró, volver a
 * cobrarla es el defecto que originó esto.
 */
export const aplicacionEfectiva = (
    guardada: string | null | undefined,
    contexto: ContextoEnvio,
): AplicacionMonto => {
    const valor = String(guardada ?? '').toUpperCase();
    const conocida = valor === 'ADELANTO' || valor === 'ITEM_ENVIO' || valor === 'NEGOCIO';
    if (!conocida) return aplicacionPorDefecto(contexto);
    if (valor === 'ADELANTO' && !contexto.esInformal) {
        // Con courier, cobrarle el flete al cliente es lo esperado y se avisa
        // en pantalla. En reparto propio el campo dice "adelanto ya pagado":
        // volverlo cobro es justo el defecto que originó esto.
        return contexto.esPropio ? 'NEGOCIO' : 'ITEM_ENVIO';
    }
    return valor as AplicacionMonto;
};

/** La etiqueta del campo dice lo que el monto va a hacer, no lo que se esperaba. */
export const etiquetaDelMonto = (aplicacion: AplicacionMonto, { esPropio }: Pick<ContextoEnvio, 'esPropio'>) => {
    if (aplicacion === 'ITEM_ENVIO') return 'Cobro extra al cliente (S/)';
    if (aplicacion === 'ADELANTO') return 'Adelanto ya pagado (S/)';
    return esPropio ? 'Adelanto ya pagado (S/)' : 'Monto cobrado / adelanto (S/)';
};

export interface AvisoAplicacion {
    tono: 'alerta' | 'info' | 'neutro';
    texto: string;
}

/**
 * El aviso debajo del campo. ITEM_ENVIO sube el total que firma el cliente y
 * en un comprobante formal eso solo se deshace con nota de crédito, así que
 * va en tono de alerta y no en verde entre otros textos.
 */
export const avisoDeAplicacion = (
    aplicacion: AplicacionMonto,
    monto: number,
    { esInformal }: Pick<ContextoEnvio, 'esInformal'>,
): AvisoAplicacion | null => {
    const valor = Number(monto);
    if (!(valor > 0)) return null;
    const soles = `S/ ${valor.toFixed(2)}`;
    if (aplicacion === 'ITEM_ENVIO') {
        return {
            tono: 'alerta',
            texto: esInformal
                ? `Se cobra al cliente: ${soles} se agrega como línea y sube el total.`
                : `Se COBRA al cliente: ${soles} se agrega como línea y sube el total del comprobante. Si es plata que ya pagó, elige "Negocio absorbe".`,
        };
    }
    if (aplicacion === 'ADELANTO') {
        return { tono: 'info', texto: `${soles} se registra como adelanto y queda saldo pendiente en la venta.` };
    }
    return { tono: 'neutro', texto: `${soles} lo asume el negocio. No se agrega al comprobante.` };
};

export interface LineaEnvio {
    productoId: null;
    descripcion: string;
    cantidad: number;
    nuevoValorUnitario: number;
    descuento: number;
}

/**
 * La línea de "Servicio de envío" que se suma al comprobante.
 *
 * Es la que convirtió la boleta de S/129 en S/257.95, así que la regla vive
 * acá y se prueba sola: solo sale si el vendedor eligió cobrarlo.
 */
export const lineasDeEnvio = ({
    envioActivo,
    costoEnvio,
    aplicacion,
    etiquetaTransportista,
}: {
    envioActivo: boolean;
    costoEnvio: unknown;
    aplicacion: AplicacionMonto;
    etiquetaTransportista?: string;
}): LineaEnvio[] => {
    const monto = Number(costoEnvio);
    if (!envioActivo || !(monto > 0) || aplicacion !== 'ITEM_ENVIO') return [];
    const etiqueta = String(etiquetaTransportista ?? '').trim();
    return [{
        productoId: null,
        descripcion: `Servicio de envío${etiqueta ? ` (${etiqueta})` : ''}`,
        cantidad: 1,
        nuevoValorUnitario: monto,
        descuento: 0,
    }];
};
