/**
 * La página donde el cliente llena sus datos de envío, abierta desde un
 * enlace de WhatsApp.
 *
 * Reemplaza el "pásame tu nombre, DNI, celular y la agencia" que llegaba en
 * cuatro mensajes sueltos y había que copiar a mano. Acá el cliente elige su
 * agencia de la lista real de Shalom u Olva (la misma del checkout de la
 * tienda) y lo que guarda va directo al despacho, listo para la guía.
 *
 *  - Sin login: el enlace es la credencial (ver `datos-cliente-envio.ts`).
 *  - Lo que la tienda ya sabe viene escrito; el cliente solo revisa.
 *  - Se puede corregir hasta que el paquete sale.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import {
    EnvioAgenciaContext,
    EnvioAgenciaSeccion,
    faltaEnvioAgencia,
    NOMBRE_COURIER,
    type AgenciaTienda,
    type CourierTienda,
    type EnvioAgenciaValor,
} from '@/components/tienda/EnvioAgencia'

type Datos = {
    nombre: string
    documento: string
    celular: string
    modo: 'DOMICILIO' | CourierTienda
    agenciaId: string
    agenciaNombre: string
    direccion: string
    distrito: string
    referencia: string
}

type Enlace = {
    negocio: string
    pedido: string
    items: { cantidad: number; descripcion: string }[]
    couriers: CourierTienda[]
    completadoEn: string | null
    datos: Datos
}

const API = import.meta.env.VITE_API_URL || '/api'
const COLOR = '#111827'
const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400'

/** Qué falta para enviar, o null si está completo. */
export function faltaDatosCliente(nombre: string, celular: string, envio: EnvioAgenciaValor, direccion: string): string | null {
    if (nombre.trim().length < 3) return 'Escribe tu nombre completo.'
    if (!/^9\d{8}$/.test(celular.replace(/\D/g, ''))) return 'Escribe tu celular de 9 dígitos.'
    return faltaEnvioAgencia(envio, direccion)
}

export default function DatosEnvioClientePage() {
    const { token = '' } = useParams()
    const [enlace, setEnlace] = useState<Enlace | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [nombre, setNombre] = useState('')
    const [celular, setCelular] = useState('')
    const [envio, setEnvio] = useState<EnvioAgenciaValor>({ modo: 'DOMICILIO', agenciaId: '', agenciaNombre: '', documento: '' })
    const [direccion, setDireccion] = useState('')
    const [distrito, setDistrito] = useState('')
    const [referencia, setReferencia] = useState('')
    const [dniDomicilio, setDniDomicilio] = useState('')

    const [enviando, setEnviando] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    const [listo, setListo] = useState<string | null>(null)
    const [agenciasCache] = useState(() => new Map<CourierTienda, Promise<AgenciaTienda[]>>())

    const cargar = useCallback(async () => {
        try {
            const r = await fetch(`${API}/datos-envio/${token}`)
            if (!r.ok) {
                setError('Este enlace ya no está activo. Escríbele a la tienda por WhatsApp.')
                return
            }
            const json = await r.json()
            const e: Enlace = json?.data ?? json
            setEnlace(e)
            const d = e.datos
            setNombre(d.nombre ?? '')
            setCelular(d.celular ?? '')
            const modo = d.modo === 'DOMICILIO' || e.couriers.includes(d.modo) ? d.modo : (e.couriers[0] ?? 'DOMICILIO')
            setEnvio({ modo, agenciaId: d.agenciaId ?? '', agenciaNombre: d.agenciaNombre ?? '', documento: d.documento ?? '' })
            setDniDomicilio(d.documento ?? '')
            setDireccion(d.direccion ?? '')
            setDistrito(d.distrito ?? '')
            setReferencia(d.referencia ?? '')
        } catch {
            setError('No se pudo cargar. Revisa tu conexión e intenta de nuevo.')
        } finally {
            setCargando(false)
        }
    }, [token])

    useEffect(() => { void cargar() }, [cargar])

    const ctx = useMemo(() => ({
        couriers: enlace?.couriers ?? [],
        tipoEntrega: 'ENVIO' as const,
        valor: envio,
        setValor: setEnvio,
        direccion,
        setDireccion,
        cargarAgencias: (c: CourierTienda) => {
            // Una sola descarga por courier: la lista no cambia mientras llena.
            if (!agenciasCache.has(c)) {
                agenciasCache.set(
                    c,
                    fetch(`${API}/datos-envio/${token}/agencias/${c}`)
                        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
                        .then((j) => j?.data ?? j ?? []),
                )
            }
            const p = agenciasCache.get(c)!
            p.catch(() => agenciasCache.delete(c))
            return p
        },
    }), [enlace, envio, direccion, token, agenciasCache])

    const enviar = async () => {
        const falta = faltaDatosCliente(nombre, celular, envio, direccion)
        if (falta) {
            setAviso(falta)
            return
        }
        setEnviando(true)
        setAviso(null)
        const domicilio = envio.modo === 'DOMICILIO'
        try {
            const r = await fetch(`${API}/datos-envio/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    celular,
                    modo: envio.modo,
                    documento: domicilio ? dniDomicilio : envio.documento,
                    ...(domicilio
                        ? { direccion, distrito, referencia }
                        : { agenciaId: envio.agenciaId, agenciaNombre: envio.agenciaNombre }),
                }),
            })
            const json = await r.json().catch(() => ({}))
            if (!r.ok) {
                const msg = json?.message
                setAviso(Array.isArray(msg) ? msg[0] : msg || 'No se pudo guardar. Intenta de nuevo.')
                if (r.status === 404) setError('Este enlace ya no está activo. Escríbele a la tienda por WhatsApp.')
                return
            }
            setListo(domicilio ? [direccion, distrito].filter(Boolean).join(' - ') : `${NOMBRE_COURIER[envio.modo as CourierTienda]} · ${envio.agenciaNombre}`)
        } catch {
            setAviso('No se pudo guardar. Revisa tu conexión e intenta de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    if (cargando) {
        return (
            <Pantalla>
                <p className="text-center text-sm text-gray-500">Cargando…</p>
            </Pantalla>
        )
    }

    if (error || !enlace) {
        return (
            <Pantalla>
                <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                    <Icon icon="solar:link-broken-bold-duotone" width={44} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600">{error}</p>
                </div>
            </Pantalla>
        )
    }

    if (listo) {
        return (
            <Pantalla>
                <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                    <Icon icon="solar:check-circle-bold" width={52} className="mx-auto mb-3 text-emerald-500" />
                    <p className="text-lg font-bold text-gray-900">¡Listo, {nombre.split(' ')[0]}!</p>
                    <p className="mt-1 text-sm text-gray-600">{enlace.negocio} ya tiene tus datos para enviarte el pedido.</p>
                    <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-800">{listo}</p>
                    <button type="button" onClick={() => setListo(null)} className="mt-4 text-xs font-semibold text-gray-500 underline">
                        Corregir algo
                    </button>
                </div>
            </Pantalla>
        )
    }

    return (
        <Pantalla>
            <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{enlace.negocio}</p>
                    <h1 className="mt-0.5 text-lg font-bold text-gray-900">Datos para tu envío</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Con esto armamos la etiqueta de tu paquete. Escríbelos como figuran en tu DNI.
                    </p>
                    <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="mb-1 font-mono text-xs font-bold text-gray-400">Pedido {enlace.pedido}</p>
                        {enlace.items.map((i, k) => (
                            <p key={k} className="text-sm text-gray-700">
                                <span className="font-bold">{i.cantidad}×</span> {i.descripcion}
                            </p>
                        ))}
                    </div>
                </div>

                {enlace.completadoEn && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        Ya recibimos tus datos. Si algo cambió, corrígelo y vuelve a guardar.
                    </p>
                )}

                <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                    <label className="block">
                        <span className="mb-1 block text-sm font-bold text-gray-900">Nombre completo</span>
                        <input className={inp} value={nombre} maxLength={120} autoComplete="name"
                               onChange={(e) => setNombre(e.target.value)} placeholder="Nombres y apellidos" />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-bold text-gray-900">Celular</span>
                        <input className={inp} value={celular} inputMode="tel" maxLength={12} autoComplete="tel"
                               onChange={(e) => setCelular(e.target.value.replace(/[^\d ]/g, ''))} placeholder="9xx xxx xxx" />
                    </label>

                    <EnvioAgenciaContext.Provider value={ctx}>
                        <EnvioAgenciaSeccion color={COLOR} />
                    </EnvioAgenciaContext.Provider>

                    {envio.modo === 'DOMICILIO' && (
                        <>
                            <input className={inp} value={distrito} maxLength={100}
                                   onChange={(e) => setDistrito(e.target.value)} placeholder="Distrito y ciudad" />
                            <input className={inp} value={referencia} maxLength={300}
                                   onChange={(e) => setReferencia(e.target.value)} placeholder="Referencia (opcional)" />
                            <input className={inp} value={dniDomicilio} inputMode="numeric" maxLength={11}
                                   onChange={(e) => setDniDomicilio(e.target.value.replace(/\D/g, ''))} placeholder="DNI (opcional)" />
                        </>
                    )}
                </div>

                {aviso && (
                    <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                        <Icon icon="solar:danger-circle-linear" width={18} /> {aviso}
                    </p>
                )}

                <button type="button" onClick={() => void enviar()} disabled={enviando}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-base font-bold text-white disabled:opacity-60">
                    <Icon icon={enviando ? 'svg-spinners:180-ring-with-bg' : 'solar:check-circle-bold'} width={22} />
                    {enlace.completadoEn ? 'Guardar cambios' : 'Enviar mis datos'}
                </button>
                <p className="pb-4 text-center text-[11px] text-gray-400">
                    Tus datos solo se usan para enviarte este pedido.
                </p>
            </div>
        </Pantalla>
    )
}

function Pantalla({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-100 px-4 py-5">
            <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
    )
}
