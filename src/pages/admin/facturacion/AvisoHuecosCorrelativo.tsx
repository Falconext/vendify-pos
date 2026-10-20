/**
 * Los correlativos que faltan en las series de la empresa.
 *
 * Lo pidió la contadora de un cliente: ante SUNAT un número faltante hay que
 * poder justificarlo, y hasta ahora no había forma de verlos sin recorrer la
 * lista a mano.
 *
 * Los huecos se abren cuando SUNAT rechaza un comprobante por datos y la
 * persona rehace la venta antes de que el rechazado se borre: la nueva ya se
 * llevó el número siguiente. Desde que la emisión rellena huecos del mismo día
 * casi no vuelve a pasar, pero los viejos quedan y hay que explicarlos.
 *
 * Si no falta ningún número no se muestra nada: un aviso que siempre está deja
 * de leerse.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { get } from '@/utils/fetch';

interface Hueco {
    serie: string;
    tipoDoc: string;
    desde: number;
    hasta: number;
    cuantos: number;
    entre: [string, string];
}

const rotulo = (h: Hueco) =>
    h.desde === h.hasta ? `${h.serie}-${h.desde}` : `${h.serie}-${h.desde} al ${h.hasta}`;

export const AvisoHuecosCorrelativo = () => {
    const [huecos, setHuecos] = useState<Hueco[]>([]);
    const [abierto, setAbierto] = useState(false);

    useEffect(() => {
        let vivo = true;
        get('comprobante/huecos-correlativo')
            .then((r: any) => {
                if (vivo) setHuecos(Array.isArray(r?.data) ? r.data : []);
            })
            // Es informativo: si falla, la pantalla sigue funcionando igual.
            .catch(() => undefined);
        return () => {
            vivo = false;
        };
    }, []);

    if (!huecos.length) return null;
    const total = huecos.reduce((n, h) => n + h.cuantos, 0);

    return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/15">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="flex w-full items-center gap-2 text-left text-sm text-amber-900 dark:text-amber-200"
            >
                <Icon icon="solar:danger-triangle-bold" className="flex-none text-lg" />
                <span className="min-w-0 flex-1">
                    <b>
                        {total === 1
                            ? 'Falta 1 correlativo'
                            : `Faltan ${total} correlativos`}
                    </b>{' '}
                    en tus series. SUNAT puede pedirte que los justifiques.
                </span>
                <Icon
                    icon={abierto ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                    className="flex-none"
                />
            </button>

            {abierto && (
                <ul className="mt-3 space-y-1 border-t border-amber-200 pt-3 text-xs text-amber-900 dark:border-amber-900/40 dark:text-amber-200">
                    {huecos.map((h) => (
                        <li key={`${h.serie}-${h.desde}`} className="flex flex-wrap gap-x-2">
                            <span className="font-semibold">{rotulo(h)}</span>
                            <span className="text-amber-700 dark:text-amber-300/80">
                                se abrió entre el {h.entre[0]} y el {h.entre[1]}
                            </span>
                        </li>
                    ))}
                    <li className="pt-2 text-amber-700 dark:text-amber-300/80">
                        Suele pasar cuando SUNAT rechaza un comprobante y se rehace la venta
                        enseguida. Si el hueco es del día, la próxima emisión lo reutiliza sola.
                    </li>
                </ul>
            )}
        </div>
    );
};

export default AvisoHuecosCorrelativo;
