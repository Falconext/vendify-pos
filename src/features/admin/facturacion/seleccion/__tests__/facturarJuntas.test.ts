import { lineasDeNotas, motivoNoFacturar, notaDeVentaDataConjunta, precioExactoDeLinea } from '../facturarJuntas';
import type { NotaElegida } from '../seleccionNotas';

const det = (x: any) => ({ productoId: 8415, descripcion: 'YOGURT', cantidad: 1, mtoPrecioUnitario: 11, unidad: 'NIU', ...x });
const nota = (id: number, x: Partial<NotaElegida> = {}, origen: any = {}): NotaElegida => ({
    id, documento: `NV01-000000${id}`, tipoDoc: 'NV', clienteId: 173, cliente: 'DELGADO REVILLA, JAMILY', telefono: '',
    total: 22, saldo: 0, moneda: 'PEN', fecha: `2026-10-${10 + id}T10:00:00Z`, nroDoc: '47065478', convertidoA: null,
    origen: { id, clienteId: 173, cliente: { id: 173, nombre: 'DELGADO' }, detalles: [det({ cantidad: 2 })], medioPago: 'EFECTIVO', formaPagoTipo: 'Contado', tipoMoneda: 'PEN', ...origen },
    ...x,
});

describe('facturar varias notas juntas', () => {
    it('pide 2+ notas, mismo cliente, moneda, sin convertir, y RUC para factura', () => {
        expect(motivoNoFacturar([nota(1)], 'BOLETA')).toMatch(/al menos 2/);
        expect(motivoNoFacturar([nota(1), nota(2, { clienteId: 9 })], 'BOLETA')).toMatch(/mismo cliente/);
        expect(motivoNoFacturar([nota(1), nota(2, { moneda: 'USD' })], 'BOLETA')).toMatch(/dólares/);
        expect(motivoNoFacturar([nota(1), nota(2, { convertidoA: 'B001-00000007' })], 'BOLETA')).toMatch(/NV01-2 ya está en B001-00000007/);
        // Sin RUC la factura NO se bloquea: el POS abre sin cliente para escribir el RUC.
        expect(motivoNoFacturar([nota(1), nota(2)], 'FACTURA')).toBeNull();
        expect(motivoNoFacturar([nota(1), nota(2)], 'BOLETA')).toBeNull();
    });

    it('suma el mismo producto al mismo precio y deja aparte lo distinto', () => {
        const l = lineasDeNotas([
            nota(1, {}, { detalles: [det({ cantidad: 2 }), det({ productoId: 99, descripcion: 'PAN', mtoPrecioUnitario: 1 })] }),
            nota(2, {}, { detalles: [det({ cantidad: 3 }), det({ cantidad: 1, mtoPrecioUnitario: 10 }), det({ productoId: null, descripcion: 'FLETE', mtoPrecioUnitario: 5 })] }),
        ]);
        expect(l.map((x) => [x.descripcion, x.cantidad, x.precioUnitario])).toEqual([
            ['YOGURT', 5, 11], ['PAN', 1, 1], ['YOGURT', 1, 10], ['FLETE', 1, 5],
        ]);
    });

    it('arma el cobro con la suma de las notas, la más antigua primero', () => {
        const d = notaDeVentaDataConjunta([
            nota(5, { total: 33, saldo: 23 }, { observaciones: 'Entregar martes' }),
            nota(3, { total: 22, saldo: 0 }),
        ]);
        expect(d.origenComprobanteId).toBe(3);
        expect(d.origenComprobanteIds).toEqual([3, 5]);
        expect(d.origenReferencia).toBe('NV01-3, NV01-5');
        expect(d).toMatchObject({ mtoImpVenta: 55, saldo: 23, estadoPago: 'PAGO_PARCIAL', formaPagoTipo: 'Contado' });
        expect(d.observaciones).toBe('Notas: NV01-3, NV01-5\nEntregar martes');
        expect(d.productos).toHaveLength(1);
        expect(d.productos[0].cantidad).toBe(4);
    });

    it('factura con cliente sin RUC: el POS abre sin cliente; con RUC, lo lleva', () => {
        const sinRuc = notaDeVentaDataConjunta([nota(1), nota(2)], 'FACTURA');
        expect(sinRuc.cliente).toBeNull();
        expect(sinRuc.clienteId).toBeNull();
        const conRuc = notaDeVentaDataConjunta([nota(1, { nroDoc: '20601811333' }), nota(2, { nroDoc: '20601811333' })], 'FACTURA');
        expect(conRuc.clienteId).toBe(173);
        expect(notaDeVentaDataConjunta([nota(1), nota(2)], 'BOLETA').clienteId).toBe(173);
    });

    it('hereda el crédito solo si todas eran a crédito', () => {
        const a = notaDeVentaDataConjunta([nota(1, { saldo: 22 }, { formaPagoTipo: 'Credito', fechaVencimientoCredito: '2026-11-01' }), nota(2, { saldo: 22 }, { formaPagoTipo: 'Credito', fechaVencimientoCredito: '2026-11-15' })]);
        expect(a.formaPagoTipo).toBe('Credito');
        expect(a.fechaVencimientoCredito).toBe('2026-11-15');
        const b = notaDeVentaDataConjunta([nota(1, { saldo: 22 }, { formaPagoTipo: 'Credito' }), nota(2)]);
        expect(b.formaPagoTipo).toBe('Contado');
    });
});

describe('el total de la boleta cuadra con el de la nota', () => {
    it('un six-pack guardado a 8.33 × 6 se rearma a 8.3333 (S/ 50.00, no 49.98)', () => {
        const det = { cantidad: 6, mtoPrecioUnitario: 8.33, mtoValorVenta: 42.37, igv: 7.63 };
        expect(precioExactoDeLinea(det)).toBe(8.3333);
        const [l] = lineasDeNotas([{ ...nota(1), origen: { detalles: [{ productoId: 5, descripcion: 'SIXPACK', unidad: 'NIU', ...det }] } }]);
        expect(Math.round(l.cantidad * l.precioUnitario * 100) / 100).toBe(50);
    });
    it('si el precio ya cuadra, no lo toca', () => {
        expect(precioExactoDeLinea({ cantidad: 1, mtoPrecioUnitario: 8, mtoValorVenta: 6.78, igv: 1.22 })).toBeNull();
    });
});
