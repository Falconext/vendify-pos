import { useRef } from 'react';
import { Icon } from '@iconify/react';
import { useConciliacionViewModel, type FiltroEstado } from './useConciliacionViewModel';
import { PeriodoSelector } from '../shared/PeriodoSelector';
import { COLUMNAS_BANCO, origenLabel } from './ConciliacionModel';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(n || 0);

const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'CONCILIADO', label: 'Conciliados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
];

export default function ConciliacionView() {
  const vm = useConciliacionViewModel();
  const fileRef = useRef<HTMLInputElement>(null);
  const r = vm.resultado?.resumen;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Conciliación bancaria
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sube el Excel del banco y crúzalo con las ventas y compras del sistema por número de operación.
        </p>
      </div>

      {/* Instrucciones + plantilla */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Columnas esperadas del banco</p>
          <button
            onClick={vm.descargarPlantilla}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Icon icon="solar:download-minimalistic-bold" width={16} /> Descargar plantilla
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLUMNAS_BANCO.map((c) => (
            <span
              key={c}
              className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-gray-300"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          La primera fila debe ser el encabezado. <b>NumeroOperacion</b> es obligatorio (las filas sin operación se omiten).
          Tipo admite <b>ABONO</b> (venta) o <b>CARGO</b> (compra).
        </p>
      </div>

      {/* Carga + rango */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => vm.setArchivo(e.target.files?.[0] ?? null)}
        />
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-indigo-400 dark:border-slate-700"
        >
          <Icon icon="solar:cloud-upload-bold-duotone" width={40} className="mx-auto mb-2 text-indigo-500" />
          {vm.archivo ? (
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{vm.archivo.name}</p>
          ) : (
            <p className="text-sm text-gray-500">Haz clic para seleccionar el Excel del banco (.xlsx / .csv)</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Período a conciliar · {vm.periodo.label}</label>
            {/* Día · Mes · Rango, el mismo selector que en las demás pestañas. */}
            <div className="flex flex-wrap items-center gap-2">
              <PeriodoSelector vm={vm.periodo} />
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={vm.conciliar}
              disabled={!vm.archivo || vm.cargando}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Icon icon={vm.cargando ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={18} />
              {vm.cargando ? 'Conciliando…' : 'Conciliar'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Solo se comparan los pagos del sistema con número de operación emitidos en el período elegido (día, mes o rango).
        </p>
      </div>

      {/* Resumen */}
      {r && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Mov. banco" value={r.movimientosBanco} sub={fmt(r.montoBanco)} color="slate" />
          <Kpi label="Conciliados" value={r.conciliados} sub={fmt(r.montoConciliado)} color="emerald" />
          <Kpi label="Pend. banco" value={r.pendientesBanco} sub={fmt(r.montoPendienteBanco)} color="amber" />
          <Kpi label="Pend. sistema" value={r.pendientesSistema} sub="sin match en banco" color="rose" />
          <Kpi label="Difs. de monto" value={r.diferenciasMonto} sub="montos que no cuadran" color="orange" />
        </div>
      )}

      {/* Observaciones (se incluyen en el PDF y el Excel) */}
      {vm.resultado && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <label className="mb-1.5 block text-sm font-semibold text-gray-900 dark:text-white">
            Observaciones (opcional)
          </label>
          <textarea
            value={vm.observaciones}
            onChange={(e) => vm.setObservaciones(e.target.value)}
            rows={3}
            placeholder="Notas para la conciliación (se incluirán al exportar a PDF y Excel)…"
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
          />
        </div>
      )}

      {/* Tabla banco vs sistema */}
      {vm.resultado && (
        <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-slate-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Movimientos del banco</p>
            <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={vm.guardarConciliacion}
              disabled={vm.guardando}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Icon icon={vm.guardando ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={15} />
              {vm.guardando ? 'Guardando…' : 'Guardar conciliación'}
            </button>
            <button
              onClick={vm.descargarExcel}
              disabled={vm.generandoExcel}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-slate-800"
            >
              <Icon icon={vm.generandoExcel ? 'svg-spinners:180-ring' : 'solar:file-download-bold'} width={15} />
              {vm.generandoExcel ? 'Generando…' : 'Exportar Excel'}
            </button>
            <button
              onClick={vm.descargarPdf}
              disabled={vm.generandoPdf}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
            >
              <Icon icon={vm.generandoPdf ? 'svg-spinners:180-ring' : 'solar:file-download-bold'} width={15} />
              {vm.generandoPdf ? 'Generando…' : 'Guardar PDF'}
            </button>
            <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => vm.setFiltro(f.value)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    vm.filtro === f.value
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-slate-800">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">N° Operación</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto banco</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Documento sistema</th>
                  <th className="px-4 py-3 text-right">Monto sistema</th>
                  <th className="px-4 py-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {vm.movimientosFiltrados.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 dark:border-slate-800/60">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.fecha ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800 dark:text-gray-200">{m.operacion}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmt(m.monto)}</td>
                    <td className="px-4 py-3">
                      {m.estado === 'CONCILIADO' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <Icon icon="solar:check-circle-bold" width={13} /> Conciliado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                          <Icon icon="solar:clock-circle-bold" width={13} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.match ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{m.match.documento}</span>
                          <span className="text-xs text-gray-400">
                            {origenLabel(m.match.origen)} · {m.match.contraparte}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {m.match ? fmt(m.match.monto) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.match ? (
                        <span
                          className={
                            Math.abs(m.match.diferenciaMonto) > 0.01
                              ? 'font-semibold text-rose-500'
                              : 'text-gray-400'
                          }
                        >
                          {fmt(m.match.diferenciaMonto)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {vm.movimientosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      Sin movimientos para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagos del sistema sin match en banco */}
      {vm.resultado && vm.resultado.sistemaPendientes.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-[#111827]">
          <div className="border-b border-gray-100 p-4 dark:border-slate-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Pagos del sistema sin coincidencia en el banco
            </p>
            <p className="text-xs text-gray-400">
              Ventas/compras con número de operación que no aparecieron en el Excel bancario.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-slate-800">
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Contraparte</th>
                  <th className="px-4 py-3">N° Operación</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {vm.resultado.sistemaPendientes.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 dark:border-slate-800/60">
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.origen === 'VENTA'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            : p.origen === 'GASTO'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                              : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}
                      >
                        {origenLabel(p.origen)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{p.documento}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.contraparte}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{p.operacion}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.medioPago}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.fecha}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmt(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de conciliaciones guardadas */}
      <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Conciliaciones guardadas
            </p>
            <p className="text-xs text-gray-400">
              Historial de conciliaciones que guardaste para consultar luego.
            </p>
          </div>
          <button
            onClick={vm.cargarGuardadas}
            disabled={vm.cargandoGuardadas}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            <Icon icon={vm.cargandoGuardadas ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={14} />
            Actualizar
          </button>
        </div>

        {vm.guardadas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            Aún no has guardado conciliaciones.
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
            {vm.guardadas.map((g) => (
              <div
                key={g.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  vm.guardadaActivaId === g.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {new Date(g.creadoEn).toLocaleString('es-PE')}
                    </span>
                    {(g.fechaInicio || g.fechaFin) && (
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                        {g.fechaInicio || '…'} → {g.fechaFin || '…'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {g.resumen.conciliados} conciliados · {g.resumen.pendientesBanco} pend. banco ·{' '}
                    {g.resumen.pendientesSistema} pend. sistema · {fmt(g.resumen.montoConciliado)} conciliado
                  </p>
                  {g.observaciones && (
                    <p className="mt-0.5 truncate text-xs italic text-gray-400" title={g.observaciones}>
                      “{g.observaciones}”
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => vm.verGuardada(g.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-slate-800"
                  >
                    <Icon icon="solar:eye-bold" width={14} /> Ver
                  </button>
                  <button
                    onClick={() => vm.eliminarGuardada(g.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-slate-800"
                  >
                    <Icon icon="solar:trash-bin-trash-bold" width={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: 'slate' | 'emerald' | 'amber' | 'rose' | 'orange';
}) {
  const colors: Record<string, string> = {
    slate: 'text-gray-900 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    orange: 'text-orange-600 dark:text-orange-400',
  };
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </div>
  );
}
