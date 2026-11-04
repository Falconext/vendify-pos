import { memo } from 'react';
import { iniciales, type AgendaOcurrencia } from './AgendaModel';

const TONOS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
];

/** Iniciales con un color fijo por usuario. */
export const Avatar = memo(function Avatar({ id, nombre, size = 28 }: { id: number; nombre: string; size?: number }) {
  return (
    <span
      title={nombre}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${TONOS[Math.abs(id) % TONOS.length]}`}
      style={{ width: size, height: size }}
    >
      {iniciales(nombre)}
    </span>
  );
});

/** Círculo para marcar hecho. Detiene el clic para no abrir el evento. */
export const CheckHecho = memo(function CheckHecho({
  evento,
  onCompletar,
}: {
  evento: AgendaOcurrencia;
  onCompletar: (e: AgendaOcurrencia, valor: boolean) => void;
}) {
  if (!evento.puedeCompletar) return null;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={evento.completado}
      aria-label={evento.completado ? `Marcar "${evento.titulo}" como pendiente` : `Marcar "${evento.titulo}" como hecho`}
      title={evento.completado ? 'Marcar como pendiente' : 'Marcar como hecho'}
      onClick={(ev) => {
        ev.stopPropagation();
        onCompletar(evento, !evento.completado);
      }}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        evento.completado
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-gray-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600'
      }`}
    >
      <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    </button>
  );
});

export const cardCls = 'rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]';
