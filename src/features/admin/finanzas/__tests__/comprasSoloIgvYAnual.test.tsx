/**
 * KREZKA 02-11.
 *  1. "Gastos operativos 1,500 pero arriba 2,400": la tarjeta sumaba las
 *     compras sin producto y el panel no. Ahora se ven separadas y cuadran,
 *     y la factura que la empresa no pagó se marca "Solo IGV".
 *  2. Resumen anual: ganancia con y sin IGV por mes y total del año.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const getMock = jest.fn()
jest.mock('@/utils/fetch', () => ({ get: (...a: any[]) => getMock(...a), patch: jest.fn(), post: jest.fn(), del: jest.fn() }))

import ComprasSinProductoPanel from '../rentabilidad/components/ComprasSinProductoPanel'
import GastosPanel from '../rentabilidad/components/GastosPanel'
import ResumenAnualView from '../resumen-anual/ResumenAnualView'

const compras = [
    { id: 481, documento: 'FF43-0001815', proveedor: 'LA PLAZA GASTRONOMICA', fecha: '2026-10-18T15:00:00Z', neto: 464.83, igv: 83.67, soloCreditoIgv: false },
    { id: 483, documento: 'FP03-00007826', proveedor: 'SERVICENTRO LA PAMPILLA', fecha: '2026-10-17T15:00:00Z', neto: 42.37, igv: 7.63, soloCreditoIgv: true },
]

describe('compras sin producto', () => {
    it('separa las que cuentan como gasto de las "solo IGV"', () => {
        render(<ComprasSinProductoPanel compras={compras} puedeMarcar onMarcar={jest.fn()} />)
        expect(screen.getByTestId('compras-cuentan')).toHaveTextContent('464.83')
        expect(screen.getByTestId('compras-solo-igv')).toHaveTextContent('42.37')
    })

    it('marcar "Solo IGV" llama con la compra y el nuevo valor', async () => {
        const onMarcar = jest.fn().mockResolvedValue(undefined)
        render(<ComprasSinProductoPanel compras={compras} puedeMarcar onMarcar={onMarcar} />)
        fireEvent.click(screen.getByLabelText(/Solo IGV: LA PLAZA GASTRONOMICA/))
        await waitFor(() => expect(onMarcar).toHaveBeenCalledWith(481, true))
    })

    it('un usuario que no es admin la ve pero no la cambia', () => {
        render(<ComprasSinProductoPanel compras={compras} puedeMarcar={false} onMarcar={jest.fn()} />)
        expect(screen.getByLabelText(/Solo IGV: LA PLAZA GASTRONOMICA/)).toBeDisabled()
    })

    it('el total del panel de gastos suma las compras: cuadra con la tarjeta', () => {
        const gastos: any[] = [{ id: 1, categoria: 'SUELDOS', etiqueta: null, monto: 1578.35, moneda: 'PEN', mes: 10, anio: 2026, fecha: '2026-10-31' }]
        render(<GastosPanel gastos={gastos} onAgregar={jest.fn()} onEditar={jest.fn()} onEliminar={jest.fn()} comprasConsumo={824.11} />)
        expect(screen.getByTestId('gastos-compras-sin-producto')).toHaveTextContent('824.11')
        expect(screen.getByTestId('gastos-total-periodo')).toHaveTextContent('2,402.46')
    })
})

describe('resumen anual', () => {
    const fila = (mes: number, gananciaNeta: number, igv: number) => ({
        mes, ventasNetas: 1000, ventasConIgv: 1000 + igv, igvVentas: igv, costoMercaderia: 0, gananciaBruta: 1000,
        otrosIngresos: 0, gastosOperativos: 100, comprasConsumo: 0, gananciaNeta, gananciaConIgv: gananciaNeta + igv, margenNeto: gananciaNeta / 10,
    })

    it('una fila por mes, el total y el mejor mes', async () => {
        getMock.mockResolvedValue({
            data: {
                anio: new Date().getFullYear(),
                meses: [fila(1, 300, 180), fila(2, -50, 90)],
                total: { ...fila(0, 250, 270), ventasNetas: 2000, margenNeto: 12.5 },
            },
        })
        render(<ResumenAnualView sedeId={null} />)
        await waitFor(() => expect(screen.getByTestId('anual-mes-1')).toBeInTheDocument())
        expect(screen.getByTestId('anual-mes-1')).toHaveTextContent('Enero')
        expect(screen.getByTestId('anual-mes-2')).toHaveTextContent('−5.0%')
        expect(screen.getByTestId('anual-total-sin-igv')).toHaveTextContent('250.00')
        expect(screen.getByTestId('anual-total-con-igv')).toHaveTextContent('520.00')
        expect(screen.getByText('Enero', { selector: 'p' })).toBeInTheDocument()
        expect(getMock.mock.calls[0][0]).toMatch(/resumen-anual\?anio=\d{4}$/)
    })
})
