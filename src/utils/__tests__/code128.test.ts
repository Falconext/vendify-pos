import { code128B } from '../code128'

describe('Code 128 B', () => {
    it('cada símbolo suma 11 módulos y el fin 13 (con la barra de cierre)', () => {
        const anchos = code128B('NV01-450')!
        // inicio + 8 caracteres + control = 10 símbolos de 11 módulos, más el fin de 13.
        expect(anchos.reduce((a, b) => a + b, 0)).toBe(10 * 11 + 13)
    })

    it('el dígito de control es el del estándar', () => {
        // 104 + P(48)·1 + J(42)·2 + J(42)·3 + 1(17)·4 + 2(18)·5 + 3(19)·6 + C(35)·7 = 879; 879 % 103 = 55.
        const anchos = code128B('PJJ123C')!
        expect(anchos.slice(8 * 6, 9 * 6).join('')).toBe('311321') // patrón del valor 55
        expect(anchos.slice(0, 6).join('')).toBe('211214') // inicio B
        expect(anchos.slice(-7).join('')).toBe('2331112') // fin
    })

    it('rechaza lo que no entra en el juego B', () => {
        expect(code128B('')).toBeNull()
        expect(code128B('ñandú')).toBeNull()
    })
})
