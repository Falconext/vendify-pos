/**
 * Espejo (frontend) del compositor de descripción de vehículos del backend
 * (`backend/src/producto/ficha-tecnica-vehiculo.ts`).
 *
 * El backend compone el bloque de la ficha del vehículo en la descripción al
 * EMITIR (queda guardado en DetalleComprobante.descripcion). Pero la impresión
 * post-emisión y la vista previa del POS usan los ítems del CARRITO, cuyo
 * `descripcion` es solo el nombre del producto. Este util reconstruye el mismo
 * bloque para esas vistas a partir de `atributosTecnicos`.
 *
 * Es idempotente: si la descripción ya viene compuesta (multilínea, p. ej. desde
 * la lista de comprobantes que lee el detalle guardado), se devuelve tal cual
 * para no duplicar el bloque. Debe mantenerse sincronizado con el backend.
 */

const ETIQUETA_CORTA: Record<string, string> = {
    marca: 'MARCA',
    modelo: 'MODELO',
    serieVin: 'SERIE/VIN',
    categoria: 'CATEGORÍA',
    numeroMotor: 'N° MOTOR',
    anioModelo: 'AÑO MOD.',
    color: 'COLOR',
    combustible: 'COMBUS.',
    cilindrada: 'CILINDRADA',
    numeroCilindros: 'CILINDROS',
    potencia: 'POT. (HP)',
    transmision: 'TRANSMISIÓN',
    numeroRuedas: 'N° RUEDAS',
    numeroPasajeros: 'PASAJEROS',
    kilometraje: 'KM',
};

const UNIDAD_CORTA: Record<string, string> = {
    cilindrada: 'cc',
    kilometraje: 'km',
};

const FILAS_DESCRIPCION: Array<[string, string?]> = [
    ['marca', 'modelo'],
    ['serieVin', 'categoria'],
    ['numeroMotor', 'anioModelo'],
    ['color', 'combustible'],
    ['cilindrada', 'numeroCilindros'],
    ['potencia', 'transmision'],
    ['numeroRuedas', 'numeroPasajeros'],
];

const CLAVES_EXCLUSIVAS_VEHICULO = [
    'serieVin',
    'numeroMotor',
    'cilindrada',
    'numeroRuedas',
    'numeroPasajeros',
];

export function esFichaVehiculo(atributos?: Record<string, any> | null): boolean {
    if (!atributos || typeof atributos !== 'object') return false;
    return CLAVES_EXCLUSIVAS_VEHICULO.some((k) => {
        const v = atributos[k];
        return v != null && String(v).trim() !== '';
    });
}

function celda(atributos: Record<string, any>, key?: string): string | null {
    if (!key) return null;
    const raw = atributos[key];
    if (raw == null || String(raw).trim() === '') return null;
    const valor = String(raw).trim();
    const unidad = UNIDAD_CORTA[key];
    const yaTieneUnidad = unidad && valor.toLowerCase().includes(unidad.toLowerCase());
    const texto = unidad && !yaTieneUnidad ? `${valor} ${unidad}` : valor;
    return `${ETIQUETA_CORTA[key] || key.toUpperCase()}: ${texto}`;
}

export function construirDescripcionVehiculo(
    nombre: string,
    atributos?: Record<string, any> | null,
): string {
    const base = String(nombre || '').trim();
    if (!esFichaVehiculo(atributos)) return base;
    const attrs = atributos as Record<string, any>;

    const SEP = '  ·  ';
    const filas: string[] = [];
    for (const [izqKey, derKey] of FILAS_DESCRIPCION) {
        const izq = celda(attrs, izqKey);
        const der = celda(attrs, derKey);
        if (!izq && !der) continue;
        filas.push(izq && der ? `${izq}${SEP}${der}` : ((izq || der) as string));
    }
    if (filas.length === 0) return base;
    return base ? `${base}\n${filas.join('\n')}` : filas.join('\n');
}

/**
 * Descripción lista para imprimir. Idempotente: si ya trae saltos de línea
 * (viene compuesta desde el backend) se devuelve igual; si es una sola línea y
 * el ítem tiene ficha de vehículo, se compone el bloque.
 */
export function descripcionParaImpresion(
    descripcion?: string | null,
    atributos?: Record<string, any> | null,
): string {
    const base = String(descripcion || '');
    if (base.includes('\n')) return base;
    if (!esFichaVehiculo(atributos)) return base;
    return construirDescripcionVehiculo(base, atributos);
}
