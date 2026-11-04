/**
 * "Stock de la tienda virtual" por sede (tienda pública).
 *
 * El backend decide de qué stock vende la tienda (`stockTienda` en
 * `GET /public/store/:slug`):
 * - SEDE: una sola sede, sin selector.
 * - CLIENTE: el comprador elige su sede; todo el catálogo se pide con `?sede=`.
 * - TODAS: la suma de las sedes; el pedido queda sin sede.
 *
 * Aquí vive el estado compartido por todas las plantillas: qué sede eligió el
 * comprador (guardada por tienda en localStorage), y lo que el interceptor de
 * axios necesita para mandar `?sede=` sin tocar las 43 plantillas.
 */
import { create } from 'zustand';

export type ModoStockTienda = 'SEDE' | 'CLIENTE' | 'TODAS';

export interface SedeTienda {
    id: number;
    nombre: string;
    direccion: string | null;
    distrito: string | null;
    provincia: string | null;
    departamento: string | null;
    esPrincipal: boolean;
}

export interface StockTienda {
    modo: ModoStockTienda;
    sedeDefaultId: number | null;
    sedes: SedeTienda[];
}

/** Otra sede donde el producto sí se puede pedir (ficha, modo CLIENTE). */
export interface DisponibleEnSede {
    sedeId: number;
    nombre: string;
    stock: number;
}

/** Lo que el aviso común de la ficha necesita del último producto abierto. */
export interface FichaSede {
    productoId: number;
    /** Sede con la que se pidió la ficha (`null` = la de la tienda). */
    sedeId: number | null;
    stock: number;
    vendible: boolean;
    disponibleEn: DisponibleEnSede[];
}

const MODOS: readonly ModoStockTienda[] = ['SEDE', 'CLIENTE', 'TODAS'];

const idValido = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const textoONull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** `stockTienda` tal como llega del servidor, a prueba de datos incompletos. */
export function normalizarStockTienda(raw: unknown): StockTienda {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const modo = MODOS.includes(r.modo as ModoStockTienda) ? (r.modo as ModoStockTienda) : 'SEDE';
    const sedes: SedeTienda[] = (Array.isArray(r.sedes) ? r.sedes : [])
        .map((s): SedeTienda | null => {
            const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
            const id = idValido(o.id);
            if (!id) return null;
            return {
                id,
                nombre: textoONull(o.nombre) ?? `Sede ${id}`,
                direccion: textoONull(o.direccion),
                distrito: textoONull(o.distrito),
                provincia: textoONull(o.provincia),
                departamento: textoONull(o.departamento),
                esPrincipal: o.esPrincipal === true,
            };
        })
        .filter((s): s is SedeTienda => s !== null);
    return { modo, sedeDefaultId: idValido(r.sedeDefaultId), sedes };
}

/** ¿El comprador tiene que elegir sede? Solo CLIENTE con más de una habilitada. */
export const clienteEligeSede = (stock: StockTienda | null | undefined): boolean =>
    !!stock && stock.modo === 'CLIENTE' && stock.sedes.length > 1;

export const sedePorId = (stock: StockTienda | null | undefined, id: number | null | undefined): SedeTienda | null =>
    (stock && id ? stock.sedes.find((s) => s.id === id) ?? null : null);

/**
 * La sede con la que arranca la tienda:
 * - CLIENTE: la última que eligió el comprador si sigue habilitada; si no, la
 *   de la tienda (`sedeDefaultId`) o la primera.
 * - SEDE: la de la tienda (sirve para la dirección de recojo).
 * - TODAS: ninguna (el pedido queda sin sede).
 */
export function resolverSedeInicial(stock: StockTienda, guardada: number | null): number | null {
    if (stock.modo === 'TODAS') return null;
    const existe = (id: number | null) => (id && stock.sedes.some((s) => s.id === id) ? id : null);
    if (stock.modo === 'CLIENTE') return existe(guardada) ?? existe(stock.sedeDefaultId) ?? stock.sedes[0]?.id ?? null;
    return existe(stock.sedeDefaultId) ?? stock.sedes[0]?.id ?? null;
}

const titulo = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, l: string) => sep + l.toUpperCase());

/** "Jr. Lima 100, Miraflores, Lima" — sin repetir provincia y departamento. */
export function direccionDeSede(sede: SedeTienda | null | undefined): string {
    if (!sede) return '';
    const partes: string[] = [];
    const agregar = (v: string | null, formatear = false) => {
        if (!v) return;
        const t = formatear ? titulo(v) : v;
        if (!partes.some((p) => p.toLowerCase() === t.toLowerCase())) partes.push(t);
    };
    agregar(sede.direccion);
    agregar(sede.distrito, true);
    agregar(sede.provincia, true);
    agregar(sede.departamento, true);
    return partes.join(', ');
}

// ── Persistencia por tienda (localStorage puede no existir o lanzar) ─────────

export const claveSedeGuardada = (slug: string) => `tienda:${slug}:sede`;

export function leerSedeGuardada(slug: string): number | null {
    if (!slug) return null;
    try {
        return idValido(window.localStorage.getItem(claveSedeGuardada(slug)));
    } catch {
        return null;
    }
}

export function guardarSede(slug: string, sedeId: number | null): void {
    if (!slug) return;
    try {
        if (sedeId) window.localStorage.setItem(claveSedeGuardada(slug), String(sedeId));
        else window.localStorage.removeItem(claveSedeGuardada(slug));
    } catch {
        /* modo privado o almacenamiento bloqueado: la sede vive solo en memoria */
    }
}

// ── Estado compartido ────────────────────────────────────────────────────────

interface EstadoSedeTienda {
    slug: string | null;
    /** `null` mientras no llega la tienda. */
    stockTienda: StockTienda | null;
    /** Sede elegida (CLIENTE) o la de la tienda (SEDE). `null` en TODAS. */
    sedeId: number | null;
    /** El comprador ya había elegido antes (no se le vuelve a preguntar). */
    eligioAntes: boolean;
    /**
     * Sube cada vez que el comprador CAMBIA de sede: las páginas se vuelven a
     * montar con ese número en su `key` y piden todo con la sede nueva.
     */
    generacion: number;
    /** Sube cuando el carrito guardado cambió desde fuera de la página (quitar/ajustar). */
    versionCarrito: number;
    selectorAbierto: boolean;
    /** Mensaje que explica por qué se abrió el selector (p. ej. un 400 del pedido). */
    motivoSelector: string | null;
    /** Pedido de revisar el carrito en la sede actual (p. ej. tras un 400 de stock). */
    revision: { n: number; mensaje: string | null };
    fichas: Record<string, FichaSede>;
    /** La franja "Comprando en" está a la vista (los encabezados fijos se corren). */
    franjaVisible: boolean;

    iniciar: (slug: string, stock: StockTienda) => void;
    confirmarSede: (sedeId: number) => void;
    carritoCambiado: () => void;
    abrirSelector: (motivo?: string | null) => void;
    cerrarSelector: () => void;
    olvidarSede: () => void;
    pedirRevisionCarrito: (mensaje?: string | null) => void;
    registrarFicha: (slug: string, ficha: FichaSede) => void;
    setFranjaVisible: (visible: boolean) => void;
}

const claveFicha = (slug: string, productoId: number) => `${slug}:${productoId}`;

export const useSedeTiendaStore = create<EstadoSedeTienda>()((set, get) => ({
    slug: null,
    stockTienda: null,
    sedeId: null,
    eligioAntes: false,
    generacion: 0,
    versionCarrito: 0,
    selectorAbierto: false,
    motivoSelector: null,
    revision: { n: 0, mensaje: null },
    fichas: {},
    franjaVisible: false,

    iniciar: (slug, stock) => {
        const previo = get();
        const mismaTienda = previo.slug === slug;
        // Sin localStorage (modo privado) la elegida en esta visita sigue valiendo.
        const guardada = leerSedeGuardada(slug) ?? (mismaTienda && previo.eligioAntes ? previo.sedeId : null);
        const sedeId = resolverSedeInicial(stock, guardada);
        set({
            slug,
            stockTienda: stock,
            sedeId,
            eligioAntes: clienteEligeSede(stock) && guardada !== null && guardada === sedeId,
            ...(mismaTienda ? {} : { generacion: 0, fichas: {}, selectorAbierto: false, motivoSelector: null }),
        });
    },

    confirmarSede: (sedeId) => {
        const { slug, sedeId: actual, generacion } = get();
        if (slug) guardarSede(slug, sedeId);
        set({
            sedeId,
            eligioAntes: true,
            selectorAbierto: false,
            motivoSelector: null,
            generacion: sedeId === actual ? generacion : generacion + 1,
        });
    },

    carritoCambiado: () => set((s) => ({ versionCarrito: s.versionCarrito + 1 })),
    abrirSelector: (motivo = null) => set({ selectorAbierto: true, motivoSelector: motivo }),
    cerrarSelector: () => set({ selectorAbierto: false, motivoSelector: null }),
    olvidarSede: () => {
        const { slug, stockTienda } = get();
        if (slug) guardarSede(slug, null);
        set({ eligioAntes: false, sedeId: stockTienda ? resolverSedeInicial(stockTienda, null) : null });
    },
    pedirRevisionCarrito: (mensaje = null) => set((s) => ({ revision: { n: s.revision.n + 1, mensaje } })),
    registrarFicha: (slug, ficha) =>
        set((s) => ({ fichas: { ...s.fichas, [claveFicha(slug, ficha.productoId)]: ficha } })),
    setFranjaVisible: (franjaVisible) => { if (get().franjaVisible !== franjaVisible) set({ franjaVisible }); },
}));

export const fichaDe = (fichas: Record<string, FichaSede>, slug: string, productoId: number): FichaSede | null =>
    fichas[claveFicha(slug, productoId)] ?? null;

/**
 * La sede que deben llevar las lecturas públicas del catálogo (`?sede=`), o
 * `null` si no hace falta. Si la tienda aún no llegó se usa la última elegida:
 * el servidor la ignora en SEDE/TODAS y, si ya no vale, cae a la de la tienda.
 */
export function sedeParaCatalogo(slug: string): number | null {
    if (!slug || slug === 'preview') return null;
    const s = useSedeTiendaStore.getState();
    if (s.slug === slug && s.stockTienda) return clienteEligeSede(s.stockTienda) ? s.sedeId : null;
    return leerSedeGuardada(slug);
}

/** `sedeId` para `POST …/orders` y `…/carrito/disponibilidad` (solo CLIENTE). */
export function sedeParaPedido(slug: string): number | null {
    const s = useSedeTiendaStore.getState();
    if (s.slug !== slug || !s.stockTienda || s.stockTienda.modo !== 'CLIENTE') return null;
    return s.sedeId;
}

/** La sede donde recoge el comprador: la elegida (CLIENTE) o la de la tienda (SEDE). */
export function sedeDeRecojo(slug: string): SedeTienda | null {
    const s = useSedeTiendaStore.getState();
    if (s.slug !== slug || !s.stockTienda || s.stockTienda.modo === 'TODAS') return null;
    return sedePorId(s.stockTienda, s.sedeId);
}
