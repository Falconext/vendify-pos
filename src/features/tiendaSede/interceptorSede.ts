/**
 * Un solo punto para que TODAS las plantillas lean el catálogo de la sede
 * elegida, sin editar sus llamadas una por una.
 *
 * Las páginas de la tienda piden el catálogo con el axios global
 * (`axios.get(`${BASE_URL}/public/store/${slug}/products`)`, etc.). Este
 * interceptor:
 * 1. agrega `?sede=<id>` a las lecturas de productos, ficha, relacionados,
 *    filtros y combos cuando la tienda está en modo CLIENTE;
 * 2. al recibir esas respuestas, marca lo que NO se puede vender en la sede
 *    (`vendible: false`) con `stock = STOCK_NO_VENDIBLE`, así `sinStock()`
 *    lo bloquea aunque la tienda acepte pedidos sin stock;
 * 3. guarda `disponibleEn` de la ficha para el aviso común "Disponible en …".
 */
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { STOCK_NO_VENDIBLE } from '@/templates/shared/ventaSinStock';
import { sedeParaCatalogo, useSedeTiendaStore, type DisponibleEnSede } from './sedeTienda';

export interface RutaCatalogo {
    slug: string;
    /** `/products/:id` (la ficha), para guardar su `disponibleEn`. */
    fichaId: number | null;
}

const RUTA_CATALOGO =
    /\/public\/store\/([^/?#]+)\/(products(?:\/([^/?#]+)(\/related)?)?|categories|brands|price-range|combos(?:\/[^/?#]+(?:\/stock)?)?)\/?(?:[?#]|$)/;

/** ¿Es una lectura del catálogo público? Devuelve el slug (y el id si es la ficha). */
export function rutaCatalogo(url: string | undefined): RutaCatalogo | null {
    if (!url) return null;
    const m = RUTA_CATALOGO.exec(url);
    if (!m) return null;
    let slug = m[1];
    try { slug = decodeURIComponent(slug); } catch { /* slug sin codificar */ }
    if (slug === 'track') return null;
    const id = m[3] !== undefined && m[4] === undefined ? Number(m[3]) : NaN;
    return { slug, fichaId: Number.isInteger(id) && id > 0 ? id : null };
}

const yaTieneSede = (config: InternalAxiosRequestConfig): boolean => {
    const p = config.params;
    if (p && typeof p === 'object' && 'sede' in (p as Record<string, unknown>)) return true;
    return /[?&]sede=/.test(config.url ?? '');
};

export function agregarSede(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if ((config.method ?? 'get').toLowerCase() !== 'get') return config;
    const ruta = rutaCatalogo(config.url);
    if (!ruta || yaTieneSede(config)) return config;
    const sede = sedeParaCatalogo(ruta.slug);
    if (!sede) return config;
    // URLSearchParams no se toca: axios lo serializa tal cual.
    if (config.params instanceof URLSearchParams) config.params.set('sede', String(sede));
    else config.params = { ...(config.params ?? {}), sede };
    return config;
}

/**
 * Recorre la respuesta (con su sobre `{code, data}`, a veces doble) y deja el
 * stock de lo no vendible en `STOCK_NO_VENDIBLE`. Un stock negativo de algo
 * vendible pasa a 0: así "negativo" solo significa "no se vende en esta sede".
 */
export function marcarNoVendibles(valor: unknown, profundidad = 0, vistos = new WeakSet<object>()): void {
    if (!valor || typeof valor !== 'object' || profundidad > 8 || vistos.has(valor as object)) return;
    vistos.add(valor as object);
    if (Array.isArray(valor)) {
        for (const v of valor) marcarNoVendibles(v, profundidad + 1, vistos);
        return;
    }
    const o = valor as Record<string, unknown>;
    if (typeof o.vendible === 'boolean') {
        if (o.vendible === false) {
            if ('stock' in o) o.stock = STOCK_NO_VENDIBLE;
            if ('stockDisponible' in o) o.stockDisponible = STOCK_NO_VENDIBLE;
        } else {
            if (typeof o.stock === 'number' && o.stock < 0) o.stock = 0;
            if (typeof o.stockDisponible === 'number' && o.stockDisponible < 0) o.stockDisponible = 0;
        }
    }
    for (const v of Object.values(o)) {
        if (v && typeof v === 'object') marcarNoVendibles(v, profundidad + 1, vistos);
    }
}

const desenvolver = (data: unknown): Record<string, unknown> | null => {
    let d = data as Record<string, unknown> | null;
    for (let i = 0; i < 3 && d && typeof d === 'object' && 'data' in d && d.data && typeof d.data === 'object' && !Array.isArray(d.data); i++) {
        d = d.data as Record<string, unknown>;
    }
    return d && typeof d === 'object' ? d : null;
};

function normalizarDisponibleEn(raw: unknown): DisponibleEnSede[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((d) => {
            const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
            return { sedeId: Number(o.sedeId), nombre: String(o.nombre ?? ''), stock: Number(o.stock ?? 0) };
        })
        .filter((d) => Number.isInteger(d.sedeId) && d.sedeId > 0 && d.nombre && d.stock > 0);
}

export function procesarRespuesta(respuesta: AxiosResponse): AxiosResponse {
    const ruta = rutaCatalogo(respuesta.config?.url);
    if (!ruta || (respuesta.config?.method ?? 'get').toLowerCase() !== 'get') return respuesta;
    if (ruta.fichaId) {
        const p = desenvolver(respuesta.data);
        if (p && Number(p.id) === ruta.fichaId && 'disponibleEn' in p) {
            const params = respuesta.config?.params as Record<string, unknown> | URLSearchParams | undefined;
            const sedePedida = params instanceof URLSearchParams ? params.get('sede') : params?.sede;
            useSedeTiendaStore.getState().registrarFicha(ruta.slug, {
                productoId: ruta.fichaId,
                sedeId: Number(sedePedida) > 0 ? Number(sedePedida) : null,
                stock: Number(p.stock ?? 0),
                vendible: p.vendible !== false,
                disponibleEn: normalizarDisponibleEn(p.disponibleEn),
            });
        }
    }
    marcarNoVendibles(respuesta.data);
    return respuesta;
}

const instalados = new WeakSet<AxiosInstance>();

/** Idempotente: instalarlo dos veces en la misma instancia no duplica nada. */
export function instalarInterceptorSede(instancia: AxiosInstance): void {
    if (instalados.has(instancia)) return;
    instalados.add(instancia);
    instancia.interceptors.request.use(agregarSede);
    instancia.interceptors.response.use(procesarRespuesta);
}
