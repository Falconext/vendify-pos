/**
 * Vigentes / vencidas y "más activas" en /administrador/empresas.
 *
 * Con el tiempo se juntan muchas empresas vencidas (demos que no compraron,
 * clientes que no renovaron) y tapaban a las que sí están usando el sistema.
 * La vista por defecto es la de vigentes; las vencidas siguen a un clic.
 *
 * "Activa" se mide con lo que el servidor ya calcula por empresa (`salud`):
 * cuántos comprobantes emitió en los últimos 7 y 30 días.
 */

export type VistaEmpresas = 'VIGENTES' | 'VENCIDAS' | 'TODAS';
export type OrdenEmpresas = 'RECIENTES' | 'VENCIMIENTO' | 'ACTIVIDAD';

interface FilaEmpresa {
    fechaActivacion?: string | Date | null;
    grupo?: string;
    diasRestantes?: number | null;
    acceso?: 'vigente' | 'gracia' | 'bloqueada';
    salud?: { ventas7?: number; ventas30?: number; diasSinVender?: number } | null;
}

/** Venció su suscripción (con o sin días de gracia). Sin fecha = vigente. */
export const estaVencida = (e: FilaEmpresa): boolean =>
    e.diasRestantes !== null && e.diasRestantes !== undefined && Number(e.diasRestantes) < 0;

export const pasaVista = (e: FilaEmpresa, vista: VistaEmpresas): boolean => {
    if (vista === 'VIGENTES') return !estaVencida(e);
    if (vista === 'VENCIDAS') return estaVencida(e);
    return true;
};

export const contarPorVista = (filas: FilaEmpresa[]) => {
    const vencidas = filas.filter(estaVencida);
    return {
        vigentes: filas.length - vencidas.length,
        vencidas: vencidas.length,
        todas: filas.length,
        // Dentro de las vencidas: las que todavía pueden entrar (gracia) son
        // las que conviene llamar primero.
        enGracia: vencidas.filter((e) => e.acceso === 'gracia').length,
        sinAcceso: vencidas.filter((e) => e.acceso === 'bloqueada').length,
    };
};

const ventas30 = (e: FilaEmpresa) => Number(e.salud?.ventas30 ?? 0);
const ventas7 = (e: FilaEmpresa) => Number(e.salud?.ventas7 ?? 0);
const diasSinVender = (e: FilaEmpresa) => {
    const d = e.salud?.diasSinVender;
    return d === null || d === undefined ? Number.POSITIVE_INFINITY : Number(d);
};

/** Más comprobantes en 30 días primero; a igualdad, la de la última semana y la que vendió más reciente. */
export const compararActividad = (a: FilaEmpresa, b: FilaEmpresa): number =>
    ventas30(b) - ventas30(a) || ventas7(b) - ventas7(a) || diasSinVender(a) - diasSinVender(b);

export const ordenarPorActividad = <T extends FilaEmpresa>(filas: T[]): T[] => [...filas].sort(compararActividad);

/** Ranking de las que más facturan (solo vigentes y con al menos una venta en 30 días). */
export const masActivas = <T extends FilaEmpresa>(filas: T[], cuantas = 8): T[] =>
    ordenarPorActividad(filas.filter((e) => !estaVencida(e) && ventas30(e) > 0)).slice(0, cuantas);

/**
 * Año-mes ("2026-10") de una fecha de activación, en hora de Lima.
 *
 * Las que se dan de alta desde el formulario se guardan como fecha sola, a la
 * medianoche UTC: pasadas a Lima caerían el día anterior y una alta del 1 de
 * octubre contaría en septiembre. Esas se leen en UTC; las que tienen hora
 * (pase a producción, demo rápida) se leen en Lima.
 */
export const mesDeAlta = (valor: string | Date | null | undefined): string | null => {
    if (!valor) return null;
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return null;
    const soloFecha = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
    if (soloFecha) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(d);
};

const altaEnMs = (e: FilaEmpresa): number => {
    const t = e.fechaActivacion ? new Date(e.fechaActivacion).getTime() : NaN;
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/** La última empresa registrada (o pasada a producción) arriba. */
export const ordenarPorAlta = <T extends FilaEmpresa>(filas: T[]): T[] => [...filas].sort((a, b) => altaEnMs(b) - altaEnMs(a));

/**
 * Clientes nuevos de un mes: los que pagan (mensual o anual, no demo) y se
 * activaron ese mes. Una demo que pasa a producción cuenta el mes en que pasa:
 * el pase reinicia su fecha de activación. Es la misma regla que usa Finanzas.
 */
export const esClienteNuevoDelMes = (e: FilaEmpresa, mes: string): boolean =>
    e.grupo !== 'DEMO' && mesDeAlta(e.fechaActivacion) === mes;

export const mesActualLima = (hoy: Date = new Date()): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(hoy);

export const mesAnterior = (mes: string): string => {
    const [y, m] = mes.split('-').map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

export const clientesNuevos = (filas: FilaEmpresa[], hoy: Date = new Date()) => {
    const mes = mesActualLima(hoy);
    const anterior = mesAnterior(mes);
    return {
        mes,
        esteMes: filas.filter((e) => esClienteNuevoDelMes(e, mes)).length,
        mesAnterior: filas.filter((e) => esClienteNuevoDelMes(e, anterior)).length,
    };
};
