/**
 * La curva de tallas de una orden de compra.
 *
 * Pedido de COMERCIAL LINNA MODA: al proveedor no se le pide "1 Verona rosa",
 * se le pide "2 de la 35, 3 de la 36, 2 de la 37". Hasta ahora la búsqueda del
 * catálogo solo ofrecía el modelo padre, así que la orden no servía para
 * comprar calzado.
 *
 * Esto es solo la FORMA DE CARGAR. Abajo produce una línea por talla, con el
 * `productoId` de la variante — exactamente las mismas líneas que si se
 * agregaran de a una. Por eso el PDF al proveedor y la recepción de mercadería
 * no cambian: cuando llega el pedido, el stock entra a la talla correcta sin
 * repartir a mano.
 */
import {
    filasDeVariantes,
    nombreDeLaTalla,
    tieneVariantes,
} from '@/features/admin/kardex/products/stockPorVariante';

/** Una casilla de la curva: una talla con lo que ya hay y lo que costó. */
export interface CeldaCurva {
    productoId: number;
    codigo: string;
    /** Lo que se muestra en el encabezado: "36", o "Negro / M" si no hay talla. */
    talla: string;
    /** La combinación completa, para la descripción de la línea. */
    etiqueta: string;
    stockActual: number;
    costo: number;
}

/** Una línea de la orden, igual que la que arma el buscador de siempre. */
export interface LineaOrden {
    productoId: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    gravado: boolean;
}

const num = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
};

/**
 * ¿Este modelo se pide por curva?
 *
 * Con una sola talla activa no vale la pena abrir una grilla de una casilla:
 * se agrega derecho, como cualquier producto suelto.
 */
export const sePideEnCurva = (producto: any): boolean =>
    tieneVariantes(producto) &&
    (producto?.variantes ?? []).filter(
        (v: any) => String(v?.estado ?? 'ACTIVO').toUpperCase() !== 'INACTIVO',
    ).length > 1;

/**
 * Las casillas del modelo, en el orden en que se piden.
 *
 * El orden numérico importa: con orden alfabético la 40 iría antes que la 9 y
 * la curva se leería al revés de como la piensa el comprador.
 */
export const curvaDeModelo = (producto: any): CeldaCurva[] => {
    const clave = nombreDeLaTalla(producto);
    const costoDelPadre = num(producto?.costoPromedio);

    return filasDeVariantes(producto)
        .map((fila): CeldaCurva => {
            const variante = (producto?.variantes ?? []).find(
                (v: any) => Number(v?.id) === fila.id,
            );
            const talla = clave ? (fila.atributos[clave] || '').trim() : '';
            return {
                productoId: fila.id,
                codigo: fila.sku,
                talla: talla || fila.etiqueta || '—',
                etiqueta: fila.etiqueta,
                stockActual: fila.stock,
                // El costo de la variante manda sobre el del modelo: a veces una
                // talla especial cuesta distinto.
                costo: num(variante?.costoPromedio) || costoDelPadre,
            };
        })
        .sort((a, b) => {
            const na = Number(a.talla);
            const nb = Number(b.talla);
            if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
            return a.talla.localeCompare(b.talla, 'es');
        });
};

/** Qué afectación hereda la línea (el padre manda: es el mismo producto). */
const esGravado = (producto: any): boolean =>
    String(producto?.tipoAfectacionIGV ?? '10') === '10';

/**
 * Las líneas que se agregan a la orden.
 *
 * Solo entran las tallas con cantidad: una curva donde se pidieron tres tallas
 * no debe ensuciar la orden con las otras tres en cero. Las cantidades
 * negativas o ilegibles se descartan en vez de romper el total.
 */
export const lineasDeCurva = (
    producto: any,
    cantidades: Record<number, unknown>,
    costos: Record<number, unknown> = {},
): LineaOrden[] => {
    const gravado = esGravado(producto);
    const nombre = String(producto?.descripcion ?? '').trim();

    return curvaDeModelo(producto)
        .map((celda) => {
            const cantidad = num(cantidades?.[celda.productoId]);
            if (!(cantidad > 0)) return null;
            const costoElegido = costos?.[celda.productoId];
            return {
                productoId: celda.productoId,
                // El proveedor lee el papel: tiene que decir modelo y talla.
                descripcion: celda.etiqueta
                    ? `${nombre} - ${celda.etiqueta}`
                    : nombre,
                cantidad,
                // 2 decimales: el costo guardado suele venir sin IGV con 4 decimales
                // (ej. 46.6102) y en la orden al proveedor se ve más limpio redondeado.
                precioUnitario: Number(
                    (costoElegido === undefined || costoElegido === ''
                        ? celda.costo
                        : Math.max(0, num(costoElegido))
                    ).toFixed(2),
                ),
                gravado,
            };
        })
        .filter((l): l is LineaOrden => l !== null);
};

/** Cuántos pares suma la curva, para mostrarlo mientras se carga. */
export const totalDeCurva = (cantidades: Record<number, unknown>): number =>
    Object.values(cantidades ?? {}).reduce<number>(
        (suma, v) => suma + Math.max(0, num(v)),
        0,
    );
