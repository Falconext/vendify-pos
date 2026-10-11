import { Icon } from '@iconify/react/dist/iconify.js';

export interface IncidenciaSunat {
  /** Hay comprobantes esperando respuesta de SUNAT (solo fallos de red). */
  activa: boolean;
  cantidad: number;
}

/**
 * Aviso de que SUNAT no está respondiendo, en la lista de comprobantes.
 *
 * Va aquí y no en un modal a propósito: el susto aparece mirando la lista, con
 * el "Fallido Envío" en rojo delante, y es ahí donde el empresario decide
 * reemitir o anular — lo único que de verdad hace daño, porque rompe
 * correlativos y duplica. Un modal se cierra sin leerse; esto queda al lado del
 * problema mientras dure, y desaparece solo cuando el reenvío automático vacía
 * la cola.
 */
export default function AvisoIncidenciaSunat({ incidencia }: { incidencia?: IncidenciaSunat | null }) {
  if (!incidencia?.activa) return null;

  const n = Number(incidencia.cantidad || 0);
  const cuantos =
    n === 1 ? 'Tienes 1 comprobante esperando respuesta de SUNAT.' : `Tienes ${n} comprobantes esperando respuesta de SUNAT.`;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
    >
      <Icon icon="solar:clock-circle-bold-duotone" className="mt-0.5 shrink-0 text-xl text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 text-sm">
        <p className="font-bold text-amber-900 dark:text-amber-200">SUNAT está demorando en responder</p>
        <p className="mt-0.5 leading-5 text-amber-800 dark:text-amber-300/90">
          {cuantos} No es un problema de tu sistema ni de tus datos, y tus comprobantes son válidos.
          Se reenvían solos y pasarán a <b>Aceptado</b> en cuanto SUNAT responda.{' '}
          <b>No los vuelvas a emitir ni los anules.</b>
        </p>
      </div>
    </div>
  );
}
