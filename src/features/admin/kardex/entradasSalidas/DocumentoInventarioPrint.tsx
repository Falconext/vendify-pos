import React from 'react';
import moment from 'moment';
import type { DetalleDocumento } from './EntradasSalidasModel';

/**
 * El papel de la entrada o salida: lo firma el que entrega y el que recibe.
 * Mismo formato A4 que el reporte de traslados.
 */
const DocumentoInventarioPrint: React.FC<{
    componentRef: React.Ref<HTMLDivElement>;
    empresa: any;
    doc: DetalleDocumento;
}> = ({ componentRef, empresa, doc }) => {
    const logo = (() => {
        const t = String(empresa?.logo ?? '').trim();
        if (!t) return undefined;
        if (t.startsWith('data:') || /^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();
    const entrada = doc.tipo === 'ENTRADA';
    const conLote = doc.items.some((i) => i.lote);
    const conCosto = entrada && doc.items.some((i) => i.costoUnitario != null);

    return (
        <div className="hidden">
            <div ref={componentRef} className="bg-white px-10 py-10 text-[11px] text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div className="mb-6 flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                        {logo ? <img src={logo} alt="" className="h-20 w-20 object-contain grayscale" /> : null}
                        <div>
                            <p className="text-base font-bold uppercase">{empresa?.nombreComercial || empresa?.razonSocial}</p>
                            <p className="uppercase">{empresa?.razonSocial}</p>
                            {empresa?.ruc ? <p>RUC {empresa.ruc}</p> : null}
                            {empresa?.direccion ? <p className="uppercase">{empresa.direccion}</p> : null}
                        </div>
                    </div>
                    <div className="min-w-[200px] border-2 border-black px-4 py-3 text-center">
                        <p className="text-xs font-bold uppercase">{entrada ? 'Nota de entrada' : 'Nota de salida'}</p>
                        <p className="mt-1 text-lg font-bold">{doc.numero}</p>
                    </div>
                </div>

                <table className="mb-5 w-full">
                    <tbody>
                        <tr>
                            <td className="w-28 py-0.5 font-bold">Fecha</td>
                            <td>{moment(doc.fecha).format('DD/MM/YYYY hh:mm A')}</td>
                            <td className="w-28 font-bold">Sede</td>
                            <td className="uppercase">{doc.sede}</td>
                        </tr>
                        <tr>
                            <td className="py-0.5 font-bold">Motivo</td>
                            <td>{doc.motivoEtiqueta}</td>
                            <td className="font-bold">Responsable</td>
                            <td className="uppercase">{doc.responsable}</td>
                        </tr>
                        {doc.detalle ? (
                            <tr>
                                <td className="py-0.5 font-bold align-top">Detalle</td>
                                <td colSpan={3}>{doc.detalle}</td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-y-2 border-black">
                            <th className="py-1.5 text-left">#</th>
                            <th className="text-left">Código</th>
                            <th className="text-left">Producto</th>
                            {conLote ? <th className="text-left">Lote / Vence</th> : null}
                            <th className="text-right">Cantidad</th>
                            {conCosto ? <th className="text-right">Costo unit.</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {doc.items.map((it, i) => (
                            <tr key={i} className="border-b border-gray-300">
                                <td className="py-1.5">{i + 1}</td>
                                <td>{it.codigo}</td>
                                <td>
                                    {it.descripcion}
                                    {it.variante ? ` — ${it.variante}` : ''}
                                </td>
                                {conLote ? (
                                    <td>
                                        {it.lote ?? '—'}
                                        {it.fechaVencimiento ? ` / ${moment.utc(it.fechaVencimiento).format('DD/MM/YYYY')}` : ''}
                                    </td>
                                ) : null}
                                <td className="text-right font-bold">
                                    {it.cantidad} {it.unidad}
                                </td>
                                {conCosto ? <td className="text-right">{it.costoUnitario != null ? `S/ ${it.costoUnitario.toFixed(2)}` : '—'}</td> : null}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-2 text-right font-bold">
                    {doc.items.length} producto(s) · {Math.round(doc.items.reduce((s, i) => s + i.cantidad, 0) * 1000) / 1000} unidades
                </p>

                <div className="mt-20 grid grid-cols-2 gap-16 text-center">
                    <div className="border-t border-black pt-1">{entrada ? 'Entregó' : 'Autorizó'}</div>
                    <div className="border-t border-black pt-1">{entrada ? 'Recibió' : 'Retiró'}</div>
                </div>
            </div>
        </div>
    );
};

export default DocumentoInventarioPrint;
