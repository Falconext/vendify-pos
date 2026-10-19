/**
 * El chip de estado de la tabla.
 *
 * Reportado en /administrador/facturacion/comprobantes: los estados dejaron de
 * salir en colores y aparecían como "Pendiente_conciliacion". La causa fue un
 * rename: la pantalla pasó su columna de `estado` a `estadoTabla` para poder
 * pintar las anulaciones en trámite, y la tabla —que reconoce las columnas de
 * estado por nombre— dejó de reconocerla. No falló nada: el valor cayó al
 * render genérico, que hace toLowerCase() + capitalize.
 *
 * Esta prueba lee el nombre real que usa la pantalla, así que un próximo rename
 * la rompe en vez de apagar los colores en silencio.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const leer = (ruta: string) => readFileSync(join(__dirname, '..', '..', '..', ruta), 'utf8');

/** Las columnas que TableBody pinta como chip. */
const columnasDeEstado = (): string[] => {
  const fuente = leer('components/Datatable/TableBody/index.tsx');
  const bloque = fuente.match(/const COLUMNAS_DE_ESTADO = new Set\(\[([\s\S]*?)\]\)/);
  if (!bloque) throw new Error('No se encontró COLUMNAS_DE_ESTADO en TableBody');
  return [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

/** La columna "Estado" que declara la pantalla de comprobantes. */
const columnaDeComprobantes = (): string => {
  const fuente = leer('pages/admin/facturacion/Comprobantes.tsx');
  const fila = fuente.match(/\{\s*label:\s*'Estado',\s*key:\s*'([^']+)'/);
  if (!fila) throw new Error('No se encontró la columna Estado en Comprobantes');
  return fila[1];
};

describe('Chip de estado en la tabla', () => {
  it('la columna Estado de comprobantes está registrada como chip', () => {
    // Esto es lo que se rompió: la columna existía, pero con otro nombre.
    expect(columnasDeEstado()).toContain(columnaDeComprobantes());
  });

  it('sigue reconociendo los nombres históricos', () => {
    // Otras pantallas (guías, kardex, usuarios) siguen usando estos.
    const columnas = columnasDeEstado();
    for (const k of ['estado', 'tipo', 'status', 'ambiente']) {
      expect(columnas).toContain(k);
    }
  });

  it('TableBody ya no compara el nombre con una cadena de ||', () => {
    // La cadena de `||` es lo que hizo que el rename pasara desapercibido.
    const fuente = leer('components/Datatable/TableBody/index.tsx');
    expect(fuente).not.toMatch(/key === 'estado' \|\| key === 'tipo'/);
  });
});
