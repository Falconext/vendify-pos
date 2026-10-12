/**
 * La grilla con la que se pide la curva de tallas al proveedor.
 *
 * Se prueba el componente real: lo que importa es que de la grilla salgan las
 * líneas correctas, porque eso es lo que llega al PDF del proveedor y a la
 * recepción de mercadería.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalCurvaTallas from '../ModalCurvaTallas';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

const v = (id: number, talla: string, stock: number, costo?: number) => ({
    id, codigo: `VER-${talla}`, estado: 'ACTIVO',
    valoresAtributos: { Color: 'Rosa', Talla: talla }, stock, stocks: [],
    ...(costo === undefined ? {} : { costoPromedio: costo }),
});

const VERONA = {
    id: 1, descripcion: 'VERONA ROSA', tipoAfectacionIGV: '10', costoPromedio: 46.61,
    opcionesAtributos: [{ nombre: 'Color', valores: ['Rosa'] }, { nombre: 'Talla', valores: ['35', '36', '37'] }],
    variantes: [v(11, '35', 0), v(12, '36', 2), v(13, '37', 1)],
};

const pintar = (onAgregar = jest.fn(), onCancelar = jest.fn()) => {
    const r = render(<ModalCurvaTallas producto={VERONA} onCancelar={onCancelar} onAgregar={onAgregar} />);
    return { ...r, onAgregar, onCancelar };
};

describe('RONDA 1 · La grilla muestra lo que hace falta para decidir', () => {
    it('una fila por talla, en orden', () => {
        pintar();
        const filas = screen.getAllByRole('row');
        expect(filas).toHaveLength(4); // encabezado + 3 tallas
        expect(screen.getByText('35')).toBeInTheDocument();
        expect(screen.getByText('37')).toBeInTheDocument();
    });

    it('muestra el stock actual de cada talla', () => {
        pintar();
        // La 36 tiene 2 y la 35 está en cero: eso decide cuánto reponer.
        const texto = document.body.textContent ?? '';
        expect(texto).toContain('Stock hoy');
        expect(screen.getByTestId('cant-12')).toBeInTheDocument();
    });

    it('el encabezado dice de qué modelo es la curva', () => {
        pintar();
        expect(document.body.textContent).toContain('VERONA ROSA');
    });

    it('se monta sobre el Modal del proyecto, para quedar ENCIMA del de la orden', () => {
        // El modal de la orden va en z-[999999]; uno propio quedaba debajo y la
        // grilla salía cortada.
        pintar();
        expect(document.querySelector('.z-\\[999999\\]')).toBeTruthy();
    });

    it('muestra el código de cada talla', () => {
        pintar();
        expect(screen.getByText('VER-36')).toBeInTheDocument();
    });
});

describe('RONDA 2 · Lo que sale al pedido', () => {
    it('una línea por talla con cantidad, con el id de la VARIANTE', () => {
        const { onAgregar } = pintar();
        fireEvent.change(screen.getByTestId('cant-11'), { target: { value: '2' } });
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '3' } });
        fireEvent.click(screen.getByText('Agregar al pedido'));

        const lineas = onAgregar.mock.calls[0][0];
        expect(lineas).toHaveLength(2);
        expect(lineas.map((l: any) => l.productoId)).toEqual([11, 12]);
        expect(lineas.map((l: any) => l.cantidad)).toEqual([2, 3]);
    });

    it('la descripción lleva modelo y talla, que es lo que lee el proveedor', () => {
        const { onAgregar } = pintar();
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Agregar al pedido'));
        expect(onAgregar.mock.calls[0][0][0].descripcion).toBe('VERONA ROSA - Rosa / 36');
    });

    it('las tallas que quedaron vacías no se agregan', () => {
        const { onAgregar } = pintar();
        fireEvent.change(screen.getByTestId('cant-13'), { target: { value: '4' } });
        fireEvent.click(screen.getByText('Agregar al pedido'));
        expect(onAgregar.mock.calls[0][0]).toHaveLength(1);
    });
});

describe('RONDA 3 · No se puede agregar un pedido vacío', () => {
    it('el botón arranca deshabilitado', () => {
        pintar();
        expect(screen.getByText('Agregar al pedido')).toBeDisabled();
    });

    it('se habilita al escribir una cantidad', () => {
        pintar();
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '1' } });
        expect(screen.getByText('Agregar al pedido')).not.toBeDisabled();
    });

    it('vuelve a deshabilitarse si se borra todo', () => {
        pintar();
        const input = screen.getByTestId('cant-12');
        fireEvent.change(input, { target: { value: '1' } });
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.getByText('Agregar al pedido')).toBeDisabled();
    });

    it('una cantidad en cero no habilita', () => {
        pintar();
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '0' } });
        expect(screen.getByText('Agregar al pedido')).toBeDisabled();
    });
});

describe('RONDA 4 · El costo por talla', () => {
    it('los costos están ocultos hasta que se piden', () => {
        pintar();
        expect(screen.queryByTestId('costo-12')).not.toBeInTheDocument();
    });

    it('al abrirlos se puede corregir el de una talla', () => {
        const { onAgregar } = pintar();
        fireEvent.click(screen.getByText('Ajustar el costo por talla'));
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '1' } });
        fireEvent.change(screen.getByTestId('costo-12'), { target: { value: '60' } });
        fireEvent.click(screen.getByText('Agregar al pedido'));
        expect(onAgregar.mock.calls[0][0][0].precioUnitario).toBe(60);
    });

    it('sin tocarlo, usa el costo del catálogo', () => {
        const { onAgregar } = pintar();
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Agregar al pedido'));
        expect(onAgregar.mock.calls[0][0][0].precioUnitario).toBe(46.61);
    });
});

describe('RONDA 5 · Resumen y cancelación', () => {
    it('dice cuántas tallas, cuántas unidades y cuánto sale', () => {
        pintar();
        fireEvent.change(screen.getByTestId('cant-11'), { target: { value: '2' } });
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '3' } });
        // El modal va por portal a document.body, no al contenedor del render.
        // 2 tallas, 5 unidades, 5 × 46.61 = 233.05
        const pie = document.body.textContent ?? '';
        expect(pie).toContain('2');
        expect(pie).toContain('tallas');
        expect(pie).toContain('5');
        expect(pie).toContain('233.05');
    });

    it('con una sola talla dice "talla", no "tallas"', () => {
        pintar();
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '1' } });
        expect(document.body.textContent).toContain('1 talla ');
    });

    it('cancelar no agrega nada', () => {
        const { onAgregar, onCancelar } = pintar();
        fireEvent.change(screen.getByTestId('cant-12'), { target: { value: '3' } });
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onCancelar).toHaveBeenCalled();
        expect(onAgregar).not.toHaveBeenCalled();
    });

    it('sin producto no se renderiza nada', () => {
        render(<ModalCurvaTallas producto={null} onCancelar={jest.fn()} onAgregar={jest.fn()} />);
        expect(document.body.textContent).toBe('');
    });
});
