/**
 * Estado de la sede en la tienda pública (stock por sede).
 */
import {
    claveSedeGuardada,
    clienteEligeSede,
    direccionDeSede,
    guardarSede,
    leerSedeGuardada,
    normalizarStockTienda,
    resolverSedeInicial,
    sedeDeRecojo,
    sedeParaCatalogo,
    sedeParaPedido,
    useSedeTiendaStore,
} from '../sedeTienda';

const SEDES = [
    { id: 1, nombre: 'Centro', direccion: 'Jr. Lima 100', distrito: 'LIMA', provincia: 'LIMA', departamento: 'LIMA', esPrincipal: true },
    { id: 2, nombre: 'Norte', direccion: 'Av. Túpac 500', distrito: 'COMAS', provincia: 'LIMA', departamento: 'LIMA', esPrincipal: false },
];
const cliente = normalizarStockTienda({ modo: 'CLIENTE', sedeDefaultId: 1, sedes: SEDES });

const reiniciar = () => {
    localStorage.clear();
    useSedeTiendaStore.setState({ slug: null, stockTienda: null, sedeId: null, eligioAntes: false, generacion: 0, versionCarrito: 0, fichas: {} });
};

describe('normalizarStockTienda', () => {
    it('lee la respuesta del servidor', () => {
        expect(cliente.modo).toBe('CLIENTE');
        expect(cliente.sedes.map((s) => s.id)).toEqual([1, 2]);
    });

    it('aguanta datos rotos o ausentes (backend viejo)', () => {
        expect(normalizarStockTienda(undefined)).toEqual({ modo: 'SEDE', sedeDefaultId: null, sedes: [] });
        const r = normalizarStockTienda({ modo: 'RARO', sedeDefaultId: 'x', sedes: [{ id: 0 }, null, { id: '3' }] });
        expect(r.modo).toBe('SEDE');
        expect(r.sedeDefaultId).toBeNull();
        expect(r.sedes).toHaveLength(1);
        expect(r.sedes[0]).toMatchObject({ id: 3, nombre: 'Sede 3', direccion: null });
    });
});

describe('clienteEligeSede', () => {
    it('solo CLIENTE con más de una sede', () => {
        expect(clienteEligeSede(cliente)).toBe(true);
        expect(clienteEligeSede({ ...cliente, sedes: cliente.sedes.slice(0, 1) })).toBe(false);
        expect(clienteEligeSede({ ...cliente, modo: 'TODAS' })).toBe(false);
        expect(clienteEligeSede(null)).toBe(false);
    });
});

describe('resolverSedeInicial', () => {
    it('CLIENTE: la guardada si sigue habilitada', () => {
        expect(resolverSedeInicial(cliente, 2)).toBe(2);
    });
    it('CLIENTE: una guardada que ya no está cae a la de la tienda', () => {
        expect(resolverSedeInicial(cliente, 99)).toBe(1);
    });
    it('SEDE ignora la guardada; TODAS no tiene sede', () => {
        expect(resolverSedeInicial({ ...cliente, modo: 'SEDE' }, 2)).toBe(1);
        expect(resolverSedeInicial({ ...cliente, modo: 'TODAS' }, 2)).toBeNull();
    });
});

describe('direccionDeSede', () => {
    it('une dirección y ubigeo sin repetir y en formato título', () => {
        expect(direccionDeSede(cliente.sedes[0])).toBe('Jr. Lima 100, Lima');
        expect(direccionDeSede(cliente.sedes[1])).toBe('Av. Túpac 500, Comas, Lima');
        expect(direccionDeSede(null)).toBe('');
    });
});

describe('persistencia por tienda', () => {
    beforeEach(reiniciar);

    it('guarda y lee por slug', () => {
        guardarSede('krezka', 2);
        expect(localStorage.getItem(claveSedeGuardada('krezka'))).toBe('2');
        expect(leerSedeGuardada('krezka')).toBe(2);
        expect(leerSedeGuardada('otra')).toBeNull();
    });

    it('localStorage que lanza no rompe la tienda', () => {
        const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
        const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
        expect(() => guardarSede('krezka', 2)).not.toThrow();
        expect(leerSedeGuardada('krezka')).toBeNull();
        get.mockRestore();
        set.mockRestore();
    });
});

describe('store y lo que leen las peticiones', () => {
    beforeEach(reiniciar);

    it('antes de cargar la tienda, el catálogo usa la sede guardada', () => {
        guardarSede('krezka', 2);
        expect(sedeParaCatalogo('krezka')).toBe(2);
        expect(sedeParaCatalogo('preview')).toBeNull();
    });

    it('CLIENTE: catálogo y pedido llevan la sede; el recojo es esa sede', () => {
        useSedeTiendaStore.getState().iniciar('krezka', cliente);
        expect(sedeParaCatalogo('krezka')).toBe(1);
        expect(sedeParaPedido('krezka')).toBe(1);
        expect(sedeDeRecojo('krezka')?.nombre).toBe('Centro');
    });

    it('SEDE: sin ?sede= ni sedeId en el pedido, pero recojo en la sede de la tienda', () => {
        useSedeTiendaStore.getState().iniciar('krezka', { ...cliente, modo: 'SEDE', sedes: cliente.sedes.slice(0, 1) });
        expect(sedeParaCatalogo('krezka')).toBeNull();
        expect(sedeParaPedido('krezka')).toBeNull();
        expect(sedeDeRecojo('krezka')?.id).toBe(1);
    });

    it('TODAS: nada lleva sede', () => {
        useSedeTiendaStore.getState().iniciar('krezka', { ...cliente, modo: 'TODAS', sedeDefaultId: null });
        expect(sedeParaCatalogo('krezka')).toBeNull();
        expect(sedeParaPedido('krezka')).toBeNull();
        expect(sedeDeRecojo('krezka')).toBeNull();
    });

    it('cambiar de sede sube la generación (las páginas se vuelven a montar) y la guarda', () => {
        const s = useSedeTiendaStore.getState();
        s.iniciar('krezka', cliente);
        expect(useSedeTiendaStore.getState().eligioAntes).toBe(false);
        s.confirmarSede(2);
        expect(useSedeTiendaStore.getState()).toMatchObject({ sedeId: 2, generacion: 1, eligioAntes: true });
        expect(leerSedeGuardada('krezka')).toBe(2);
        // Confirmar la misma no vuelve a montar nada.
        useSedeTiendaStore.getState().confirmarSede(2);
        expect(useSedeTiendaStore.getState().generacion).toBe(1);
    });

    it('volver a la misma tienda (otra página) recuerda lo elegido aunque no haya localStorage', () => {
        const s = useSedeTiendaStore.getState();
        s.iniciar('krezka', cliente);
        s.confirmarSede(2);
        localStorage.clear();
        useSedeTiendaStore.getState().iniciar('krezka', cliente);
        expect(useSedeTiendaStore.getState()).toMatchObject({ sedeId: 2, eligioAntes: true, generacion: 1 });
    });

    it('otra tienda empieza de cero', () => {
        const s = useSedeTiendaStore.getState();
        s.iniciar('krezka', cliente);
        s.confirmarSede(2);
        useSedeTiendaStore.getState().iniciar('otra', cliente);
        expect(useSedeTiendaStore.getState()).toMatchObject({ slug: 'otra', sedeId: 1, generacion: 0, eligioAntes: false });
    });
});
