// Precio por mayor mezclando productos.
//
// Pedido de un cliente que vende perfumes (01-11): "si llevan 6 perfumes,
// iguales o distintos, les doy el precio por mayor". El precio por mayor de
// siempre mira solo la cantidad de su propia línea: 2 de un perfume y 4 de otro
// no llegaban a la escala de 6 en ninguno.
//
// Con la mezcla encendida (Empresa.mayoristaMezclaActivo) se suman las unidades
// de todos los productos del alcance —todos, o los de ciertas categorías— y
// cada línea toma SU escala de precio por mayor según ese total. Cada producto
// conserva sus propios precios: 6 unidades mezcladas ponen a cada perfume en su
// precio "desde 6". El que no tiene escalas suma unidades pero sigue a su precio.
//
// Vive aparte del ViewModel para poder probarlo sin montar el POS: el VM solo
// aplica lo que esto calcula (ver el efecto `reprecioPorMezcla` allá).

export interface ConfigMezcla {
    activo: boolean;
    /** Vacío = todos los productos. */
    categoriaIds: number[];
}

export interface ReglaMayorista {
    cantidadMinima: number;
    precio: number;
}

const SIN_MEZCLA: ConfigMezcla = { activo: false, categoriaIds: [] };

export function configMezclaDe(empresa: any): ConfigMezcla {
    if (!empresa?.mayoristaMezclaActivo) return SIN_MEZCLA;
    const ids = Array.isArray(empresa.mayoristaMezclaCategoriaIds)
        ? empresa.mayoristaMezclaCategoriaIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
    return { activo: true, categoriaIds: ids };
}

/**
 * Precio unitario de una escala. Hay escalas guardadas como precio del lote
 * (6 unidades a S/ 120) en vez de por unidad: si el precio de la escala supera
 * al de lista, se reparte entre las unidades. Misma regla que el POS de siempre.
 */
export function precioUnitarioDeEscala(base: number, regla: ReglaMayorista): number {
    const minimo = Number(regla.cantidadMinima);
    const precio = Number(regla.precio);
    if (!Number.isFinite(precio) || precio <= 0) return base;
    if (Number.isFinite(base) && base > 0 && minimo > 1 && precio > base) {
        return Number((precio / minimo).toFixed(6));
    }
    return precio;
}

/** Escalas válidas (mínimo y precio positivos), de menor a mayor cantidad. */
export function escalasValidas(base: number, reglas: ReglaMayorista[] | null | undefined) {
    return (reglas ?? [])
        .map((r) => ({ cantidadMinima: Number(r?.cantidadMinima), precioUnitario: precioUnitarioDeEscala(base, r) }))
        .filter((r) => Number.isFinite(r.cantidadMinima) && r.cantidadMinima > 0 && Number.isFinite(r.precioUnitario) && r.precioUnitario > 0)
        .sort((a, b) => a.cantidadMinima - b.cantidadMinima);
}

/** El precio que corresponde a `cantidad` unidades: la escala más alta alcanzada, o el de lista. */
export function precioPorCantidad(base: number, reglas: ReglaMayorista[] | null | undefined, cantidad: number): number {
    if (!Number.isFinite(base) || base <= 0) return 0;
    const qty = Number(cantidad);
    if (!Number.isFinite(qty) || qty <= 0) return base;
    const alcanzada = escalasValidas(base, reglas).filter((r) => qty >= r.cantidadMinima).pop();
    return alcanzada ? alcanzada.precioUnitario : base;
}

const esGratuita = (codigo: unknown): boolean => {
    const n = Number(codigo);
    return (n >= 11 && n <= 16) || n === 21 || (n >= 31 && n <= 37);
};

const productoDe = (linea: any): number => Number(linea?.productoId ?? linea?.id) || 0;

const enCategorias = (linea: any, ids: number[]): boolean => {
    if (!ids.length) return true;
    if (ids.includes(Number(linea?.categoriaId))) return true;
    // Un producto puede estar en varias categorías: cuenta cualquiera de ellas.
    const extra: any[] = Array.isArray(linea?.categoriasExtra) ? linea.categoriasExtra : [];
    return extra.some((c) => ids.includes(Number(c?.id ?? c)));
};

/**
 * La línea suma unidades a la mezcla. Quedan fuera los kits, los ítems libres
 * (no son productos del catálogo) y lo que va de regalo: una bonificación no
 * debería empujar al cliente a la escala por mayor.
 */
export function sumaALaMezcla(linea: any, cfg: ConfigMezcla): boolean {
    if (!cfg.activo) return false;
    if (!productoDe(linea) || linea?.comboId || linea?.esItemLibre) return false;
    if (esGratuita(linea?.tipoAfectacionIGV)) return false;
    if (!(Number(linea?.cantidad) > 0)) return false;
    return enCategorias(linea, cfg.categoriaIds);
}

/**
 * La línea cambia de precio con la mezcla. Además de sumar, tiene que tener
 * escalas propias y un precio que el sistema pone solo:
 * - el precio escrito a mano (o una escala elegida a mano) manda;
 * - las líneas traídas de un comprobante ya emitido conservan su precio;
 * - los paquetes y presentaciones tienen su propio precio de pack.
 */
export function seRepreciaPorMezcla(linea: any, cfg: ConfigMezcla): boolean {
    if (!sumaALaMezcla(linea, cfg)) return false;
    if (linea?.precioManual || linea?._tierOverride != null) return false;
    if (linea?.precioDelDocumento) return false;
    if (linea?.esPaquete || String(linea?.presentacionCodigo ?? '') !== '') return false;
    const base = Number(linea?.precioBase ?? linea?.precioUnitario);
    return base > 0 && escalasValidas(base, linea?.preciosMayorista).length > 0;
}

/** Unidades de la venta que cuentan para la mezcla. */
export function cantidadEnMezcla(lineas: any[], cfg: ConfigMezcla, excepto?: number): number {
    if (!cfg.activo) return 0;
    return (lineas || []).reduce(
        (acc, l, i) => (i !== excepto && sumaALaMezcla(l, cfg) ? acc + Number(l.cantidad) : acc),
        0,
    );
}

export interface CambioMezcla {
    index: number;
    patch: { precioUnitario: number; total: string; sale: string; igv: string };
}

/**
 * Las líneas cuyo precio no corresponde a la cantidad mezclada, con el precio
 * que les toca. Solo devuelve las que cambian: aplicarlo dos veces no hace nada,
 * así el efecto del POS no entra en bucle.
 */
export function reprecioPorMezcla(lineas: any[], cfg: ConfigMezcla): CambioMezcla[] {
    if (!cfg.activo) return [];
    const total = cantidadEnMezcla(lineas, cfg);
    const cambios: CambioMezcla[] = [];
    (lineas || []).forEach((l, index) => {
        if (!seRepreciaPorMezcla(l, cfg)) return;
        const base = Number(l.precioBase ?? l.precioUnitario);
        // El total mezclado nunca es menor que la cantidad de la propia línea.
        const precio = precioPorCantidad(base, l.preciosMayorista, Math.max(total, Number(l.cantidad)));
        if (Math.abs(precio - Number(l.precioUnitario)) < 0.000001) return;
        const qty = Number(l.cantidad);
        const conDescuento = precio * qty * (1 - (Number(l.descuento) || 0) / 100);
        cambios.push({
            index,
            patch: {
                precioUnitario: precio,
                total: conDescuento.toFixed(2),
                sale: (conDescuento / 1.18).toFixed(2),
                igv: (conDescuento - conDescuento / 1.18).toFixed(2),
            },
        });
    });
    return cambios;
}

export interface AvisoMezcla {
    /** Unidades mezcladas en la venta. */
    total: number;
    /** Alguna línea ya está en precio por mayor con el total mezclado. */
    aplicado: boolean;
    /** La próxima escala que se puede alcanzar sumando más unidades. */
    siguiente: { cantidadMinima: number; faltan: number } | null;
}

/**
 * Lo que el cajero ve sobre el carrito: cuántas unidades lleva mezcladas, si ya
 * hay precio por mayor y cuánto falta para la próxima escala. Null cuando no
 * hay ninguna línea con escalas en la mezcla (no hay nada que avisar).
 */
export function avisoMezcla(lineas: any[], cfg: ConfigMezcla): AvisoMezcla | null {
    if (!cfg.activo) return null;
    const conEscalas = (lineas || []).filter((l) => seRepreciaPorMezcla(l, cfg));
    if (!conEscalas.length) return null;
    const total = cantidadEnMezcla(lineas, cfg);
    let aplicado = false;
    let siguiente: number | null = null;
    for (const l of conEscalas) {
        const base = Number(l.precioBase ?? l.precioUnitario);
        const escalas = escalasValidas(base, l.preciosMayorista);
        if (precioPorCantidad(base, l.preciosMayorista, total) < base) aplicado = true;
        const proxima = escalas.find((e) => e.cantidadMinima > total);
        if (proxima && (siguiente === null || proxima.cantidadMinima < siguiente)) siguiente = proxima.cantidadMinima;
    }
    return { total, aplicado, siguiente: siguiente === null ? null : { cantidadMinima: siguiente, faltan: siguiente - total } };
}
