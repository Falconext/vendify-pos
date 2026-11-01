/**
 * Envío por agencia en el modal de confirmación de la tienda (29-10).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import ConfirmOrderModal from '../ConfirmOrderModal'
import {
  ENVIO_AGENCIA_INICIAL,
  EnvioAgenciaContext,
  faltaEnvioAgencia,
  payloadEnvioAgencia,
  type EnvioAgenciaValor,
} from '../EnvioAgencia'

const AGENCIAS = [
  { id: '11', nombre: 'Wanchaq', departamento: 'CUSCO', provincia: 'CUSCO', distrito: 'WANCHAQ', direccion: 'Av. Sol 100' },
  { id: '22', nombre: 'Cercado', departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'CERCADO' },
]

function Envoltura({ onConfirm, couriers = ['SHALOM', 'OLVA'] as any, tipoEntrega = 'ENVIO' as const }: any) {
  const [valor, setValor] = useState<EnvioAgenciaValor>(ENVIO_AGENCIA_INICIAL)
  const [direccion, setDireccion] = useState('')
  return (
    <EnvioAgenciaContext.Provider
      value={{ couriers, tipoEntrega, valor, setValor, direccion, setDireccion, cargarAgencias: async () => AGENCIAS }}
    >
      <ConfirmOrderModal isOpen onClose={() => {}} onConfirm={onConfirm} total={100} />
      <output data-testid="valor">{JSON.stringify(payloadEnvioAgencia(valor, tipoEntrega))}</output>
    </EnvioAgenciaContext.Provider>
  )
}

describe('modal de confirmación con agencias', () => {
  it('sin contexto se ve como siempre', () => {
    render(<ConfirmOrderModal isOpen onClose={() => {}} onConfirm={() => {}} total={50} />)
    expect(screen.queryByText('¿Cómo te lo enviamos?')).toBeNull()
  })

  it('recojo en tienda: no pregunta agencia', () => {
    render(<Envoltura onConfirm={jest.fn()} tipoEntrega="RECOJO" />)
    expect(screen.queryByText('¿Cómo te lo enviamos?')).toBeNull()
  })

  it('no confirma sin agencia ni DNI, y con ambos manda courier, agencia y DNI', async () => {
    const onConfirm = jest.fn()
    render(<Envoltura onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /Agencia Shalom/ }))
    fireEvent.click(screen.getByRole('button', { name: /Sí, Confirmar/ }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText(/Elige la agencia/)).toBeTruthy()

    fireEvent.change(await screen.findByPlaceholderText('Busca tu ciudad o distrito'), { target: { value: 'cusco' } })
    await waitFor(() => expect(screen.queryByText('Cercado - AREQUIPA - AREQUIPA')).toBeNull())
    fireEvent.click(screen.getByText('Wanchaq - CUSCO - CUSCO'))
    fireEvent.change(screen.getByPlaceholderText(/Tu DNI/), { target: { value: '45678912' } })
    fireEvent.click(screen.getByRole('button', { name: /Sí, Confirmar/ }))
    expect(onConfirm).toHaveBeenCalled()
    expect(JSON.parse(screen.getByTestId('valor').textContent!)).toEqual({
      envioCourier: 'SHALOM',
      envioAgenciaId: '11',
      envioAgenciaNombre: 'Wanchaq - CUSCO - CUSCO',
      clienteDocumento: '45678912',
    })
  })

  it('a domicilio pide la dirección en el mismo modal', () => {
    const onConfirm = jest.fn()
    render(<Envoltura onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /Sí, Confirmar/ }))
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('Dirección de entrega *'), { target: { value: 'Jr. Lima 123' } })
    fireEvent.click(screen.getByRole('button', { name: /Sí, Confirmar/ }))
    expect(onConfirm).toHaveBeenCalled()
    expect(screen.getByTestId('valor').textContent).toBe('{}')
  })
})

describe('faltaEnvioAgencia', () => {
  it('acepta DNI, carné de extranjería y RUC', () => {
    const v = { modo: 'OLVA' as const, agenciaId: 'X', agenciaNombre: 'Lince', documento: '' }
    expect(faltaEnvioAgencia({ ...v, documento: '12345678' }, '')).toBeNull()
    expect(faltaEnvioAgencia({ ...v, documento: '123456789' }, '')).toBeNull()
    expect(faltaEnvioAgencia({ ...v, documento: '20123456789' }, '')).toBeNull()
    expect(faltaEnvioAgencia({ ...v, documento: '1234' }, '')).toMatch(/DNI/)
  })
})

describe('plantilla Moda (modal propio)', () => {
  it('también pide la agencia antes de confirmar', async () => {
    const { default: ModaConfirmOrderModal } = await import('../ModaConfirmOrderModal')
    function Moda({ onConfirm }: { onConfirm: () => void }) {
      const [valor, setValor] = useState<EnvioAgenciaValor>(ENVIO_AGENCIA_INICIAL)
      return (
        <EnvioAgenciaContext.Provider
          value={{ couriers: ['OLVA'], tipoEntrega: 'ENVIO', valor, setValor, direccion: '', setDireccion: () => {}, cargarAgencias: async () => AGENCIAS }}
        >
          <ModaConfirmOrderModal isOpen onClose={() => {}} onConfirm={onConfirm} total={10} />
        </EnvioAgenciaContext.Provider>
      )
    }
    const onConfirm = jest.fn()
    render(<Moda onConfirm={onConfirm} />)
    expect(screen.getByText('¿Cómo te lo enviamos?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Agencia Olva/ }))
    fireEvent.click(screen.getByRole('button', { name: /Sí, Confirmar/ }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
