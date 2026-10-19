import {
    elegiblesParaRotulo,
    estaMarcado,
    rotulosAImprimir,
    alternarRotulo,
    alternarTodos,
    resumenSeleccion,
    type RotuloElegible,
} from '../seleccionRotulos';

const fila = (over: Partial<any> = {}) => ({
    comprobanteId: 1,
    referencia: 'NV01-00000006',
    cliente: 'ESPINOZA CHAVEZ, ERIKA',
    courier: 'SHALOM',
    celularDest: '987654321',
    clienteTelefono: '912345678',
    estadoDespacho: 'PREPARANDO',
    ...over,
});

const elegible = (id: number, over: Partial<RotuloElegible> = {}): RotuloElegible => ({
    comprobanteId: id,
    referencia: `NV01-${id}`,
    cliente: `CLIENTE ${id}`,
    courier: 'SHALOM',
    celular: '987654321',
    ...over,
});

describe('elegiblesParaRotulo', () => {
    it('toma solo los despachos en Preparando con comprobante', () => {
        const r = elegiblesParaRotulo([
            fila({ comprobanteId: 1 }),
            fila({ comprobanteId: 2, estadoDespacho: 'EN_CAMINO' }),
            fila({ comprobanteId: null }),
            fila({ comprobanteId: 3, estadoDespacho: 'ENTREGADO' }),
        ] as any);
        expect(r.map((x) => x.comprobanteId)).toEqual([1]);
    });

    it('conserva el orden de la tabla', () => {
        const r = elegiblesParaRotulo([
            fila({ comprobanteId: 9, referencia: 'NV01-9' }),
            fila({ comprobanteId: 4, referencia: 'NV01-4' }),
            fila({ comprobanteId: 7, referencia: 'NV01-7' }),
        ] as any);
        expect(r.map((x) => x.referencia)).toEqual(['NV01-9', 'NV01-4', 'NV01-7']);
    });

    it('lleva el cliente para reconocer la fila en el selector', () => {
        const r = elegiblesParaRotulo([fila({ cliente: 'VARGAS NUÑEZ, MONICA' })] as any);
        expect(r[0].cliente).toBe('VARGAS NUÑEZ, MONICA');
    });

    it('cae al teléfono del cliente cuando el celular del destinatario es el guion', () => {
        const r = elegiblesParaRotulo([fila({ celularDest: '—', clienteTelefono: '955444333' })] as any);
        expect(r[0].celular).toBe('955444333');
    });

    it('no revienta con la lista vacía', () => {
        expect(elegiblesParaRotulo([])).toEqual([]);
    });
});

describe('sin tocar el selector se imprime todo (flujo de un clic)', () => {
    const lista = [elegible(1), elegible(2), elegible(3)];

    it('imprime los tres', () => {
        expect(rotulosAImprimir(lista, null).map((x) => x.comprobanteId)).toEqual([1, 2, 3]);
    });

    it('todas las filas se ven marcadas', () => {
        expect(lista.every((r) => estaMarcado(null, r.comprobanteId))).toBe(true);
    });

    it('el resumen dice "todos" y no está vacío', () => {
        expect(resumenSeleccion(lista, null)).toEqual({ total: 3, marcados: 3, todos: true, vacio: false });
    });
});

describe('elegir filas a mano', () => {
    const lista = [elegible(1), elegible(2), elegible(3)];

    it('destildar una deja las otras dos', () => {
        const sel = alternarRotulo(lista, null, 2);
        expect(rotulosAImprimir(lista, sel).map((x) => x.comprobanteId)).toEqual([1, 3]);
    });

    it('la fila destildada se ve destildada', () => {
        const sel = alternarRotulo(lista, null, 2);
        expect(estaMarcado(sel, 2)).toBe(false);
        expect(estaMarcado(sel, 1)).toBe(true);
    });

    it('volver a tildarla la trae de vuelta, en el orden de la tabla', () => {
        const sel = alternarRotulo(lista, alternarRotulo(lista, null, 2), 2);
        expect(rotulosAImprimir(lista, sel).map((x) => x.comprobanteId)).toEqual([1, 2, 3]);
    });

    it('el badge muestra cuántos saldrían, no el total', () => {
        const sel = alternarRotulo(lista, null, 3);
        expect(resumenSeleccion(lista, sel)).toEqual({ total: 3, marcados: 2, todos: false, vacio: false });
    });

    it('destildar todas una por una deja la impresión bloqueada, no imprimiendo todo', () => {
        let sel = alternarRotulo(lista, null, 1);
        sel = alternarRotulo(lista, sel, 2);
        sel = alternarRotulo(lista, sel, 3);
        expect(rotulosAImprimir(lista, sel)).toEqual([]);
        expect(resumenSeleccion(lista, sel).vacio).toBe(true);
    });
});

describe('Todos / Ninguno', () => {
    const lista = [elegible(1), elegible(2)];

    it('desde "todos" el enlace desmarca todo', () => {
        const sel = alternarTodos(lista, null);
        expect(rotulosAImprimir(lista, sel)).toEqual([]);
    });

    it('desde "ninguno" vuelve a marcar todo', () => {
        const sel = alternarTodos(lista, alternarTodos(lista, null));
        expect(rotulosAImprimir(lista, sel).map((x) => x.comprobanteId)).toEqual([1, 2]);
    });

    it('con una selección parcial marca todo (no la invierte)', () => {
        const parcial = alternarRotulo(lista, null, 1);
        const sel = alternarTodos(lista, parcial);
        expect(rotulosAImprimir(lista, sel).map((x) => x.comprobanteId)).toEqual([1, 2]);
    });
});

describe('la selección no sobrevive a lo que el usuario dejó de ver', () => {
    it('si cambia el filtro, no imprime una fila que ya no está en la lista', () => {
        const antes = [elegible(1), elegible(2), elegible(3)];
        const sel = alternarRotulo(antes, null, 1); // quedan 2 y 3 marcadas
        const despues = [elegible(2)]; // filtraron por courier y quedó una
        expect(rotulosAImprimir(despues, sel).map((x) => x.comprobanteId)).toEqual([2]);
    });

    it('si ninguna de las marcadas sigue visible, no imprime nada', () => {
        const sel = alternarRotulo([elegible(1), elegible(2)], null, 1);
        expect(rotulosAImprimir([elegible(5)], sel)).toEqual([]);
    });

    it('sin elegibles, el resumen queda vacío y no dice "todos"', () => {
        expect(resumenSeleccion([], null)).toEqual({ total: 0, marcados: 0, todos: false, vacio: true });
    });
});
