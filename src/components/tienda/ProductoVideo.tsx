import { resolverVideo, proporcionVideo } from '@/templates/shared/video';

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
          {video.tipo === 'archivo' ? (
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
    </section>
  );
}
