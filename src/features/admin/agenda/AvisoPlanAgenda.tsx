import { Icon } from '@iconify/react';
import { MENSAJE_SIN_PLAN } from './AgendaModel';

/** Lo que ve quien entra a la Agenda sin tenerla en su plan. */
export default function AvisoPlanAgenda() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <Icon icon="solar:calendar-bold-duotone" width={28} />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">Agenda</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Tu plan no incluye la Agenda</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{MENSAJE_SIN_PLAN}</p>
      </div>
    </div>
  );
}
