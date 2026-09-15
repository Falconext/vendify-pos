// Observaciones de la venta recordadas por empresa (autoguardado en el navegador):
// lo último que se escribió en "Configurar venta → Observaciones" se vuelve a
// proponer en la siguiente venta, para no tipear siempre lo mismo.

const key = (empresaId: number | string | undefined) => `POS_OBSERVACIONES_VENTA_${empresaId ?? 'x'}`;

export const leerObservacionesRecordadas = (empresaId: number | string | undefined): string => {
    try {
        return localStorage.getItem(key(empresaId)) ?? '';
    } catch {
        return '';
    }
};

export const guardarObservacionesRecordadas = (empresaId: number | string | undefined, texto: string) => {
    try {
        const t = String(texto ?? '');
        if (t.trim()) localStorage.setItem(key(empresaId), t);
        else localStorage.removeItem(key(empresaId));
    } catch {
        /* almacenamiento no disponible (modo privado, etc.): se ignora */
    }
};
