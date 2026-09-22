/**
 * Ticket 80mm de una Nota de Venta pagada con Yape: la línea "Cuenta:" imprime la
 * etiqueta guardada en paymentDetails (alias de la cuenta, sin "0-29" de un slice
 * de cuenta con guiones) y las observaciones son las de ESA venta.
 */
import { render } from '@testing-library/react';
import ComprobantePrintPage from '../comprobanteImprimir';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/zustand/auth', () => ({ useAuthStore: (sel: any) => sel({ sedeActiva: null }) }));
jest.mock('@/zustand/sedes', () => ({ useSedesStore: () => ({ sedes: [], listarSedes: jest.fn() }) }));
jest.mock('@/lib/branding', () => ({ BRAND: { name: 'Krezka', website: 'https://krezka.com' } }));

const empresa = {
  razonSocial: 'OWENSOFT PERU E.I.R.L.', nombreComercial: 'OWENSOFT PERU E.I.R.L.', ruc: '20607353795',
  direccion: 'PRO. TACNA NRO. 118', rubro: { nombre: 'Ventas' }, celular: '952957056',
  cuentasBancarias: [{ banco: 'BCP', alias: 'Titular: OwenSoft Peru Eirl', moneda: 'PEN', numeroCuenta: '191-1234567-0-29', cci: '' }],
};

it('ticket NV con Yape: Cuenta = alias guardado y observaciones de la venta', () => {
  const { container } = render(
    <ComprobantePrintPage
      company={{ email: 'x@x.com', empresa }}
      formValues={{
        serie: 'NV01', correlativo: '272', fechaEmision: new Date().toISOString(), tipoDoc: 'NV',
        mtoOperGravadas: 40.68, subTotal: 40.68, mtoIGV: 7.32, mtoImpVenta: 48, medioPago: 'YAPE',
        paymentDetails: { mode: 'SIMPLE', method: 'YAPE', amount: 48, cuentaBancariaId: 6, cuentaBancariaLabel: 'Titular: OwenSoft Peru Eirl' },
      }}
      size="TICKET"
      serie="NV01"
      correlative="272"
      productsInvoice={[{ cantidad: 1, unidad: 'UNIDAD', descripcion: 'CLEAN 10ML', precioUnitario: 18, total: 18 }]}
      total="48.00"
      mode="preview"
      receipt="NOTA DE VENTA"
      selectedClient={{ nombre: 'ELVIRA YULIZA FERRE FERRE', nroDoc: '0' }}
      totalInWords="CUARENTA Y OCHO CON 00/100 SOLES"
      observation="LICENCIA 1 AÑO"
      includeProductImages={false}
    />,
  );
  const texto = container.textContent || '';
  expect(texto).toContain('Cuenta: Titular: OwenSoft Peru Eirl');
  expect(texto).not.toMatch(/Eirl\s*0-29/);
  expect(texto).toContain('LICENCIA 1 AÑO');
});
