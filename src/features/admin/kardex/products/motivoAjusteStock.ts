/**
 * Por qué se ajusta el stock a mano.
 *
 * Pedido de DEMENVER: hoy el inventario deja quitar o agregar unidades, pero no
 * dejar dicho POR QUÉ. En el kardex todos esos movimientos salen como "Ajuste
 * manual de stock desde inventario (-9)" y lo único que se guarda del contexto
 * es quién lo hizo. Cuando después alguien pregunta por qué faltan nueve
 * audífonos, no hay respuesta en ningún lado.
 *
 * Su sistema anterior lo resolvía con un comentario libre por salida ("ERROR DE
 * INGRESO", "se uso para el local", "producto roto"). Acá se guarda lo mismo
 * pero con un motivo elegido de una lista —para poder contar las mermas más
 * adelante— y un detalle opcional en texto, que es donde va el matiz.
 */

export type TipoAjuste = 'sumar' | 'restar' | 'reemplazar' | 'ninguno';

export interface MotivoAjuste {
    codigo: string;
    etiqueta: string;
}

/** Por qué SALE mercadería sin haberse vendido. */
export const MOTIVOS_SALIDA: MotivoAjuste[] = [
    { codigo: 'MERMA', etiqueta: 'Merma (producto roto o dañado)' },
    { codigo: 'VENCIDO', etiqueta: 'Vencido o en mal estado' },
    { codigo: 'CONSUMO_INTERNO', etiqueta: 'Consumo interno del negocio' },
    { codigo: 'PERDIDA', etiqueta: 'Pérdida o robo' },
    { codigo: 'DEVOLUCION_PROVEEDOR', etiqueta: 'Devolución al proveedor' },
    { codigo: 'ERROR_REGISTRO', etiqueta: 'Error de registro anterior' },
    { codigo: 'OTRO', etiqueta: 'Otro motivo' },
];

/** Por qué ENTRA mercadería sin haberse comprado. */
export const MOTIVOS_INGRESO: MotivoAjuste[] = [
    { codigo: 'ENCONTRADO', etiqueta: 'Encontrado en inventario (venía de más)' },
    { codigo: 'DEVOLUCION_CLIENTE', etiqueta: 'Devolución de un cliente' },
    { codigo: 'ERROR_REGISTRO', etiqueta: 'Error de registro anterior' },
    { codigo: 'CONTEO', etiqueta: 'Corrección por conteo físico' },
    { codigo: 'OTRO', etiqueta: 'Otro motivo' },
];

/**
 * Los motivos que tiene sentido ofrecer para este ajuste.
 *
 * "Reemplazar" no tiene lista propia: deja el stock en un número y puede
 * terminar sumando o restando, así que se ofrecen los de conteo —que es para lo
 * que se usa— más los de ingreso.
 */
export const motivosPara = (tipo: TipoAjuste): MotivoAjuste[] => {
    if (tipo === 'restar') return MOTIVOS_SALIDA;
    if (tipo === 'sumar') return MOTIVOS_INGRESO;
    if (tipo === 'reemplazar') return MOTIVOS_INGRESO;
    return [];
};

/** La etiqueta legible de un código, o el código si no se reconoce. */
export const etiquetaDeMotivo = (codigo?: string | null): string => {
    const c = String(codigo ?? '').trim().toUpperCase();
    if (!c) return '';
    const todos = [...MOTIVOS_SALIDA, ...MOTIVOS_INGRESO];
    return todos.find((m) => m.codigo === c)?.etiqueta ?? c;
};

/**
 * ¿Se puede guardar este ajuste?
 *
 * Se exige el motivo: sin él volvemos al problema que trajo DEMENVER. Y si el
 * motivo es "Otro", el detalle deja de ser opcional —"Otro motivo" solo no
 * explica nada—.
 */
export const faltaMotivo = (params: {
    tipo: TipoAjuste;
    motivo?: string | null;
    detalle?: string | null;
}): boolean => {
    if (params.tipo === 'ninguno') return false;
    const motivo = String(params.motivo ?? '').trim();
    if (!motivo) return true;
    if (motivo.toUpperCase() === 'OTRO') return !String(params.detalle ?? '').trim();
    return false;
};

/**
 * El texto que queda en el kardex.
 *
 * Lleva el motivo adelante para que se lea de un vistazo en la lista de
 * movimientos, donde solo se ve esta línea.
 */
export const conceptoDelAjuste = (params: {
    tipo: TipoAjuste;
    motivo?: string | null;
    cantidad: number;
}): string => {
    const signo = params.tipo === 'restar' ? '-' : '+';
    const etiqueta = etiquetaDeMotivo(params.motivo);
    const base = `Ajuste de inventario (${signo}${params.cantidad})`;
    return etiqueta ? `${etiqueta} · ${base}` : base;
};
