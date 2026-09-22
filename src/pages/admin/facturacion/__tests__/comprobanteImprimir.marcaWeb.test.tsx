/**
 * La web del sistema en el pie ("https://vendify.pe") tiene su propio interruptor
 * en Configurar formato (`marcaWeb`): hay negocios que quieren conservar
 * "Sistema punto de venta / Desarrollado por …" pero sin la URL impresa.
 * Apagar la marca completa sigue siendo Perfil → Configuración (mostrarMarcaSistema).
 */
import { render } from '@testing-library/react';
import ComprobantePrintPage from '../comprobanteImprimir';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/zustand/auth', () => ({ useAuthStore: (sel: any) => sel({ sedeActiva: null }) }));
jest.mock('@/lib/branding', () => ({ BRAND: { name: 'Vendify', website: 'https://vendify.pe' } }));

const empresaBase = {
  razonSocial: 'PROLACFER S.R.L.',
  nombreComercial: 'LACTEOS FERNANDEZ',
  ruc: '20615698432',
  direccion: 'CALLE DIGNIDAD MZ B',
  rubro: { nombre: 'Bodega y abarrotes' },
  celular: '990958750',
};

const renderTicket = (formato: Record<string, any>, extraEmpresa: Record<string, any> = {}) =>
  render(
    <ComprobantePrintPage
      company={{ email: 'lacteos@correo.com', empresa: { ...empresaBase, ...extraEmpresa, facturaFormatoConfig: formato } }}
      formValues={{ serie: 'F001', correlativo: '23', fechaEmision: new Date().toISOString(), tipoDoc: '01', mtoImpVenta: 30.9, subTotal: 26.19, mtoIGV: 4.71 }}
      size="TICKET"
      serie="F001"
      correlative="23"
      productsInvoice={[{ cantidad: 1, unidad: 'UNIDAD', descripcion: 'DAMBO', precioUnitario: 30, total: 30.9 }]}
      total="30.90"
      mode="preview"
      receipt="FACTURA"
      selectedClient={{ nombre: 'HIYAKU FOODS S.A.C.', nroDoc: '20615248992' }}
      totalInWords="TREINTA CON 90/100 SOLES"
      observation=""
      includeProductImages={false}
    />,
  );

describe('ticket: interruptor propio de la web del sistema', () => {
  it('por defecto NO imprime la web del sistema, pero sí el resto de la marca', () => {
    const html = renderTicket({}).container.innerHTML;
    expect(html).toContain('Sistema punto de venta');
    expect(html).toContain('Desarrollado por');
    expect(html).not.toContain('https://vendify.pe');
  });

  it('encender "Web del sistema" vuelve a imprimir la URL', () => {
    const html = renderTicket({ marcaWeb: { visible: true } }).container.innerHTML;
    expect(html).toContain('Sistema punto de venta');
    expect(html).toContain('https://vendify.pe');
  });

  it('apagar la marca del sistema (Perfil) sigue quitando las tres líneas', () => {
    const html = renderTicket({}, { mostrarMarcaSistema: false }).container.innerHTML;
    expect(html).not.toContain('Sistema punto de venta');
    expect(html).not.toContain('Desarrollado por');
    expect(html).not.toContain('https://vendify.pe');
  });

  it('nombre comercial y rubro se pueden apagar por separado', () => {
    const conTodo = renderTicket({}).container.innerHTML;
    // El nombre comercial se imprime SIN la etiqueta "NOMBRE COMERCIAL:" (pedido del cliente).
    expect(conTodo).toContain('LACTEOS FERNANDEZ');
    expect(conTodo).not.toContain('NOMBRE COMERCIAL:');
    expect(conTodo).toContain('RUBRO: BODEGA Y ABARROTES');
    const sinEllos = renderTicket({ nombreComercial: { visible: false }, rubro: { visible: false } }).container.innerHTML;
    expect(sinEllos).not.toContain('LACTEOS FERNANDEZ');
    expect(sinEllos).not.toContain('RUBRO:');
  });
});
