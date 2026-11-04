import { ventaBloqueadaEnSede } from '../ventaEnSede';

describe('ventaBloqueadaEnSede', () => {
  const sedes = [{ id: 1, puedeVender: true }, { id: 2, puedeVender: false }, { id: 3 }];
  const vendedor = { rol: 'USUARIO_EMPRESA', sedes };

  it('bloquea solo la sede marcada sin venta', () => {
    expect(ventaBloqueadaEnSede(vendedor, 2)).toBe(true);
    expect(ventaBloqueadaEnSede(vendedor, 1)).toBe(false);
    expect(ventaBloqueadaEnSede(vendedor, 3)).toBe(false);
  });

  it('nunca bloquea al admin ni sin sede', () => {
    expect(ventaBloqueadaEnSede({ ...vendedor, rol: 'ADMIN_EMPRESA' }, 2)).toBe(false);
    expect(ventaBloqueadaEnSede(vendedor, null)).toBe(false);
    expect(ventaBloqueadaEnSede(null, 2)).toBe(false);
  });
});
