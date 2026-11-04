/**
 * "Stock de la tienda virtual" en Tienda → Configuración (`/tienda/config`).
 * Lógica pura: lectura de la config, si cambió y qué se manda al guardar.
 */
export type ModoStockTienda = 'SEDE' | 'CLIENTE' | 'TODAS';

export interface SedeEmpresa {
    id: number;
    nombre: string;
    direccion: string | null;
    esPrincipal: boolean;
}

export interface StockTiendaForm {
    modo: ModoStockTienda;
    /** SEDE: la sede de la tienda; CLIENTE: con la que abre. `null` = la principal. */
    sedeId: number | null;
    /** CLIENTE: las que se ofrecen; TODAS: las que se suman. `[]` = todas las activas. */
    sedesIds: number[];
}

export interface StockTiendaConfig {
    form: StockTiendaForm;
    sedes: SedeEmpresa[];
    /** >1 sede activa y el dueño aún no eligió (lo puso la migración). */
    aviso: boolean;
}

export const MODOS_STOCK: { id: ModoStockTienda; titulo: string; descripcion: string; paraQuien: string; icono: string }[] = [
    {
        id: 'SEDE',
        titulo: 'Una sede',
        descripcion: 'La tienda vende solo el stock de la sede que elijas. El cliente no ve sedes.',
        paraQuien: 'Ideal si despachas todo desde un local o almacén.',
        icono: 'solar:shop-2-bold-duotone',
    },
    {
        id: 'CLIENTE',
        titulo: 'El cliente elige su sede',
        descripcion: 'Tu cliente elige dónde comprar y ve el stock y la dirección de recojo de esa sede. El pedido llega a esa sede.',
        paraQuien: 'Ideal si tienes varias tiendas y el cliente recoge en la más cercana.',
        icono: 'solar:map-point-wave-bold-duotone',
    },
    {
        id: 'TODAS',
        titulo: 'Todas las sedes',
        descripcion: 'Suma el stock de tus sedes. Al generar la nota de venta eliges de qué sede sale.',
        paraQuien: 'Ideal si mueves mercadería entre sedes antes de despachar.',
        icono: 'solar:buildings-2-bold-duotone',
    },
];

const entero = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};

export function leerStockTiendaConfig(raw: unknown): StockTiendaConfig {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const modo: ModoStockTienda = r.tiendaStockModo === 'CLIENTE' || r.tiendaStockModo === 'TODAS' ? r.tiendaStockModo : 'SEDE';
    const sedes: SedeEmpresa[] = (Array.isArray(r.sedesTienda) ? r.sedesTienda : [])
        .map((s): SedeEmpresa | null => {
            const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
            const id = entero(o.id);
            if (!id) return null;
            return {
                id,
                nombre: typeof o.nombre === 'string' && o.nombre.trim() ? o.nombre.trim() : `Sede ${id}`,
                direccion: typeof o.direccion === 'string' && o.direccion.trim() ? o.direccion.trim() : null,
                esPrincipal: o.esPrincipal === true,
            };
        })
        .filter((s): s is SedeEmpresa => s !== null);
    const ids = new Set(sedes.map((s) => s.id));
    const sedesIds = [...new Set((Array.isArray(r.tiendaSedesIds) ? r.tiendaSedesIds : []).map(entero))]
        .filter((id): id is number => id !== null && ids.has(id));
    const sedeId = entero(r.tiendaSedeId);
    return {
        form: { modo, sedeId: sedeId && ids.has(sedeId) ? sedeId : null, sedesIds },
        sedes,
        aviso: r.avisoStockTienda === true,
    };
}

const mismaLista = (a: number[], b: number[]) => {
    const x = [...a].sort((m, n) => m - n);
    const y = [...b].sort((m, n) => m - n);
    return x.length === y.length && x.every((v, i) => v === y[i]);
};

export function stockTiendaCambio(a: StockTiendaForm, b: StockTiendaForm): boolean {
    return a.modo !== b.modo || a.sedeId !== b.sedeId || !mismaLista(a.sedesIds, b.sedesIds);
}

/** La sede efectiva de la tienda (null = principal) para mostrarla marcada. */
export const sedeEfectiva = (form: StockTiendaForm, sedes: SedeEmpresa[]): number | null =>
    form.sedeId ?? sedes.find((s) => s.esPrincipal)?.id ?? sedes[0]?.id ?? null;

/** Sedes habilitadas (marcadas en la lista); `[]` = todas. */
export const sedesHabilitadas = (form: StockTiendaForm, sedes: SedeEmpresa[]): number[] =>
    form.sedesIds.length ? form.sedesIds : sedes.map((s) => s.id);

/** Marcar/desmarcar una sede. Si quedan todas marcadas se guarda `[]` (incluye las nuevas). */
export function alternarSede(form: StockTiendaForm, sedes: SedeEmpresa[], id: number): StockTiendaForm {
    const actuales = sedesHabilitadas(form, sedes);
    const siguiente = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
    if (siguiente.length === 0) return form; // al menos una
    const todas = sedes.every((s) => siguiente.includes(s.id));
    const sedesIds = todas ? [] : siguiente;
    // La sede con la que abre la tienda tiene que estar habilitada.
    const sedeId = form.sedeId && !(todas || siguiente.includes(form.sedeId)) ? null : form.sedeId;
    return { ...form, sedesIds, sedeId };
}

export function validarStockTienda(form: StockTiendaForm, sedes: SedeEmpresa[]): string | null {
    if (sedes.length <= 1) return null;
    if (form.modo === 'CLIENTE' && form.sedeId && form.sedesIds.length && !form.sedesIds.includes(form.sedeId)) {
        return 'La sede con la que abre la tienda debe estar entre las sedes habilitadas.';
    }
    return null;
}

/**
 * Lo que va en `PATCH /tienda/config`. Solo si cambió (o si se confirma el
 * modo): mandar `tiendaStockModo` marca la elección del dueño y apaga el aviso,
 * así que guardar otra cosa de la página no debe mandarlo.
 */
export function payloadStockTienda(
    form: StockTiendaForm,
    original: StockTiendaForm,
    sedes: SedeEmpresa[],
    confirmar = false,
): Record<string, unknown> {
    if (!confirmar && !stockTiendaCambio(form, original)) return {};
    const principal = sedes.find((s) => s.esPrincipal)?.id ?? null;
    return {
        tiendaStockModo: form.modo,
        tiendaSedeId: form.sedeId && form.sedeId !== principal ? form.sedeId : null,
        tiendaSedesIds: form.modo === 'SEDE' ? original.sedesIds : form.sedesIds,
    };
}
