import { useState } from 'react';
import { resolverVideo, proporcionVideo } from '@/templates/shared/video';

const NOMBRE_PLATAFORMA = { tiktok: 'TikTok', youtube: 'YouTube', vimeo: 'Vimeo' } as const;

/**
 * Video del producto dentro de la ficha.
 *
 * Neutro a propósito: hereda el color del contenedor y solo recibe el borde y
 * el título de cada plantilla, para que entre en las 31 fichas sin pelearse con
 * el diseño de ninguna. Si la URL no se puede reproducir, cae a un enlace en vez
 * de dejar un iframe en blanco.
 */
export default function ProductoVideo({
  url,
  titulo = 'Mira el producto en video',
  borde,
  className = '',
}: {
  url?: string | null;
  titulo?: string;
  /** Color del borde; por defecto uno tenue que funciona en claro y oscuro. */
  borde?: string;
  className?: string;
}) {
  /**
   * El reproductor no se carga hasta que el cliente lo pide.
   *
   * TikTok y YouTube limitan por IP cuántas veces se puede pedir el mismo
   * video: cargándolo en cada visita, el sitio gasta ese cupo con gente que
   * ni siquiera iba a verlo, y cuando se agota aparece una caja negra
   * ("overload-protect triggered", o un 429 de su balanceador) en plena ficha
   * de producto. Con un clic de por medio solo se pide cuando hay interés
   * real, que es una fracción de las visitas, y mientras tanto se ve una
   * portada propia en vez de un error de otro.
   */
  const [reproducir, setReproducir] = useState(false);

  const video = resolverVideo(url);
  if (!video) return null;

  const marco: React.CSSProperties = {
    aspectRatio: proporcionVideo(video),
    // El vertical de TikTok, a ancho completo, ocuparía toda la pantalla: se
    // acota para que la ficha siga siendo legible.
    maxWidth: video.tipo === 'embed' && video.plataforma === 'tiktok' ? 340 : undefined,
    borderColor: borde,
  };

  return (
    <section className={`mt-8 ${className}`} aria-label={titulo}>
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em]">{titulo}</p>

      {video.tipo === 'enlace' ? (
        <a
          href={video.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold underline-offset-4 hover:underline"
          style={{ borderColor: borde }}
        >
          Ver el video del producto
        </a>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border bg-black/5"
          style={marco}
        >
          {video.tipo === 'embed' && !reproducir ? (
            <button
              type="button"
              onClick={() => setReproducir(true)}
              className="group flex h-full w-full flex-col items-center justify-center gap-3 bg-black/80 transition-colors hover:bg-black/70"
              aria-label={`Reproducir el video en ${NOMBRE_PLATAFORMA[video.plataforma]}`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-black" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="text-[12px] font-semibold text-white/90">
                Ver en {NOMBRE_PLATAFORMA[video.plataforma]}
              </span>
            </button>
          ) : video.tipo === 'archivo' ? (
            <video
              src={video.src}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <iframe
              src={video.src}
              title={titulo}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              style={{ border: 0 }}
            />
          )}
        </div>
      )}

      {/* TikTok y YouTube cortan el reproductor cuando reciben muchas cargas
          seguidas desde la misma conexión (TikTok responde
          "overload-protect triggered" y se ve una caja negra). No se puede
          detectar desde aquí —el iframe es de otro dominio—, así que la salida
          se ofrece siempre: si no carga, el cliente igual llega al video. */}
      {video.tipo === 'embed' && (
        <a
          href={video.original}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[11.5px] opacity-60 underline underline-offset-2 hover:opacity-100"
        >
          ¿No carga? Ver el video en {NOMBRE_PLATAFORMA[video.plataforma]}
        </a>
      )}
    </section>
  );
}
