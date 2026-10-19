/**
 * Convertir una Nota de Venta en factura con ÍTEMS LIBRES.
 *
 * El caso real: la NV NVA1-99 de EQUIPOS & MAQUINARIAS (empresa 51) traía
 * cuatro ítems libres —"Combo Doncheng 20v", "Taladro de banco machint",
 * "Pistola de calor total 2000 Watts", "Sopladora total 800 Watts"— en las
 * líneas 11240 a 11243. Al convertirla, el POS mandó esos ids de LÍNEA como
 * productoId; cayeron sobre productos de la empresa 44 (otra ferretería) y la
 * emisión se rechazó con "Productos encontrados pero inactivos: ID 11240
 * (CAVADORA CON MANGO DE METAL TRUPER)". Los nombres del error eran del
 * catálogo ajeno, no de la venta: por eso el mensaje no tenía sentido.
 *
 * Lo que más importa acá es que un ítem libre llegue al backend con
 * productoId null: si llega con un id, o rechaza la emisión (id de otra
 * empresa) o — peor, y solo por suerte no pasó — factura un producto ajeno a
 * la venta y le descuenta el stock sin que nadie se entere.
 */
import { mapDetalleToInvoiceProduct } from '../comprobanteProductMapper';

describe('Ítem libre al convertir una nota de venta', () => {
  const itemLibre = {
    id: 11240, // PK de DetalleComprobante, NO de producto
    comprobanteId: 4546, // NV NVA1-99
    productoId: null,
    producto: null,
    descripcion: 'Combo Doncheng 20v',
    unidad: 'NIU',
    cantidad: 1,
    mtoPrecioUnitario: 85,
    tipAfeIgv: 10,
  };

  it('no usa el id de la línea como productoId', () => {
    // Es el defecto reportado: antes esto daba 11240, el id de la línea.
    expect(mapDetalleToInvoiceProduct(itemLibre).productoId).toBeNull();
  });

  it('tampoco lo filtra por el campo `id` del carrito', () => {
    // El payload final resuelve `item.productoId || item.id`: si `id` se
    // quedaba con 11240, el arreglo anterior no servía de nada.
    expect(mapDetalleToInvoiceProduct(itemLibre).id).toBeNull();
  });

  it('lo marca como ítem libre y conserva su unidad', () => {
    const m = mapDetalleToInvoiceProduct(itemLibre);
    expect(m.esItemLibre).toBe(true);
    // Sin esto el backend cae a 'ZZ' y reemite el producto como servicio.
    expect(m.unidadMedidaCodigo).toBe('NIU');
  });

  it('respeta la afectación de IGV de la nota, no la fuerza a gravada', () => {
    const exonerado = { ...itemLibre, tipAfeIgv: 20 };
    expect(mapDetalleToInvoiceProduct(exonerado).tipoAfectacionIGV).toBe('20');
  });

  it('sobrevive al doble mapeo (la navegación ya manda detalles mapeados)', () => {
    const unaVez = mapDetalleToInvoiceProduct(itemLibre);
    expect(mapDetalleToInvoiceProduct(unaVez).productoId).toBeNull();
  });
});

describe('Línea con producto de catálogo', () => {
  const conProducto = {
    id: 11241,
    productoId: 4821,
    producto: { id: 4821, descripcion: 'HIDROLAVADORA BICAF PORTATIL', stock: 7, estado: 'ACTIVO' },
    descripcion: 'HIDROLAVADORA BICAF PORTATIL',
    unidad: 'NIU',
    cantidad: 1,
    mtoPrecioUnitario: 22,
    tipAfeIgv: 10,
  };

  it('sigue resolviendo el productoId real', () => {
    const m = mapDetalleToInvoiceProduct(conProducto);
    expect(m.productoId).toBe(4821);
    expect(m.id).toBe(4821);
    expect(m.esItemLibre).toBeUndefined();
  });

  it('toma el productoId suelto cuando no viene la relación `producto`', () => {
    const sinRelacion = { ...conProducto, producto: null };
    expect(mapDetalleToInvoiceProduct(sinRelacion).productoId).toBe(4821);
  });
});
