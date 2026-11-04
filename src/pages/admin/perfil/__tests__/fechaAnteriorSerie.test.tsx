import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FechaAnteriorSerieToggle } from '../FechaAnteriorSerieToggle'

const cb = () => screen.getByRole('checkbox', { name: 'Permitir fechas anteriores dentro de una serie' })

describe('FechaAnteriorSerieToggle', () => {
    it('refleja el valor apagado y llama al handler con true', () => {
        const onChange = jest.fn()
        render(<FechaAnteriorSerieToggle checked={false} disabled={false} saving={false} onChange={onChange} />)
        expect(cb()).not.toBeChecked()
        fireEvent.click(cb())
        expect(onChange).toHaveBeenCalledWith(true)
    })
    it('refleja el valor activo y llama al handler con false', () => {
        const onChange = jest.fn()
        render(<FechaAnteriorSerieToggle checked disabled={false} saving={false} onChange={onChange} />)
        expect(cb()).toBeChecked()
        fireEvent.click(cb())
        expect(onChange).toHaveBeenCalledWith(false)
    })
    it('deshabilitado mientras guarda', () => {
        render(<FechaAnteriorSerieToggle checked={false} disabled saving onChange={jest.fn()} />)
        expect(cb()).toBeDisabled()
        expect(screen.getByText('Guardando configuración...')).toBeInTheDocument()
        expect(screen.getByText(/Actívalo bajo tu responsabilidad/)).toBeInTheDocument()
    })
})
