import { mensajeVencimientoPlan } from '../AvisoVencimientoPlan';

// Plan que vence el 12/11 en Lima (se guarda como medianoche UTC del 13).
const vence = '2026-11-13T00:00:00.000Z';
const enLima = (iso: string) => jest.setSystemTime(new Date(`${iso}-05:00`));

describe('aviso de vencimiento del plan', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('no avisa si faltan más de 7 días', () => {
        enLima('2026-11-04T10:00:00');
        expect(mensajeVencimientoPlan(vence)).toBeNull();
    });

    it('avisa los días que faltan', () => {
        enLima('2026-11-05T10:00:00');
        expect(mensajeVencimientoPlan(vence)).toEqual({
            urgente: false,
            texto: 'Te faltan 7 días para que venza tu plan (12/11/2026).',
        });
        enLima('2026-11-11T22:00:00');
        expect(mensajeVencimientoPlan(vence)?.texto).toBe('Tu plan vence mañana (12/11/2026).');
    });

    it('el día que vence anuncia la prórroga hasta el día siguiente', () => {
        enLima('2026-11-12T20:00:00');
        expect(mensajeVencimientoPlan(vence)?.texto).toContain('Tienes prórroga hasta mañana 13/11/2026 a las 11:59 p.m.');
    });

    it('en la prórroga avisa el bloqueo; pasada la prórroga ya no hay aviso', () => {
        enLima('2026-11-13T09:00:00');
        expect(mensajeVencimientoPlan(vence)?.texto).toContain('Hoy es tu último día de prórroga');
        enLima('2026-11-14T09:00:00');
        expect(mensajeVencimientoPlan(vence)).toBeNull();
    });
});
