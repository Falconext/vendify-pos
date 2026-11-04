/**
 * Textos opcionales para provincia (envío por agencia) en los avisos de
 * despacho. Cliente, 31-10: "para clientes de Lima envío otro tipo de mensaje
 * tanto de en camino y cuando llega, no es lo mismo texto para provincia".
 *
 * El backend elige el texto según el despacho (tipoEnvio AGENCIA o courier
 * Shalom/Olva/…); acá solo se decide qué se guarda. Apagado o vacío → null:
 * provincia recibe el texto general, como siempre.
 */

export const MENSAJES_PROVINCIA_DEFAULT = {
    mensajeEnCaminoAgencia:
        'Hola {{nombre}}, tu pedido {{pedido}} ya salió por agencia 🚚. Lo recogerás en {{agencia}}; te avisamos apenas llegue.',
    mensajeEntregadoAgencia:
        'Hola {{nombre}}, ya recogiste tu pedido {{pedido}} en {{agencia}} ✅. ¡Gracias por preferir {{empresa}}!',
} as const;

export type CampoProvincia = keyof typeof MENSAJES_PROVINCIA_DEFAULT;

export const VARIABLES_PROVINCIA: Record<CampoProvincia, string[]> = {
    mensajeEnCaminoAgencia: ['nombre', 'pedido', 'agencia', 'clave', 'empresa'],
    mensajeEntregadoAgencia: ['nombre', 'pedido', 'agencia', 'empresa'],
};

export type TextosProvincia = Record<CampoProvincia, string>;
export type ProvinciaActiva = Record<CampoProvincia, boolean>;

const CAMPOS = Object.keys(MENSAJES_PROVINCIA_DEFAULT) as CampoProvincia[];

/** Al cargar: la variante está prendida si el negocio ya escribió un texto. */
export function provinciaActivaDesde(textos: Partial<Record<CampoProvincia, string | null>>): ProvinciaActiva {
    return Object.fromEntries(CAMPOS.map((c) => [c, !!textos[c]?.trim()])) as ProvinciaActiva;
}

/** Lo que se manda al backend: apagada → null (vuelve al texto general). */
export function payloadProvincia(textos: TextosProvincia, activa: ProvinciaActiva): Record<CampoProvincia, string | null> {
    return Object.fromEntries(
        CAMPOS.map((c) => [c, activa[c] && textos[c].trim() ? textos[c] : null]),
    ) as Record<CampoProvincia, string | null>;
}

/** Prendida pero vacía: no se guarda en silencio un "no cambia nada". */
export function errorProvincia(textos: TextosProvincia, activa: ProvinciaActiva): string | null {
    if (activa.mensajeEnCaminoAgencia && !textos.mensajeEnCaminoAgencia.trim()) {
        return 'Escribe el mensaje "En camino" para recojo en agencia o desactívalo.';
    }
    if (activa.mensajeEntregadoAgencia && !textos.mensajeEntregadoAgencia.trim()) {
        return 'Escribe el mensaje "Entregado" para recojo en agencia o desactívalo.';
    }
    return null;
}
