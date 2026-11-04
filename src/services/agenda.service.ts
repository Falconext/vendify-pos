/**
 * Agenda de "Mi negocio". Espeja el contrato del backend (`/agenda/*`); los
 * tipos viven en el modelo de la pantalla.
 */
import apiClient from '@/utils/apiClient';
import type {
  AgendaEventoInput,
  AgendaOcurrencia,
  AgendaResumen,
  AgendaTipo,
  AgendaUsuarioMin,
} from '@/features/admin/agenda/AgendaModel';

/** Saca el payload del sobre `{ code, message, data }` (mira si `data` existe). */
const datos = <T,>(r: { data: unknown }): T => {
  const sobre = r.data;
  if (sobre && typeof sobre === 'object' && 'data' in sobre) return (sobre as { data: T }).data;
  return sobre as T;
};

export interface FiltroEventos {
  desde: string;
  hasta: string;
  tipos?: AgendaTipo[];
  soloMios?: boolean;
}

export const agendaService = {
  eventos: ({ desde, hasta, tipos, soloMios }: FiltroEventos) => {
    const q = new URLSearchParams({ desde, hasta });
    if (tipos && tipos.length) q.set('tipos', tipos.join(','));
    if (soloMios) q.set('soloMios', 'true');
    return apiClient.get(`/agenda/eventos?${q.toString()}`).then(datos<AgendaOcurrencia[]>);
  },

  crear: (input: AgendaEventoInput) =>
    apiClient.post('/agenda/eventos', input).then(datos<AgendaOcurrencia>),

  editar: (eventoId: number, cambios: Partial<AgendaEventoInput>) =>
    apiClient.patch(`/agenda/eventos/${eventoId}`, cambios).then(datos<AgendaOcurrencia>),

  eliminar: (eventoId: number) =>
    apiClient.delete(`/agenda/eventos/${eventoId}`).then(datos<{ ok: true }>),

  completar: (eventoId: number, cuerpo: { ocurrencia?: string; completado: boolean }) =>
    apiClient.post(`/agenda/eventos/${eventoId}/completar`, cuerpo).then(datos<AgendaOcurrencia>),

  resumen: () => apiClient.get('/agenda/resumen').then(datos<AgendaResumen>),

  usuarios: () => apiClient.get('/agenda/usuarios').then(datos<AgendaUsuarioMin[]>),
};
