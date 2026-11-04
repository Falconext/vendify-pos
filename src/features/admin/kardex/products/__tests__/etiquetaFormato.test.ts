import {
  FORMATOS_PREDEFINIDOS,
  estiloPagina,
  guardarFormato,
  leerFormatoGuardado,
  medidasCodigo,
  normalizarFormato,
} from '../etiquetaFormato';

const sinTextos = { nombre: false, variante: false, precio: false };

describe('formato de etiquetas', () => {
  beforeEach(() => localStorage.clear());

  it('por defecto es el rollo de 50 × 25 de siempre', () => {
    expect(leerFormatoGuardado()).toMatchObject({ id: 'rollo-50x25', ancho: 50, alto: 25, columnas: 1 });
  });

  it('trae el de 30 × 30', () => {
    expect(FORMATOS_PREDEFINIDOS.find((f) => f.id === 'rollo-30x30')).toMatchObject({ ancho: 30, alto: 30 });
  });

  it('recuerda el tamaño elegido en este equipo', () => {
    guardarFormato(normalizarFormato({ id: 'personalizado', ancho: 33, alto: 25, columnas: 2 }));
    expect(leerFormatoGuardado()).toEqual({ id: 'personalizado', tipo: 'rollo', ancho: 33, alto: 25, columnas: 2 });
  });

  it('acota medidas imposibles en vez de romper la impresión', () => {
    expect(normalizarFormato({ id: 'personalizado', ancho: 5, alto: 500, columnas: 9 })).toMatchObject({
      ancho: 20,
      alto: 100,
      columnas: 4,
    });
    expect(normalizarFormato({ id: 'personalizado', ancho: Number.NaN })).toMatchObject({ ancho: 50 });
  });

  it('un valor guardado roto vuelve al de siempre', () => {
    localStorage.setItem('ETIQUETAS_BARRAS_FORMATO', '{no es json');
    expect(leerFormatoGuardado().id).toBe('rollo-50x25');
  });

  it('un predefinido no se puede deformar con medidas guardadas', () => {
    expect(normalizarFormato({ id: 'rollo-30x30', ancho: 90 })).toMatchObject({ ancho: 30, alto: 30 });
  });
});

describe('código de barras dentro de la etiqueta', () => {
  it('en 30 mm el código entra en el ancho', () => {
    const m = medidasCodigo({ ancho: 30, alto: 30 }, sinTextos);
    const anchoCodigoMm = ((95 + 2 * 7) * m.moduloPx * 25.4) / 96;
    expect(anchoCodigoMm).toBeLessThanOrEqual(30);
    // ~1px por módulo: lo mínimo que un escáner lee bien.
    expect(m.moduloPx).toBeGreaterThanOrEqual(0.9);
  });

  it('en etiquetas grandes no pasa de 1.5px por módulo', () => {
    expect(medidasCodigo({ ancho: 100, alto: 50 }, sinTextos).moduloPx).toBe(1.5);
  });

  it('los textos encendidos le quitan alto a las barras', () => {
    const sin = medidasCodigo({ ancho: 50, alto: 25 }, sinTextos).altoBarras;
    const con = medidasCodigo({ ancho: 50, alto: 25 }, { nombre: true, variante: true, precio: true }).altoBarras;
    expect(con).toBeLessThan(sin);
    expect(con).toBeGreaterThanOrEqual(14);
  });
});

describe('página de impresión', () => {
  it('rollo doble: la página es la fila completa', () => {
    expect(estiloPagina(normalizarFormato({ id: 'personalizado', ancho: 33, alto: 25, columnas: 2 }))).toContain(
      'size: 66mm 25mm',
    );
  });

  it('A4 sigue con su margen', () => {
    expect(estiloPagina(normalizarFormato({ id: 'a4-65x35' }))).toContain('size: A4');
  });
});
