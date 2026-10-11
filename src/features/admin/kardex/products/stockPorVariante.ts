/**
 * Desglose del stock de un modelo por sus variantes (color, talla, …).
 *
 * Pedido de un negocio de ropa y calzado: el inventario muestra "77" para un
 * modelo y no hay dónde ver cuántos quedan en S, en M o en XL. El dato ya
 * existe —cada variante es un producto con su propio stock— pero la lista solo
 * mostraba el total del padre.
 *
 * Vive aparte de la pantalla para poder probar las reglas que importan sin
 * montar la tabla entera: cuáles variantes cuentan, cómo se nombran las
 * columnas y por qué el total tiene que cuadrar con el badge de la lista.
 */

/** El stock de una variante en una sede concreta. */
export interface StockEnSede {
    sedeId: number;
    stock: number;
}

export interface FilaVariante {
    id: number;
    sku: string;
    /** { Color: 'Negro', Talla: 'S' } — tal cual lo guarda la variante. */
    atributos: Record<string, string>;
    /** "Negro / S", para mostrar en una sola celda. */
    etiqueta: string;
    stock: number;
    porSede: StockEnSede[];
    /** Pedido al proveedor y aún no recibido (órdenes de compra abiertas). */
    enCamino: number;
    /** Entrega comprometida más próxima, o null si ninguna orden la tiene. */
    enCaminoProximaEntrega: string | null;
    /** Ya prometido en Notas de Pedido sin entregar. */
    comprometido: number;
    /** Cuánto más se puede prometer (puede ser negativo: se sobrevendió). */
    saldoPrometible: number;
}

const texto = (valor: unknown): string => String(valor ?? '').trim();

/**
 * Solo las variantes ACTIVAS.
 *
 * Es la misma regla con la que el backend arma el stock del padre
 * (`sincronizarStockPadre`: suma de las variantes ACTIVO). Si acá entraran las
 * desactivadas, el desglose sumaría más que el número que el usuario ve en la
 * lista y el reporte quedaría desacreditado de entrada.
 */
const esActiva = (variante: any): boolean =>
    texto(variante?.estado).toUpperCase() !== 'INACTIVO';

/** ¿Este producto tiene tallas/colores que valga la pena desglosar? */
export const tieneVariantes = (producto: any): boolean =>
    Array.isArray(producto?.variantes) && producto.variantes.some(esActiva);

/**
 * Las columnas de atributos, en el orden en que el usuario las configuró.
 *
 * El orden sale del padre (`opcionesAtributos`), no de las variantes: así
 * "Color" y "Talla" salen siempre en el mismo orden aunque alguna variante
 * tenga las claves al revés. Si el padre no lo trae, se cae al orden de
 * aparición en las variantes.
 */
export const nombresDeAtributos = (producto: any): string[] => {
    const delPadre = Array.isArray(producto?.opcionesAtributos)
        ? producto.opcionesAtributos
              .map((opcion: any) => texto(opcion?.nombre))
              .filter((nombre: string) => nombre !== '')
        : [];

    const vistos = new Set<string>(delPadre);
    const extras: string[] = [];
    for (const variante of producto?.variantes ?? []) {
        if (!esActiva(variante)) continue;
        for (const clave of Object.keys(variante?.valoresAtributos ?? {})) {
            const nombre = texto(clave);
            if (nombre !== '' && !vistos.has(nombre)) {
                vistos.add(nombre);
                extras.push(nombre);
            }
        }
    }
    return [...delPadre, ...extras];
};

/** "Negro / S" a partir de los valores, en el orden de las columnas. */
export const etiquetaDeVariante = (
    atributos: Record<string, string>,
    orden: string[],
): string => {
    const enOrden = orden
        .map((nombre) => texto(atributos[nombre]))
        .filter((valor) => valor !== '');
    if (enOrden.length > 0) return enOrden.join(' / ');
    // Sin columnas conocidas: lo que haya, para no mostrar una fila en blanco.
    return Object.values(atributos)
        .map(texto)
        .filter((valor) => valor !== '')
        .join(' / ');
};

/**
 * Las filas del desglose.
 *
 * `sedeId` opcional: cuando la pantalla está filtrada por una sede, el stock
 * que se muestra tiene que ser el de ESA sede, no el global — si no, el
 * desglose contradice al total que la misma lista está mostrando.
 */
export const filasDeVariantes = (
    producto: any,
    sedeId?: number,
): FilaVariante[] => {
    const orden = nombresDeAtributos(producto);
    return (producto?.variantes ?? [])
        .filter(esActiva)
        .map((variante: any): FilaVariante => {
            const atributos: Record<string, string> = {};
            for (const [clave, valor] of Object.entries(
                variante?.valoresAtributos ?? {},
            )) {
                atributos[texto(clave)] = texto(valor);
            }

            const porSede: StockEnSede[] = (variante?.stocks ?? []).map(
                (fila: any) => ({
                    sedeId: Number(fila?.sedeId),
                    stock: Number(fila?.stock ?? 0),
                }),
            );

            const deLaSede = sedeId
                ? porSede.find((fila) => fila.sedeId === Number(sedeId))
                : undefined;

            return {
                id: Number(variante?.id),
                sku: texto(variante?.codigo),
                atributos,
                etiqueta: etiquetaDeVariante(atributos, orden),
                stock: sedeId
                    ? Number(deLaSede?.stock ?? 0)
                    : Number(variante?.stock ?? 0),
                porSede,
                enCamino: Number(variante?.enCamino ?? 0) || 0,
                enCaminoProximaEntrega: variante?.enCaminoProximaEntrega ?? null,
                comprometido: Number(variante?.comprometido ?? 0) || 0,
                saldoPrometible: Number(
                    variante?.saldoPrometible ??
                    (Number(variante?.stock ?? 0) + Number(variante?.enCamino ?? 0) - Number(variante?.comprometido ?? 0)),
                ) || 0,
            };
        });
};

/** Lo que suma el desglose: tiene que coincidir con el badge de la lista. */
export const totalDeFilas = (filas: FilaVariante[]): number =>
    filas.reduce((suma, fila) => suma + fila.stock, 0);

/** Cuántas combinaciones quedaron sin una sola unidad. */
export const sinStock = (filas: FilaVariante[]): number =>
    filas.filter((fila) => fila.stock <= 0).length;

// ─────────────────────────────────────────────────────────────────────────────
// Resumen por talla, para el catálogo impreso
// ─────────────────────────────────────────────────────────────────────────────

/** Una talla, cuánto queda y cuánto viene en camino. */
export interface TallaDisponible {
    talla: string;
    stock: number;
    /** Pedido al proveedor y aún no recibido. No se vende contra esto. */
    enCamino: number;
}

const ES_TALLA = /talla|size|medida/i;

/**
 * El nombre del atributo que hace de talla, si lo hay.
 *
 * Se busca por nombre porque "Talla" no es un campo del sistema: el usuario
 * bautiza sus atributos. En calzado suelen ser Color, Talla y Taco.
 */
export const nombreDeLaTalla = (producto: any): string | null =>
    nombresDeAtributos(producto).find((nombre) => ES_TALLA.test(nombre)) ?? null;

/**
 * Qué tallas hay disponibles y cuántas de cada una.
 *
 * Pedido de COMERCIAL LINNA MODA: el catálogo en PDF mostraba "Stock: 5" para
 * un modelo y la vendedora no sabía de qué tallas eran esos 5. Se listan solo
 * las que tienen stock: en un catálogo lo que importa es qué se puede vender,
 * y una lista con ceros ocupa el doble sin decir nada.
 *
 * Si el modelo no tiene un atributo que parezca talla, se cae a la etiqueta
 * completa de la variante ("Negro / M"), que es mejor que no mostrar nada.
 */
export const tallasDisponibles = (
    producto: any,
    sedeId?: number,
): TallaDisponible[] => {
    // Una talla agotada pero con reposición pedida SÍ tiene que aparecer: es
    // justo la que la vendedora necesita poder ofrecer (pedido de KREZKA).
    const filas = filasDeVariantes(producto, sedeId).filter(
        (f) => f.stock > 0 || f.enCamino > 0,
    );
    if (filas.length === 0) return [];

    const clave = nombreDeLaTalla(producto);
    const acumulado = new Map<string, number>();
    const enCaminoPorTalla = new Map<string, number>();
    for (const fila of filas) {
        const talla = clave ? (fila.atributos[clave] || '').trim() : '';
        const etiqueta = talla || fila.etiqueta || '—';
        acumulado.set(etiqueta, (acumulado.get(etiqueta) ?? 0) + fila.stock);
        if (fila.enCamino > 0) {
            enCaminoPorTalla.set(etiqueta, (enCaminoPorTalla.get(etiqueta) ?? 0) + fila.enCamino);
        }
    }

    // Las tallas se ordenan como números cuando lo son (35, 36, 37…) y como
    // texto cuando no (S, M, L): ordenar "40" antes que "9" sería absurdo.
    return [...acumulado.entries()]
        .map(([talla, stock]) => ({ talla, stock, enCamino: enCaminoPorTalla.get(talla) ?? 0 }))
        .sort((a, b) => {
            const na = Number(a.talla);
            const nb = Number(b.talla);
            if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
            return a.talla.localeCompare(b.talla, 'es');
        });
};

/**
 * "36:1 · 37:0+3 · 39:2" — compacto, para que entre en una ficha del catálogo.
 * El "+3" es lo que viene en camino: se muestra aparte del stock real para que
 * nadie lo confunda con mercadería disponible.
 */
export const textoDeTallas = (producto: any, sedeId?: number): string =>
    tallasDisponibles(producto, sedeId)
        .map(({ talla, stock, enCamino }) =>
            enCamino > 0 ? `${talla}:${stock}+${enCamino}` : `${talla}:${stock}`,
        )
        .join(' · ');
