/**
 * WAWABB (02-11): escribió "W138PAR750M" en "Producto filtrado" y apretó
 * Buscar sin elegir de la lista. El filtro se ignoraba sin avisar y salían los
 * movimientos de todos los productos.
 */
import { renderHook, act } from '@testing-library/react';
import { useMovementsViewModel } from '../useMovementsViewModel';
import { useKardexStore } from '@/zustand/kardex';
import { useProductsStore } from '@/zustand/products';

jest.mock('@/zustand/kardex', () => ({ useKardexStore: jest.fn() }));
jest.mock('@/zustand/products', () => ({ useProductsStore: jest.fn() }));
const alertMock = jest.fn();
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: jest.fn(() => ({ alert: alertMock })) }));

const getKardex = jest.fn();
const usarProductos = (products: any[]) =>
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ products, getAllProducts: jest.fn() });

beforeEach(() => {
    jest.clearAllMocks();
    (useKardexStore as unknown as jest.Mock).mockReturnValue({ kardex: { movimientos: [], paginacion: { total: 0 } }, loading: false, getKardex, exportKardex: jest.fn() });
});

const escribir = (result: any, texto: string) =>
    act(() => { result.current.actions.handleProductSearchChange({ target: { value: texto } } as any); });

describe('producto escrito sin elegir', () => {
    it('si el código coincide exacto, Buscar lo elige y filtra por él', () => {
        usarProductos([
            { id: 12733, codigo: 'W138PAR70XS', descripcion: 'Pantalon XS' },
            { id: 12734, codigo: 'W138PAR750M', descripcion: 'Pantalon rosadas M' },
        ]);
        const { result } = renderHook(() => useMovementsViewModel());
        escribir(result, 'w138par750m');
        getKardex.mockClear();
        act(() => { result.current.actions.applyFilters(); });
        expect(result.current.filters.productoId).toBe('12734');
        expect(getKardex).toHaveBeenLastCalledWith(expect.objectContaining({ productoId: '12734' }));
    });

    it('si no hay cómo saber cuál es, avisa y no muestra todo', () => {
        usarProductos([{ id: 1, codigo: 'A1' }, { id: 2, codigo: 'A2' }]);
        const { result } = renderHook(() => useMovementsViewModel());
        escribir(result, 'pantalon');
        getKardex.mockClear();
        act(() => { result.current.actions.applyFilters(); });
        expect(alertMock).toHaveBeenCalledWith(expect.stringMatching(/Elige el producto/), 'warning');
        expect(getKardex).not.toHaveBeenCalled();
    });

    it('cambiar el texto suelta el producto elegido antes', () => {
        usarProductos([{ id: 12734, codigo: 'W138PAR750M' }]);
        const { result } = renderHook(() => useMovementsViewModel());
        act(() => { result.current.actions.selectProduct({ id: 12734, codigo: 'W138PAR750M', descripcion: 'x' }); });
        expect(result.current.filters.productoId).toBe('12734');
        escribir(result, 'W138PAR700M');
        expect(result.current.filters.productoId).toBe('');
    });
});
