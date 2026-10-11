/**
 * El desglose de tallas que se imprime en el catálogo PDF.
 *
 * Pedido de COMERCIAL LINNA MODA: el catálogo mostraba "Stock: 5" para un
 * modelo y la vendedora no sabía de qué tallas eran esos 5.
 */
import {
    nombreDeLaTalla,
    tallasDisponibles,
    textoDeTallas,
} from '../stockPorVariante';

const variante = (talla: string, stock: number, color = 'Marrón', taco = '7') => ({
    id: Math.random(), codigo: `X-${talla}`, estado: 'ACTIVO',
    valoresAtributos: { Color: color, Talla: talla, Taco: taco }, stock, stocks: [],
});

/** Victoria caoba, tal como está en producción. */
const VICTORIA = {
    opcionesAtributos: [
        { nombre: 'Color', valores: ['Marrón'] },
        { nombre: 'Talla', valores: ['35', '36', '37', '38', '39', '40'] },
        { nombre: 'Taco', valores: ['7'] },
    ],
    variantes: [
        variante('35', 0), variante('36', 1), variante('37', 1),
        variante('38', 0), variante('39', 1), variante('40', 2),
    ],
};

describe('Qué tallas se listan', () => {
    it('solo las que tienen stock: el catálogo es para vender', () => {
        expect(textoDeTallas(VICTORIA)).toBe('36:1 · 37:1 · 39:1 · 40:2');
    });

    it('las de stock cero no ocupan lugar', () => {
        expect(tallasDisponibles(VICTORIA).map((t) => t.talla)).toEqual(['36', '37', '39', '40']);
    });

    it('un modelo sin nada disponible no imprime una lista vacía', () => {
        const agotado = { ...VICTORIA, variantes: VICTORIA.variantes.map((v) => ({ ...v, stock: 0 })) };
        expect(textoDeTallas(agotado)).toBe('');
    });
});

describe('El orden de las tallas', () => {
    it('las numéricas van en orden numérico, no alfabético', () => {
        // Ordenado como texto, "40" iría antes que "9". En calzado eso es absurdo.
        const conNueve = { ...VICTORIA, variantes: [variante('40', 1), variante('9', 1), variante('36', 1)] };
        expect(tallasDisponibles(conNueve).map((t) => t.talla)).toEqual(['9', '36', '40']);
    });

    it('las de letra van alfabéticas', () => {
        const ropa = {
            opcionesAtributos: [{ nombre: 'Talla', valores: ['S', 'M', 'L'] }],
            variantes: [
                { id: 1, estado: 'ACTIVO', valoresAtributos: { Talla: 'M' }, stock: 2, stocks: [] },
                { id: 2, estado: 'ACTIVO', valoresAtributos: { Talla: 'L' }, stock: 1, stocks: [] },
            ],
        };
        expect(textoDeTallas(ropa)).toBe('L:1 · M:2');
    });
});

describe('Cómo se detecta cuál atributo es la talla', () => {
    it('la encuentra por nombre, no por posición', () => {
        expect(nombreDeLaTalla(VICTORIA)).toBe('Talla');
    });

    it('acepta variaciones del nombre', () => {
        expect(nombreDeLaTalla({ opcionesAtributos: [{ nombre: 'TALLA' }] })).toBe('TALLA');
        expect(nombreDeLaTalla({ opcionesAtributos: [{ nombre: 'Medida' }] })).toBe('Medida');
        expect(nombreDeLaTalla({ opcionesAtributos: [{ nombre: 'Size' }] })).toBe('Size');
    });

    it('sin atributo de talla cae a la etiqueta completa', () => {
        // Un producto con variantes de solo color igual debe decir algo útil.
        const soloColor = {
            opcionesAtributos: [{ nombre: 'Color', valores: ['Rojo', 'Azul'] }],
            variantes: [
                { id: 1, estado: 'ACTIVO', valoresAtributos: { Color: 'Rojo' }, stock: 3, stocks: [] },
            ],
        };
        expect(nombreDeLaTalla(soloColor)).toBeNull();
        expect(textoDeTallas(soloColor)).toBe('Rojo:3');
    });
});

describe('Suma y bordes', () => {
    it('dos colores de la misma talla se suman', () => {
        const dosColores = {
            opcionesAtributos: [{ nombre: 'Color', valores: ['Rojo', 'Azul'] }, { nombre: 'Talla', valores: ['36'] }],
            variantes: [variante('36', 2, 'Rojo'), variante('36', 3, 'Azul')],
        };
        expect(textoDeTallas(dosColores)).toBe('36:5');
    });

    it('una variante desactivada no aporta', () => {
        const conBaja = {
            ...VICTORIA,
            variantes: [...VICTORIA.variantes, { ...variante('41', 9), estado: 'INACTIVO' }],
        };
        expect(textoDeTallas(conBaja)).toBe('36:1 · 37:1 · 39:1 · 40:2');
    });

    it('un producto sin variantes no devuelve tallas', () => {
        expect(tallasDisponibles({ stock: 7 })).toEqual([]);
        expect(textoDeTallas({ stock: 7 })).toBe('');
    });
});
