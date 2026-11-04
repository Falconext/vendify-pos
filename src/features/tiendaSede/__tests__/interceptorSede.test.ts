/**
 * El interceptor que hace que las 43 plantillas lean el catálogo de la sede
 * elegida sin tocar sus llamadas.
 */
import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { agregarSede, instalarInterceptorSede, marcarNoVendibles, rutaCatalogo } from '../interceptorSede';
import { normalizarStockTienda, useSedeTiendaStore } from '../sedeTienda';
import { STOCK_NO_VENDIBLE } from '@/templates/shared/ventaSinStock';

const API = 'http://localhost:4001/api';
const SEDES = [
    { id: 1, nombre: 'Centro', esPrincipal: true },
    { id: 2, nombre: 'Norte' },
];

const iniciar = (modo: 'SEDE' | 'CLIENTE' | 'TODAS', sedeElegida?: number) => {
    localStorage.clear();
    useSedeTiendaStore.setState({ slug: null, stockTienda: null, fichas: {}, generacion: 0 });
    useSedeTiendaStore.getState().iniciar('krezka', normalizarStockTienda({ modo, sedeDefaultId: 1, sedes: SEDES }));
    if (sedeElegida) useSedeTiendaStore.getState().confirmarSede(sedeElegida);
};

const cfg = (url: string, extra: Partial<InternalAxiosRequestConfig> = {}) =>
    ({ url, method: 'get', headers: {} as never, ...extra }) as InternalAxiosRequestConfig;

describe('rutaCatalogo: qué llamadas llevan la sede', () => {
    it.each([
        [`${API}/public/store/krezka/products`, null],
        [`${API}/public/store/krezka/products?search=te&limit=5`, null],
        [`${API}/public/store/krezka/products/7`, 7],
        [`${API}/public/store/krezka/products/7/related`, null],
        [`${API}/public/store/krezka/categories`, null],
        [`${API}/public/store/krezka/brands`, null],
        [`${API}/public/store/krezka/price-range`, null],
        [`${API}/public/store/krezka/combos`, null],
        [`${API}/public/store/krezka/combos/3`, null],
        [`${API}/public/store/krezka/combos/3/stock`, null],
    ])('%s', (url, ficha) => {
        expect(rutaCatalogo(url)).toEqual({ slug: 'krezka', fichaId: ficha });
    });

    it.each([
        `${API}/public/store/krezka`,
        `${API}/public/store/krezka/products/7/reviews`,
        `${API}/public/store/krezka/products/7/modifiers`,
        `${API}/public/store/krezka/orders`,
        `${API}/public/store/krezka/shipping-config`,
        `${API}/public/store/krezka/chat`,
        `${API}/public/store/track/PT-123`,
        `${API}/productos`,
    ])('no: %s', (url) => {
        expect(rutaCatalogo(url)).toBeNull();
    });

    it('decodifica el slug', () => {
        expect(rutaCatalogo(`${API}/public/store/mi%20tienda/products`)?.slug).toBe('mi tienda');
    });
});

describe('agregarSede', () => {
    it('CLIENTE: agrega ?sede= con la sede elegida', () => {
        iniciar('CLIENTE', 2);
        expect(agregarSede(cfg(`${API}/public/store/krezka/products`, { params: { page: 1 } })).params).toEqual({ page: 1, sede: 2 });
    });

    it('SEDE y TODAS: no agrega nada', () => {
        iniciar('SEDE');
        expect(agregarSede(cfg(`${API}/public/store/krezka/products`)).params).toBeUndefined();
        iniciar('TODAS');
        expect(agregarSede(cfg(`${API}/public/store/krezka/categories`)).params).toBeUndefined();
    });

    it('no pisa una sede que ya viene ni toca POST', () => {
        iniciar('CLIENTE', 2);
        expect(agregarSede(cfg(`${API}/public/store/krezka/products`, { params: { sede: 1 } })).params).toEqual({ sede: 1 });
        expect(agregarSede(cfg(`${API}/public/store/krezka/products?sede=1`)).params).toBeUndefined();
        expect(agregarSede(cfg(`${API}/public/store/krezka/products`, { method: 'post' })).params).toBeUndefined();
    });

    it('respeta URLSearchParams', () => {
        iniciar('CLIENTE', 2);
        const p = new URLSearchParams('page=1');
        expect((agregarSede(cfg(`${API}/public/store/krezka/products`, { params: p })).params as URLSearchParams).get('sede')).toBe('2');
    });

    it('otra tienda no hereda la sede', () => {
        iniciar('CLIENTE', 2);
        expect(agregarSede(cfg(`${API}/public/store/otra/products`)).params).toBeUndefined();
    });
});

describe('marcarNoVendibles', () => {
    it('lo no vendible queda en STOCK_NO_VENDIBLE; un negativo vendible pasa a 0', () => {
        const data = {
            code: 1,
            data: {
                data: [
                    { id: 1, stock: 0, vendible: false, variantes: [{ id: 10, stock: 3, vendible: false }, { id: 11, stock: 2, vendible: true }] },
                    { id: 2, stock: -4, vendible: true },
                    { id: 3, stock: 5 },
                ],
            },
        };
        marcarNoVendibles(data);
        const [a, b, c] = data.data.data;
        expect(a.stock).toBe(STOCK_NO_VENDIBLE);
        expect(a.variantes![0].stock).toBe(STOCK_NO_VENDIBLE);
        expect(a.variantes![1].stock).toBe(2);
        expect(b.stock).toBe(0);
        expect(c.stock).toBe(5);
    });

    it('combos (doble sobre): stockDisponible y componentes', () => {
        const data = { code: 1, data: { code: 1, data: [{ id: 30, stockDisponible: 4, vendible: false, items: [{ producto: { stock: 1, vendible: false } }] }] } };
        marcarNoVendibles(data);
        expect(data.data.data[0].stockDisponible).toBe(STOCK_NO_VENDIBLE);
        expect(data.data.data[0].items[0].producto.stock).toBe(STOCK_NO_VENDIBLE);
    });
});

describe('instalado en una instancia de axios (de punta a punta)', () => {
    const responder = (data: unknown): AxiosAdapter => async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config });

    it('la petición sale con ?sede= y la ficha queda registrada con su disponibleEn', async () => {
        iniciar('CLIENTE', 2);
        const instancia = axios.create();
        instalarInterceptorSede(instancia);
        instalarInterceptorSede(instancia); // idempotente
        const ficha = { code: 1, data: { id: 7, stock: 0, vendible: true, disponibleEn: [{ sedeId: 1, nombre: 'Centro', stock: 8 }, { sedeId: 9, nombre: 'X', stock: 0 }] } };
        const r = await instancia.get(`${API}/public/store/krezka/products/7`, { adapter: responder(ficha) });
        expect(r.config.params).toEqual({ sede: 2 });
        const registrada = useSedeTiendaStore.getState().fichas['krezka:7'];
        expect(registrada).toEqual({ productoId: 7, sedeId: 2, stock: 0, vendible: true, disponibleEn: [{ sedeId: 1, nombre: 'Centro', stock: 8 }] });
    });

    it('en modo SEDE sale sin ?sede=', async () => {
        iniciar('SEDE');
        const instancia = axios.create();
        instalarInterceptorSede(instancia);
        const r = await instancia.get(`${API}/public/store/krezka/products`, { adapter: responder({ data: [] }) });
        expect(r.config.params).toBeUndefined();
    });
});
