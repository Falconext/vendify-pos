import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Icon } from '@iconify/react';
import { useProductModalViewModel } from '../useProductModalViewModel';

type ViewProps = ReturnType<typeof useProductModalViewModel>;

// Fuera del componente: si la barra se arma en cada render, Quill la ve como
// configuración nueva y se reinicia.
const MODULOS_QUILL = {
    toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'clean'],
    ],
};

// Quill 2 guarda cada espacio doble como &nbsp;: en la tienda el párrafo no se
// corta en líneas y se sale de la pantalla. Se guardan espacios normales.
const sinNbsp = (html: string) => html.replace(/&nbsp;/g, ' ');

export const ProductRichDescription: React.FC<{ vm: ViewProps }> = ({ vm }) => {
    const { productSections, formValues, setFormValues } = vm;
    const [descTiendaOpen, setDescTiendaOpen] = useState(false);

    // El editor trabaja con su propio HTML y al formulario solo pasa lo que
    // escribe la persona, ya limpio. Antes el valor limpio volvía al editor como
    // `value`; Quill lo veía distinto del suyo (volvía a poner &nbsp;), lo
    // recargaba, avisaba de un cambio y se limpiaba otra vez: con una
    // descripción con espacios dobles el modal entraba en bucle y colgaba la
    // página (22-10, "editar producto se congela").
    const guardada = String((formValues as any)?.descripcionLarga || '');
    const [html, setHtml] = useState(guardada);
    useEffect(() => {
        // Llegó otro texto de afuera (otro producto, o el detalle completo que se
        // carga después de abrir): se muestra. Lo que salió del propio editor ya
        // coincide y no se toca.
        setHtml((actual) => (sinNbsp(actual) === guardada ? actual : guardada));
    }, [guardada]);

    const autoOpenedForRef = useRef<number | null>(null);
    useEffect(() => {
        const pid = Number((formValues as any)?.productoId) || 0;
        const hasText = !!(formValues as any)?.descripcionLarga;
        if (hasText && autoOpenedForRef.current !== pid) {
            autoOpenedForRef.current = pid;
            setDescTiendaOpen(true);
        }
    }, [(formValues as any)?.productoId, (formValues as any)?.descripcionLarga]);

    if (!productSections.descripcionRica) return null;

    return (
        <div className="mt-4 mb-4">
            <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${descTiendaOpen ? 'border-rose-200 dark:border-rose-900/40' : 'border-gray-200 dark:border-white/10 hover:border-rose-200 dark:hover:border-rose-900/50 hover:shadow-sm'}`}>
                <button
                    type="button"
                    onClick={() => setDescTiendaOpen(o => !o)}
                    className="w-full flex items-center justify-between p-4 text-left group bg-white dark:bg-[#1E2435]"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${descTiendaOpen ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 group-hover:text-rose-600 dark:group-hover:text-rose-400'}`}>
                            <Icon icon="solar:document-text-bold-duotone" width={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Descripción para la Tienda Online</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {(formValues as any)?.descripcionLarga
                                    ? 'Rich text activo · Fichas técnicas, specs, detalles'
                                    : 'Agrega contenido rico · Se muestra en la página de tu producto'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {(formValues as any)?.descripcionLarga && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                Activo
                            </span>
                        )}
                        <Icon
                            icon="solar:alt-arrow-down-bold"
                            width={16}
                            className={`text-gray-400 transition-transform duration-200 ${descTiendaOpen ? 'rotate-180' : ''}`}
                        />
                    </div>
                </button>

                {descTiendaOpen && (
                    <div className="px-4 pb-4 border-t border-rose-100 dark:border-rose-900/30 pt-4 bg-rose-50/30 dark:bg-rose-950/5">
                        <style>{`
                            .quill-container .ql-container {
                                min-height: 250px !important;
                                font-size: 14px;
                            }
                            .quill-container .ql-editor {
                                min-height: 250px !important;
                            }
                            /* Dark mode support for quill borders */
                            .dark .quill-container .ql-toolbar.ql-snow,
                            .dark .quill-container .ql-container.ql-snow {
                                border-color: #334155; /* slate-700 */
                            }
                        `}</style>
                        <div className="quill-container bg-white dark:bg-[#1E293B] rounded-xl overflow-hidden">
                            <ReactQuill
                                theme="snow"
                                value={html}
                                onChange={(value: string, _delta: unknown, source: string) => {
                                    setHtml(value);
                                    // Solo lo que tecleó la persona: los cambios que hace
                                    // Quill al cargar un texto no son ediciones.
                                    if (source !== 'user') return;
                                    const limpio = sinNbsp(value);
                                    if (limpio !== guardada) setFormValues({ ...formValues, descripcionLarga: limpio } as any);
                                }}
                                placeholder="Escribe la descripción completa del producto: especificaciones, garantía, compatibilidad, características..."
                                className="dark:text-gray-200"
                                modules={MODULOS_QUILL}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                <Icon icon="solar:info-circle-linear" width={13} />
                                Visible en la página de detalle del producto en tu tienda virtual.
                            </p>
                            {(formValues as any)?.descripcionLarga && (
                                <button
                                    type="button"
                                    onClick={() => setFormValues({ ...formValues, descripcionLarga: '' } as any)}
                                    className="text-[11px] text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                                >
                                    <Icon icon="solar:trash-bin-minimalistic-linear" width={12} />
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
