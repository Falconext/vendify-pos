/**
 * Detalle multilínea bajo el título del ítem (cotización de servicios).
 *
 * Sale en cotización / nota de venta (A4 y ticket), en letra normal y una
 * línea por renglón. En factura/boleta no: el XML de SUNAT solo lleva el
 * título y la representación impresa no debe decir más que el XML.
 */
import { render } from '@testing-library/react';
import ComprobantePrintPage from '../comprobanteImprimir';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/zustand/auth', () => ({ useAuthStore: (sel: any) => sel({ sedeActiva: null }) }));
jest.mock('@/zustand/sedes', () => ({ useSedesStore: () => ({ sedes: [], listarSedes: jest.fn() }) }));
jest.mock('@/lib/branding', () => ({ BRAND: { name: 'Falconext', website: 'https://falconext.pe' } }));

const empresa = { razonSocial: 'PINTURAS SAC', ruc: '20607846147', rubro: { nombre: 'Servicios' } };
const item = {
    cantidad: 1,
    descripcion: 'Retiro de pintura de pared piso 6',
    detalleAdicional: 'Retiro de pintura antigua\nRaspado, lijado y eliminación de material suelto\nlimpieza',
    precioUnitario: 850,
    unidad: 'ZZ',
};

const pintar = (receipt: string, size: 'A4' | 'TICKET', tipoDoc?: string) =>
    render(
        <ComprobantePrintPage
            company={{ email: 'x@y.pe', empresa }}
            formValues={{ serie: 'COT1', correlativo: '1', fechaEmision: new Date().toISOString(), mtoImpVenta: 850, tipoDoc }}
            size={size}
            serie="COT1"
            correlative="1"
            receipt={receipt}
            productsInvoice={[item]}
            total="850"
            mode="off"
        />,
    );

describe.each([
    ['COTIZACIÓN', 'A4', 'COT'],
    ['COTIZACIÓN', 'TICKET', 'COT'],
    ['NOTA DE VENTA', 'A4', 'NV'],
] as const)('%s %s', (receipt, size, tipoDoc) => {
    it('imprime el título y debajo cada línea del detalle, tal cual (sin mayúsculas)', () => {
        const { container } = pintar(receipt, size, tipoDoc);
        const txt = container.textContent || '';
        const iTitulo = txt.indexOf('RETIRO DE PINTURA DE PARED PISO 6');
        expect(iTitulo).toBeGreaterThan(-1);
        expect(txt.indexOf('Retiro de pintura antigua')).toBeGreaterThan(iTitulo);
        expect(txt).toContain('Raspado, lijado y eliminación de material suelto');
        expect(txt).toContain('limpieza');
    });
});

describe.each([['FACTURA', '01'], ['BOLETA', '03']])('%s', (receipt, tipoDoc) => {
    it('no imprime el detalle (el XML de SUNAT solo lleva el título)', () => {
        const { container } = pintar(receipt, 'A4', tipoDoc);
        const txt = container.textContent || '';
        expect(txt).toContain('RETIRO DE PINTURA DE PARED PISO 6');
        expect(txt).not.toContain('Retiro de pintura antigua');
    });
});
