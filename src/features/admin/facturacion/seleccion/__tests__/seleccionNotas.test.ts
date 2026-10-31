import { mensajeEstadoCuenta, nombreDePila, motivoNoCobrar, resumirSeleccion, telefonoWhatsApp, type NotaElegida } from '../seleccionNotas';

const nota = (x: Partial<NotaElegida>): NotaElegida => ({
    id: 1, documento: 'NV01-00000085', tipoDoc: 'NV', clienteId: 7, cliente: 'ANA TORRES', telefono: '',
    total: 45, saldo: 45, moneda: 'PEN', fecha: '2026-10-19T15:00:00Z', nroDoc: '', convertidoA: null, ...x,
});

describe('notas elegidas', () => {
    it('suma total y saldo y sabe si son del mismo cliente', () => {
        const r = resumirSeleccion([nota({}), nota({ id: 2, total: 30, saldo: 10.5 }), nota({ id: 3, saldo: 0 })]);
        expect(r).toMatchObject({ cantidad: 3, mismoCliente: true, total: 120, saldo: 55.5, conSaldo: 2 });
        expect(motivoNoCobrar(r)).toBeNull();
    });
    it('no deja cobrar junto clientes distintos, monedas mezcladas o todo pagado', () => {
        expect(motivoNoCobrar(resumirSeleccion([nota({}), nota({ id: 2, clienteId: 8 })]))).toMatch(/mismo cliente/);
        expect(motivoNoCobrar(resumirSeleccion([nota({}), nota({ id: 2, moneda: 'USD' })]))).toMatch(/dólares/);
        expect(motivoNoCobrar(resumirSeleccion([nota({ saldo: 0 })]))).toMatch(/pagadas/);
    });
    it('normaliza el celular para WhatsApp', () => {
        expect(telefonoWhatsApp('987 654 321')).toBe('51987654321');
        expect(telefonoWhatsApp('+51 987654321')).toBe('51987654321');
        expect(telefonoWhatsApp('01-4445555')).toBe('');
        expect(telefonoWhatsApp('')).toBe('');
    });
    it('saluda por el nombre de pila, no por el apellido', () => {
        expect(nombreDePila('DELGADO REVILLA, JAMILY STEFANY')).toBe('Jamily');
        expect(nombreDePila('ANA TORRES')).toBe('Ana');
        expect(nombreDePila('CONSTRUCTORA LOS ANDES S.A.C.')).toBe('');
        expect(nombreDePila('CLIENTES VARIOS')).toBe('');
    });
    it('arma el estado de cuenta con lo pendiente', () => {
        const m = mensajeEstadoCuenta([
            nota({ id: 2, documento: 'NV01-00000090', total: 11, saldo: 0, fecha: '2026-10-20T15:00:00Z' }),
            nota({ total: 45, saldo: 40 }),
        ], 'Bodega Ana');
        expect(m).toContain('Hola Ana, te comparto tu estado de cuenta en Bodega Ana:');
        expect(m).toContain('• NV01-85 (19/10): S/ 45.00 — debe S/ 40.00');
        expect(m).toContain('• NV01-90 (20/10): S/ 11.00 — pagada');
        expect(m.indexOf('NV01-85')).toBeLessThan(m.indexOf('NV01-90'));
        expect(m).toContain('*Pendiente de pago: S/ 40.00*');
    });
});
