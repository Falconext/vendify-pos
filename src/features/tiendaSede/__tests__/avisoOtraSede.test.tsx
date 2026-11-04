/**
 * Pedido 02-11: "cuando no hay productos en una sede, que le diga que en otra
 * sede hay". En la tienda de una sola sede el cliente no puede cambiarse, así
 * que el aviso solo informa dónde hay, con la dirección.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AvisoOtraSede, { debeAvisarOtraSede } from '../AvisoOtraSede'

const ficha = {
    productoId: 7,
    sedeId: null,
    stock: 0,
    vendible: true,
    disponibleEn: [{ sedeId: 2, nombre: 'Surco', stock: 4, direccion: 'Av. Primavera 120' }],
}

describe('aviso "hay en otra sede"', () => {
    it('agotado aquí y hay en otra: se avisa', () => {
        expect(debeAvisarOtraSede(ficha)).toBe(true)
        expect(debeAvisarOtraSede({ ...ficha, stock: 3 })).toBe(false)
        expect(debeAvisarOtraSede({ ...ficha, disponibleEn: [] })).toBe(false)
    })

    it('tienda de una sola sede: dice dónde hay, sin botón para cambiarse', () => {
        render(<AvisoOtraSede ficha={ficha} sedeNombre="Centro" color="#000" />)
        expect(screen.getByTestId('aviso-otra-sede')).toHaveTextContent('Agotado en Centro')
        expect(screen.getByTestId('aviso-solo-informa')).toHaveTextContent('Surco · Av. Primavera 120')
        expect(screen.queryByTestId('aviso-cambiar-2')).not.toBeInTheDocument()
    })

    it('cuando el cliente elige sede: botón para comprar en la otra', () => {
        const cambiar = jest.fn()
        render(<AvisoOtraSede ficha={ficha} sedeNombre="Centro" color="#000" onCambiar={cambiar} />)
        fireEvent.click(screen.getByTestId('aviso-cambiar-2'))
        expect(cambiar).toHaveBeenCalledWith(2)
    })
})
