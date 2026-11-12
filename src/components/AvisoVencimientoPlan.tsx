import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/zustand/auth';
import { diasRestantesLima, formatFechaLima } from '@/utils/fechaLima';

/** Desde cuántos días antes del vencimiento se muestra el aviso. */
const DIAS_AVISO = 7;
/** Días de prórroga tras el vencimiento (hasta las 11:59 p.m.). Igual que el backend. */
const DIAS_PRORROGA = 1;

/** Día siguiente al vencimiento (dd/mm/yyyy), último día de prórroga. */
const diaFinProrroga = (fecha: string | Date): string => {
    const d = new Date(fecha);
    d.setTime(d.getTime() + DIAS_PRORROGA * 86_400_000);
    return formatFechaLima(d);
};

/**
 * Mensaje del aviso según los días que faltan (Lima). null = no se muestra.
 * Mismos textos que la notificación diaria del backend (common/utils/aviso-plan.ts).
 */
export const mensajeVencimientoPlan = (
    fechaExpiracion?: string | Date | null,
): { texto: string; urgente: boolean } | null => {
    if (!fechaExpiracion) return null;
    const dias = diasRestantesLima(fechaExpiracion);
    if (dias === null || dias > DIAS_AVISO || dias < -DIAS_PRORROGA) return null;

    const vence = formatFechaLima(fechaExpiracion);
    if (dias < 0) {
        return {
            urgente: true,
            texto: `Tu plan venció el ${vence}. Hoy es tu último día de prórroga: a las 11:59 p.m. se bloqueará el acceso al sistema.`,
        };
    }
    if (dias === 0) {
        return {
            urgente: true,
            texto: `Tu plan vence hoy. Tienes prórroga hasta mañana ${diaFinProrroga(fechaExpiracion)} a las 11:59 p.m.; después ya no podrás entrar al sistema.`,
        };
    }
    if (dias === 1) {
        return { urgente: true, texto: `Tu plan vence mañana (${vence}).` };
    }
    return { urgente: dias <= 3, texto: `Te faltan ${dias} días para que venza tu plan (${vence}).` };
};

/** Aviso fijo arriba del contenido mientras el plan esté por vencer o en prórroga. */
const AvisoVencimientoPlan = () => {
    const { auth } = useAuthStore();
    const [cerrado, setCerrado] = useState(false);

    if (auth?.rol === 'ADMIN_SISTEMA' || auth?.rol === 'RESELLER') return null;
    const aviso = mensajeVencimientoPlan((auth?.empresa as any)?.fechaExpiracion);
    if (!aviso || cerrado) return null;

    return (
        <div
            role="alert"
            className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${aviso.urgente
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300'
                }`}
        >
            <Icon icon={aviso.urgente ? 'mdi:alert-circle' : 'mdi:clock-alert'} className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1">
                <span className="font-semibold">{aviso.texto}</span>{' '}
                Comunícate con tu asesor para renovarlo.
            </p>
            <button
                type="button"
                onClick={() => setCerrado(true)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            >
                <Icon icon="mdi:close" className="h-4 w-4" />
            </button>
        </div>
    );
};

export default AvisoVencimientoPlan;
