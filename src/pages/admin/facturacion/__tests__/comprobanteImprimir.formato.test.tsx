/**
 * El formato configurable de factura/boleta (Configurar formato → facturaFormatoConfig /
 * boletaFormatoConfig) debe aplicarse al layout A4 fiscal: visibilidad y tamaño de
 * cada elemento del modal. Antes solo se respetaban las filas de totales.
 */
import { render } from '@testing-library/react';
import ComprobantePrintPage from '../comprobanteImprimir';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
// El store de auth usa import.meta (Vite); solo se necesita la sede activa.
jest.mock('@/zustand/auth', () => ({ useAuthStore: (sel: any) => sel({ sedeActiva: null }) }));
jest.mock('@/lib/branding', () => ({ BRAND: { name: 'Krezka', website: 'https://krezka.com' } }));

const empresaBase = {
  razonSocial: 'DEMENVER IMPORT S.A.C.',
  nombreComercial: 'DEMENVER STORE',
  ruc: '20615715655',
  direccion: 'JR. C MZ. S LT. 6',
  rubro: { nombre: 'Bazar' },
  celular: '974282976',
  paginaWeb: 'www.demenver.com',
  cuentasBancarias: [{ banco: 'BCP', moneda: 'PEN', numeroCuenta: '191-123', cci: '002-191-123' }],
  yapeQrUrl: 'data:image/png;base64,AAA',
  yapeNumero: '999999999',
};

const renderFactura = (formato: Record<string, { visible?: boolean; size?: number }>, tipoDoc: '01' | '03' = '01') => {
  const key = tipoDoc === '03' ? 'boletaFormatoConfig' : 'facturaFormatoConfig';
  return render(
    <ComprobantePrintPage
      company={{ email: 'import@demenver.com', empresa: { ...empresaBase, [key]: formato } }}
      formValues={{
        serie: 'F001', correlativo: '1', fechaEmision: new Date().toISOString(), tipoDoc,
        mtoOperGravadas: 0, subTotal: 753.9, mtoIGV: 0, mtoOperExoneradas: 753.9, mtoImpVenta: 753.9,
        tipoDetraccion: { codigo: '001', descripcion: 'Azúcar', porcentaje: 10 }, montoDetraccion: 88.96,
      }}
      size="A4"
      serie="F001"
      correlative="1"
      productsInvoice={[{ cantidad: 1, unidad: 'UNIDAD', descripcion: 'Prod', precioUnitario: 753.9, total: 753.9 }]}
      total="753.90"
      mode="preview"
      receipt={tipoDoc === '03' ? 'BOLETA' : 'FACTURA'}
      selectedClient={{ nombre: 'CLIENTE', nroDoc: '20123456789' }}
      totalInWords="SETECIENTOS CINCUENTA Y TRES CON 90/100 SOLES"
      observation="OBS DE PRUEBA"
      includeProductImages={false}
    />,
  );
};

describe('formato configurable en factura/boleta A4', () => {
  it('sin configuración muestra todo (menos el QR de pago) y la razón social a 20px', () => {
    const { container } = renderFactura({});
    const html = container.innerHTML;
    expect(html).toContain('NOMBRE COMERCIAL: DEMENVER STORE');
    expect(html).toContain('JR. C MZ. S LT. 6');
    expect(html).toContain('>BAZAR<');
    expect(html).toContain('CELULAR: 974282976');
    expect(html).toContain('EMAIL: import@demenver.com');
    expect(html).toContain('WEB: www.demenver.com');
    expect(html).toContain('CLIENTE:');
    expect(html).toContain('FORMA PAGO:');
    expect(html).toContain('OPERACIÓN SUJETA A DETRACCIÓN');
    expect(html).toContain('SON: SETECIENTOS');
    expect(html).toContain('OBSERVACIONES:');
    expect(html).toContain('MONTO TOTAL:');
    expect(html).toContain('GRACIAS POR ELEGIR');
    expect(html).toContain('BCP'); // cuentas bancarias visibles por defecto
    expect(html).not.toContain('QR Yape'); // QR de pago oculto por defecto
    const h6 = container.querySelector('h6') as HTMLElement;
    expect(h6.textContent).toBe('DEMENVER IMPORT S.A.C.');
    expect(h6.style.fontSize).toBe('20px');
  });

  it('oculta cada elemento deseleccionado en el modal', () => {
    const hidden = { visible: false };
    const { container } = renderFactura({
      nombreComercial: hidden, direccion: hidden, rubro: hidden, celular: hidden, email: hidden, web: hidden,
      datosCliente: hidden, detraccion: hidden, sonTexto: hidden, observaciones: hidden,
      opExoneradas: hidden, icbper: hidden, montoTotal: hidden, cuentas: hidden, gracias: hidden, logo: hidden,
    });
    const html = container.innerHTML;
    expect(html).not.toContain('NOMBRE COMERCIAL');
    expect(html).not.toContain('JR. C MZ. S LT. 6');
    expect(html).not.toContain('>BAZAR<');
    expect(html).not.toContain('CELULAR:');
    expect(html).not.toContain('EMAIL: import@demenver.com');
    expect(html).not.toContain('WEB:');
    expect(html).not.toContain('CLIENTE:');
    expect(html).toContain('FORMA PAGO:'); // datos del comprobante siguen visibles
    expect(html).not.toContain('OPERACIÓN SUJETA A DETRACCIÓN');
    expect(html).not.toContain('SON: SETECIENTOS');
    expect(html).not.toContain('OBSERVACIONES:');
    expect(html).not.toContain('OP. EXONERADAS:');
    expect(html).not.toContain('ICBPER:');
    expect(html).not.toContain('MONTO TOTAL:');
    expect(html).not.toContain('BCP');
    expect(html).not.toContain('GRACIAS POR ELEGIR');
    expect(html).toContain('RUC: 20615715655'); // el cuadro del documento nunca se oculta
    expect(html).toContain('OP. GRAVADAS:');
  });

  it('oculta razón social, datos del comprobante y activa el QR de pago', () => {
    const { container } = renderFactura({
      razonSocial: { visible: false }, datosCotizacion: { visible: false }, qrPagos: { visible: true, size: 120 },
    });
    const html = container.innerHTML;
    expect(container.querySelector('h6')).toBeNull();
    expect(html).not.toContain('FORMA PAGO:');
    expect(html).toContain('CLIENTE:');
    const qr = container.querySelector('img[alt="QR Yape"]') as HTMLElement;
    expect(qr).not.toBeNull();
    expect(qr.style.width).toBe('120px');
  });

  it('aplica los tamaños configurados', () => {
    const { container } = renderFactura({
      razonSocial: { size: 14 }, direccion: { size: 9 }, sonTexto: { size: 22 }, montoTotal: { size: 24 }, logo: { size: 60 }, opGravadas: { size: 8 },
    });
    expect((container.querySelector('h6') as HTMLElement).style.fontSize).toBe('14px');
    const byText = (t: string) => Array.from(container.querySelectorAll<HTMLElement>('div')).find((d) => d.textContent === t) as HTMLElement;
    expect(byText('JR. C MZ. S LT. 6').style.fontSize).toBe('9px');
    expect(byText('SON: SETECIENTOS CINCUENTA Y TRES CON 90/100 SOLES').style.fontSize).toBe('22px');
    // Filas de totales: el div .justify-between cuyo texto empieza por la etiqueta.
    const fila = (t: string) => Array.from(container.querySelectorAll<HTMLElement>('div.justify-between')).find((d) => d.textContent?.startsWith(t)) as HTMLElement;
    expect(fila('MONTO TOTAL:').style.fontSize).toBe('24px');
    expect(fila('OP. GRAVADAS:').style.fontSize).toBe('8px');
  });

  it('la boleta usa boletaFormatoConfig y no facturaFormatoConfig', () => {
    const { container } = render(
      <ComprobantePrintPage
        company={{ email: 'x@y.com', empresa: { ...empresaBase, facturaFormatoConfig: { direccion: { visible: false } }, boletaFormatoConfig: { rubro: { visible: false } } } }}
        formValues={{ serie: 'B001', correlativo: '1', tipoDoc: '03', mtoImpVenta: 10, mtoOperGravadas: 10 }}
        size="A4" serie="B001" correlative="1" productsInvoice={[]} total="10.00" mode="preview" receipt="BOLETA"
        selectedClient={{ nombre: 'CLIENTE', nroDoc: '12345678' }} totalInWords="DIEZ CON 00/100 SOLES" observation="" includeProductImages={false}
      />,
    );
    const html = container.innerHTML;
    expect(html).toContain('JR. C MZ. S LT. 6'); // la dirección oculta en factura sí se ve en boleta
    expect(html).not.toContain('>BAZAR<'); // la línea de rubro oculta en boleta no se ve
  });
});
