/**
 * Los atajos de teclado del POS, y cuándo NO deben actuar.
 *
 * Reportado en producción: al pegar el celular del destinatario dentro del
 * modal de Coordinación de Envío, el número se iba al escáner de códigos de
 * barras y salía "Código 991065217 no encontrado. ¿Deseas crear el producto?".
 *
 * El atajo Ctrl+V lleva el foco al escáner, pero solo contemplaba TEXTAREA y
 * campos editables: un `<input>` normal —como el del celular— no lo frenaba.
 *
 * La regla, en una línea: **si el cursor está en un campo, el teclado es del
 * campo**. Los atajos solo actúan cuando no se está escribiendo.
 */

/** Lo poco que hace falta saber del elemento con el foco. */
export interface Enfocado {
    tagName?: string;
    isContentEditable?: boolean;
}

/**
 * ¿El usuario está escribiendo en algún campo?
 *
 * Incluye SELECT: con un desplegable abierto las teclas son suyas.
 */
export const estaEscribiendo = (el?: Enfocado | null): boolean => {
    const tag = String(el?.tagName ?? '').toUpperCase();
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(el?.isContentEditable)
    );
};

export interface TeclaPos {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
}

export type AccionPos = 'buscar' | 'escanear' | 'buscarBarra' | null;

/**
 * Qué hace el POS con esta tecla.
 *
 * - Ctrl+B / Cmd+B: ir al buscador de productos. Funciona siempre, incluso
 *   escribiendo: es un salto explícito, no interfiere con escribir texto.
 * - Ctrl+V / Cmd+V: ir al escáner, SOLO si no se está escribiendo.
 * - "/": ir al buscador, SOLO si no se está escribiendo (si no, no se podría
 *   escribir una barra en ningún campo).
 */
export const accionDeTecla = (
    tecla: TeclaPos,
    enfocado?: Enfocado | null,
): AccionPos => {
    const mod = Boolean(tecla.ctrlKey || tecla.metaKey);
    const limpio = mod && !tecla.shiftKey && !tecla.altKey;
    const escribiendo = estaEscribiendo(enfocado);

    if (limpio && (tecla.key === 'b' || tecla.key === 'B')) return 'buscar';
    if (limpio && (tecla.key === 'v' || tecla.key === 'V')) {
        return escribiendo ? null : 'escanear';
    }
    if (tecla.key === '/' && !mod) return escribiendo ? null : 'buscarBarra';
    return null;
};
