import { afectacionDeDetalle, mapDetalleToInvoiceProduct } from '../comprobanteProductMapper';

/**
 * FRUTA PURA (Ley de Amazonía, 30-10): al convertir una nota de venta
 * exonerada a boleta, la línea salía gravada ('10') y SUNAT recibió IGV.
 */
describe('afectación al convertir un documento', () => {
  it('la línea de la nota exonerada sigue exonerada', () => {
    const linea = { productoId: 7, descripcion: 'IK. JALAPEÑO 30gr X6und', cantidad: 2, mtoPrecioUnitario: 25, tipAfeIgv: 20 };
    const m: any = mapDetalleToInvoiceProduct(linea);
    expect(m.tipoAfectacionIGV).toBe('20');
    expect(m.afectacionNombre).toBe('Exonerado');
  });

  it('sin afectación en la línea usa la del producto', () => {
    expect(afectacionDeDetalle({ producto: { tipoAfectacionIGV: '30' } })).toBe('30');
  });

  it('una línea gravada sigue gravada', () => {
    expect((mapDetalleToInvoiceProduct({ productoId: 1, tipAfeIgv: 10 }) as any).tipoAfectacionIGV).toBe('10');
  });

  it('sin ningún dato no inventa: decide quien llama', () => {
    const m: any = mapDetalleToInvoiceProduct({ productoId: 1, descripcion: 'X' });
    expect(m.tipoAfectacionIGV).toBeUndefined();
    expect(afectacionDeDetalle({})).toBeNull();
  });
});
