import {
    errorProvincia,
    MENSAJES_PROVINCIA_DEFAULT,
    payloadProvincia,
    provinciaActivaDesde,
} from '../despachoMensajes'

describe('textos de provincia', () => {
    const textos = { mensajeEnCaminoAgencia: 'A', mensajeEntregadoAgencia: '  ' }

    it('al cargar, prendida solo si hay texto escrito', () => {
        expect(provinciaActivaDesde(textos)).toEqual({ mensajeEnCaminoAgencia: true, mensajeEntregadoAgencia: false })
        expect(provinciaActivaDesde({})).toEqual({ mensajeEnCaminoAgencia: false, mensajeEntregadoAgencia: false })
    })

    it('apagada o vacía se guarda null: vuelve al texto general', () => {
        expect(payloadProvincia(textos, { mensajeEnCaminoAgencia: false, mensajeEntregadoAgencia: true })).toEqual({
            mensajeEnCaminoAgencia: null,
            mensajeEntregadoAgencia: null,
        })
    })

    it('prendida y vacía no se guarda en silencio', () => {
        expect(errorProvincia(textos, { mensajeEnCaminoAgencia: true, mensajeEntregadoAgencia: true })).toMatch(/Entregado/)
        expect(errorProvincia({ ...textos, ...MENSAJES_PROVINCIA_DEFAULT }, { mensajeEnCaminoAgencia: true, mensajeEntregadoAgencia: true })).toBeNull()
    })
})
