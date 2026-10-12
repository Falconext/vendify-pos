/**
 * Disponibilidad y prioridad de venta del producto.
 *
 * "Disponible" no es lo mismo que "con stock": muchos negocios no llevan
 * inventario real, y lo que importa para contestarle al cliente es si lo
 * pueden entregar. Vacío sigue deduciéndose del stock, que es lo correcto
 * para quien sí lo lleva.
 *
 * Los dos campos ya existían en la base, pero solo se podían poner por API:
 * el dueño no tenía dónde tocarlos, así que en la práctica no existían.
 */
import { Icon } from '@iconify/react';
import { useProductModalViewModel } from '../useProductModalViewModel';

type ViewProps = ReturnType<typeof useProductModalViewModel>;

const ACCENT = 'var(--accent, #7551FF)';

const OPCIONES: {
  valor: string;
  label: string;
  detalle: string;
  icon: string;
  clases: string;
}[] = [
  {
    valor: 'INMEDIATA',
    label: 'Disponible',
    detalle: 'Se entrega de inmediato.',
    icon: 'solar:check-circle-bold-duotone',
    clases:
      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  {
    valor: 'BAJO_PEDIDO',
    label: 'Bajo reserva',
    detalle: 'Se consigue; se ofrece sin prometer fecha.',
    icon: 'solar:calendar-bold-duotone',
    clases:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    valor: 'NO_DISPONIBLE',
    label: 'Agotado',
    detalle: 'Sin stock, pero puede volver.',
    icon: 'solar:close-circle-bold-duotone',
    clases:
      'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-300',
  },
  {
    valor: 'NO_COMERCIAL',
    label: 'Descontinuado',
    detalle: 'Ya no se vende y no va a volver.',
    icon: 'solar:forbidden-circle-bold-duotone',
    clases:
      'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
];

/** Los cuatro niveles que pidió el negocio, más "sin preferencia". */
const PRIORIDADES: { valor: number; label: string }[] = [
  { valor: 0, label: 'Sin preferencia' },
  { valor: 1, label: 'Baja' },
  { valor: 2, label: 'Media' },
  { valor: 3, label: 'Alta' },
  { valor: 4, label: 'Muy alta' },
];

export const ProductDisponibilidad: React.FC<{ vm: ViewProps }> = ({ vm }) => {
  const { formValues, handleChange } = vm as unknown as {
    formValues: Record<string, unknown>;
    handleChange: (e: { target: { name: string; value: string } }) => void;
  };

  // Sin valor guardado se asume disponible: es lo que el negocio espera de un
  // producto que acaba de cargar.
  const actual = String(formValues?.disponibilidad ?? 'INMEDIATA');
  const prioridad = Number(formValues?.prioridadVenta ?? 0);

  const poner = (name: string, value: string) =>
    handleChange({ target: { name, value } });

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-slate-800">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
        <Icon icon="solar:bag-check-bold-duotone" style={{ color: ACCENT }} />
        Qué prometerle al cliente
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            type="button"
            data-testid={`disp-${o.valor}`}
            title={o.detalle}
            onClick={() => poner('disponibilidad', o.valor)}
            className={`rounded-lg border p-2 text-left transition-colors ${
              actual === o.valor
                ? o.clases
                : 'border-gray-200 text-gray-500 dark:border-slate-700 dark:text-gray-400'
            }`}
          >
            <Icon icon={o.icon} className="text-base" />
            <p className="text-[11px] font-black leading-tight">{o.label}</p>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">
        {OPCIONES.find((o) => o.valor === actual)?.detalle}
      </p>

      {/* La escala es la que acepta el backend (1 a 4). Un campo libre dejaba
          poner valores que la API rechaza, y el usuario se habría enterado
          recién al guardar. */}
      <div className="mt-3 border-t border-gray-100 pt-2 dark:border-slate-800">
        <p className="mb-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">
          Empuje al ofrecerlo
        </p>
        <div className="grid grid-cols-5 gap-1">
          {PRIORIDADES.map((p) => (
            <button
              key={p.valor}
              type="button"
              data-testid={`prio-${p.valor}`}
              onClick={() => poner('prioridadVenta', String(p.valor))}
              className={`rounded-lg border py-1 text-[11px] font-black transition-colors ${
                prioridad === p.valor
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300'
                  : 'border-gray-200 text-gray-500 dark:border-slate-700 dark:text-gray-400'
              }`}
              style={prioridad === p.valor ? { borderColor: ACCENT } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          Entre productos que sirven para lo mismo, se ofrece primero el de
          mayor empuje. Sale en el Excel del catálogo.
        </p>
      </div>
    </div>
  );
};
