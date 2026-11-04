import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import useAlertStore from '@/zustand/alert';

/** La clave de retiro en la fila del panel, lista para copiarla y mandársela al cliente. */
export default function ClaveRetiroCelda({ clave }: { clave?: string | null }) {
    const [copiada, setCopiada] = useState(false);
    const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(espera.current), []);

    const valor = String(clave ?? '').trim();
    if (!valor) return <span className="text-xs text-gray-400">—</span>;

    const copiar = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(valor);
            setCopiada(true);
            clearTimeout(espera.current);
            espera.current = setTimeout(() => setCopiada(false), 1500);
        } catch {
            // Sin permiso de portapapeles la clave sigue a la vista para copiarla a mano.
            useAlertStore.getState().alert('No se pudo copiar la clave', 'error');
        }
    };

    return (
        <button
            type="button"
            data-testid="panel-clave-retiro"
            onClick={copiar}
            title="Copiar clave de retiro"
            aria-label={`Copiar clave de retiro ${valor}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1 font-mono text-xs font-black tracking-wider text-gray-800 transition hover:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
            {valor}
            <Icon icon={copiada ? 'solar:check-circle-bold' : 'solar:copy-linear'} className={copiada ? 'text-emerald-500' : 'text-gray-400'} width={14} />
        </button>
    );
}
