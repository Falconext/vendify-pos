/**
 * Lo que ve el cliente mientras la tienda carga.
 *
 * Hasta tener la tienda no se sabe su plantilla, así que cualquier diseño que
 * se pinte antes es el de otra (el por defecto) y luego "salta" al real. Por
 * eso es una pantalla neutra: blanca, sin marca ni colores, igual en todas las
 * páginas. Si la tienda no llega, se ofrece reintentar en vez de caer en la
 * plantilla por defecto.
 */
interface Props {
    error?: boolean;
    onReintentar?: () => void;
}

export default function CargandoTienda({ error = false, onReintentar }: Props) {
    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center" role="alert">
                <p className="mb-4 text-sm text-gray-500">No pudimos cargar la tienda. Revisa tu conexión.</p>
                <button
                    type="button"
                    onClick={onReintentar ?? (() => window.location.reload())}
                    className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Reintentar
                </button>
            </div>
        );
    }
    return (
        <div className="flex min-h-screen items-center justify-center bg-white" role="status" aria-label="Cargando" data-carga="tienda">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
        </div>
    );
}
