import {
    DETALLE_ADICIONAL_MAX,
    detalleAdicionalParaPayload,
    imprimeDetalleAdicional,
    lineasDetalleAdicional,
    normalizarDetalleAdicional,
} from '../detalleAdicional';

describe('detalle adicional de la línea', () => {
    const ejemplo = 'Retiro de pintura antigua\r\nRaspado, lijado y eliminación de material suelto\nlimpieza\n\n';

    it('respeta saltos de línea y minúsculas', () => {
        expect(normalizarDetalleAdicional(ejemplo)).toBe(
            'Retiro de pintura antigua\nRaspado, lijado y eliminación de material suelto\nlimpieza',
        );
        expect(lineasDetalleAdicional(ejemplo)).toEqual([
            'Retiro de pintura antigua',
            'Raspado, lijado y eliminación de material suelto',
            'limpieza',
        ]);
    });

    it('vacío no viaja en el payload', () => {
        expect(detalleAdicionalParaPayload('   \n ')).toEqual({});
        expect(detalleAdicionalParaPayload(undefined)).toEqual({});
        expect(detalleAdicionalParaPayload('a\nb')).toEqual({ detalleAdicional: 'a\nb' });
    });

    it('recorta al tope', () => {
        expect(normalizarDetalleAdicional('y'.repeat(DETALLE_ADICIONAL_MAX + 10))).toHaveLength(DETALLE_ADICIONAL_MAX);
    });

    it('no se imprime en documentos fiscales (factura/boleta/notas), sí en cotización y NV', () => {
        expect(imprimeDetalleAdicional('COT')).toBe(true);
        expect(imprimeDetalleAdicional('NV')).toBe(true);
        expect(imprimeDetalleAdicional(undefined)).toBe(true);
        for (const t of ['01', '03', '07', '08']) expect(imprimeDetalleAdicional(t)).toBe(false);
    });
});
