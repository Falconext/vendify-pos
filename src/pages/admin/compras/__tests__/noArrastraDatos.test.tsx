/**
 * Modales que siguen montados entre un documento y otro: al abrir de nuevo no
 * puede quedar nada del anterior (ver envioDeVenta.ts, mismo error en el POS).
 */
import * as fs from 'fs';
import * as path from 'path';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModalRegistrarPagoCompra from '../ModalRegistrarPagoCompra';
import { ModalRecetaMedica } from '../../facturacion/ModalRecetaMedica';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@iconify/react/dist/iconify.js', () => ({ Icon: () => null }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: () => null }));
jest.mock('@/zustand/compras', () => ({ useComprasStore: () => ({ registrarPagoCompra: jest.fn(), loading: false }) }));
jest.mock('@/services/tipoCambio.service', () => ({ tipoCambioService: { consultar: jest.fn().mockResolvedValue({ venta: 3.7, fecha: '2026-11-04' }) } }));
jest.mock('@/utils/fetch', () => ({ get: jest.fn().mockResolvedValue({ data: [] }), post: jest.fn() }));

const reabrir = (rerender: any, jsx: (abierto: boolean) => any) => { rerender(jsx(false)); rerender(jsx(true)); };

describe('pago de compra', () => {
    const modal = (abierto: boolean, compra: any) => <ModalRegistrarPagoCompra isOpen={abierto} compra={compra} onClose={() => {}} onSuccess={() => {}} />;
    it('el monto de la compra anterior no queda para la siguiente', () => {
        const a = { id: 1, saldo: 500, moneda: 'PEN' }; const b = { id: 2, saldo: 80, moneda: 'PEN' };
        const { rerender } = render(modal(true, a));
        const monto = () => document.querySelector('input[type="number"]') as HTMLInputElement;
        fireEvent.change(monto(), { target: { value: '500' } });
        expect(monto().value).toBe('500');
        rerender(modal(false, a)); rerender(modal(true, b));
        expect(monto().value).toBe('');
    });
});

describe('receta médica', () => {
    const modal = (abierto: boolean, item: any) => <ModalRecetaMedica isOpen={abierto} item={item} onConfirmar={() => {}} onCerrar={() => {}} />;
    const inputs = () => [...document.querySelectorAll('input')] as HTMLInputElement[];
    it('el paciente anterior no aparece en el siguiente ítem, y cada ítem conserva lo suyo', () => {
        const a = { descripcion: 'A', requiereReceta: true, controlado: true }; 
        const { rerender } = render(modal(true, a));
        fireEvent.change(inputs()[0], { target: { value: 'R-111' } });
        reabrir(rerender, (x) => modal(x, { descripcion: 'B', requiereReceta: true, controlado: true }));
        expect(inputs().every((i) => i.value === '')).toBe(true);
        reabrir(rerender, (x) => modal(x, { descripcion: 'A', requiereReceta: true, controlado: true, datosReceta: { numeroReceta: 'R-111' } }));
        expect(inputs().map((i) => i.value)).toContain('R-111');
    });
});

it('importar compras reinicia "marcar pagado" y "crear productos"', () => {
    const src = fs.readFileSync(path.join(__dirname, '../ModalImportarCompras.tsx'), 'utf8');
    const reset = src.slice(src.indexOf('const reset = () =>'), src.indexOf('const handleClose'));
    for (const s of ['setMarcarPagado(false)', 'setCrearProductos(false)', "setMetodoPago('EFECTIVO')", 'setIncluyeIgvDefault(true)']) expect(reset).toContain(s);
});

it('nueva compra reinicia la clasificación y la línea a medio cargar', () => {
    const src = fs.readFileSync(path.join(__dirname, '../ModalNuevaCompra.tsx'), 'utf8');
    const reset = src.slice(src.indexOf('// Reset form when modal opens'), src.indexOf('// Modo EDICIÓN: precargar'));
    for (const s of ['setEsGasto(null)', 'setCurrentItem(itemVacio)', 'setPkg(null)', 'setDistribuyendoIdx(null)']) expect(reset).toContain(s);
});
