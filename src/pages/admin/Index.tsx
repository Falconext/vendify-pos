import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/zustand/auth'
import { useDashboardStore, type IDashboardState } from '@/zustand/dashboard'
import { Icon } from '@iconify/react'
import moment from 'moment'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { get } from '@/utils/fetch'
import { useDebounce } from '@/hooks/useDebounce'
import { WelcomeModal, TourSpotlight, useWelcomeTour } from '@/components/WelcomeTour'
import Select from '@/components/Select'
import {
  esFarmaciaRetailRubro,
  esDrogueriaRubro,
  esRubroFabricacion,
  esRubroComputo,
} from '@/utils/rubro-features'

// ── Dashboard del negocio — resumen accionable + tabla de comprobantes ────────
// Responde en 5 segundos: ¿cuánto vendí? ¿qué requiere mi atención? ¿qué/cómo se vende?
// Adaptativo por rubro (bodega, farmacia, restaurante, fabricación, cómputo, vehicular…).
const ACCENT = '#7551FF'
// Paleta CVD-safe (dataviz) para series categóricas.
const SERIES = ['#7551FF', '#1baf7a', '#eda100', '#2a78d6', '#e0567a']

type Invoice = {
  id: number
  tipoDoc: string
  serie: string
  correlativo: number
  fechaEmision: string
  mtoImpVenta: number
  tipoMoneda?: string
  estadoEnvioSunat?: string
  estadoPago?: string
  cliente?: { nombre?: string; numDoc?: string }
  clienteNombre?: string
  sede?: { nombre?: string }
}

const money = (v: number, moneda = 'PEN') =>
  `${moneda === 'USD' ? '$' : 'S/'} ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatMoney = (v: number) =>
  `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatShort = (v: number) => {
  if (Math.abs(v) >= 1000) return `S/ ${(v / 1000).toFixed(1)}K`
  return `S/ ${Number(v ?? 0).toFixed(0)}`
}

const TIPO_DOC_LABEL: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'N. Crédito',
  '08': 'N. Débito',
  NV: 'N. Venta',
}

function estadoPill(estado?: string) {
  const e = String(estado ?? '').toUpperCase()
  if (['ACEPTADO', 'APROBADO'].includes(e)) return { label: 'Aceptado', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (['PENDIENTE', 'ENVIANDO', 'EN_PROCESO', 'PROCESANDO'].includes(e)) return { label: 'En proceso', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }
  if (['RECHAZADO', 'FALLIDO_ENVIO', 'ERROR', 'OBSERVADO'].includes(e)) return { label: 'Rechazado', dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' }
  if (['ANULADO', 'BAJA'].includes(e)) return { label: 'Anulado', dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100' }
  return { label: e ? e.charAt(0) + e.slice(1).toLowerCase() : 'Emitido', dot: 'bg-violet-500', text: 'text-violet-600', bg: 'bg-violet-50' }
}

const SORTS = [
  { key: 'fecha_desc', label: 'Más recientes' },
  { key: 'fecha_asc', label: 'Más antiguos' },
  { key: 'total_desc', label: 'Mayor monto' },
  { key: 'total_asc', label: 'Menor monto' },
]
const ESTADOS = [
  { key: '', label: 'Todos' },
  { key: 'ACEPTADO', label: 'Aceptado' },
  { key: 'PENDIENTE', label: 'En proceso' },
  { key: 'RECHAZADO', label: 'Rechazado' },
]
const PER_PAGE = [10, 20, 50]

const PERIODS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: 'mes', label: 'Este mes' },
]

// ── Configuración por rubro ───────────────────────────────────────────────────
type RubroUI = {
  key: string
  ventaCta: string
  productosLabel: string
  quickActions: { label: string; icon: string; to: string; primary?: boolean }[]
  focus?: { label: string; hint: string; icon: string; to: string; tone: 'amber' | 'sky' | 'violet' }
}

function resolveRubroUI(nombreRaw?: string | null): RubroUI {
  const nombre = (nombreRaw || '').toLowerCase()
  const nueva = { label: 'Nueva venta', icon: 'solar:add-circle-bold', to: '/administrador/facturacion/nuevo', primary: true }
  const reportes = { label: 'Reportes', icon: 'solar:chart-2-bold-duotone', to: '/administrador/finanzas/dashboard' }
  const productos = { label: 'Productos', icon: 'solar:box-bold-duotone', to: '/administrador/kardex/productos' }
  const clientes = { label: 'Clientes', icon: 'solar:users-group-rounded-bold-duotone', to: '/administrador/clientes' }

  const esBodega = ['bodega', 'supermarket', 'supermercado', 'minimarket', 'abarrotes'].some((x) => nombre.includes(x))
  const esRestaurante = nombre.includes('restaurante')
  const esAlimentos = esRestaurante || ['panaderia', 'panadería', 'pasteleria', 'pastelería', 'cafeteria', 'cafetería'].some((x) => nombre.includes(x))
  const esVehicular = ['vehicular', 'vehiculo', 'vehículo', 'alarma', 'gps', 'rastreo', 'monitoreo'].some((x) => nombre.includes(x))

  if (esFarmaciaRetailRubro(nombre) || esDrogueriaRubro(nombre)) {
    return {
      key: 'farmacia',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Lotes y vencimientos', icon: 'solar:calendar-mark-bold-duotone', to: '/administrador/kardex/lotes' }, productos, reportes],
      focus: { label: 'Revisar lotes por vencer', hint: 'Controla el FEFO antes de que caduquen', icon: 'solar:calendar-mark-bold-duotone', to: '/administrador/kardex/lotes', tone: 'amber' },
    }
  }
  if (esRubroFabricacion(nombre)) {
    return {
      key: 'fabricacion',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Órdenes de producción', icon: 'solar:widget-add-bold-duotone', to: '/administrador/produccion/ordenes' }, productos, reportes],
      focus: { label: 'Órdenes de producción', hint: 'Revisa el avance de fabricación', icon: 'solar:widget-add-bold-duotone', to: '/administrador/produccion/ordenes', tone: 'sky' },
    }
  }
  if (esRubroComputo(nombre)) {
    return {
      key: 'computo',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Series y garantías', icon: 'solar:shield-check-bold-duotone', to: '/administrador/kardex/series-garantias' }, productos, reportes],
      focus: { label: 'Series y garantías', hint: 'Controla los equipos por número de serie', icon: 'solar:shield-check-bold-duotone', to: '/administrador/kardex/series-garantias', tone: 'sky' },
    }
  }
  if (esAlimentos) {
    return {
      key: 'alimentos',
      ventaCta: esRestaurante ? 'Nueva comanda' : 'Nueva venta',
      productosLabel: esRestaurante ? 'Platos más vendidos' : 'Productos más vendidos',
      quickActions: [{ ...nueva, label: esRestaurante ? 'Nueva comanda' : 'Nueva venta' }, productos, clientes, reportes],
    }
  }
  if (esBodega) {
    return {
      key: 'bodega',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Reponer stock', icon: 'solar:bag-check-bold-duotone', to: '/administrador/compras' }, productos, reportes],
    }
  }
  if (esVehicular) {
    return {
      key: 'vehicular',
      ventaCta: 'Nueva venta',
      productosLabel: 'Servicios más vendidos',
      quickActions: [nueva, { label: 'Clientes y contratos', icon: 'solar:file-check-bold-duotone', to: '/administrador/clientes' }, productos, reportes],
      focus: { label: 'Contratos y renovaciones', hint: 'Da seguimiento a los contratos por vencer', icon: 'solar:file-check-bold-duotone', to: '/administrador/clientes', tone: 'violet' },
    }
  }
  return {
    key: 'generico',
    ventaCta: 'Nueva venta',
    productosLabel: 'Productos más vendidos',
    quickActions: [nueva, productos, clientes, reportes],
  }
}

const Trend = ({ trend }: { trend: number }) => {
  const pos = (trend ?? 0) >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${pos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
      <Icon icon={pos ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
      {Math.abs(trend ?? 0).toFixed(1)}%
    </span>
  )
}

export default function AdminIndex() {
  const navigate = useNavigate()
  const { auth, sedeActiva } = useAuthStore()
  const { overviewData, getOverview }: IDashboardState = useDashboardStore()
  const { showModal, tourStep, startTour, skipTour, nextStep, prevStep, endTour } = useWelcomeTour(auth)

  const rubroUI = useMemo(() => resolveRubroUI(auth?.empresa?.rubro?.nombre), [auth?.empresa?.rubro?.nombre])

  // ── Periodo del resumen ──
  const [period, setPeriod] = useState('mes')
  const { fechaInicio, fechaFin, periodLabel } = useMemo(() => {
    const fin = moment().format('YYYY-MM-DD')
    if (period === 'hoy') return { fechaInicio: fin, fechaFin: fin, periodLabel: 'Hoy' }
    if (period === '7d') return { fechaInicio: moment().subtract(6, 'days').format('YYYY-MM-DD'), fechaFin: fin, periodLabel: 'Últimos 7 días' }
    return { fechaInicio: moment().startOf('month').format('YYYY-MM-DD'), fechaFin: fin, periodLabel: 'Este mes' }
  }, [period])

  const effectiveSedeId = sedeActiva?.id ?? null
  const [ovLoading, setOvLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setOvLoading(true)
    ;(async () => {
      await (getOverview(fechaInicio, fechaFin, effectiveSedeId) as unknown as Promise<void>)
      if (alive) setOvLoading(false)
    })()
    return () => { alive = false }
  }, [fechaInicio, fechaFin, effectiveSedeId, getOverview])

  const kpis = overviewData?.kpis ?? { ventas: { value: 0, trend: 0 }, pedidos: { value: 0, trend: 0 }, clientes: { value: 0, trend: 0 }, conversion: { value: 0, trend: 0 } }
  const financiero = overviewData?.financiero ?? { ingresos: { value: 0, trend: 0 }, gastos: { value: 0, trend: 0 }, ganancias: { value: 0, trend: 0 }, margen: 0 }
  const chartVentas: Array<{ date: string; total: number }> = overviewData?.chartVentas ?? []
  const chartCanales: Array<{ name: string; value: number; percentage: number }> = overviewData?.chartCanales ?? []
  const topProductos: any[] = overviewData?.topProductos ?? []
  const alertas = overviewData?.alertas ?? {}
  const canalTotal = useMemo(() => chartCanales.reduce((a, c) => a + (c.value || 0), 0), [chartCanales])

  // ── Tarjetas "Requiere tu atención" ──
  const atencion = useMemo(() => {
    const items: { key: string; icon: string; label: string; value: string; to: string; tone: string }[] = []
    const stockN = alertas?.stockBajo?.length ?? 0
    const sunatN = alertas?.sunatPendientes?.count ?? 0
    const cobrar = alertas?.cuentasCobrar?.total ?? 0
    const pedidos = alertas?.pedidosTiendaPendientes ?? 0
    if (stockN > 0) items.push({ key: 'stock', icon: 'solar:box-minimalistic-bold-duotone', label: 'Productos con stock bajo', value: String(stockN), to: '/administrador/kardex/productos', tone: 'rose' })
    if (sunatN > 0) items.push({ key: 'sunat', icon: 'solar:document-add-bold-duotone', label: 'Comprobantes pendientes en SUNAT', value: String(sunatN), to: '/administrador/facturacion/comprobantes', tone: 'amber' })
    if (cobrar > 0) items.push({ key: 'cobrar', icon: 'solar:wallet-money-bold-duotone', label: `Por cobrar${alertas?.cuentasCobrar?.cantidad ? ` (${alertas.cuentasCobrar.cantidad})` : ''}`, value: formatShort(cobrar), to: '/administrador/ventas/pagos/cuentas-cobrar', tone: 'violet' })
    if (pedidos > 0) items.push({ key: 'pedidos', icon: 'solar:cart-large-2-bold-duotone', label: 'Pedidos de tienda por atender', value: String(pedidos), to: '/administrador/tienda/pedidos', tone: 'sky' })
    // Rubro reordena: farmacia/droguería priorizan el stock (ya va primero).
    return items
  }, [alertas])

  const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
  }

  // ── Tabla de comprobantes (sección inferior) ──
  const [rows, setRows] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [sort, setSort] = useState('fecha_desc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const debounced = useDebounce(search, 500)
  const reqRef = useRef(0)

  const fetchData = async () => {
    const reqId = ++reqRef.current
    setLoading(true)
    try {
      const params = Object.entries({
        tipoComprobante: 'FORMAL', page, limit, search: debounced, estado,
        ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {}),
      }).filter(([, v]) => v !== undefined && v !== '').reduce((o, [k, v]) => ({ ...o, [k]: String(v) }), {} as Record<string, string>)
      const query = new URLSearchParams(params).toString()
      const resp: any = await get(`comprobante/listar?${query}`)
      if (reqId !== reqRef.current) return
      if (resp?.code === 1) {
        setRows(Array.isArray(resp.data?.comprobantes) ? resp.data.comprobantes : [])
        setTotal(typeof resp.data?.total === 'number' ? resp.data.total : (resp.data?.comprobantes?.length ?? 0))
      } else { setRows([]); setTotal(0) }
    } catch {
      if (reqId === reqRef.current) { setRows([]); setTotal(0) }
    } finally {
      if (reqId === reqRef.current) setLoading(false)
    }
  }

  useEffect(() => { fetchData() /* eslint-disable-next-line */ }, [page, limit, debounced, estado, effectiveSedeId])
  useEffect(() => { setPage(1) }, [debounced, estado, limit])

  const sortedRows = useMemo(() => {
    const arr = [...rows]
    switch (sort) {
      case 'fecha_asc': return arr.sort((a, b) => +new Date(a.fechaEmision) - +new Date(b.fechaEmision))
      case 'total_desc': return arr.sort((a, b) => (b.mtoImpVenta || 0) - (a.mtoImpVenta || 0))
      case 'total_asc': return arr.sort((a, b) => (a.mtoImpVenta || 0) - (b.mtoImpVenta || 0))
      default: return arr.sort((a, b) => +new Date(b.fechaEmision) - +new Date(a.fechaEmision))
    }
  }, [rows, sort])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const fromRow = total === 0 ? 0 : (page - 1) * limit + 1
  const toRow = Math.min(page * limit, total)

  const copyDoc = (inv: Invoice) => {
    navigator.clipboard?.writeText(`${inv.serie}-${String(inv.correlativo).padStart(8, '0')}`)
    setCopied(inv.id); setTimeout(() => setCopied((c) => (c === inv.id ? null : c)), 1200)
  }

  const exportCSV = () => {
    const head = ['Cliente', 'Documento', 'Total', 'Sede', 'Estado', 'Fecha', 'Tipo']
    const lines = sortedRows.map((r) => [
      r.cliente?.nombre || r.clienteNombre || '',
      `${r.serie}-${String(r.correlativo).padStart(8, '0')}`,
      r.mtoImpVenta ?? 0, r.sede?.nombre || '', estadoPill(r.estadoEnvioSunat).label,
      moment(r.fechaEmision).format('DD/MM/YYYY'), TIPO_DOC_LABEL[r.tipoDoc] || r.tipoDoc,
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `comprobantes_${moment().format('YYYYMMDD')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const pageNumbers = useMemo(() => {
    const nums: number[] = []; const win = 2
    for (let i = Math.max(1, page - win); i <= Math.min(totalPages, page + win); i++) nums.push(i)
    if (!nums.includes(1)) nums.unshift(1)
    if (!nums.includes(totalPages)) nums.push(totalPages)
    return [...new Set(nums)].sort((a, b) => a - b)
  }, [page, totalPages])

  const nombre = auth?.nombre?.split(' ')[0] || 'Administrador'
  const kpiCards = [
    { label: 'Ventas netas', value: formatShort(kpis.ventas.value), sub: formatMoney(kpis.ventas.value), trend: kpis.ventas.trend, icon: 'solar:cart-large-2-bold-duotone', spark: true },
    { label: 'Ganancia', value: formatShort(financiero.ganancias.value), sub: `Margen ${Number(financiero.margen ?? 0).toFixed(0)}%`, trend: financiero.ganancias.trend, icon: 'solar:money-bag-bold-duotone' },
    { label: 'Ticket promedio', value: formatMoney(kpis.conversion.value), sub: `${kpis.pedidos.value.toLocaleString('es-PE')} comprobantes`, trend: kpis.conversion.trend, icon: 'solar:tag-price-bold-duotone' },
    { label: 'Clientes nuevos', value: kpis.clientes.value.toLocaleString('es-PE'), sub: periodLabel, trend: kpis.clientes.trend, icon: 'solar:users-group-rounded-bold-duotone' },
  ]

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta" style={{ ['--accent' as any]: ACCENT }}>
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight truncate">Hola, {nombre} 👋</h1>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white shrink-0" style={{ background: ACCENT }}>En vivo</span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Resumen de tu negocio · <span className="capitalize">{moment().format('dddd, D [de] MMMM')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Selector de periodo */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${period === p.key ? 'text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                style={period === p.key ? { background: ACCENT } : undefined}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/administrador/facturacion/nuevo')}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}>
            <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">{rubroUI.ventaCta}</span>
          </button>
        </div>
      </div>

      {/* ── KPIs hero ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpiCards.map((c) => (
          <div key={c.label} className="rounded-3xl bg-white p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 grid place-items-center rounded-2xl bg-violet-50 text-violet-600">
                <Icon icon={c.icon} className="text-xl" />
              </div>
              {!ovLoading && <Trend trend={c.trend} />}
            </div>
            <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">{c.label}</p>
            {ovLoading ? (
              <div className="mt-1 h-7 w-24 rounded-lg bg-slate-100 animate-pulse" />
            ) : (
              <p className="mt-0.5 text-2xl font-extrabold text-slate-800">{c.value}</p>
            )}
            {c.spark && chartVentas.length > 1 ? (
              <div className="mt-2 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartVentas} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kpiSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="total" stroke={ACCENT} strokeWidth={2} fill="url(#kpiSpark)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-1 text-xs font-medium text-slate-400 truncate">{c.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Requiere tu atención ── */}
      {(atencion.length > 0 || rubroUI.focus) && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-500 text-lg" />
            <h2 className="text-sm font-extrabold text-slate-700">Requiere tu atención</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {atencion.map((a) => {
              const t = toneMap[a.tone]
              return (
                <button key={a.key} onClick={() => navigate(a.to)}
                  className={`group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_2px_14px_rgba(15,23,42,0.05)] border border-slate-100 ring-1 ${t.ring} hover:shadow-md transition-all`}>
                  <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-xl ${t.bg} ${t.text}`}>
                    <Icon icon={a.icon} className="text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg font-extrabold ${t.text}`}>{a.value}</p>
                    <p className="text-xs font-semibold text-slate-500 leading-tight">{a.label}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>
              )
            })}
            {rubroUI.focus && (() => {
              const t = toneMap[rubroUI.focus.tone]
              return (
                <button onClick={() => navigate(rubroUI.focus!.to)}
                  className={`group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_2px_14px_rgba(15,23,42,0.05)] border border-slate-100 ring-1 ${t.ring} hover:shadow-md transition-all`}>
                  <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-xl ${t.bg} ${t.text}`}>
                    <Icon icon={rubroUI.focus.icon} className="text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-700 leading-tight">{rubroUI.focus.label}</p>
                    <p className="text-xs font-medium text-slate-400 leading-tight">{rubroUI.focus.hint}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Accesos rápidos por rubro ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {rubroUI.quickActions.map((q) => (
          <button key={q.label} onClick={() => navigate(q.to)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all border ${q.primary ? 'text-white border-transparent shadow-md shadow-violet-500/25 hover:brightness-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-violet-600'}`}
            style={q.primary ? { background: ACCENT } : undefined}>
            <Icon icon={q.icon} className="text-lg" /> {q.label}
          </button>
        ))}
      </div>

      {/* ── Gráficos: ventas por día + canales ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 lg:col-span-2">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Ventas por día</h3>
              <p className="text-xs text-slate-400">{periodLabel}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} /> Ventas netas
            </div>
          </div>
          <div className="h-56">
            {chartVentas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartVentas} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    formatter={(v: any) => [formatMoney(v), 'Ventas']}
                    labelFormatter={(l) => moment(l).format('DD MMM')}
                    contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#e5e7eb' }}
                  />
                  <Area type="monotone" dataKey="total" stroke={ACCENT} strokeWidth={2.5} fill="url(#ventasFill)" dot={false} activeDot={{ r: 4, fill: ACCENT }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-300">
                <Icon icon="solar:chart-2-linear" className="text-5xl mb-2" />
                <p className="text-sm text-slate-400">Sin ventas en este periodo</p>
              </div>
            )}
          </div>
        </div>

        {/* Donut canales */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-800">Cómo te pagan</h3>
          <p className="mb-2 text-xs text-slate-400">Canales del periodo</p>
          <div className="relative mx-auto h-36 w-36">
            {chartCanales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartCanales} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {chartCanales.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [formatMoney(v), n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-300">Sin datos</div>
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-extrabold text-slate-800">{formatShort(canalTotal)}</span>
              <span className="text-[10px] font-medium text-slate-400">total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {chartCanales.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                  <span className="truncate font-medium text-slate-600">{c.name}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-500">{(c.percentage ?? 0).toFixed(0)}%</span>
              </div>
            ))}
            {chartCanales.length === 0 && <p className="text-center text-xs text-slate-400 py-2">Aún no hay pagos registrados</p>}
          </div>
        </div>
      </div>

      {/* ── Top productos ── */}
      <div className="rounded-3xl bg-white p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 mb-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800">{rubroUI.productosLabel}</h3>
          <button onClick={() => navigate('/administrador/kardex/productos')} className="text-xs font-bold text-violet-600 hover:underline">Ver todos</button>
        </div>
        <div className="space-y-4">
          {topProductos.length > 0 ? topProductos.slice(0, 5).map((p, i) => {
            const max = topProductos[0]?.total || 1
            const pct = ((p.total || 0) / max) * 100
            const color = SERIES[i % SERIES.length]
            return (
              <div key={p.productoId || i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: color }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-800">{p.producto?.descripcion || 'Producto sin nombre'}</span>
                    <span className="shrink-0 text-[13px] font-bold text-slate-700">{formatMoney(p.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] font-medium text-slate-400">{p.cantidad ?? 0} u.</span>
                  </div>
                </div>
              </div>
            )
          }) : (
            <p className="py-6 text-center text-sm text-slate-400">Sin productos vendidos en este periodo</p>
          )}
        </div>
      </div>

      {/* ── Comprobantes recientes (tabla) ── */}
      <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-800 mr-1">Comprobantes recientes</h3>
          <div className="relative flex-1 min-w-[180px] lg:max-w-xs">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente o documento…"
              className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><Icon icon="solar:close-circle-bold" /></button>}
          </div>
          {/* Filtro */}
          <div className="relative">
            <button onClick={() => { setShowFilter((v) => !v); setShowSort(false) }} className="h-9 px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
              <Icon icon="solar:filter-linear" /> Filtro {estado && <span className="ml-0.5 h-5 min-w-5 px-1 grid place-items-center rounded-full text-white text-[11px]" style={{ background: ACCENT }}>1</span>}
            </button>
            {showFilter && (
              <div className="absolute z-20 mt-2 w-44 rounded-2xl border border-slate-100 bg-white shadow-xl p-1.5">
                {ESTADOS.map((e) => (
                  <button key={e.key} onClick={() => { setEstado(e.key); setShowFilter(false) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between ${estado === e.key ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {e.label} {estado === e.key && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Orden */}
          <div className="relative">
            <button onClick={() => { setShowSort((v) => !v); setShowFilter(false) }} className="h-9 px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
              <Icon icon="solar:sort-vertical-linear" /> {SORTS.find((s) => s.key === sort)?.label}
            </button>
            {showSort && (
              <div className="absolute z-20 mt-2 w-44 rounded-2xl border border-slate-100 bg-white shadow-xl p-1.5">
                {SORTS.map((s) => (
                  <button key={s.key} onClick={() => { setSort(s.key); setShowSort(false) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between ${sort === s.key ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {s.label} {sort === s.key && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button onClick={exportCSV} className="h-9 px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
              <Icon icon="solar:upload-minimalistic-linear" /> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button onClick={() => navigate('/administrador/facturacion/comprobantes')} className="h-9 px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
              <Icon icon="solar:eye-linear" /> <span className="hidden sm:inline">Ver todo</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="py-3 pl-5 px-3">Cliente</th>
                <th className="py-3 px-3">Documento</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Sede</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3 pr-5">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50"><td colSpan={7} className="py-3.5 px-5"><div className="h-6 rounded-lg bg-slate-100 animate-pulse" /></td></tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Icon icon="solar:inbox-linear" className="text-5xl text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No hay comprobantes para mostrar.</p>
                </td></tr>
              ) : sortedRows.map((inv) => {
                const pill = estadoPill(inv.estadoEnvioSunat)
                const pagado = String(inv.estadoPago ?? '').toUpperCase() === 'PAGADO'
                const cliente = inv.cliente?.nombre || inv.clienteNombre || 'Cliente varios'
                return (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 pl-5 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">{cliente.charAt(0).toUpperCase()}</div>
                        <span className="font-semibold text-slate-700 text-sm truncate max-w-[180px]">{cliente}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm text-slate-600">{inv.serie}-{String(inv.correlativo).padStart(8, '0')}</span>
                        <button onClick={() => copyDoc(inv)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 transition-opacity">
                          <Icon icon={copied === inv.id ? 'solar:check-read-linear' : 'solar:copy-linear'} className={copied === inv.id ? 'text-emerald-500' : ''} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 text-sm">{money(inv.mtoImpVenta, inv.tipoMoneda)}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 truncate max-w-[160px]">{inv.sede?.nombre || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500">{moment(inv.fechaEmision).format('DD/MM/YYYY')}</td>
                    <td className="py-3 px-3 pr-5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600">{TIPO_DOC_LABEL[inv.tipoDoc] || inv.tipoDoc}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${pagado ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{pagado ? 'Pagado' : 'Por cobrar'}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100">
          <span className="text-sm text-slate-400">{fromRow}-{toRow} de {total.toLocaleString('es-PE')}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
            {pageNumbers.map((n, i) => {
              const prev = pageNumbers[i - 1]; const gap = prev && n - prev > 1
              return (
                <span key={n} className="flex items-center">
                  {gap && <span className="px-1 text-slate-300">…</span>}
                  <button onClick={() => setPage(n)} className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === page ? 'text-white' : 'text-slate-500 hover:bg-slate-100'}`} style={n === page ? { background: ACCENT } : undefined}>{n}</button>
                </span>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Filas/pág</span>
            <Select label="" name="limit" error="" options={PER_PAGE.map((n) => ({ id: n, value: String(n) }))} value={String(limit)} onChange={(id) => setLimit(Number(id))} />
          </div>
        </div>
      </div>

      {/* Tour de bienvenida — solo primer login */}
      {showModal && auth && <WelcomeModal user={auth} onStartTour={startTour} onSkip={skipTour} />}
      {tourStep !== null && <TourSpotlight step={tourStep} onNext={nextStep} onPrev={prevStep} onEnd={endTour} />}
    </div>
  )
}
