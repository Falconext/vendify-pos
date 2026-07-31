import { get, post } from '../fetch';
import type {
  IResultadoConciliacion,
  IPlantillaExcel,
} from '@/features/admin/finanzas/conciliacion/ConciliacionModel';

const BASE = '/finanzas';

// ── Conciliación bancaria ──────────────────────────────────────────────────
export const getPlantillaConciliacion = () =>
  get<IPlantillaExcel>(`${BASE}/conciliacion/plantilla`);

export const importarConciliacion = (
  archivoBase64: string,
  fechaInicio?: string,
  fechaFin?: string,
) =>
  post<IResultadoConciliacion>(`${BASE}/conciliacion/importar`, {
    archivoBase64,
    fechaInicio,
    fechaFin,
  });
