/**
 * HELOUSHOP 02-11: rótulo con empresa, repartidor, detalle y "por cobrar" en
 * Lima (sin monto en Shalom); filtros rápidos y color por repartidor.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RotuloTicket, { tieneDestino } from '../RotuloTicket'
import { colorDeRepartidor, FECHA_INICIO_TODO, guardarPeriodo, opcionesCourier, periodoActivo, periodoGuardado, quienLlevaEnLista, rangoDePeriodo } from '../filtrosDespacho'

const base = {
    nroOrden: null, claveOrden: null, nombreDestinatario: 'GOMEZ CUEVA KATIA', dniDestinatario: '46531103',
    ubicacion: '', agenciaNombre: '', direccion: 'AV. LOS ALISOS 474', celular: '907236450',
    transportista: 'PROPIOS', referencia: 'NV01-00000450', empresaNombre: 'Helou Shop Peru', repartidor: 'INDRIVE',
    destino: 'LOCAL' as const, distrito: 'SAN MARTIN DE PORRES', porCobrar: 318,
    productos: [{ descripcion: 'TRIPODE SMAR TRACK', cantidad: 1 }, { descripcion: 'CABLE (REGALO)', cantidad: 1 }],
    fecha: '2026-10-29T15:00:00Z',
}

describe('rótulo', () => {
    it('Lima: empresa, repartidor, dirección, por cobrar, productos y pie', () => {
        render(<RotuloTicket d={base} />)
        expect(screen.getByTestId('rotulo-empresa')).toHaveTextContent('Helou Shop Peru')
        expect(screen.getByTestId('rotulo-quien-lleva')).toHaveTextContent('INDRIVE')
        expect(screen.getByTestId('rotulo-por-cobrar')).toHaveTextContent('318.00')
        expect(screen.getByTestId('rotulo-productos')).toHaveTextContent('CABLE (REGALO)')
        expect(screen.getByText('NV01-450')).toBeInTheDocument()
        expect(screen.getByTestId('rotulo-barras')).toBeInTheDocument()
        expect(screen.getByTestId('rotulo-fecha')).toHaveTextContent('29/10/2026')
    })

    it('Shalom: destino de agencia y sin monto', () => {
        render(<RotuloTicket d={{ ...base, destino: 'AGENCIA', porCobrar: null, repartidor: null, transportista: 'SHALOM_PRO', ubicacion: 'MADRE DE DIOS - TAMBOPATA', agenciaNombre: 'TAMBOPATA AV UCAYALI', direccion: '' }} />)
        expect(screen.getByTestId('rotulo-quien-lleva')).toHaveTextContent('Shalom PRO')
        expect(screen.queryByTestId('rotulo-por-cobrar')).not.toBeInTheDocument()
        expect(screen.getByTestId('rotulo-ticket')).toHaveTextContent('MADRE DE DIOS - TAMBOPATA / TAMBOPATA AV UCAYALI')
    })

    it('el reparto en Lima ya no se omite del lote por no tener agencia', () => {
        expect(tieneDestino(base)).toBe(true)
        expect(tieneDestino({ ...base, direccion: '', distrito: '' })).toBe(false)
    })
})

describe('filtros del panel', () => {
    it('semana de lunes a hoy; mes del 1 a hoy; hoy un solo día', () => {
        expect(rangoDePeriodo('SEMANA', '2026-11-05')).toEqual({ fecha: '2026-11-02', fechaFin: '2026-11-05' })
        expect(rangoDePeriodo('MES', '2026-11-05')).toEqual({ fecha: '2026-11-01', fechaFin: '2026-11-05' })
        expect(rangoDePeriodo('DIA', '2026-11-05')).toEqual({ fecha: '2026-11-05', fechaFin: '' })
        expect(periodoActivo('2026-11-01', '2026-11-05', '2026-11-05')).toBe('MES')
        expect(periodoActivo('2026-10-01', '', '2026-11-05')).toBeNull()
    })

    it('couriers de la lista, con nombre legible y sin las ventas sin despacho', () => {
        expect(opcionesCourier([
            { courier: 'SHALOM_PRO', estadoDespacho: 'PREPARANDO' },
            { courier: 'PROPIOS', estadoDespacho: 'ENTREGADO' },
            { courier: 'OLVA', estadoDespacho: 'NO_APLICA' },
        ])).toEqual([{ value: 'PROPIOS', label: 'Reparto propio' }, { value: 'SHALOM_PRO', label: 'Shalom PRO' }])
    })

    it('el color elegido manda; sin color, uno fijo por nombre', () => {
        expect(colorDeRepartidor('INDRIVE', '#16a34a')).toBe('#16a34a')
        expect(colorDeRepartidor('INDRIVE')).toBe(colorDeRepartidor('indrive'))
        expect(colorDeRepartidor('INDRIVE', 'rojo')).toMatch(/^#[0-9a-f]{6}$/)
    })
})

describe('columna Repartidor: quién lleva el pedido', () => {
    it('envío por Shalom sin repartidor muestra Shalom en rojo, no "No aplica"', () => {
        expect(quienLlevaEnLista({ estadoDespacho: 'CONFIRMADO', repartidorId: null, repartidor: 'No aplica', courier: 'SHALOM_PRO' }))
            .toEqual({ texto: 'Shalom PRO', color: '#dc2626' })
        expect(quienLlevaEnLista({ estadoDespacho: 'PREPARANDO', repartidorId: null, repartidor: 'No aplica', courier: 'OLVA' })?.texto).toBe('Olva Courier')
    })

    it('con repartidor manda el repartidor y su color', () => {
        expect(quienLlevaEnLista({ estadoDespacho: 'EN_CAMINO', repartidorId: 4, repartidor: 'INDRIVE', repartidorColor: '#16a34a', courier: 'PROPIOS' }))
            .toEqual({ texto: 'INDRIVE', color: '#16a34a' })
    })

    it('reparto propio sin repartidor: "Sin asignar"; sin envío: nada', () => {
        expect(quienLlevaEnLista({ estadoDespacho: 'PREPARANDO', repartidorId: null, repartidor: 'No aplica', courier: 'PROPIOS' }))
            .toEqual({ texto: 'Sin asignar', color: null })
        expect(quienLlevaEnLista({ estadoDespacho: 'NO_APLICA', courier: 'SHALOM_PRO' })).toBeNull()
    })
})

describe('estado Confirmado (rótulo impreso)', () => {
    it('el lote solo toma lo que sigue en Preparando: lo ya confirmado no se reimprime', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { elegiblesParaRotulo } = require('../seleccionRotulos')
        const fila = (comprobanteId: number, estadoDespacho: string) => ({ comprobanteId, estadoDespacho, referencia: `NV01-${comprobanteId}`, cliente: '', courier: 'PROPIOS', celularDest: '', clienteTelefono: '' })
        expect(elegiblesParaRotulo([fila(1, 'PREPARANDO'), fila(2, 'CONFIRMADO'), fila(3, 'EN_CAMINO')]).map((e: any) => e.comprobanteId)).toEqual([1])
    })
})

describe('periodo "Todas" del panel', () => {
    const hoy = '2026-11-04';
    beforeEach(() => localStorage.clear());

    it('va desde antes de cualquier venta hasta hoy y se reconoce', () => {
        const r = rangoDePeriodo('TODO', hoy);
        expect(r).toEqual({ fecha: FECHA_INICIO_TODO, fechaFin: hoy });
        expect(periodoActivo(r.fecha, r.fechaFin, hoy)).toBe('TODO');
    });

    it('recuerda lo que eligió la caja', () => {
        expect(periodoGuardado()).toBeNull();
        guardarPeriodo('TODO');
        expect(periodoGuardado()).toBe('TODO');
        guardarPeriodo('DIA');
        expect(periodoGuardado()).toBe('DIA');
    });

    it('ignora un valor guardado que no conoce', () => {
        localStorage.setItem('panel_ventas_periodo', 'ANIO');
        expect(periodoGuardado()).toBeNull();
    });
});
