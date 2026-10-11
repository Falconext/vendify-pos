/**
 * "Acepto pedidos de productos agotados" (Tienda Virtual → Configuración).
 *
 * El negocio que trabaja por encargo no quiere que su tienda le tape los
 * productos: prefiere recibir el pedido y reponer después. Cuando ese ajuste
 * está activo, el stock deja de ser un freno y nunca se pinta "Agotado".
 *
 * El dato vive en la tienda (`tiendaVentaSinStock`), pero quien decide pintar
 * "Agotado" suele ser una tarjeta de producto que solo recibe el producto, sin
 * la tienda. Pasar la tienda por props hasta cada tarjeta de las 31 plantillas
 * sería mucho cableado frágil, así que se guarda aquí, en el módulo, apenas
 * llega la respuesta de la tienda.
 *
 * Esto es seguro porque el valor solo cambia junto con un `setTienda(...)`: ese
 * cambio de estado vuelve a renderizar el árbol y las tarjetas recalculan con
 * el valor nuevo. No hay forma de que una tarjeta quede pintada con el valor
 * anterior.
 *
 * El navegador no es la autoridad: el backend aplica la misma regla al crear el
 * pedido (`tienda.service.ts`), así que esto es presentación, no permiso.
 */

let aceptaPedidosAgotados = false;

/**
 * Registra la política de la tienda recién cargada y devuelve la misma tienda,
 * para poder envolver la llamada: `setTienda(recordarVentaSinStock(store))`.
 */
export function recordarVentaSinStock<T>(tienda: T): T {
  aceptaPedidosAgotados = Boolean((tienda as any)?.tiendaVentaSinStock);
  return tienda;
}

/** ¿Esta tienda recibe pedidos aunque no haya stock? */
export function aceptaVentaSinStock(): boolean {
  return aceptaPedidosAgotados;
}

/**
 * ¿Hay que tratar este producto como agotado?
 *
 * `requerido` es cuántas unidades base consume la compra: una presentación de
 * "rollo de 12 m" necesita 12, no 1.
 */
export function sinStock(stock: unknown, requerido = 1): boolean {
  if (aceptaPedidosAgotados) return false;
  return Number(stock ?? 0) < Math.max(1, Number(requerido) || 1);
}

/**
 * Hasta cuántas unidades deja subir el selector de cantidad.
 *
 * Por encargo no hay tope: el cliente puede pedir 10 de algo que no está en
 * almacén. Sin stock conocido tampoco se topea (el botón de comprar ya está
 * bloqueado por `sinStock`, así que el número no es lo que frena).
 */
export function limiteCantidad(stock: unknown): number {
  if (aceptaPedidosAgotados) return Number.POSITIVE_INFINITY;
  const n = Number(stock ?? 0);
  return n > 0 ? n : Number.POSITIVE_INFINITY;
}

/**
 * ¿Mostrar el aviso de "¡Quedan pocas!"?
 *
 * Es un empujón de urgencia que solo tiene sentido cuando el almacén manda.
 * Por encargo no se muestra: no hay escasez que comunicar, y con stock 0 el
 * cartel diría "¡Quedan 0!", que es peor que no decir nada.
 */
export function pocasUnidades(stock: unknown, umbral = 5): boolean {
  if (aceptaPedidosAgotados) return false;
  const n = Number(stock ?? 0);
  return n > 0 && n <= umbral;
}
