/**
 * La ficha pública de la tienda (`GET /public/store/:slug`), pedida una sola vez.
 *
 * Cada página de la tienda (portada, catálogo, ficha, checkout, seguimiento,
 * contacto, blog) y cada ficha de producto de las plantillas la pedía por su
 * cuenta: la ficha de producto la pedía dos veces (el router para saber la
 * plantilla y la propia ficha) y pasar de una página a otra volvía a mostrar
 * la pantalla de carga aunque la tienda ya estuviera en memoria.
 *
 * - Pedidos simultáneos del mismo slug comparten la misma petición.
 * - La respuesta se reutiliza durante `VIGENCIA_MS`: navegar dentro de la
 *   tienda es instantáneo y un cambio del dueño se ve, como mucho, un minuto
 *   después (o al recargar, que vacía la memoria).
 * - Un error no se guarda: "Reintentar" vuelve a pedir.
 * - Cada llamador recibe su propia copia, así nadie le cambia la tienda a otro.
 */
import axios, { type AxiosResponse } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
export const VIGENCIA_MS = 60_000;

interface Entrada {
    peticion: Promise<AxiosResponse>;
    respuesta?: AxiosResponse;
    desde: number;
}

const cache = new Map<string, Entrada>();

// Es JSON del servidor: copiarlo como JSON basta y funciona en todo navegador.
const clonar = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const copia = (r: AxiosResponse): AxiosResponse => ({ ...r, data: clonar(r.data) });

const vigente = (e: Entrada | undefined, ahora: number): e is Entrada =>
    !!e && ahora - e.desde < VIGENCIA_MS;

/**
 * Igual que `axios.get(`${BASE_URL}/public/store/${slug}`)`, pero sin repetir
 * la petición. Devuelve la respuesta de axios para no cambiar a quien la usa.
 */
export function obtenerTiendaPublica(slug: string | undefined, ahora = Date.now()): Promise<AxiosResponse> {
    const clave = String(slug ?? '');
    const previa = cache.get(clave);
    if (vigente(previa, ahora)) return previa.peticion.then(copia);

    const entrada: Entrada = { desde: ahora, peticion: axios.get(`${BASE_URL}/public/store/${encodeURIComponent(clave)}`) };
    entrada.peticion = entrada.peticion.then(
        (r) => { entrada.respuesta = r; return r; },
        (e) => { if (cache.get(clave) === entrada) cache.delete(clave); throw e; },
    );
    cache.set(clave, entrada);
    return entrada.peticion.then(copia);
}

/**
 * La tienda ya cargada (el `data.data || data` de la respuesta), o `null` si
 * aún no llegó o venció. Sirve para arrancar una página con la tienda en vez
 * de con la pantalla de carga.
 */
export function tiendaPublicaEnCache(slug: string | undefined, ahora = Date.now()): any | null {
    const e = cache.get(String(slug ?? ''));
    if (!vigente(e, ahora) || !e.respuesta) return null;
    const data = clonar(e.respuesta.data);
    return data?.data || data || null;
}

/** Solo para pruebas. */
export function vaciarTiendaPublica(): void {
    cache.clear();
}
