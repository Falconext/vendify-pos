/**
 * Modo oscuro en "Gestión de Inventario".
 *
 * Reportado sobre app.krezka.com: con el panel en oscuro, el campo "Cantidad a
 * agregar" salía blanco con texto blanco —ilegible— y los títulos "Tipo de
 * Ajuste" y "Cantidad a agregar:" quedaban en gris oscuro sobre fondo oscuro.
 * Faltaban las variantes `dark:`.
 *
 * Se lee el archivo fuente en vez de montar el componente a propósito: lo que
 * se quiere fijar es que NINGÚN control de ese bloque quede sin su variante
 * oscura, y eso se ve en las clases. Montar el componente solo probaría el caso
 * que uno se acuerde de escribir.
 */
import * as fs from 'fs';
import * as path from 'path';

const ARCHIVO = path.join(__dirname, '..', 'components', 'ProductStockManager.tsx');
const fuente = fs.readFileSync(ARCHIVO, 'utf-8');

/** Todas las `className="..."` del archivo, con su número de línea. */
const clases = (): { linea: number; cls: string }[] => {
  const out: { linea: number; cls: string }[] = [];
  const re = /className="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fuente)) !== null) {
    out.push({ linea: fuente.slice(0, m.index).split('\n').length, cls: m[1] });
  }
  return out;
};

describe('El campo de cantidad se lee en modo oscuro', () => {
  it('tiene fondo y texto propios para oscuro', () => {
    const input = clases().find((c) => c.cls.includes('focus:ring-blue-500') && c.cls.includes('w-full px-3 py-2'));
    expect(input).toBeDefined();
    expect(input!.cls).toContain('dark:bg-slate-900');
    expect(input!.cls).toContain('dark:text-white');
  });

  it('el placeholder tampoco queda invisible', () => {
    const input = clases().find((c) => c.cls.includes('focus:ring-blue-500') && c.cls.includes('w-full px-3 py-2'));
    expect(input!.cls).toContain('dark:placeholder:text-slate-500');
  });
});

describe('Ningún control del bloque queda sin variante oscura', () => {
  it('todo fondo claro declara su contraparte oscura', () => {
    // `bg-white` sin `dark:bg-...` es exactamente el defecto reportado.
    const sinPareja = clases().filter(
      (c) => c.cls.includes('bg-white') && !c.cls.includes('dark:bg-'),
    );
    expect(sinPareja.map((c) => `línea ${c.linea}: ${c.cls}`)).toEqual([]);
  });

  it('todo texto gris oscuro declara su contraparte clara', () => {
    // text-gray-700/800 sobre fondo oscuro no se lee.
    const sinPareja = clases().filter(
      (c) =>
        /\btext-gray-(700|800|900)\b/.test(c.cls) &&
        !/dark:text-/.test(c.cls),
    );
    expect(sinPareja.map((c) => `línea ${c.linea}: ${c.cls}`)).toEqual([]);
  });
});
