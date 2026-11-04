/**
 * El cliente llena sus datos de envío desde un enlace (provincia).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DatosEnvioClientePage, { faltaDatosCliente } from '../DatosEnvioClientePage'
import { mensajeDatosCliente, numeroWhatsapp } from '@/pages/admin/despacho/enlaceDatosCliente'

const ENLACE = {
    negocio: 'Aroma360',
    pedido: 'NV01-00000012',
    items: [{ cantidad: 2, descripcion: 'KHAMRA QAWUA' }],
    couriers: ['SHALOM'],
    completadoEn: null as string | null,
    datos: {
        nombre: 'Freddy', documento: '', celular: '953504112', modo: 'SHALOM',
        agenciaId: '', agenciaNombre: '', direccion: '', distrito: '', referencia: '',
    },
}
const AGENCIAS = [
    { id: 'T1', nombre: 'Cusco Centro', departamento: 'CUSCO', provincia: 'CUSCO', distrito: 'CUSCO' },
    { id: 'T2', nombre: 'Cercado', departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'CERCADO' },
]

const respuesta = (body: unknown, ok = true, status = 200) =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response)

function abrir(fetchMock: jest.Mock) {
    ;(global as any).fetch = fetchMock
    render(
        <MemoryRouter initialEntries={['/datos-envio/tok123']}>
            <Routes>
                <Route path="/datos-envio/:token" element={<DatosEnvioClientePage />} />
            </Routes>
        </MemoryRouter>,
    )
}

function servidor(extra: Partial<typeof ENLACE> = {}) {
    return jest.fn((url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return respuesta({ ok: true })
        if (url.includes('/agencias/SHALOM')) return respuesta({ data: AGENCIAS })
        return respuesta({ data: { ...ENLACE, ...extra } })
    })
}

describe('página de datos de envío', () => {
    it('muestra el pedido con lo que la tienda ya sabe', async () => {
        abrir(servidor())
        expect(await screen.findByText('Datos para tu envío')).toBeTruthy()
        expect(screen.getByText('Aroma360')).toBeTruthy()
        expect(screen.getByText(/KHAMRA QAWUA/)).toBeTruthy()
        expect((screen.getByPlaceholderText('Nombres y apellidos') as HTMLInputElement).value).toBe('Freddy')
        expect((screen.getByPlaceholderText('9xx xxx xxx') as HTMLInputElement).value).toBe('953504112')
        // Solo Shalom: el negocio despacha por ahí.
        expect(screen.getByText('Agencia Shalom')).toBeTruthy()
        expect(screen.queryByText('Agencia Olva Courier')).toBeNull()
    })

    it('elige agencia, pone su DNI y lo guarda', async () => {
        const fetchMock = servidor()
        abrir(fetchMock)
        await screen.findByText('Datos para tu envío')
        fireEvent.change(screen.getByPlaceholderText('Nombres y apellidos'), { target: { value: 'Freddy Ramos' } })
        fireEvent.change(await screen.findByPlaceholderText('Busca tu ciudad o distrito'), { target: { value: 'cusco' } })
        fireEvent.click(await screen.findByText('Cusco Centro - CUSCO - CUSCO'))
        fireEvent.change(screen.getByPlaceholderText(/Tu DNI/), { target: { value: '12345678' } })
        fireEvent.click(screen.getByText('Enviar mis datos'))

        expect(await screen.findByText('¡Listo, Freddy!')).toBeTruthy()
        expect(screen.getByText('Shalom · Cusco Centro - CUSCO - CUSCO')).toBeTruthy()
        const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
        expect(post[0]).toMatch(/\/datos-envio\/tok123$/)
        expect(JSON.parse(String(post[1]!.body))).toEqual({
            nombre: 'Freddy Ramos', celular: '953504112', modo: 'SHALOM', documento: '12345678',
            agenciaId: 'T1', agenciaNombre: 'Cusco Centro - CUSCO - CUSCO',
        })
    })

    it('sin agencia no envía y dice qué falta', async () => {
        const fetchMock = servidor()
        abrir(fetchMock)
        await screen.findByText('Datos para tu envío')
        fireEvent.click(screen.getByText('Enviar mis datos'))
        expect(await screen.findByText('Elige la agencia donde recogerás tu pedido.')).toBeTruthy()
        expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
    })

    it('muestra el error del servidor', async () => {
        const fetchMock = jest.fn((url: string, init?: RequestInit) => {
            if (init?.method === 'POST') return respuesta({ message: 'Escribe tu DNI: la agencia lo pide para entregarte el paquete.' }, false, 400)
            return respuesta({ data: { ...ENLACE, datos: { ...ENLACE.datos, modo: 'DOMICILIO', direccion: 'Av. Sol 123' }, couriers: ['SHALOM'] } })
        })
        abrir(fetchMock)
        await screen.findByText('Datos para tu envío')
        fireEvent.click(screen.getByText('Enviar mis datos'))
        expect(await screen.findByText(/la agencia lo pide/)).toBeTruthy()
    })

    it('si ya los llenó, avisa y deja corregir', async () => {
        abrir(servidor({ completadoEn: '2026-11-02T10:00:00Z' }))
        expect(await screen.findByText(/Ya recibimos tus datos/)).toBeTruthy()
        expect(screen.getByText('Guardar cambios')).toBeTruthy()
    })

    it('enlace vencido o inválido', async () => {
        abrir(jest.fn(() => respuesta({ message: 'x' }, false, 404)))
        await waitFor(() => expect(screen.getByText(/ya no está activo/)).toBeTruthy())
    })

    it('valida nombre y celular antes que la agencia', () => {
        const env = { modo: 'SHALOM' as const, agenciaId: 'T1', agenciaNombre: 'X', documento: '12345678' }
        expect(faltaDatosCliente('Fr', '953504112', env, '')).toMatch(/nombre/)
        expect(faltaDatosCliente('Freddy', '12345', env, '')).toMatch(/celular/)
        expect(faltaDatosCliente('Freddy', '953 504 112', env, '')).toBeNull()
    })
})

describe('mensaje de WhatsApp para pedir los datos', () => {
    const e = { token: 'tok', pedido: 'NV01-00000012', cliente: 'Freddy Ramos', telefono: '953504112' }
    it('saluda por el nombre y lleva el enlace', () => {
        const m = mensajeDatosCliente(e, 'https://app.krezka.com/')
        expect(m).toMatch(/^Hola Freddy/)
        expect(m).toContain('*NV01-00000012*')
        expect(m).toContain('https://app.krezka.com/datos-envio/tok')
    })
    it('a "Clientes varios" no lo llama por ese nombre', () => {
        expect(mensajeDatosCliente({ ...e, cliente: 'CLIENTES VARIOS' }, 'x')).toMatch(/^Hola 👋/)
    })
    it('número de WhatsApp: solo celulares peruanos válidos', () => {
        expect(numeroWhatsapp('+51 953-504-112')).toBe('51953504112')
        expect(numeroWhatsapp('014567890')).toBe('')
        expect(numeroWhatsapp(null)).toBe('')
    })
})
