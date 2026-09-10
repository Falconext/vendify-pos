const DAY_MS = 86_400_000;

/** Día calendario de Lima de una fecha, como timestamp UTC a medianoche. */
const diaLimaUtc = (fecha: Date): number => {
    const [yyyy, mm, dd] = fecha
        .toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
        .split('-')
        .map(Number);
    return Date.UTC(yyyy, mm - 1, dd);
};

/**
 * Día calendario objetivo como timestamp UTC a medianoche.
 * Un string "YYYY-MM-DD" (sin hora) se toma literal como ese día; un timestamp
 * completo se convierte al día que corresponde en Lima.
 */
const resolverDiaUtc = (fecha: string | Date): number | null => {
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [yyyy, mm, dd] = fecha.split('-').map(Number);
        return Date.UTC(yyyy, mm - 1, dd);
    }
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : diaLimaUtc(d);
};

/**
 * Días calendario (hora de Lima) que faltan para que venza `fecha`.
 * 0 = vence hoy (vigente hasta fin del día); negativo = vencida.
 * Misma fórmula que el backend (common/utils/fecha-lima.ts): la hora guardada
 * en la fecha de expiración se ignora, solo cuenta el día en Lima.
 */
export const diasRestantesLima = (fecha?: string | Date | null): number | null => {
    if (!fecha) return null;
    const dia = resolverDiaUtc(fecha);
    if (dia === null) return null;
    return Math.round((dia - diaLimaUtc(new Date())) / DAY_MS);
};

/** dd/mm/yyyy de la fecha vista en Lima. */
export const formatFechaLima = (fecha?: string | Date | null): string => {
    if (!fecha) return '—';
    const dia = resolverDiaUtc(fecha);
    if (dia === null) return '—';
    return new Date(dia).toLocaleDateString('es-PE', { timeZone: 'UTC' });
};

/**
 * Día (YYYY-MM-DD) de una fecha, en hora de Lima.
 *
 * No usar `fechaIso.slice(0, 10)`: eso toma el día UTC y, como Lima va 5 horas
 * atrás, **toda venta posterior a las 19:00 hora Lima ya es del día siguiente en
 * UTC**. Filtrar por ese texto hacía que las ventas de la tarde-noche se
 * contaran en el día equivocado y que las del último día del mes se fueran al
 * mes siguiente.
 */
export const diaLima = (fecha?: string | Date | null): string => {
    if (!fecha) return '';
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

/** Hoy (YYYY-MM-DD) en hora de Lima. */
export const hoyLima = (): string =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

/** `true` si la fecha cae dentro del rango [desde, hasta], ambos YYYY-MM-DD. */
export const dentroDelRangoLima = (
    fecha: string | Date | null | undefined,
    desde: string,
    hasta: string,
): boolean => {
    const dia = diaLima(fecha);
    return dia ? dia >= desde && dia <= hasta : false;
};
