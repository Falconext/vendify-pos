import { contarPorVista, estaVencida, masActivas, ordenarPorActividad, pasaVista } from '../vistaEmpresas'

const e = (id: number, diasRestantes: number | null, v30 = 0, v7 = 0, extra: any = {}) => ({
  id,
  diasRestantes,
  salud: { ventas30: v30, ventas7: v7, diasSinVender: extra.diasSinVender ?? 0 },
  acceso: extra.acceso ?? 'vigente',
})

describe('vigentes / vencidas', () => {
  it('vencida = días restantes negativos; sin fecha cuenta como vigente', () => {
    expect(estaVencida(e(1, -1))).toBe(true)
    expect(estaVencida(e(2, 0))).toBe(false)
    expect(estaVencida(e(3, null))).toBe(false)
  })

  it('cada vista muestra lo suyo', () => {
    const filas = [e(1, 10), e(2, -3), e(3, null)]
    expect(filas.filter((f) => pasaVista(f, 'VIGENTES')).map((f) => f.id)).toEqual([1, 3])
    expect(filas.filter((f) => pasaVista(f, 'VENCIDAS')).map((f) => f.id)).toEqual([2])
    expect(filas.filter((f) => pasaVista(f, 'TODAS'))).toHaveLength(3)
  })

  it('cuenta vencidas en gracia y sin acceso', () => {
    const c = contarPorVista([e(1, 5), e(2, -1, 0, 0, { acceso: 'gracia' }), e(3, -40, 0, 0, { acceso: 'bloqueada' }), e(4, -60, 0, 0, { acceso: 'bloqueada' })])
    expect(c).toEqual({ vigentes: 1, vencidas: 3, todas: 4, enGracia: 1, sinAcceso: 2 })
  })
})

describe('más activas', () => {
  it('ordena por comprobantes en 30 días, luego 7 días, luego la que vendió más reciente', () => {
    const r = ordenarPorActividad([
      e(1, 5, 10, 1),
      e(2, 5, 50, 0),
      e(3, 5, 10, 4),
      e(4, 5, 10, 4, { diasSinVender: 0 }),
    ].map((f, i) => (i === 2 ? { ...f, salud: { ...f.salud, diasSinVender: 3 } } : f)))
    expect(r.map((f) => f.id)).toEqual([2, 4, 3, 1])
  })

  it('el ranking deja fuera vencidas y las que no facturaron', () => {
    const r = masActivas([e(1, 5, 0), e(2, -2, 900), e(3, 5, 7), e(4, null, 30)], 8)
    expect(r.map((f) => f.id)).toEqual([4, 3])
  })

  it('respeta el tope', () => {
    expect(masActivas(Array.from({ length: 20 }, (_, i) => e(i, 5, i + 1)), 8)).toHaveLength(8)
  })
})
