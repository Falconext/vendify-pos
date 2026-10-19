/**
 * El catálogo impreso con stock por talla.
 *
 * Se renderizan los CINCO diseños con los mismos datos, porque cada uno pinta
 * el stock por su cuenta y el pedido de COMERCIAL LINNA MODA aplica a todos.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CatalogoPrintTemplate from '../CatalogoPrintTemplate';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

const variante = (talla: string, stock: number) => ({
    id: Number(talla), codigo: `289C-${talla}`, estado: 'ACTIVO',
    valoresAtributos: { Color: 'Marrón', Talla: talla, Taco: '7' }, stock, stocks: [],
});

/** Victoria caoba: 6 tallas, 5 pares, 2 sin stock. Igual que en producción. */
const CON_TALLAS = {
    id: 1, descripcion: 'VICTORIA CAOBA', codigo: '289C', precioUnitario: 152, stock: 5,
    opcionesAtributos: [
        { nombre: 'Color', valores: ['Marrón'] },
        { nombre: 'Talla', valores: ['35', '36', '37', '38', '39', '40'] },
        { nombre: 'Taco', valores: ['7'] },
    ],
    variantes: [variante('35', 0), variante('36', 1), variante('37', 1),
                variante('38', 0), variante('39', 1), variante('40', 2)],
};

const SIN_TALLAS = {
    id: 2, descripcion: 'TRIANA NUDE', codigo: '209N', precioUnitario: 75, stock: 3, variantes: [],
};

const empresa = { razonSocial: 'ELEINN', ruc: '20607823929' } as any;

const pintar = (theme: string, productos: any[] = [CON_TALLAS, SIN_TALLAS]) =>
    render(
        <CatalogoPrintTemplate
            componentRef={{ current: null } as any}
            productos={productos as any}
            theme={theme as any}
            company={empresa}
            showStock
        />,
    );

const DISENOS = ['moderna', 'tecnica', 'minimal', 'menu', 'premium-tech'];

describe('Los cinco diseños muestran el desglose', () => {
    it.each(DISENOS)('diseño "%s": lista las tallas con stock', (theme) => {
        const { container, unmount } = pintar(theme);
        // Lo que importa: que aparezcan las tallas disponibles y sus cantidades.
        expect(container.textContent).toContain('36:1');
        expect(container.textContent).toContain('40:2');
        unmount();
    });

    it.each(DISENOS)('diseño "%s": no lista las tallas agotadas', (theme) => {
        const { container, unmount } = pintar(theme);
        // La 35 y la 38 están en cero: ocuparían lugar sin servir para vender.
        expect(container.textContent).not.toContain('35:');
        expect(container.textContent).not.toContain('38:');
        unmount();
    });

    it.each(DISENOS)('diseño "%s": un producto sin tallas conserva su número', (theme) => {
        const { container, unmount } = pintar(theme, [SIN_TALLAS]);
        expect(container.textContent).toContain('3');
        expect(container.textContent).not.toContain('Tallas:');
        unmount();
    });
});

describe('Sin el check de stock no se imprime nada de esto', () => {
    it.each(DISENOS)('diseño "%s": sin showStock no aparecen tallas', (theme) => {
        const { container, unmount } = render(
            <CatalogoPrintTemplate
                componentRef={{ current: null } as any}
                productos={[CON_TALLAS] as any}
                theme={theme as any}
                company={empresa}
            />,
        );
        expect(container.textContent).not.toContain('36:1');
        unmount();
    });
});

describe('Un modelo agotado', () => {
    it('dice "Sin stock" en vez de una lista vacía', () => {
        const agotado = { ...CON_TALLAS, stock: 0, variantes: CON_TALLAS.variantes.map((v) => ({ ...v, stock: 0 })) };
        const { container } = pintar('moderna', [agotado]);
        expect(container.textContent).toContain('Sin stock');
    });
});

describe('El nombre del producto sigue estando', () => {
    it('no se perdió al cambiar el renglón de stock', () => {
        pintar('moderna');
        expect(screen.getAllByText(/VICTORIA CAOBA/i).length).toBeGreaterThan(0);
    });
});
