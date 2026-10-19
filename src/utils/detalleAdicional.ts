/**
 * Descripción / detalle adicional de una línea (multilínea).
 *
 * Caso: cotización de servicios (pintura, obras). El ítem lleva un título
 * ("RETIRO DE PINTURA DE PARED PISO 6") en `descripcion` y, debajo, el detalle
 * del trabajo en varias líneas, en letra normal. Se guarda en
 * `DetalleComprobante.detalleAdicional` y se imprime en el PDF; NO viaja al
 * XML de SUNAT (allí el ítem sigue con `descripcion`). Espejo de
 * backend/src/comprobante/detalle-adicional.ts.
 */

export const DETALLE_ADICIONAL_MAX = 2000;

/** Texto listo para enviar: saltos \n, sin líneas vacías en los bordes. '' si no hay nada. */
export function normalizarDetalleAdicional(valor: unknown): string {
    if (valor == null) return '';
    const lineas = String(valor)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''));
    while (lineas.length && !lineas[0].trim()) lineas.shift();
    while (lineas.length && !lineas[lineas.length - 1].trim()) lineas.pop();
    return lineas.join('\n').slice(0, DETALLE_ADICIONAL_MAX).trim();
}

/** Líneas a imprimir (sin vacías), respetando mayúsculas/minúsculas. */
export function lineasDetalleAdicional(valor: unknown): string[] {
    const texto = normalizarDetalleAdicional(valor);
    if (!texto) return [];
    return texto.split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * Campo para el payload de la línea: solo si hay texto (no manda "" ni null
 * para no ensuciar el resto de ventas del POS).
 */
export function detalleAdicionalParaPayload(valor: unknown): { detalleAdicional?: string } {
    const texto = normalizarDetalleAdicional(valor);
    return texto ? { detalleAdicional: texto } : {};
}

/**
 * Los documentos que declaran a SUNAT (factura, boleta, NC, ND) no imprimen
 * el detalle: el XML solo lleva `descripcion` y la representación impresa no
 * debe contar más del ítem que el XML. Cotización y notas de venta sí.
 */
export function imprimeDetalleAdicional(tipoDoc: unknown): boolean {
    return !['01', '03', '07', '08'].includes(String(tipoDoc ?? ''));
}
