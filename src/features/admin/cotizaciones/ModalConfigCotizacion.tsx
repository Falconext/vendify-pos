import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import useEmpresasStore from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import ComprobantePrintPage from '@/pages/admin/facturacion/comprobanteImprimir';
import { COTIZ_ELEMENTOS, CotizConfig, elemCfg, FORMATO_KEYS_FISCALES, OVERRIDE_POR_FORMATO, sizeOverride, ticketPx, type FormatoImpresionKey } from './cotizFormatoElementos';
import { FORMATOS_IMPRESION_INFO, type FormatoImpresion } from '@/utils/formatoImpresion';

// Ancho real de cada formato en px (96dpi) y escala para que quepa en el panel.
const PREVIEW_DIMS: Record<FormatoImpresion, { width: number; scale: number }> = {
  A4: { width: 794, scale: 0.68 },
  A5: { width: 559, scale: 0.85 },
  TICKET: { width: 302, scale: 1 },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  auth: any;
  /** Campo de la empresa donde se guarda el formato. Por defecto cotización. */
  configKey?: 'cotizFormatoConfig' | 'notaVentaFormatoConfig' | 'facturaFormatoConfig' | 'boletaFormatoConfig';
  /** Tipo de comprobante para la vista previa. */
  previewReceipt?: string;
  /** Título del modal. */
  title?: string;
  /** Mensaje al guardar. */
  savedMsg?: string;
  /**
   * Formato con el que arranca la vista previa (Ticket / A5 / A4). La página lo
   * pasa desde su selector "Formato impresión" para que el modal muestre lo que
   * realmente va a salir por la impresora; dentro del modal se puede cambiar.
   */
  previewSize?: FormatoImpresion;
}

const numberToWords = (n: number) =>
  `${Math.floor(n)} CON ${Math.round((n % 1) * 100).toString().padStart(2, '0')}/100`;

// Datos de ejemplo para el preview del formato
const SAMPLE_PRODUCTS = [
  { cantidad: 1, unidad: 'UNIDAD', descripcion: 'Distribuidor 12V (ejemplo)', codigoBarras: '7501234567890', codigo: 'PROD-001', precioUnitario: 630, total: 630, imagenUrl: null },
  { cantidad: 1, unidad: 'SERVICIO', descripcion: 'Servicio de reparación (ejemplo)', precioUnitario: 259.6, total: 259.6, imagenUrl: null },
];
const SAMPLE_CLIENT = { nombre: 'CLIENTE DE EJEMPLO S.A.C.', nroDoc: '20123456789', email: 'cliente@correo.com', telefono: '999 888 777', direccion: 'AV. EJEMPLO 123, LIMA' };
const SAMPLE_INVOICE = {
  serie: 'COT1', correlativo: '1', fechaEmision: new Date().toISOString(),
  mtoOperGravadas: 753.9, subTotal: 753.9, mtoIGV: 135.7, mtoImpVenta: 889.6, discount: 0,
  observaciones: 'TIEMPO DE ENTREGA 1 DÍA DESPUÉS DE CONFIRMADA LA OC',
  cotizVigencia: 7, cotizTipoPago: 'CONTADO', cotizTerminos: '',
  tipoDetraccion: { codigo: '001', descripcion: 'Azúcar y melaza de caña', porcentaje: 10 },
  montoDetraccion: 88.96,
};

export default function ModalConfigCotizacion({
  isOpen,
  onClose,
  auth,
  configKey = 'cotizFormatoConfig',
  previewReceipt = 'COTIZACIÓN',
  title = 'Configurar formato de cotización',
  savedMsg = 'Formato de cotización guardado',
  previewSize = 'A4',
}: Props) {
  const alertStore = useAlertStore();
  const [config, setConfig] = useState<CotizConfig>({});
  const [saving, setSaving] = useState(false);
  const [previewFmt, setPreviewFmt] = useState<FormatoImpresion>(previewSize);
  // Factura/boleta: defaults de tamaño propios y etiquetas alternativas.
  const esFiscal = (FORMATO_KEYS_FISCALES as readonly string[]).includes(configKey);

  useEffect(() => {
    if (isOpen) {
      setConfig({ ...((auth?.empresa?.[configKey] as CotizConfig) || {}) });
      setPreviewFmt(previewSize);
    }
  }, [isOpen, auth, configKey, previewSize]);

  const setVisible = (key: string, visible: boolean) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], visible } }));
  // Tamaño propio de un formato (A5/Ticket): "desvincula" ese elemento del
  // general. Se guarda dentro del mismo elemento (`a5.size` / `ticket.size`).
  const setSizePropio = (key: string, formato: FormatoImpresionKey, size: number) => {
    const ov = OVERRIDE_POR_FORMATO[formato];
    if (!ov) return setSize(key, size);
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], [ov]: { ...(prev[key]?.[ov] || {}), size } } }));
  };
  // Vuelve a enlazar el elemento con el general (borra el tamaño propio).
  const quitarSizePropio = (key: string, formato: FormatoImpresionKey) => {
    const ov = OVERRIDE_POR_FORMATO[formato];
    if (!ov) return;
    setConfig((prev) => {
      const { [ov]: _omit, ...resto } = prev[key] || {};
      return { ...prev, [key]: resto };
    });
  };
  const setTexto = (key: string, texto: string) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], texto } }));
  const setSize = (key: string, size: number) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], size } }));

  const previewCompany = useMemo(
    () => ({ ...auth, empresa: { ...auth?.empresa, [configKey]: config } }),
    [auth, config, configKey],
  );

  // La vista previa de comprobantes fiscales (factura/boleta) necesita `tipoDoc`
  // para que el componente de impresión renderice el bloque de totales fiscal.
  // Para factura/boleta se muestra un ejemplo con operación exonerada, que es el
  // caso típico que se quiere ajustar (p. ej. negocios de selva/Amazonía).
  const previewInvoice = useMemo(() => {
    const rc = String(previewReceipt || '').toUpperCase();
    if (rc === 'FACTURA' || rc === 'BOLETA') {
      return {
        ...SAMPLE_INVOICE,
        tipoDoc: rc === 'FACTURA' ? '01' : '03',
        mtoOperGravadas: 0,
        subTotal: 753.9,
        mtoIGV: 0,
        mtoOperExoneradas: 753.9,
        mtoImpVenta: 753.9,
      };
    }
    // Nota de venta: sin detracción (no aplica a informales) y con serie NV01.
    if (rc === 'NOTA DE VENTA') {
      return { ...SAMPLE_INVOICE, serie: 'NV01', tipoDetraccion: undefined, montoDetraccion: 0 };
    }
    return SAMPLE_INVOICE;
  }, [previewReceipt]);

  const guardar = async () => {
    setSaving(true);
    try {
      await useEmpresasStore.getState().actualizarMiEmpresa({ [configKey]: config } as any);
      useAuthStore.setState((state) => ({
        auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, [configKey]: config } } : state.auth,
      }));
      alertStore.alert(savedMsg, 'success');
      onClose();
    } catch (e: any) {
      alertStore.alert(e?.message || 'No se pudo guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const grupos = ['Encabezado', 'Cuerpo', 'Pie'] as const;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-2 md:p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icon icon="solar:tuning-square-bold-duotone" width={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Muestra/oculta y ajusta el tamaño de cada elemento. Aplica a la vista previa y al PDF.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <Icon icon="solar:close-circle-bold" width={26} />
          </button>
        </div>

        {/* Body: controles + preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Controles */}
          <div className="w-full md:w-[380px] shrink-0 overflow-y-auto p-4 border-r border-gray-100 dark:border-slate-800">
            {grupos.map((g) => (
              <div key={g} className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{g}</p>
                <div className="space-y-2">
                  {COTIZ_ELEMENTOS.filter((e) => e.grupo === g && (!e.soloEn || e.soloEn.includes(configKey))).map((el) => {
                    const cur = elemCfg(config, el.key, esFiscal);
                    return (
                      <div key={el.key} className="p-2.5 rounded-xl border border-gray-100 dark:border-transparent bg-gray-50/50 dark:bg-slate-900/40">
                        <div className="flex items-center gap-2">
                        {el.hasVisible ? (
                          <button
                            onClick={() => setVisible(el.key, !cur.visible)}
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cur.visible ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-200 text-gray-400 dark:bg-slate-700'}`}
                            title={cur.visible ? 'Visible' : 'Oculto'}
                          >
                            <Icon icon={cur.visible ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={16} />
                          </button>
                        ) : (
                          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600"><Icon icon="solar:lock-keyhole-minimalistic-bold" width={14} /></div>
                        )}
                        <span className={`flex-1 text-sm ${cur.visible || el.esModo ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{esFiscal && el.labelFiscal ? el.labelFiscal : el.label}</span>
                        {!el.esModo && (() => {
                          // A4 = tamaño general. En A5/Ticket, +/− crea un tamaño PROPIO
                          // para ese formato (desvinculado); el candado lo vuelve a enlazar.
                          const fmt = previewFmt as FormatoImpresionKey;
                          const esOverride = fmt === 'A5' || fmt === 'TICKET';
                          const propio = esOverride ? sizeOverride(config, el.key, fmt) : undefined;
                          const mostrado = fmt === 'TICKET' && !el.unit
                            ? ticketPx(config, el.key, esFiscal)
                            : elemCfg(config, el.key, esFiscal, fmt).size;
                          // En ticket los límites del elemento están en px de A4: se escalan.
                          const factorTicket = fmt === 'TICKET' && !el.unit ? mostrado / Math.max(1, elemCfg(config, el.key, esFiscal).size) : 1;
                          const minF = Math.round(el.min * factorTicket);
                          const maxF = Math.round(el.max * factorTicket);
                          const cambiar = (delta: number) => {
                            const nuevo = Math.min(maxF, Math.max(minF, mostrado + delta));
                            if (esOverride) setSizePropio(el.key, fmt, nuevo);
                            else setSize(el.key, nuevo);
                          };
                          return (
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <div className="flex items-center gap-1">
                                {esOverride && (
                                  <button
                                    type="button"
                                    onClick={() => propio !== undefined && quitarSizePropio(el.key, fmt)}
                                    title={propio !== undefined ? `Tamaño propio en ${fmt === 'TICKET' ? 'ticket' : 'A5'}. Clic para volver a seguir al general.` : `Sigue al tamaño general (A4). Usa + / − para darle un tamaño propio en ${fmt === 'TICKET' ? 'ticket' : 'A5'}.`}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${propio !== undefined ? 'bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300' : 'text-gray-300 dark:text-slate-600 cursor-default'}`}
                                  >
                                    <Icon icon={propio !== undefined ? 'solar:link-broken-minimalistic-bold' : 'solar:link-minimalistic-2-linear'} width={14} />
                                  </button>
                                )}
                                <button onClick={() => cambiar(-1)} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600"><Icon icon="solar:minus-square-bold" width={14} /></button>
                                <span className={`w-11 text-center text-xs font-mono ${propio !== undefined ? 'text-violet-600 dark:text-violet-300 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{mostrado}{el.unit || 'px'}</span>
                                <button onClick={() => cambiar(1)} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600"><Icon icon="solar:add-square-bold" width={14} /></button>
                              </div>
                              {esOverride && (
                                <span className={`text-[10px] leading-none ${propio !== undefined ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                  {propio !== undefined ? `propio de ${fmt === 'TICKET' ? 'ticket' : 'A5'}` : `sigue al general (${cur.size}${el.unit || 'px'})`}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        </div>
                        {el.esTexto && cur.visible && (
                          <textarea
                            // Valor crudo, no el de elemCfg (que hace trim): con el
                            // recortado, cada espacio o Enter al final desaparecía en el
                            // mismo keystroke y no se podía escribir la frase de corrido.
                            value={config[el.key]?.texto ?? ''}
                            onChange={(e) => setTexto(el.key, e.target.value)}
                            placeholder={el.placeholder}
                            rows={2}
                            className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="hidden md:flex flex-1 flex-col bg-gray-100 dark:bg-slate-950 overflow-hidden">
            {/* Selector de formato: la vista previa muestra el mismo layout que se imprime en cada uno. */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
              <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
                {[...FORMATOS_IMPRESION_INFO].reverse().map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setPreviewFmt(f.value)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${previewFmt === f.value ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    <Icon icon={f.icon} width={15} />
                    {f.label}
                    <span className="font-normal text-[10px] opacity-70">{f.sub}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {previewFmt === 'TICKET'
                  ? 'Ticket térmico: los tamaños se muestran ya convertidos a la fuente de 80mm (el logo del ticket se ajusta en Perfil → Configuración).'
                  : 'Se aplican visibilidad y tamaño de cada elemento, igual que en el PDF.'}
              </p>
            </div>
            <div className="flex-1 overflow-auto p-6 flex justify-center">
            <div style={{ width: PREVIEW_DIMS[previewFmt].width, transform: `scale(${PREVIEW_DIMS[previewFmt].scale})`, transformOrigin: 'top center' }}>
              <div className="bg-white shadow-xl">
                <ComprobantePrintPage
                  company={previewCompany}
                  formValues={previewInvoice}
                  size={previewFmt}
                  serie={previewInvoice.serie}
                  correlative="1"
                  productsInvoice={SAMPLE_PRODUCTS}
                  total={SAMPLE_INVOICE.mtoImpVenta.toFixed(2)}
                  mode="preview"
                  receipt={previewReceipt}
                  selectedClient={SAMPLE_CLIENT}
                  totalInWords={numberToWords(SAMPLE_INVOICE.mtoImpVenta) + ' SOLES'}
                  observation={SAMPLE_INVOICE.observaciones}
                  includeProductImages={false}
                  quotationValidity={SAMPLE_INVOICE.cotizVigencia}
                  quotationTerms={SAMPLE_INVOICE.cotizTerminos}
                  quotationPaymentType={SAMPLE_INVOICE.cotizTipoPago}
                  quotationAdvance={0}
                />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <button onClick={() => setConfig({})} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
            <Icon icon="solar:restart-bold" width={14} /> Restablecer a valores por defecto
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold btn-accent flex items-center gap-2 disabled:opacity-60">
              <Icon icon={saving ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={16} />
              {saving ? 'Guardando…' : 'Guardar formato'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
