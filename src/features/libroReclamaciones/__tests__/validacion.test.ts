import { FORMULARIO_VACIO, armarPayload, errorDocumento, errorRespuesta, validarHoja } from '../validacion';
import { nivelPlazo, textoPlazo, hoyLima, soles } from '../formato';
import type { FormularioHoja } from '../tipos';

const valido: FormularioHoja = {
  ...FORMULARIO_VACIO,
  nombres: 'Ana Pérez',
  tipoDocumento: 'DNI',
  numeroDocumento: '12345678',
  domicilio: 'Av. Siempre Viva 123, Lima',
  telefono: '987 654 321',
  email: 'ana@correo.pe',
  bienDescripcion: 'Zapatillas talla 40',
  detalle: 'Llegaron con la suela despegada.',
  pedidoConsumidor: 'Cambio del producto',
  aceptaDeclaracion: true,
};

describe('validarHoja', () => {
  it('una hoja completa no tiene errores', () => {
    expect(validarHoja(valido)).toEqual({});
  });

  it('la hoja vacía marca todos los obligatorios', () => {
    const e = validarHoja(FORMULARIO_VACIO);
    expect(Object.keys(e).sort()).toEqual(
      ['aceptaDeclaracion', 'bienDescripcion', 'detalle', 'domicilio', 'email', 'nombres', 'numeroDocumento', 'pedidoConsumidor', 'telefono'].sort(),
    );
  });

  it.each([
    ['DNI', '1234567', 'El DNI tiene 8 dígitos.'],
    ['DNI', '1234567a', 'El DNI tiene 8 dígitos.'],
    ['DNI', '12345678', null],
    ['RUC', '2012345678', 'El RUC tiene 11 dígitos.'],
    ['RUC', '20123456789', null],
    ['CE', 'X12', 'El carné de extranjería tiene de 6 a 12 letras o números.'],
    ['CE', 'ab 12345', null], // como el servidor: sin espacios y en mayúsculas
    ['CE', '0012-3456', 'El carné de extranjería tiene de 6 a 12 letras o números.'],
    ['PASAPORTE', 'AB1', 'El pasaporte tiene de 5 a 15 letras o números.'],
    ['PASAPORTE', 'AB1234567890123X', 'El pasaporte tiene de 5 a 15 letras o números.'],
    ['CE', '001234567', null],
    ['PASAPORTE', 'AB123456', null],
    ['DNI', '   ', 'Ingresa tu número de documento.'],
  ])('documento %s "%s"', (tipo, numero, esperado) => {
    expect(errorDocumento(tipo, numero)).toBe(esperado);
  });

  it('menor de edad sin apoderado no pasa', () => {
    const e = validarHoja({ ...valido, menorDeEdad: true });
    expect(e.apoderadoNombre).toBeTruthy();
    expect(e.apoderadoDocumento).toBeTruthy();
    expect(validarHoja({ ...valido, menorDeEdad: true, apoderadoNombre: 'Luis Pérez', apoderadoDocumento: '87654321' })).toEqual({});
  });

  it('correo y teléfono inválidos', () => {
    expect(validarHoja({ ...valido, email: 'ana@correo' }).email).toBe('Correo no válido.');
    expect(validarHoja({ ...valido, telefono: '12ab' }).telefono).toBe('Teléfono no válido.');
    expect(validarHoja({ ...valido, telefono: '12345' }).telefono).toBe('Teléfono no válido.');
  });

  it('monto opcional: ≥0 y hasta 2 decimales', () => {
    expect(validarHoja({ ...valido, montoReclamado: '' }).montoReclamado).toBeUndefined();
    expect(validarHoja({ ...valido, montoReclamado: '120.50' }).montoReclamado).toBeUndefined();
    expect(validarHoja({ ...valido, montoReclamado: '0' }).montoReclamado).toBeUndefined();
    expect(validarHoja({ ...valido, montoReclamado: '-5' }).montoReclamado).toBeTruthy();
    expect(validarHoja({ ...valido, montoReclamado: '10.555' }).montoReclamado).toBeTruthy();
    expect(validarHoja({ ...valido, montoReclamado: 'abc' }).montoReclamado).toBeTruthy();
  });

  it('largos de detalle (10–3000) y pedido (5–2000)', () => {
    expect(validarHoja({ ...valido, detalle: 'corto' }).detalle).toBe('Escribe al menos 10 caracteres.');
    expect(validarHoja({ ...valido, detalle: 'x'.repeat(3001) }).detalle).toBe('Máximo 3000 caracteres.');
    expect(validarHoja({ ...valido, detalle: `  ${'x'.repeat(9)}  ` }).detalle).toBeTruthy();
    expect(validarHoja({ ...valido, pedidoConsumidor: 'abcd' }).pedidoConsumidor).toBeTruthy();
    expect(validarHoja({ ...valido, pedidoConsumidor: 'x'.repeat(2001) }).pedidoConsumidor).toBeTruthy();
  });

  it('sin aceptar la declaración no se envía', () => {
    expect(validarHoja({ ...valido, aceptaDeclaracion: false }).aceptaDeclaracion).toBeTruthy();
  });
});

describe('armarPayload', () => {
  it('recorta, convierte el monto y omite opcionales vacíos', () => {
    const p = armarPayload({ ...valido, nombres: '  Ana  ', email: ' ANA@Correo.PE ', montoReclamado: '120.5', pedidoCodigo: '  ' });
    expect(p.nombres).toBe('Ana');
    expect(p.email).toBe('ana@correo.pe');
    expect(p.montoReclamado).toBe(120.5);
    expect(p.pedidoCodigo).toBeUndefined();
    expect(p.aceptaDeclaracion).toBe(true);
    expect(p.website).toBe('');
  });

  it('el apoderado solo viaja si es menor', () => {
    expect(armarPayload({ ...valido, apoderadoNombre: 'X', apoderadoDocumento: '1' }).apoderadoNombre).toBeUndefined();
    expect(armarPayload({ ...valido, menorDeEdad: true, apoderadoNombre: 'X', apoderadoDocumento: '1' }).apoderadoNombre).toBe('X');
  });

  it('el honeypot viaja tal cual (el servidor lo rechaza si viene lleno)', () => {
    expect(armarPayload({ ...valido, website: 'http://spam' }).website).toBe('http://spam');
  });
});

describe('errorRespuesta', () => {
  it('10–4000 caracteres', () => {
    expect(errorRespuesta('')).toBeTruthy();
    expect(errorRespuesta('muy corto')).toBeTruthy();
    expect(errorRespuesta('x'.repeat(4001))).toBeTruthy();
    expect(errorRespuesta('Le cambiamos el producto sin costo.')).toBeNull();
  });
});

describe('plazo', () => {
  it.each([
    [10, 'PENDIENTE', 'aTiempo', '10 d. hábiles'],
    [4, 'PENDIENTE', 'aTiempo', '4 d. hábiles'],
    [3, 'PENDIENTE', 'urgente', '3 d. hábiles'],
    [1, 'PENDIENTE', 'urgente', '1 d. hábil'],
    [0, 'PENDIENTE', 'urgente', 'Vence hoy'],
    [-2, 'VENCIDO', 'vencido', 'Vencido hace 2 d. hábiles'],
    [-1, 'PENDIENTE', 'vencido', 'Vencido hace 1 d. hábil'],
    [null, 'RESPONDIDO', 'respondido', 'Respondido'],
  ] as const)('%s días, %s', (dias, estado, nivel, texto) => {
    expect(nivelPlazo(dias, estado)).toBe(nivel);
    expect(textoPlazo(dias, estado)).toBe(texto);
  });

  it('hoy en Lima aunque en UTC ya sea mañana', () => {
    expect(hoyLima(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-31');
  });

  it('soles', () => {
    expect(soles('12.5')).toBe('S/ 12.50');
    expect(soles(null)).toBe('—');
  });
});
