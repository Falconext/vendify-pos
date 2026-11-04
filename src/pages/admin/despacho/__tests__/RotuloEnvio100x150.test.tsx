/**
 * Rótulo 100×150: tamaño fijo, datos según destino (agencia o reparto) y
 * nada de saltar a una segunda etiqueta por exceso de contenido.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RotuloEnvio100x150, { logoSrc } from '../RotuloEnvio100x150';
import { guardarRotuloFormato, leerRotuloFormato, rotuloPageStyle } from '../rotuloFormato';
import type { DatosRotulo } from '../RotuloTicket';

const base: DatosRotulo = {
    nroOrden: null, claveOrden: null, nombreDestinatario: 'ORTEGA ROLDAN, DIEGO JESUS', dniDestinatario: '47065472',
    ubicacion: '', agenciaNombre: '', direccion: '', celular: '991065217', empresaNombre: 'DEMENVER IMPORT S.A.C.',
    referencia: 'NV01-00000450', fecha: '2026-11-04T15:00:00.000Z',
};

it('agencia: destino, orden y clave, sin monto; tamaño y salto de página fijos', () => {
    render(<RotuloEnvio100x150 saltoDePagina courier="Shalom PRO" d={{ ...base, destino: 'AGENCIA', agenciaNombre: 'CUSCO PARQUE INDUSTRIAL', ubicacion: 'CUSCO - CUSCO - CUSCO', nroOrden: '96696478', claveEnvio: '1010', porCobrar: null }} />);
    const el = screen.getByTestId('rotulo-100x150');
    expect(el).toHaveStyle({ width: '100mm', height: '150mm', overflow: 'hidden', pageBreakAfter: 'always' });
    expect(el).toHaveTextContent('Entregar a');
    expect(screen.getByTestId('rotulo-100x150-destino')).toHaveTextContent('CUSCO PARQUE INDUSTRIAL');
    expect(screen.getByTestId('rotulo-100x150-orden')).toHaveTextContent('96696478');
    expect(screen.getByTestId('rotulo-100x150-orden')).toHaveTextContent('1010');
    expect(screen.getByTestId('rotulo-100x150-courier')).toHaveTextContent('Shalom PRO');
    expect(screen.queryByTestId('rotulo-100x150-cobrar')).toBeNull();
});

it('reparto: dirección y por cobrar, o pagado', () => {
    const { rerender } = render(<RotuloEnvio100x150 d={{ ...base, destino: 'LOCAL', direccion: 'Av. Los Olivos 123', distrito: 'Comas', porCobrar: 120.5 }} />);
    expect(screen.getByTestId('rotulo-100x150-destino')).toHaveTextContent('Av. Los Olivos 123');
    expect(screen.getByTestId('rotulo-100x150-cobrar')).toHaveTextContent(/POR COBRAR\s*S\/\s*120\.50/);
    rerender(<RotuloEnvio100x150 d={{ ...base, destino: 'LOCAL', direccion: 'Av. Los Olivos 123', porCobrar: 0 }} />);
    expect(screen.getByTestId('rotulo-100x150-cobrar')).toHaveTextContent('PAGADO');
});

it('con muchos productos resume y no se sale de la etiqueta', () => {
    const productos = Array.from({ length: 9 }, (_, i) => ({ descripcion: `Producto ${i + 1}`, cantidad: 2 }));
    render(<RotuloEnvio100x150 d={{ ...base, destino: 'LOCAL', direccion: 'Jr. Lima 1', productos }} />);
    const lista = screen.getByTestId('rotulo-100x150-productos');
    expect(lista).toHaveTextContent('9 productos · 18 unidades');
    expect(lista).toHaveTextContent('Producto 5');
    expect(lista).not.toHaveTextContent('Producto 6');
    expect(lista).toHaveTextContent('+ 4 productos más');
});

it('el documento de relleno de clientes varios no se imprime', () => {
    const { rerender } = render(<RotuloEnvio100x150 d={{ ...base, destino: 'LOCAL', direccion: 'Jr. Lima 1', dniDestinatario: '10000000' }} />);
    expect(screen.getByTestId('rotulo-100x150')).not.toHaveTextContent('DNI');
    rerender(<RotuloEnvio100x150 d={{ ...base, destino: 'LOCAL', direccion: 'Jr. Lima 1', dniDestinatario: '47065472' }} />);
    expect(screen.getByTestId('rotulo-100x150')).toHaveTextContent('DNI 47065472');
});

it('el código de barras lleva la nota sin ceros de relleno', () => {
    render(<RotuloEnvio100x150 d={{ ...base, destino: 'LOCAL', direccion: 'Jr. Lima 1' }} />);
    expect(screen.getByTestId('rotulo-100x150-barras')).toHaveAttribute('aria-label', 'Código NV01-450');
    expect(screen.getByTestId('rotulo-100x150-referencia')).toHaveTextContent('NV01-450');
});

it('el formato se recuerda y define el @page; el logo acepta URL o base64', () => {
    guardarRotuloFormato(70, 'ETIQUETA_100X150');
    expect(leerRotuloFormato(70)).toBe('ETIQUETA_100X150');
    expect(rotuloPageStyle('ETIQUETA_100X150')).toContain('size: 100mm 150mm');
    expect(rotuloPageStyle('ETIQUETA_80X50')).toContain('size: 80mm 50mm');
    expect(rotuloPageStyle('TICKET')).toBeNull();
    expect(logoSrc('https://x.com/l.png')).toBe('https://x.com/l.png');
    expect(logoSrc('iVBORw0')).toBe('data:image/png;base64,iVBORw0');
    expect(logoSrc(null)).toBeUndefined();
});
