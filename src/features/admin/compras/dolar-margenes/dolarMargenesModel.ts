import type { EstadoReposicion, FilaReposicion } from '@/services/dolarMargenes.service';

export type FiltroEstado = 'todos' | EstadoReposicion;

export const ESTADOS: Record<EstadoReposicion, { label: string; ayuda: string; chip: string; icon: string }> = {
    riesgo: {
        label: 'En riesgo',
        ayuda: 'El dólar subió y el precio ya no deja tu margen sobre lo que cuesta reponer.',
        chip: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-900/40',
        icon: 'solar:danger-triangle-bold',
    },
    'margen-bajo': {
        label: 'Margen bajo',
        ayuda: 'El dólar casi no se movió, pero el precio no llega a tu margen objetivo.',
        chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-900/40',
        icon: 'solar:graph-down-bold',
    },
    bajo: {
        label: 'Dólar bajó',
        ayuda: 'Reponer cuesta menos que cuando compraste: puedes competir en precio.',
        chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:ring-sky-900/40',
        icon: 'solar:arrow-down-bold',
    },
    ok: {
        label: 'Bien',
        ayuda: 'El precio deja tu margen al dólar de hoy.',
        chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900/40',
        icon: 'solar:check-circle-bold',
    },
};

const dosDecimales = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
export const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', dosDecimales)}`;
export const dolares = (n: number) => `US$ ${n.toLocaleString('es-PE', dosDecimales)}`;
export const enMoneda = (n: number, moneda: string) => (moneda === 'USD' ? dolares(n) : soles(n));
export const tc = (n: number) => n.toFixed(3);
export const pct = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`);
export const fechaCorta = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', '');

export function filtrarFilas(filas: FilaReposicion[], estado: FiltroEstado, busqueda: string) {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(
        (f) =>
            (estado === 'todos' || f.estado === estado) &&
            (!q || f.descripcion.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q)),
    );
}

/** El precio que se va a aplicar: el escrito a mano, si hay, o el sugerido. */
export const precioAAplicar = (f: FilaReposicion, editados: Record<number, string>) => {
    const escrito = editados[f.productoId];
    return escrito !== undefined ? Number(escrito) : f.precioSugerido;
};
