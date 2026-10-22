/**
 * Cómo se nombra un turno de caja en los avisos. La caja es por usuario: en
 * una sede con varios cajeros, "Cerrar turno del 16/10" aparecía tres veces
 * igual y parecía un duplicado (LA DESPENSA HM, 22-10). Con el cajero y el
 * turno se ve de quién es cada uno.
 */

const capitalizar = (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();

/** "VANESSA VIEIRA PEREIRA" → "Vanessa Vieira": nombre y primer apellido. */
export function nombreCajero(nombre: string | null | undefined): string {
    const partes = String(nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(capitalizar).join(' ');
}

const TURNOS: Record<string, string> = { MANANA: 'Mañana', MAÑANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };

/** "16/10 · Tarde · Liliana Serna" (sin año: los pendientes son de los últimos 60 días). */
export function etiquetaTurno(t: { fecha: string; turno?: string | null; usuario?: string | null }): string {
    const dia = new Date(t.fecha).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
    });
    const turno = t.turno ? TURNOS[t.turno.toUpperCase()] ?? capitalizar(t.turno) : '';
    return [dia, turno, nombreCajero(t.usuario)].filter(Boolean).join(' · ');
}

/** "21/10 5:05 p. m." */
export function desdeCuando(iso: string): string {
    const d = new Date(iso);
    const dia = d.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit' });
    const hora = d.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dia} ${hora}`;
}
