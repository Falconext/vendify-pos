import { memo } from 'react';
import { nivelPlazo, textoPlazo, type NivelPlazo } from './formato';

const ESTILO: Record<NivelPlazo, string> = {
  vencido: 'bg-rose-50 text-rose-700 ring-rose-200',
  urgente: 'bg-amber-50 text-amber-700 ring-amber-200',
  aTiempo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  respondido: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** Días hábiles restantes con semáforo: rojo vencido, ámbar ≤3, verde a tiempo. */
function BadgePlazo({ dias, estado }: { dias: number | null; estado: string }) {
  const nivel = nivelPlazo(dias, estado);
  return (
    <span data-nivel={nivel} className={`inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${ESTILO[nivel]}`}>
      {textoPlazo(dias, estado)}
    </span>
  );
}

export default memo(BadgePlazo);
