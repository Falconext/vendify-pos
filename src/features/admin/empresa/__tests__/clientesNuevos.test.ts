import { clientesNuevos, mesDeAlta, ordenarPorAlta } from '../vistaEmpresas';

describe('clientes nuevos del mes y orden por alta', () => {
  const hoy = new Date('2026-10-30T15:00:00Z');

  it('fecha sola (medianoche UTC) se lee en UTC; con hora, en Lima', () => {
    expect(mesDeAlta('2026-10-01T00:00:00.000Z')).toBe('2026-10');
    // 1 de octubre 02:00 UTC = 30 de septiembre 21:00 en Lima.
    expect(mesDeAlta('2026-10-01T02:00:00.000Z')).toBe('2026-09');
    expect(mesDeAlta(null)).toBeNull();
  });

  it('cuenta solo mensuales y anuales del mes; las demos no', () => {
    const filas = [
      { grupo: 'MENSUAL', fechaActivacion: '2026-10-05T00:00:00.000Z' },
      { grupo: 'ANUAL', fechaActivacion: '2026-10-29T18:30:00.000Z' },
      { grupo: 'DEMO', fechaActivacion: '2026-10-20T00:00:00.000Z' },
      { grupo: 'MENSUAL', fechaActivacion: '2026-09-12T00:00:00.000Z' },
      { grupo: 'MENSUAL', fechaActivacion: null },
    ];
    expect(clientesNuevos(filas, hoy)).toEqual({ mes: '2026-10', esteMes: 2, mesAnterior: 1 });
  });

  it('enero compara con diciembre del año anterior', () => {
    const r = clientesNuevos([{ grupo: 'ANUAL', fechaActivacion: '2025-12-10T00:00:00.000Z' }], new Date('2026-01-15T15:00:00Z'));
    expect(r).toEqual({ mes: '2026-01', esteMes: 0, mesAnterior: 1 });
  });

  it('la última registrada arriba y las sin fecha al final', () => {
    const orden = ordenarPorAlta([
      { id: 1, fechaActivacion: '2026-09-01T00:00:00.000Z' },
      { id: 2, fechaActivacion: null },
      { id: 3, fechaActivacion: '2026-10-29T18:30:00.000Z' },
    ] as any[]).map((e: any) => e.id);
    expect(orden).toEqual([3, 1, 2]);
  });
});
