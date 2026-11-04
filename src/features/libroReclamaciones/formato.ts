/** Fechas en hora de Lima: el plazo legal se cuenta en el Perú, no en la zona del navegador. */
const ZONA = 'America/Lima';

export function fechaLima(iso: string | null | undefined, conHora = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', {
    timeZone: ZONA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Fecha de hoy en Lima como `AAAA-MM-DD` (para los filtros de exportación). */
export function hoyLima(ahora = new Date()): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: ZONA });
}

export function soles(monto: number | string | null | undefined): string {
  if (monto === null || monto === undefined || monto === '') return '—';
  const n = Number(monto);
  return Number.isFinite(n) ? `S/ ${n.toFixed(2)}` : '—';
}

export type NivelPlazo = 'vencido' | 'urgente' | 'aTiempo' | 'respondido';

/** Semáforo del plazo: rojo vencido, ámbar ≤3 días hábiles, verde el resto. */
export function nivelPlazo(dias: number | null, estado: string): NivelPlazo {
  if (estado === 'RESPONDIDO' || dias === null) return 'respondido';
  if (estado === 'VENCIDO' || dias < 0) return 'vencido';
  if (dias <= 3) return 'urgente';
  return 'aTiempo';
}

export function textoPlazo(dias: number | null, estado: string): string {
  const nivel = nivelPlazo(dias, estado);
  if (nivel === 'respondido') return 'Respondido';
  const d = dias ?? 0;
  if (nivel === 'vencido') {
    const atraso = Math.abs(d);
    return atraso === 0 ? 'Vencido' : `Vencido hace ${atraso} d. hábil${atraso === 1 ? '' : 'es'}`;
  }
  if (d === 0) return 'Vence hoy';
  return `${d} d. hábil${d === 1 ? '' : 'es'}`;
}
