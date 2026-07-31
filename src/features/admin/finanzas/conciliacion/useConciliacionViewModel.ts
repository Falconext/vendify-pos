import { useState } from 'react';
import useAlertStore from '@/zustand/alert';
import * as api from '@/utils/api/finanzas';
import type {
  IResultadoConciliacion,
  IPlantillaExcel,
} from './ConciliacionModel';

const leerBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export type FiltroEstado = 'TODOS' | 'CONCILIADO' | 'PENDIENTE';

export function useConciliacionViewModel() {
  const alertStore = useAlertStore();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resultado, setResultado] = useState<IResultadoConciliacion | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroEstado>('TODOS');

  const conciliar = async () => {
    if (!archivo) {
      alertStore.alert('Selecciona el Excel del banco primero', 'error');
      return;
    }
    setCargando(true);
    setResultado(null);
    try {
      const base64 = await leerBase64(archivo);
      const res = await api.importarConciliacion(
        base64,
        fechaInicio || undefined,
        fechaFin || undefined,
      );
      if (res.success && res.data) {
        setResultado(res.data as IResultadoConciliacion);
        const r = (res.data as IResultadoConciliacion).resumen;
        alertStore.alert(
          `Conciliación lista: ${r.conciliados} conciliados, ${r.pendientesBanco} pendientes`,
          'success',
        );
      } else {
        alertStore.alert(res.error || 'No se pudo conciliar', 'error');
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'Error al conciliar', 'error');
    } finally {
      setCargando(false);
    }
  };

  const descargarPlantilla = async () => {
    try {
      const res = await api.getPlantillaConciliacion();
      if (res.success && res.data) {
        const { nombreArchivo, base64 } = res.data as IPlantillaExcel;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'Error al descargar plantilla', 'error');
    }
  };

  const movimientosFiltrados =
    resultado?.movimientos.filter((m) =>
      filtro === 'TODOS' ? true : m.estado === filtro,
    ) ?? [];

  return {
    archivo,
    setArchivo,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    resultado,
    cargando,
    filtro,
    setFiltro,
    movimientosFiltrados,
    conciliar,
    descargarPlantilla,
  };
}
