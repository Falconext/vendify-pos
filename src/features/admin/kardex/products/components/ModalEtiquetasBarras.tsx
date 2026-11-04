import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useReactToPrint } from 'react-to-print';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import CodigoBarrasEAN13 from '@/components/CodigoBarrasEAN13';
import { esEan13Valido } from '@/utils/ean13';
import {
  FORMATOS_PREDEFINIDOS,
  LIMITES,
  estiloPagina,
  guardarFormato,
  leerFormatoGuardado,
  medidasCodigo,
  normalizarFormato,
  type FormatoEtiqueta,
} from '../etiquetaFormato';

interface EtiquetaProducto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  codigoBarras: string | null;
  valido: boolean;
  precio: number;
  variante: string | null;
  esVariante: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Productos a etiquetar. Se piden al backend al abrir. */
  productoIds: number[];
}

export default function ModalEtiquetasBarras({ isOpen, onClose, productoIds }: Props) {
  const auth = useAuthStore((s) => s.auth);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [productos, setProductos] = useState<EtiquetaProducto[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  // Cada impresora usa su rollo: el tamaño elegido se recuerda en este equipo.
  const [cfg, setCfg] = useState<FormatoEtiqueta>(leerFormatoGuardado);
  const elegirFormato = (f: Partial<FormatoEtiqueta>) => {
    const nuevo = normalizarFormato(f);
    setCfg(nuevo);
    guardarFormato(nuevo);
  };

  // El código escaneado ya trae nombre/variante/precio desde el sistema, así que
  // el texto va apagado por defecto: se enciende para el vendedor que mira la
  // caja sin escáner a la mano.
  const [mostrarNombre, setMostrarNombre] = useState(false);
  const [mostrarVariante, setMostrarVariante] = useState(false);
  const [mostrarPrecio, setMostrarPrecio] = useState(false);

  useEffect(() => {
    if (!isOpen || !productoIds.length) return;
    let cancelado = false;
    (async () => {
      setCargando(true);
      try {
        const resp = await apiClient.post('/productos/codigos-barras/etiquetas', { productoIds });
        const data: EtiquetaProducto[] = resp.data?.data ?? resp.data ?? [];
        if (cancelado) return;
        setProductos(data);
        setSeleccionados(new Set(data.filter((p) => p.valido).map((p) => p.id)));
        setCantidades(Object.fromEntries(data.map((p) => [p.id, 1])));
      } catch {
        if (!cancelado) useAlertStore.getState().alert('No se pudieron cargar los productos', 'error');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [isOpen, productoIds]);

  const sinCodigo = useMemo(() => productos.filter((p) => !p.valido), [productos]);

  /** Asigna EAN-13 interno a los que aún no tienen y refresca la lista. */
  const generarFaltantes = async () => {
    if (!sinCodigo.length) return;
    setGenerando(true);
    try {
      await apiClient.post('/productos/codigos-barras/generar', {
        productoIds: sinCodigo.map((p) => p.id),
      });
      const resp = await apiClient.post('/productos/codigos-barras/etiquetas', { productoIds });
      const data: EtiquetaProducto[] = resp.data?.data ?? resp.data ?? [];
      setProductos(data);
      setSeleccionados(new Set(data.filter((p) => p.valido).map((p) => p.id)));
      useAlertStore.getState().alert(`Se generaron ${sinCodigo.length} códigos de barra`, 'success');
    } catch (e: any) {
      useAlertStore
        .getState()
        .alert(e?.response?.data?.message || 'No se pudieron generar los códigos', 'error');
    } finally {
      setGenerando(false);
    }
  };

  /** Una entrada por etiqueta física a imprimir (producto × cantidad). */
  const etiquetas = useMemo(() => {
    const out: EtiquetaProducto[] = [];
    for (const p of productos) {
      if (!seleccionados.has(p.id) || !p.valido) continue;
      const n = Math.max(1, Math.min(200, Number(cantidades[p.id]) || 1));
      for (let i = 0; i < n; i++) out.push(p);
    }
    return out;
  }, [productos, seleccionados, cantidades]);

  const codigo = medidasCodigo(cfg, { nombre: mostrarNombre, variante: mostrarVariante, precio: mostrarPrecio });
  const filas = useMemo(() => {
    const out: EtiquetaProducto[][] = [];
    for (let i = 0; i < etiquetas.length; i += cfg.columnas) out.push(etiquetas.slice(i, i + cfg.columnas));
    return out;
  }, [etiquetas, cfg.columnas]);

  // Función y no componente: un componente declarado acá se remontaría en cada render.
  const renderEtiqueta = (p: EtiquetaProducto, key: string) => (
    <div
      key={key}
      style={{ width: `${cfg.ancho}mm`, height: `${cfg.alto}mm`, breakInside: 'avoid', pageBreakInside: 'avoid' }}
      className="flex shrink-0 flex-col items-center justify-center overflow-hidden bg-white px-1 text-center text-black"
    >
      {mostrarNombre && (
        <span className="w-full truncate text-[6.5pt] font-bold leading-tight">{p.descripcion}</span>
      )}
      {mostrarVariante && p.variante && (
        <span className="w-full truncate text-[6pt] leading-tight">{p.variante}</span>
      )}
      {p.codigoBarras && esEan13Valido(p.codigoBarras) && (
        <CodigoBarrasEAN13
          codigo={p.codigoBarras}
          moduloPx={codigo.moduloPx}
          altoBarras={codigo.altoBarras}
          altoTexto={codigo.altoTexto}
          margenModulos={codigo.margenModulos}
        />
      )}
      {mostrarPrecio && <span className="text-[8pt] font-black leading-tight">S/ {p.precio.toFixed(2)}</span>}
    </div>
  );
  const printRef = useRef<HTMLDivElement>(null);
  const imprimir = useReactToPrint({
    // @ts-ignore la versión instalada usa contentRef
    contentRef: printRef,
    documentTitle: `Etiquetas_${auth?.empresa?.razonSocial?.replace(/\s+/g, '_') || 'Productos'}`,
    pageStyle: estiloPagina(cfg),
  });

  const toggle = (id: number) =>
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!isOpen) return null;

  // z-[1000000]: por encima del Modal compartido (z-[999999]), ya que se abre desde "Editar producto".
  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4">
      {/* En móvil/tablet el panel de configuración va arriba y todo el cuerpo scrollea; en desktop, dos columnas. */}
      <div className="flex h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:h-[95vh]">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Icon icon="mdi:barcode" className="text-xl text-violet-600" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-gray-800 dark:text-white sm:text-lg">Etiquetas de código de barras</h2>
              <p className="text-xs text-gray-500">
                {etiquetas.length} etiqueta{etiquetas.length === 1 ? '' : 's'} a imprimir ·{' '}
                {seleccionados.size} de {productos.length} productos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <Icon icon="solar:close-circle-bold" className="text-2xl" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Configuración */}
          <div className="flex w-full shrink-0 flex-col gap-4 border-b border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:w-80 md:gap-5 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-gray-500">Tamaño de etiqueta</p>
              <div className="grid grid-cols-2 gap-2">
                {[...FORMATOS_PREDEFINIDOS, { id: 'personalizado', label: 'Personalizado', detalle: 'Escribe la medida de tu rollo' }].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => elegirFormato(f.id === 'personalizado' ? { ...cfg, id: 'personalizado' } : f)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      cfg.id === f.id
                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 hover:border-violet-300 dark:border-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-black text-gray-800 dark:text-white">{f.label}</span>
                    <span className="block text-[10px] leading-tight text-gray-500">{f.detalle}</span>
                  </button>
                ))}
              </div>
              {cfg.id === 'personalizado' && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    ['ancho', 'Ancho (mm)', LIMITES.anchoMin, LIMITES.anchoMax],
                    ['alto', 'Alto (mm)', LIMITES.altoMin, LIMITES.altoMax],
                    ['columnas', 'Por fila', 1, LIMITES.columnasMax],
                  ] as const).map(([campo, label, min, max]) => (
                    <label key={campo} className="block">
                      <span className="mb-1 block text-[10px] font-bold text-gray-500">{label}</span>
                      <input
                        type="number"
                        min={min}
                        max={max}
                        defaultValue={cfg[campo]}
                        key={`${campo}-${cfg[campo]}`}
                        onBlur={(e) => elegirFormato({ ...cfg, [campo]: Number(e.target.value) })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>
                  ))}
                  <p className="col-span-3 text-[10px] leading-snug text-gray-400">
                    Mide una etiqueta de tu rollo. "Por fila" es para rollos de 2 o 3 etiquetas lado a lado.
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-gray-500">
                Texto en la etiqueta
              </p>
              <p className="mb-2 text-[11px] leading-snug text-gray-400">
                Al escanear, el sistema ya trae nombre, variante y precio. Enciéndelos solo si el
                vendedor necesita leerlos sin escáner.
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  ['Nombre del producto', mostrarNombre, setMostrarNombre],
                  ['Variante (color / talla)', mostrarVariante, setMostrarVariante],
                  ['Precio', mostrarPrecio, setMostrarPrecio],
                ].map(([label, valor, set]: any) => (
                  <label key={label} className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={valor}
                      onChange={(e) => set(e.target.checked)}
                      className="h-4 w-4 accent-violet-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {sinCodigo.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  {sinCodigo.length} producto{sinCodigo.length === 1 ? '' : 's'} sin código de barras
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                  Se les asignará un EAN-13 interno (prefijo 2), válido para cualquier escáner y sin
                  riesgo de chocar con un producto de fábrica.
                </p>
                <button
                  type="button"
                  onClick={generarFaltantes}
                  disabled={generando}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  <Icon icon={generando ? 'svg-spinners:180-ring-with-bg' : 'mdi:barcode'} width={14} />
                  Generar los que faltan
                </button>
              </div>
            )}

            {/* En móvil el botón de imprimir va en el pie fijo del modal */}
            <button
              type="button"
              onClick={() => imprimir?.()}
              disabled={!etiquetas.length}
              className="mt-auto hidden items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex"
            >
              <Icon icon="solar:printer-bold" width={18} />
              Imprimir {etiquetas.length || ''}
            </button>
          </div>

          {/* Lista + vista previa */}
          <div className="flex flex-1 flex-col md:overflow-hidden">
            <div className="overflow-x-auto border-b border-gray-100 p-4 dark:border-slate-800 md:max-h-[38%] md:overflow-y-auto">
              {cargando ? (
                <p className="text-xs text-gray-500">Cargando productos…</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="py-1.5 pr-2 w-8" />
                      <th className="py-1.5 pr-2">Producto</th>
                      <th className="py-1.5 pr-2">Código</th>
                      <th className="py-1.5 pr-2 w-24">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                        <td className="py-1.5 pr-2">
                          <input
                            type="checkbox"
                            checked={seleccionados.has(p.id)}
                            disabled={!p.valido}
                            onChange={() => toggle(p.id)}
                            className="h-4 w-4 accent-violet-600 disabled:opacity-30"
                          />
                        </td>
                        <td className="py-1.5 pr-2 font-semibold text-gray-700 dark:text-gray-300">
                          {p.descripcion}
                          {p.variante && (
                            <span className="ml-1 text-[11px] font-bold text-violet-600 dark:text-violet-300">
                              {p.variante}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-[11px] text-gray-500">
                          {p.valido ? p.codigoBarras : <span className="text-amber-600">sin código</span>}
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={cantidades[p.id] ?? 1}
                            disabled={!p.valido}
                            onChange={(e) =>
                              setCantidades((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                            }
                            className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold outline-none focus:border-violet-400 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="min-h-[260px] flex-1 overflow-auto bg-gray-100 p-3 dark:bg-slate-950 sm:p-5">
              <div ref={printRef}>
                {cfg.tipo === 'rollo' ? (
                  // Rollo: cada fila (1 a 4 etiquetas lado a lado) es su propia página física.
                  filas.map((fila, f) => (
                    <div
                      key={f}
                      className="mx-auto flex bg-white"
                      style={{
                        width: `${cfg.ancho * cfg.columnas}mm`,
                        height: `${cfg.alto}mm`,
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        ...(f > 0 ? { breakBefore: 'page', pageBreakBefore: 'always' } : {}),
                      }}
                    >
                      {fila.map((p, i) => (
                        renderEtiqueta(p, `${p.id}-${f}-${i}`)
                      ))}
                    </div>
                  ))
                ) : (
                  <div
                    className="mx-auto bg-white"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${cfg.columnas}, ${cfg.ancho}mm)`,
                      width: `${cfg.columnas * cfg.ancho}mm`,
                    }}
                  >
                    {etiquetas.map((p, i) => (
                      renderEtiqueta(p, `${p.id}-${i}`)
                    ))}
                  </div>
                )}
                {!etiquetas.length && (
                  <p className="py-10 text-center text-xs text-gray-400">
                    Selecciona al menos un producto con código de barras.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pie solo en móvil/tablet: el botón de imprimir siempre a la vista */}
        <div className="border-t border-gray-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <button
            type="button"
            onClick={() => imprimir?.()}
            disabled={!etiquetas.length}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon icon="solar:printer-bold" width={18} />
            Imprimir {etiquetas.length || ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
