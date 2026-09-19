/**
 * QA del "Simulador de Rentabilidad Diaria" (Análisis Financiero Avanzado):
 * la ganancia por unidad debe calcularse CON IGV (misma base que el Resumen de
 * Margen). Caso real NAVILOOK: precio 35, costo 17, regalo/envío 3.5 → 14.50.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: jest.fn() } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: Object.assign(() => ({ alert: jest.fn() }), { getState: () => ({ alert: jest.fn() }) }) }));
jest.mock('@/services/tipoCambio.service', () => ({ tipoCambioService: { obtenerHoy: jest.fn(() => Promise.resolve(null)), getHoy: jest.fn(() => Promise.resolve(null)) } }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/BarcodeScannerInput', () => ({ BarcodeScannerInput: () => null }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/InputPro', () => ({ __esModule: true, default: (p: any) => <input name={p.name} value={p.value ?? ''} onChange={p.onChange} readOnly={!p.onChange} /> }));
jest.mock('../ProductStockManager', () => ({ ProductStockManager: () => null }));
jest.mock('../ProductSedesDisponibles', () => ({ ProductSedesDisponibles: () => null }));
jest.mock('../ProductVariantsManager', () => ({ ProductVariantsManager: () => null }));
jest.mock('../ProductFinancialAnalysis', () => ({ ProductFinancialAnalysis: () => null }));
jest.mock('../ProductPriceListsPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('../../useProductModalViewModel', () => ({ useProductModalViewModel: () => ({}) }));

import { ProductBasicForm } from '../ProductBasicForm';

const noop = () => {};
const baseVm = (formValues: any) => new Proxy({
    isFarmacia: false, esDrogueria: false, esFarmaceutico: false, isFabricacion: false, isRestaurante: false, isMobile: false, isEdit: true,
    features: {}, labels: {},
    productSections: { analisisAvanzado: true, codigos: false, fichaComputo: false, seriesGarantia: false, localizacion: false, ecommerce: false },
    formValues, errors: {}, unitOfMeasure: [], categories: [], brands: [], gruposModificadores: [], gruposSeleccionados: [],
    isCategorizing: false, tieneGestionProvisiones: false, tieneTienda: false, tieneGestionLotes: false,
    handleChange: noop, handleChangeSelect: noop, handleAutoCategorize: noop, handlePrecioUnitarioBlur: noop,
    setShowMedicamentoModal: noop, setShowLotesModal: noop, toggleGrupoSeleccionado: noop, setFormValues: noop, addCategory: noop, addBrand: noop,
    generandoCodigoBarras: false, generarCodigoBarras: noop,
} as any, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && /^(set|handle|toggle|add|generar|on)/.test(k) ? noop : undefined)) });

const abrirSimulador = () => fireEvent.click(screen.getByText('Análisis Financiero Avanzado'));
const fila = (label: string) => screen.getByText(label).parentElement!.textContent!.replace(/\s+/g, ' ');

describe('Simulador de Rentabilidad (con IGV)', () => {
    it('NAVILOOK: 35 / 17 / 3.5 → ganancia 14.50 y muestra precio y costo con IGV', () => {
        // costoUnitario se guarda NETO (17 con IGV → 14.4068)
        render(<ProductBasicForm vm={baseVm({ precioUnitario: 35, costoUnitario: 14.4068, costoFijo: 3.5, tipoAfectacionIGV: '10' })} />);
        abrirSimulador();
        expect(fila('Precio de venta (con IGV)')).toContain('S/ 35.00');
        expect(fila('Costo del producto (con IGV)')).toContain('S/ 17.00');
        expect(fila('Regalo / envío')).toContain('S/ 3.50');
        expect(fila('Ganancia sin ads')).toContain('S/ 14.50');
    });

    it('coincide con el Resumen de Margen: 50 / 20 → 30.00', () => {
        render(<ProductBasicForm vm={baseVm({ precioUnitario: 50, costoUnitario: 16.9492, tipoAfectacionIGV: '10' })} />);
        abrirSimulador();
        expect(fila('Ganancia sin ads')).toContain('S/ 30.00');
    });

    it('exonerado (afectación 20): no toca IGV → 14.50', () => {
        render(<ProductBasicForm vm={baseVm({ precioUnitario: 35, costoUnitario: 17, costoFijo: 3.5, tipoAfectacionIGV: '20' })} />);
        abrirSimulador();
        expect(fila('Costo del producto (con IGV)')).toContain('S/ 17.00');
        expect(fila('Ganancia sin ads')).toContain('S/ 14.50');
    });

    it('proyección diaria: 10 u/día y S/50 de ads → +95.00/día y CPA 5.00', () => {
        render(<ProductBasicForm vm={baseVm({ precioUnitario: 35, costoUnitario: 14.4068, costoFijo: 3.5, tipoAfectacionIGV: '10' })} />);
        abrirSimulador();
        fireEvent.change(screen.getByPlaceholderText('Ej: 10'), { target: { value: '10' } });
        fireEvent.change(screen.getByPlaceholderText('Ej: 100'), { target: { value: '50' } });
        expect(screen.getByText('¡Estás ganando!')).toBeInTheDocument();
        expect(screen.getByText(/\+ S\/ 95\.00/)).toBeInTheDocument();
        expect(fila('CPA (costo por venta)')).toContain('S/ 5.00');
        expect(screen.getByText('Ingresos (10 × S/35.00)')).toBeInTheDocument();
    });
});
