import { desdeCuando, etiquetaTurno, nombreCajero } from '../turnosCaja';

describe('turnos de caja con su cajero', () => {
    it('nombre y primer apellido, sin gritar', () => {
        expect(nombreCajero('VANESSA VIEIRA PEREIRA')).toBe('Vanessa Vieira');
        expect(nombreCajero('  liliana   serna ')).toBe('Liliana Serna');
        expect(nombreCajero(null)).toBe('');
    });

    it('tres turnos del mismo día se distinguen por el cajero', () => {
        const base = { fecha: '2026-10-16T21:13:09.733Z', turno: 'TARDE' };
        const etiquetas = ['VANESSA VIEIRA PEREIRA', 'Christian Herrera Mendoza', 'LILIANA SERNA ANDRES'].map((usuario) =>
            etiquetaTurno({ ...base, usuario }),
        );
        expect(etiquetas[0]).toBe('16/10 · Tarde · Vanessa Vieira');
        expect(new Set(etiquetas).size).toBe(3);
    });

    it('el día es el de Lima, no el de UTC', () => {
        // 01:11 UTC del 17 = 20:11 del 16 en Lima.
        expect(etiquetaTurno({ fecha: '2026-10-17T01:11:35.884Z', turno: null, usuario: null })).toBe('16/10');
        expect(desdeCuando('2026-10-21T22:05:43.354Z')).toMatch(/^21\/10 5:05/);
    });
});
