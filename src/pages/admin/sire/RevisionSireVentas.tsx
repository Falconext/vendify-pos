/**
 * Lo que hay que mirar ANTES de declarar las ventas del período.
 *
 * La página de Libro de Ventas ya genera el TXT y el Excel con lo registrado.
 * Esto es la revisión previa: los totales para cuadrar, el IGV del período
 * (débito menos crédito), lo que SUNAT observaría, y el cruce contra la
 * propuesta del RVIE.
 *
 * Vive aparte porque la página ya era larga y porque son dos momentos
 * distintos: esto durante el mes, el TXT al cierre.
 */
import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { get, post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

interface ResumenVentas {
  periodo: string;
  cantidad: number;
  gravadas: number;
  igv: number;
  exoneradas: number;
  inafectas: number;
  exportacion: number;
  total: number;
  anulados: number;
  notasCredito: number;
  porTipoDoc: Record<string, { cantidad: number; total: number }>;
}

interface RevisionVentas {
  excluidos: Array<{ comprobante: string; tipoDoc: string; estado: string; total: number }>;
  huecos: Array<{ serie: string; faltantes: number[] }>;
  docsInvalidos: Array<{ comprobante: string; cliente: string; motivo: string }>;
  notasHuerfanas: Array<{ comprobante: string; referencia: string }>;
  detalle: Array<{
    tipoDoc: string; comprobante: string; fecha: string; docCliente: string;
    cliente: string; base: number; igv: number; total: number; anulado: boolean;
  }>;
}

interface Comparacion {
  periodo: string;
  cuadra: boolean;
  totales: {
    sunat: { cantidad: number; igv: number; total: number };
    sistema: { cantidad: number; igv: number; total: number };
  };
  soloEnSunat: Array<{ comprobante: string; tipoDoc: string; total: number }>;
  soloEnSistema: Array<{ comprobante: string; tipoDoc: string; total: number }>;
  diferencias: Array<{
    comprobante: string;
    sunat: { base: number; igv: number; total: number };
    sistema: { base: number; igv: number; total: number };
  }>;
  totalSoloEnSunat: number;
  totalSoloEnSistema: number;
  totalDiferencias: number;
}

interface IgvPeriodo {
  periodo: string;
  debito: number;
  credito: number;
  resultado: number;
  esSaldoAFavor: boolean;
  comprobantesCompras: number;
  periodoAnterior: { periodo: string; resultado: number };
  variacion: number | null;
}

const TIPO_DOC_LABEL: Record<string, string> = {
  '01': 'Facturas',
  '03': 'Boletas',
  '07': 'Notas de crédito',
  '08': 'Notas de débito',
};

const fmtMoneda = (v: number) =>
  `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// El backend manda el nombre oficial que exige SUNAT (LE+RUC+periodo+...) en
// la cabecera Content-Disposition. Hay que respetarlo: si el navegador guarda
// el archivo con otro nombre, el validador PVSIRE y el portal lo rechazan.
function nombreDesdeRespuesta(headers: any, fallback: string): string {
  const cd = headers?.['content-disposition'] ?? headers?.['Content-Disposition'];
  const m = typeof cd === 'string' ? cd.match(/filename="?([^";]+)"?/i) : null;
  return m?.[1]?.trim() || fallback;
}
export default function RevisionSireVentas({
  mes,
  anio,
  empresarial,
}: {
  mes: number | null;
  anio: number | null;
  empresarial: boolean;
}) {
  const { alert } = useAlertStore();
  const [resumen, setResumen] = useState<ResumenVentas | null>(null);
  const [revision, setRevision] = useState<RevisionVentas | null>(null);
  const [igv, setIgv] = useState<IgvPeriodo | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [comparacion, setComparacion] = useState<Comparacion | null>(null);
  const [comparando, setComparando] = useState(false);
  const inputPropuesta = useRef<HTMLInputElement>(null);
  const [filtroDetalle, setFiltroDetalle] = useState('');

  // Lo cargado corresponde a un período/alcance concreto: si cambian, se
  // descarta para no mostrar totales que ya no corresponden.
  useEffect(() => {
    setResumen(null);
    setRevision(null);
    setIgv(null);
    setMostrarDetalle(false);
    setComparacion(null);
    setFiltroDetalle('');
  }, [mes, anio, empresarial]);

  const validar = () => {
    if (!mes || !anio) {
      alert('Selecciona el mes y año', 'warning');
      return false;
    }
    return true;
  };

  const buildQuery = () =>
    new URLSearchParams({
      mes: String(mes),
      anio: String(anio),
      empresarial: String(empresarial),
    }).toString();

  const handlePrevisualizar = async () => {
    if (!validar()) return;
    try {
      setCargandoResumen(true);
      const qs = `mes=${mes}&anio=${anio}&empresarial=${empresarial}`;
      const [resp, respRev, respIgv] = await Promise.all([
        get<ResumenVentas>(`contabilidad/sire/ventas-resumen?${qs}`),
        get<RevisionVentas>(`contabilidad/sire/ventas-revision?${qs}`),
        get<IgvPeriodo>(`contabilidad/sire/igv-periodo?${qs}`),
      ]);
      if (resp.error || !resp.data) {
        alert(resp.error ?? 'No se pudo calcular el resumen', 'error');
        return;
      }
      setResumen(resp.data);
      // La revisión y el IGV son complementarios: si fallan, el resumen igual
      // se muestra en vez de dejar la pantalla vacía.
      setRevision(respRev.data ?? null);
      setIgv(respIgv.data ?? null);
    } catch {
      alert('No se pudo calcular el resumen', 'error');
    } finally {
      setCargandoResumen(false);
    }
  };

  const handleCompararPropuesta = async (file: File) => {
    if (!validar()) return;
    try {
      setComparando(true);
      // SUNAT entrega el archivo en ISO-8859-1; leerlo como UTF-8 corrompe
      // los nombres con tildes y Ñ.
      const contenido = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result ?? ''));
        fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
        fr.readAsText(file, 'ISO-8859-1');
      });
      const resp = await post<Comparacion>('/contabilidad/sire/ventas-comparar', {
        mes, anio, contenido, empresarial,
      });
      if (!resp.success || !resp.data) {
        alert((resp as any).error ?? 'No se pudo comparar el archivo', 'error');
        return;
      }
      setComparacion(resp.data);
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo comparar el archivo', 'error');
    } finally {
      setComparando(false);
      if (inputPropuesta.current) inputPropuesta.current.value = '';
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handlePrevisualizar}
          disabled={cargandoResumen}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <Icon
            icon={cargandoResumen ? 'solar:refresh-circle-bold-duotone' : 'solar:calculator-minimalistic-bold-duotone'}
            className={`text-lg ${cargandoResumen ? 'animate-spin' : ''}`}
          />
          Ver totales y revisión previa
        </button>
      </div>
          {/* Resumen del período — para cuadrar antes de exportar */}
          {resumen && (
            <div className="border-t border-gray-100 pt-6 mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                Totales del período {resumen.periodo}
              </p>

              {resumen.cantidad === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">
                  No hay comprobantes válidos en este período.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: 'Comprobantes', valor: String(resumen.cantidad) },
                      { label: 'Base gravada', valor: fmtMoneda(resumen.gravadas) },
                      { label: 'IGV', valor: fmtMoneda(resumen.igv) },
                      { label: 'Exoneradas', valor: fmtMoneda(resumen.exoneradas) },
                      { label: 'Inafectas', valor: fmtMoneda(resumen.inafectas) },
                      { label: 'Exportación', valor: fmtMoneda(resumen.exportacion) },
                    ].map((f) => (
                      <div key={f.label} className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[11px] text-gray-400">{f.label}</p>
                        <p className="text-sm font-semibold text-gray-800">{f.valor}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-3 flex justify-between items-center">
                    <span className="text-xs font-semibold text-blue-700">Importe total</span>
                    <span className="text-base font-bold text-blue-700">{fmtMoneda(resumen.total)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {Object.entries(resumen.porTipoDoc).map(([tipo, d]) => (
                      <span key={tipo} className="text-[11px] bg-gray-100 text-gray-600 rounded-lg px-2 py-1">
                        {TIPO_DOC_LABEL[tipo] ?? tipo}: {d.cantidad} · {fmtMoneda(d.total)}
                      </span>
                    ))}
                  </div>

                  {(resumen.notasCredito > 0 || resumen.anulados > 0) && (
                    <p className="text-[11px] text-gray-400 text-center mt-3">
                      {resumen.notasCredito > 0 && `${resumen.notasCredito} nota(s) de crédito restan del total. `}
                      {resumen.anulados > 0 && `${resumen.anulados} comprobante(s) van con estado 6 (anulado).`}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── IGV del período: débito menos crédito fiscal ── */}
          {igv && (
            <div className="border-t border-gray-100 pt-6 mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                IGV del período
              </p>
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="flex justify-between text-sm px-1">
                  <span className="text-gray-500">IGV de ventas (débito)</span>
                  <span className="font-semibold text-gray-800">{fmtMoneda(igv.debito)}</span>
                </div>
                <div className="flex justify-between text-sm px-1">
                  <span className="text-gray-500">
                    IGV de compras (crédito)
                    {igv.comprobantesCompras === 0 && (
                      <span className="text-amber-600"> · sin compras registradas</span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-800">− {fmtMoneda(igv.credito)}</span>
                </div>
                <div className={`flex justify-between items-center rounded-xl px-3 py-2.5 mt-2 ${
                  igv.esSaldoAFavor ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100'
                }`}>
                  <span className={`text-xs font-bold ${igv.esSaldoAFavor ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {igv.esSaldoAFavor ? 'Saldo a favor' : 'IGV a pagar'}
                  </span>
                  <span className={`text-base font-bold ${igv.esSaldoAFavor ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {fmtMoneda(Math.abs(igv.resultado))}
                  </span>
                </div>
                {igv.variacion !== null && (
                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    vs período {igv.periodoAnterior.periodo}: {igv.variacion >= 0 ? '+' : ''}
                    {igv.variacion.toFixed(1)}% ({fmtMoneda(igv.periodoAnterior.resultado)})
                  </p>
                )}
                <p className="text-[11px] text-gray-400 text-center">
                  Referencial: no reemplaza la declaración mensual.
                </p>
              </div>
            </div>
          )}

          {/* ── Revisión previa: lo que SUNAT observaría ── */}
          {revision && (() => {
            const alertas =
              revision.excluidos.length + revision.huecos.length +
              revision.docsInvalidos.length + revision.notasHuerfanas.length;
            if (alertas === 0) {
              return (
                <div className="border-t border-gray-100 pt-6 mb-2">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-3 max-w-md mx-auto">
                    <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-500 text-xl shrink-0" />
                    <p className="text-sm text-emerald-700 font-medium">
                      Revisión sin observaciones: numeración correlativa completa, documentos de identidad válidos y todo emitido a SUNAT.
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div className="border-t border-gray-100 pt-6 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                  Revisión del período · {alertas} observación(es)
                </p>
                <div className="space-y-2">
                  {revision.excluidos.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                      <p className="text-sm font-bold text-rose-700 flex items-center gap-2">
                        <Icon icon="solar:danger-triangle-bold-duotone" className="text-lg" />
                        {revision.excluidos.length} comprobante(s) no entran al libro
                      </p>
                      <p className="text-xs text-rose-600 mt-1">
                        Están pendientes, rechazados o fallaron al enviarse a SUNAT: son ventas que quedarían sin declarar.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {revision.excluidos.slice(0, 12).map((e, i) => (
                          <span key={i} className="text-[11px] bg-white text-rose-700 border border-rose-200 rounded-lg px-2 py-0.5">
                            {e.comprobante} · {e.estado}
                          </span>
                        ))}
                        {revision.excluidos.length > 12 && (
                          <span className="text-[11px] text-rose-500 px-1">+{revision.excluidos.length - 12} más</span>
                        )}
                      </div>
                    </div>
                  )}

                  {revision.huecos.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                        <Icon icon="solar:sort-by-time-bold-duotone" className="text-lg" />
                        Huecos en la numeración
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Faltan correlativos dentro del rango del período. SUNAT observa los saltos de numeración.
                      </p>
                      {revision.huecos.map((h, i) => (
                        <p key={i} className="text-[11px] text-amber-700 mt-1.5">
                          <strong>{h.serie}</strong>: falta {h.faltantes.slice(0, 10).join(', ')}
                          {h.faltantes.length > 10 && ` +${h.faltantes.length - 10} más`}
                        </p>
                      ))}
                    </div>
                  )}

                  {revision.docsInvalidos.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                        <Icon icon="solar:user-cross-bold-duotone" className="text-lg" />
                        {revision.docsInvalidos.length} documento(s) de identidad inválidos
                      </p>
                      <div className="mt-2 space-y-1">
                        {revision.docsInvalidos.slice(0, 8).map((d, i) => (
                          <p key={i} className="text-[11px] text-amber-700">
                            <strong>{d.comprobante}</strong> — {d.motivo}
                            {d.cliente && <span className="text-amber-500"> · {d.cliente}</span>}
                          </p>
                        ))}
                        {revision.docsInvalidos.length > 8 && (
                          <p className="text-[11px] text-amber-500">+{revision.docsInvalidos.length - 8} más</p>
                        )}
                      </div>
                    </div>
                  )}

                  {revision.notasHuerfanas.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                        <Icon icon="solar:link-broken-bold-duotone" className="text-lg" />
                        {revision.notasHuerfanas.length} nota(s) sin documento afectado
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        No se encontró el comprobante que modifican, así que el archivo iría sin esos datos.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {revision.notasHuerfanas.map((nh, i) => (
                          <span key={i} className="text-[11px] bg-white text-amber-700 border border-amber-200 rounded-lg px-2 py-0.5">
                            {nh.comprobante} → {nh.referencia}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Detalle fila por fila ── */}
          {revision && revision.detalle.length > 0 && (
            <div className="border-t border-gray-100 pt-6 mb-2">
              <button
                onClick={() => setMostrarDetalle((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
              >
                <span>Detalle · {revision.detalle.length} comprobantes</span>
                <Icon icon={mostrarDetalle ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-base" />
              </button>

              {mostrarDetalle && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Buscar por comprobante, cliente o RUC..."
                    value={filtroDetalle}
                    onChange={(e) => setFiltroDetalle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-gray-500">
                          <th className="text-left font-semibold px-3 py-2">Comprobante</th>
                          <th className="text-left font-semibold px-3 py-2">Fecha</th>
                          <th className="text-left font-semibold px-3 py-2">Cliente</th>
                          <th className="text-right font-semibold px-3 py-2">Base</th>
                          <th className="text-right font-semibold px-3 py-2">IGV</th>
                          <th className="text-right font-semibold px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revision.detalle
                          .filter((d) => {
                            const q = filtroDetalle.trim().toLowerCase();
                            if (!q) return true;
                            return (
                              d.comprobante.toLowerCase().includes(q) ||
                              d.cliente.toLowerCase().includes(q) ||
                              d.docCliente.includes(q)
                            );
                          })
                          .map((d, i) => (
                            <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/60">
                              <td className="px-3 py-1.5">
                                <span className="font-medium text-gray-800">{d.comprobante}</span>
                                <span className="text-gray-400 ml-1.5">{TIPO_DOC_LABEL[d.tipoDoc]?.slice(0, 3) ?? d.tipoDoc}</span>
                                {d.anulado && (
                                  <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 rounded px-1">anulado</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                              <td className="px-3 py-1.5 text-gray-600">
                                <span className="block truncate max-w-[220px]">{d.cliente || '—'}</span>
                                <span className="text-gray-400 text-[10px]">{d.docCliente}</span>
                              </td>
                              <td className={`px-3 py-1.5 text-right tabular-nums ${d.base < 0 ? 'text-rose-600' : 'text-gray-700'}`}>{d.base.toFixed(2)}</td>
                              <td className={`px-3 py-1.5 text-right tabular-nums ${d.igv < 0 ? 'text-rose-600' : 'text-gray-700'}`}>{d.igv.toFixed(2)}</td>
                              <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${d.total < 0 ? 'text-rose-600' : 'text-gray-800'}`}>{d.total.toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Comparación con la propuesta de SUNAT ── */}
          <div className="border-t border-gray-100 pt-6 mb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Comparar con la propuesta de SUNAT
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Descarga la propuesta del RVIE desde SUNAT y súbela: te dice qué difiere.
                </p>
              </div>
              <button
                onClick={() => inputPropuesta.current?.click()}
                disabled={comparando}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
              >
                <Icon
                  icon={comparando ? 'solar:refresh-circle-bold-duotone' : 'solar:upload-minimalistic-bold-duotone'}
                  className={`text-lg ${comparando ? 'animate-spin' : ''}`}
                />
                Subir propuesta
              </button>
              <input
                ref={inputPropuesta}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCompararPropuesta(f);
                }}
              />
            </div>

            {comparacion && (
              <div className="mt-4">
                <div className={`rounded-xl px-4 py-3 mb-3 flex items-center gap-3 ${
                  comparacion.cuadra
                    ? 'bg-emerald-50 border border-emerald-100'
                    : 'bg-amber-50 border border-amber-100'
                }`}>
                  <Icon
                    icon={comparacion.cuadra ? 'solar:check-circle-bold-duotone' : 'solar:danger-triangle-bold-duotone'}
                    className={`text-xl shrink-0 ${comparacion.cuadra ? 'text-emerald-500' : 'text-amber-500'}`}
                  />
                  <p className={`text-sm font-medium ${comparacion.cuadra ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {comparacion.cuadra
                      ? `Todo cuadra: ${comparacion.totales.sunat.cantidad} comprobantes coinciden con SUNAT.`
                      : `${comparacion.totalSoloEnSunat + comparacion.totalSoloEnSistema + comparacion.totalDiferencias} diferencia(s) encontradas.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { t: 'Propuesta SUNAT', d: comparacion.totales.sunat },
                    { t: 'Nuestro sistema', d: comparacion.totales.sistema },
                  ].map((c) => (
                    <div key={c.t} className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[11px] text-gray-400">{c.t}</p>
                      <p className="text-sm font-semibold text-gray-800">{c.d.cantidad} comprobantes</p>
                      <p className="text-[11px] text-gray-500">IGV {fmtMoneda(c.d.igv)} · Total {fmtMoneda(c.d.total)}</p>
                    </div>
                  ))}
                </div>

                {comparacion.totalSoloEnSunat > 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mb-2">
                    <p className="text-sm font-bold text-rose-700">
                      {comparacion.totalSoloEnSunat} en SUNAT pero no en el sistema
                    </p>
                    <p className="text-xs text-rose-600 mt-1">
                      SUNAT los tiene registrados y acá no aparecen: revisa si falta registrarlos.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {comparacion.soloEnSunat.slice(0, 15).map((x, i) => (
                        <span key={i} className="text-[11px] bg-white text-rose-700 border border-rose-200 rounded-lg px-2 py-0.5">
                          {x.comprobante} · {fmtMoneda(x.total)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {comparacion.totalSoloEnSistema > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
                    <p className="text-sm font-bold text-amber-700">
                      {comparacion.totalSoloEnSistema} en el sistema pero no en SUNAT
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Puede que no se hayan enviado a SUNAT, o que la propuesta esté desactualizada.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {comparacion.soloEnSistema.slice(0, 15).map((x, i) => (
                        <span key={i} className="text-[11px] bg-white text-amber-700 border border-amber-200 rounded-lg px-2 py-0.5">
                          {x.comprobante} · {fmtMoneda(x.total)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {comparacion.totalDiferencias > 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                    <p className="text-sm font-bold text-rose-700 mb-2">
                      {comparacion.totalDiferencias} con montos distintos
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-rose-500">
                            <th className="text-left font-semibold py-1">Comprobante</th>
                            <th className="text-right font-semibold py-1">Base SUNAT</th>
                            <th className="text-right font-semibold py-1">Base sistema</th>
                            <th className="text-right font-semibold py-1">IGV SUNAT</th>
                            <th className="text-right font-semibold py-1">IGV sistema</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparacion.diferencias.slice(0, 20).map((d, i) => (
                            <tr key={i} className="border-t border-rose-100 text-rose-700">
                              <td className="py-1 font-medium">{d.comprobante}</td>
                              <td className="py-1 text-right tabular-nums">{d.sunat.base.toFixed(2)}</td>
                              <td className="py-1 text-right tabular-nums font-semibold">{d.sistema.base.toFixed(2)}</td>
                              <td className="py-1 text-right tabular-nums">{d.sunat.igv.toFixed(2)}</td>
                              <td className="py-1 text-right tabular-nums font-semibold">{d.sistema.igv.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
    </div>
  );
}
