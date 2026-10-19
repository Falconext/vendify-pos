/**
 * El panel que abre el desglose por talla.
 *
 * Prueba el componente real: que muestre una fila por combinación, que los
 * números sean los de la sede correcta y que la columna por sede solo aparezca
 * cuando el negocio tiene más de una tienda.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ModalStockVariantes from '../components/ModalStockVariantes';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

let sedesMock: any[] = [];
jest.mock('@/zustand/sedes', () => ({
    useSedesStore: (selector: any) => selector({ sedes: sedesMock }),
}));

const BOTA = {
    id: 1,
    descripcion: 'BOTA ALTA RONDINI',
    opcionesAtributos: [
        { nombre: 'Color', valores: ['Negro', 'Rojo'] },
        { nombre: 'Talla', valores: ['S', 'M'] },
    ],
    variantes: [
        { id: 11, codigo: 'PR018-NEGR-S', estado: 'ACTIVO', valoresAtributos: { Color: 'Negro', Talla: 'S' }, stock: 10, stocks: [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }] },
        { id: 12, codigo: 'PR018-NEGR-M', estado: 'ACTIVO', valoresAtributos: { Color: 'Negro', Talla: 'M' }, stock: 10, stocks: [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }] },
        { id: 13, codigo: 'PR018-ROJO-M', estado: 'ACTIVO', valoresAtributos: { Color: 'Rojo', Talla: 'M' }, stock: 14, stocks: [{ sedeId: 1, stock: 8 }, { sedeId: 2, stock: 6 }] },
        { id: 14, codigo: 'PR018-ROJO-S', estado: 'ACTIVO', valoresAtributos: { Color: 'Rojo', Talla: 'S' }, stock: 0, stocks: [{ sedeId: 1, stock: 0 }, { sedeId: 2, stock: 0 }] },
    ],
};

beforeEach(() => { sedesMock = [{ id: 1, nombre: 'PRINCIPAL' }, { id: 2, nombre: 'SURCO' }]; });

describe('El panel de stock por talla', () => {
    it('sin producto no renderiza nada', () => {
        const { container } = render(<ModalStockVariantes producto={null} onClose={jest.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('muestra las columnas Color y Talla, en ese orden', () => {
        render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} />);
        const encabezados = screen.getAllByRole('columnheader').map((c) => c.textContent);
        expect(encabezados.slice(0, 2)).toEqual(['Color', 'Talla']);
    });

    it('lista una fila por combinación con su código', () => {
        render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} />);
        expect(screen.getByText('PR018-NEGR-S')).toBeInTheDocument();
        expect(screen.getByText('PR018-ROJO-M')).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(5); // 4 filas + encabezado
    });

    it('el resumen dice cuántas combinaciones hay y cuántas sin stock', () => {
        render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} />);
        expect(screen.getByText(/4 combinaciones/)).toBeInTheDocument();
        expect(screen.getByText(/34 en total/)).toBeInTheDocument();
        expect(screen.getByText(/1 sin stock/)).toBeInTheDocument();
    });

    it('con una sede seleccionada muestra el stock DE esa sede', () => {
        // La roja M tiene 14 en total pero solo 8 en PRINCIPAL. Mostrar 14 haría
        // que la vendedora prometa pares que no tiene en su tienda.
        const { rerender } = render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} sedeId={1} />);
        expect(screen.getByText(/28 en total/)).toBeInTheDocument();
        rerender(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} sedeId={2} />);
        expect(screen.getByText(/6 en total/)).toBeInTheDocument();
    });

    it('con varias sedes agrega una columna por sede', () => {
        render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} />);
        const encabezados = screen.getAllByRole('columnheader').map((c) => c.textContent);
        expect(encabezados).toContain('PRINCIPAL');
        expect(encabezados).toContain('SURCO');
    });

    it('con una sola sede NO agrega columnas que no aportan', () => {
        sedesMock = [{ id: 1, nombre: 'PRINCIPAL' }];
        render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} />);
        expect(screen.getAllByRole('columnheader').map((c) => c.textContent))
            .not.toContain('PRINCIPAL');
    });

    it('filtrando por sede tampoco repite las columnas por sede', () => {
        render(<ModalStockVariantes producto={BOTA} onClose={jest.fn()} sedeId={1} />);
        expect(screen.getAllByRole('columnheader').map((c) => c.textContent))
            .not.toContain('SURCO');
    });
});
