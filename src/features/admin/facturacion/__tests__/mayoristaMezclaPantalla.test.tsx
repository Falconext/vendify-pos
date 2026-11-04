/**
 * Precio por mayor mezclando productos, en pantalla: el aviso del carrito y el
 * modal de edición de la línea. La regla en sí se prueba en mayoristaMezcla.test.ts.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
const alertMock = jest.fn();
jest.mock('@/zustand/alert', () => ({
    __esModule: true,
    default: Object.assign(() => ({ alert: alertMock }), { getState: () => ({ alert: alertMock }) }),
}));
jest.mock('@/zustand/auth', () => ({
    useAuthStore: (selector?: any) => {
        const state = { auth: { bloquearEdicionPrecioVenta: false } };
        return selector ? selector(state) : state;
    },
}));
jest.mock('@/components/Modal', () => ({
    __esModule: true,
    default: ({ isOpenModal, children }: any) => (isOpenModal ? <div>{children}</div> : null),
}));

import { POSCartLayout } from '../components/POSCartLayout';
import ModalEditLineItem from '@/pages/admin/facturacion/ModalEditLineItem';
import { avisoMezcla, reprecioPorMezcla } from '../mayoristaMezcla';

const ESCALAS = [{ cantidadMinima: 6, precio: 20 }];
const perfume = (productoId: number, cantidad: number, extra: any = {}) => ({
    id: productoId,
    productoId,
    descripcion: `PERFUME ${productoId}`,
    categoriaId: 1,
    cantidad,
    precioBase: 25,
    precioUnitario: 25,
    total: (25 * cantidad).toFixed(2),
    stock: 50,
    preciosMayorista: ESCALAS,
    ...extra,
});
const CFG = { activo: true, categoriaIds: [] as number[] };

const vmCarrito = (lineas: any[]) => {
    const copia = lineas.map((l) => ({ ...l }));
    for (const c of reprecioPorMezcla(copia, CFG)) Object.assign(copia[c.index], c.patch);
    return {
        products: [],
        productsInvoice: copia,
        monedaSimbolo: 'S/',
        permitirVentaSinStock: true,
        avisarSobreventa: false,
        updateProductInvoice: jest.fn(),
        handleDeleteProductByIndex: jest.fn(),
        calculateLineItem: (item: any, cantidad: number) => ({ cantidad, precioUnitario: item.precioUnitario }),
        configMezcla: CFG,
        avisoMezclaCarrito: avisoMezcla(copia, CFG),
    };
};

describe('aviso del carrito', () => {
    it('dice cuántas unidades faltan para el precio por mayor', () => {
        render(<POSCartLayout vm={vmCarrito([perfume(1, 2), perfume(2, 2)])} />);
        expect(screen.getByText('Lleva 4 unidades para el precio por mayor')).toBeInTheDocument();
        expect(screen.getByText('Faltan 2 (iguales o distintos) para llegar a 6.')).toBeInTheDocument();
        expect(screen.queryByText('Por mayor')).not.toBeInTheDocument();
    });

    it('con 6 mezclados marca el precio por mayor en cada línea', () => {
        render(<POSCartLayout vm={vmCarrito([perfume(1, 2), perfume(2, 2), perfume(3, 2)])} />);
        expect(screen.getByText('Precio por mayor aplicado: 6 unidades mezcladas')).toBeInTheDocument();
        expect(screen.getAllByText('Por mayor')).toHaveLength(3);
    });

    it('sin la mezcla encendida no muestra nada', () => {
        const vm = { ...vmCarrito([perfume(1, 2)]), configMezcla: { activo: false, categoriaIds: [] }, avisoMezclaCarrito: null };
        render(<POSCartLayout vm={vm} />);
        expect(screen.queryByText(/precio por mayor/i)).not.toBeInTheDocument();
    });
});

describe('modal de edición con la mezcla', () => {
    const abrir = (item: any, otras: number) => {
        const onSave = jest.fn();
        const { container } = render(
            <ModalEditLineItem isOpen onClose={() => {}} item={item} onSave={onSave} cantidadOtrasEnMezcla={otras} />,
        );
        const input = (name: string) => container.querySelector(`input[name="${name}"]`) as HTMLInputElement;
        return { onSave, input };
    };

    it('al cambiar la cantidad calcula el precio con el total mezclado', () => {
        const { input } = abrir(perfume(1, 1), 4);
        fireEvent.change(input('cantidad'), { target: { value: '2' } });
        // 2 propias + 4 de otras líneas = 6 → precio por mayor.
        expect(Number(input('precioUnitario').value)).toBe(20);
        expect(screen.getByText('Precio por mayor según el total mezclado: 6 unidades')).toBeInTheDocument();
    });

    it('un precio escrito a mano queda marcado para que la mezcla no lo pise', () => {
        const { input, onSave } = abrir(perfume(1, 2), 1);
        fireEvent.change(input('precioUnitario'), { target: { value: '22' } });
        fireEvent.click(screen.getByText('Guardar'));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ precioUnitario: 22, precioManual: true }));
    });

    it('guardar sin tocar el precio no lo marca como manual', () => {
        const { input, onSave } = abrir(perfume(1, 2), 1);
        fireEvent.change(input('cantidad'), { target: { value: '3' } });
        fireEvent.click(screen.getByText('Guardar'));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 3, precioManual: false }));
    });

    it('escribir justo el precio automático tampoco lo deja a mano', () => {
        const { input, onSave } = abrir(perfume(1, 2), 4);
        fireEvent.change(input('precioUnitario'), { target: { value: '20' } });
        fireEvent.click(screen.getByText('Guardar'));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ precioUnitario: 20, precioManual: false }));
    });
});
