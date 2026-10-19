const firstValue = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? null;

export const normalizeSerialsForCart = (value: any) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') return firstValue(item.numeroSerie, item.serie, item.codigo, item.valor, '');
        return String(item).trim();
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'string') return value.trim();
  return '';
};

export const getDetalleProductImage = (detalle: any) =>
  firstValue(
    detalle?.imagenUrl,
    detalle?.imagenUrlDisplay,
    detalle?.producto?.imagenUrlDisplay,
    detalle?.producto?.imagenUrl,
    detalle?.producto?.imagen,
    detalle?.producto?.imageUrl,
  );

export const getDetalleSerials = (detalle: any) =>
  normalizeSerialsForCart(firstValue(detalle?.numerosSerie, detalle?.series, detalle?.productoSeries));

export const mapDetalleToInvoiceProduct = (detalle: any) => {
  const producto = detalle?.producto || {};
  // OJO: `detalle.id` es la PK de DetalleComprobante, NO un id de producto.
  // Tenerlo en esta cadena hacía que un ÍTEM LIBRE (productoId null, sin
  // `producto`) saliera del mapper con el id de su propia línea. Al convertir
  // una Nota de Venta en factura, esa línea viajaba como productoId = 11240 y
  // el backend buscaba el producto 11240: si no era de la empresa, rechazaba
  // con "productos no encontrados"; y si por casualidad SÍ era uno suyo,
  // facturaba un producto equivocado y le descontaba el stock sin avisar.
  const productoId = Number(firstValue(producto?.id, detalle?.productoId) || 0);
  // Sin producto en catálogo la línea es un ítem libre: se mantiene en null
  // para que el backend la trate como tal (su rama `productoId == null`).
  const esItemLibre = !productoId;
  const precioUnitario = Number(firstValue(detalle?.mtoPrecioUnitario, detalle?.precioUnitario, detalle?.precioUnit, producto?.precioUnitario) || 0);
  const cantidad = Number(firstValue(detalle?.cantidad, detalle?.cantidadInicial) || 1);
  const imagenUrl = getDetalleProductImage(detalle);
  const numerosSerie = getDetalleSerials(detalle);

  return {
    ...detalle,
    id: productoId || null,
    productoId: productoId || null,
    ...(esItemLibre ? { esItemLibre: true } : {}),
    descripcion: firstValue(detalle?.descripcion, producto?.descripcion, 'Producto'),
    cantidad,
    cantidadInicial: cantidad,
    cantidadOriginal: cantidad,
    precioUnitario,
    descuento: Number(detalle?.descuento ?? 0),
    unidad: firstValue(detalle?.unidad, detalle?.unidadMedida, producto?.unidadMedida?.codigo, producto?.unidadMedida?.nombre, 'NIU'),
    unidadMedida: detalle?.unidadMedida || { nombre: firstValue(detalle?.unidad, producto?.unidadMedida?.nombre, 'NIU') },
    unidadMedidaNombre: firstValue(detalle?.unidad, detalle?.unidadMedida, producto?.unidadMedida?.nombre, 'NIU'),
    ...(esItemLibre
      ? {
          // El backend arma el ítem de servicio con `unidadVenta || unidad || 'ZZ'`:
          // sin esto, un producto externo vendido por unidad se reemitía como
          // servicio (ZZ). La afectación también se respeta, para no convertir
          // en gravada una línea que iba exonerada o inafecta.
          unidadMedidaCodigo: firstValue(detalle?.unidadVenta, detalle?.unidad, 'NIU'),
          tipoAfectacionIGV: String(
            firstValue(detalle?.tipoAfectacionIGV, detalle?.tipAfeIgv, '10'),
          ),
        }
      : {}),
    stock: Number(firstValue(producto?.stock, detalle?.stock, 999) || 999),
    estado: producto?.estado || detalle?.estado || 'ACTIVO',
    atributosTecnicos: firstValue(detalle?.atributosTecnicos, producto?.atributosTecnicos, undefined),
    imagenUrl,
    imagenUrlDisplay: firstValue(detalle?.imagenUrlDisplay, producto?.imagenUrlDisplay, imagenUrl),
    ...(numerosSerie ? { numerosSerie } : {}),
  };
};
