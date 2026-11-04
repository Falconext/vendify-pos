import axios from 'axios';
import apiClient from '@/utils/apiClient';
import type {
  EstadoReclamo, HojaReclamacionPayload, ListadoReclamos, ProveedorLibro, Reclamo, ReclamoRegistrado,
} from './tipos';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

/** El backend envuelve casi todo en `{ data }`; algunos endpoints no. */
function cuerpo<T>(res: { data?: unknown }): T {
  const d = res?.data as { data?: unknown } | undefined;
  return ((d && typeof d === 'object' && 'data' in d ? d.data : d) ?? null) as T;
}

/** Mensaje legible de un error de la API. */
export function mensajeDeError(e: unknown, porDefecto: string): string {
  if (axios.isAxiosError(e)) {
    const m = (e.response?.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(m) && m.length) return String(m[0]);
    if (typeof m === 'string' && m.trim()) return m;
    if (e.response?.status === 429) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  }
  return porDefecto;
}

const rutaPublica = (slug: string) => `${BASE_URL}/public/store/${encodeURIComponent(slug)}/libro-reclamaciones`;

// ─── Público (tienda) ────────────────────────────────────────────────────────

export async function obtenerProveedor(slug: string): Promise<ProveedorLibro> {
  const res = await axios.get(rutaPublica(slug));
  return cuerpo<{ proveedor: ProveedorLibro }>(res).proveedor;
}

export async function registrarReclamo(slug: string, payload: HojaReclamacionPayload): Promise<ReclamoRegistrado> {
  const res = await axios.post(rutaPublica(slug), payload);
  return cuerpo<ReclamoRegistrado>(res);
}

/** URL pública de la constancia en PDF (protegida por el token del reclamo). */
export function urlConstanciaPublica(slug: string, codigo: string, token: string): string {
  return `${rutaPublica(slug)}/${encodeURIComponent(codigo)}/constancia?token=${encodeURIComponent(token)}`;
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export interface FiltrosLibro {
  estado?: EstadoReclamo;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listarReclamos(filtros: FiltrosLibro): Promise<ListadoReclamos> {
  const params: Record<string, string | number> = {};
  if (filtros.estado) params.estado = filtros.estado;
  if (filtros.search?.trim()) params.search = filtros.search.trim();
  params.page = filtros.page ?? 1;
  params.limit = filtros.limit ?? 20;
  const res = await apiClient.get('/libro-reclamaciones', { params });
  const r = cuerpo<Partial<ListadoReclamos>>(res) || {};
  return {
    data: Array.isArray(r.data) ? r.data : [],
    total: Number(r.total ?? 0),
    resumen: {
      pendientes: Number(r.resumen?.pendientes ?? 0),
      vencidos: Number(r.resumen?.vencidos ?? 0),
      porVencer: Number(r.resumen?.porVencer ?? 0),
      respondidos: Number(r.resumen?.respondidos ?? 0),
    },
  };
}

export async function obtenerReclamo(id: number): Promise<Reclamo> {
  return cuerpo<Reclamo>(await apiClient.get(`/libro-reclamaciones/${id}`));
}

export async function responderReclamo(id: number, respuesta: string): Promise<Reclamo> {
  return cuerpo<Reclamo>(await apiClient.post(`/libro-reclamaciones/${id}/respuesta`, { respuesta: respuesta.trim() }));
}

function guardarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function descargarConstancia(reclamo: Pick<Reclamo, 'id' | 'codigo'>): Promise<void> {
  const res = await apiClient.get(`/libro-reclamaciones/${reclamo.id}/constancia`, { responseType: 'blob', timeout: 60_000 });
  guardarBlob(res.data as Blob, `hoja-reclamacion-${reclamo.codigo}.pdf`);
}

export async function exportarExcel(desde: string, hasta: string): Promise<void> {
  const res = await apiClient.get('/libro-reclamaciones/exportar', { params: { desde, hasta }, responseType: 'blob', timeout: 120_000 });
  guardarBlob(res.data as Blob, `libro-reclamaciones-${desde}_${hasta}.xlsx`);
}
