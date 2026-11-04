/**
 * El vendedor tiene la sede asignada (entra, ve stock, cotiza) pero el
 * empresario le quitó la venta ahí (`UsuarioSede.puedeVender = false`).
 * El backend lo rechaza igual; esto evita que arme la venta para nada.
 */
export function ventaBloqueadaEnSede(
  auth: { rol?: string; sedes?: { id: number; puedeVender?: boolean }[] } | null | undefined,
  sedeId: number | null | undefined,
): boolean {
  if (!auth || auth.rol !== 'USUARIO_EMPRESA' || sedeId == null) return false;
  return (auth.sedes ?? []).some((s) => s.id === sedeId && s.puedeVender === false);
}
