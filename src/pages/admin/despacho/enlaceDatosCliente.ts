import apiClient from '@/utils/apiClient'

/**
 * El enlace para que el cliente llene él mismo sus datos de envío
 * (provincia): nombre, DNI, celular y la agencia de Shalom u Olva.
 *
 * Igual que el del repartidor, no se manda desde el servidor: Meta bloquea el
 * texto libre a un número que no escribió en 24 horas. Se abre `wa.me` con el
 * mensaje listo y lo manda quien vende, desde su WhatsApp. El backend crea el
 * despacho si la venta todavía no tenía.
 */
export interface EnlaceDatosCliente {
    token: string
    pedido: string
    cliente: string | null
    telefono: string | null
}

export function mensajeDatosCliente(e: EnlaceDatosCliente, origen: string): string {
    const nombre = (e.cliente ?? '').trim().split(/\s+/)[0]
    const saludo = nombre && !/^clientes?$/i.test(nombre) ? `Hola ${nombre} 👋` : 'Hola 👋'
    return [
        saludo,
        `Para enviarte tu pedido *${e.pedido}* necesitamos tus datos: nombre, DNI, celular y la agencia donde lo recoges.`,
        '',
        'Llénalos aquí, es un minuto:',
        `${origen.replace(/\/+$/, '')}/datos-envio/${e.token}`,
    ].join('\n')
}

/** Celular peruano de 9 dígitos con el 51 delante, o '' si no hay uno válido. */
export function numeroWhatsapp(telefono: string | null | undefined): string {
    const d = String(telefono ?? '').replace(/\D/g, '').slice(-9)
    return /^9\d{8}$/.test(d) ? `51${d}` : ''
}

export async function pedirDatosAlCliente(comprobanteId: number): Promise<EnlaceDatosCliente> {
    const res: any = await apiClient.post(`/envio-despacho/comprobante/${comprobanteId}/enlace-datos-cliente`)
    const e = res?.data?.data ?? res?.data
    if (!e?.token) throw new Error('Sin token')
    return e
}

/** Pide el enlace y abre WhatsApp con el mensaje escrito. Devuelve el error para mostrarlo. */
export async function enviarEnlaceDatosCliente(comprobanteId: number): Promise<string | null> {
    try {
        const e = await pedirDatosAlCliente(comprobanteId)
        window.open(
            `https://wa.me/${numeroWhatsapp(e.telefono)}?text=${encodeURIComponent(mensajeDatosCliente(e, window.location.origin))}`,
            '_blank',
            'noopener,noreferrer',
        )
        return null
    } catch (err: any) {
        return err?.response?.data?.message || 'No se pudo generar el enlace. Intenta de nuevo.'
    }
}
