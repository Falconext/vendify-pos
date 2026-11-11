import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RotuloTicketEnvio from '../RotuloTicketEnvio'
import { altoTicketMm, guardarRotuloFormato, leerRotuloFormato, ROTULO_FORMATOS, rotuloPageStyle } from '../rotuloFormato'

const base = {
    nroOrden: '102662417', claveOrden: null, nombreDestinatario: 'CHUQUIPOMA GARCIA, ELY JANET', dniDestinatario: '74819375',
    ubicacion: 'PIURA - PAITA - PAITA', agenciaNombre: 'PAITA', direccion: '', celular: '943239274', destino: 'AGENCIA' as const,
    referencia: 'NV01-00000010', empresaNombre: 'HELOU SHOP E.I.R.L.', fecha: '2026-11-05T15:00:00Z',
    productos: [{ descripcion: 'CABLE DE CARGA', cantidad: 1 }, { descripcion: 'TRIPODE', cantidad: 1 }],
}

describe('rótulo Ticket 80 mm con logo', () => {
    it('en agencia muestra destino y orden, sin monto', () => {
        render(<RotuloTicketEnvio d={{ ...base, porCobrar: null }} courier="Shalom PRO" logo="https://x.pe/logo.png" />)
        expect(screen.getByTestId('rotulo-ticket-envio-destino')).toHaveTextContent('PAITA')
        expect(screen.getByTestId('rotulo-ticket-envio-orden')).toHaveTextContent('102662417')
        expect(screen.getByTestId('rotulo-ticket-envio-courier')).toHaveTextContent('Shalom PRO')
        expect(screen.getByTestId('rotulo-ticket-envio-logo')).toBeInTheDocument()
        expect(screen.getByTestId('rotulo-ticket-envio-referencia')).toHaveTextContent('NV01-10')
        expect(screen.queryByTestId('rotulo-ticket-envio-cobrar')).toBeNull()
    })

    it('en Lima muestra dirección y lo que hay que cobrar', () => {
        render(<RotuloTicketEnvio d={{ ...base, destino: 'LOCAL', direccion: 'AV SOL 1', distrito: 'SURQUILLO', porCobrar: 152 }} />)
        expect(screen.getByTestId('rotulo-ticket-envio-destino')).toHaveTextContent('AV SOL 1')
        expect(screen.getByTestId('rotulo-ticket-envio-cobrar')).toHaveTextContent('152.00')
    })

    it('sin logo y con muchos productos, resume la lista', () => {
        const productos = Array.from({ length: 8 }, (_, i) => ({ descripcion: `P${i}`, cantidad: 1 }))
        render(<RotuloTicketEnvio d={{ ...base, productos }} />)
        expect(screen.queryByTestId('rotulo-ticket-envio-logo')).toBeNull()
        expect(screen.getByTestId('rotulo-ticket-envio-productos')).toHaveTextContent('+ 4 productos más')
    })

    it('es un formato aparte que se recuerda y usa la hoja medida', () => {
        expect(ROTULO_FORMATOS.map((f) => f.value)).toEqual(expect.arrayContaining(['TICKET', 'TICKET_ENVIO']))
        guardarRotuloFormato(99, 'TICKET_ENVIO')
        expect(leerRotuloFormato(99)).toBe('TICKET_ENVIO')
        expect(rotuloPageStyle('TICKET_ENVIO', 95)).toContain('size: 80mm 95mm')
    })

    it('la hoja se mide también con este diseño', () => {
        const caja = document.createElement('div')
        const el = document.createElement('div')
        el.setAttribute('data-testid', 'rotulo-ticket-envio')
        Object.defineProperty(el, 'offsetHeight', { value: 400 })
        caja.appendChild(el)
        expect(altoTicketMm(caja)).toBe(108)
    })
})
