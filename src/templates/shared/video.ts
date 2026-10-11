/**
 * Video del producto en la tienda.
 *
 * Los negocios que venden por WhatsApp suelen grabar el producto real y pegar
 * el enlace de TikTok en la descripción, donde queda como texto muerto. Acá se
 * traduce la URL que pegaron —tal como la copiaron del navegador o de la app— a
 * algo que el navegador pueda reproducir dentro de la ficha, sin sacar al
 * comprador de la tienda a mitad de la compra.
 */

export type VideoProducto =
  /** Se reproduce con <video>: archivo propio (S3, mp4). */
  | { tipo: 'archivo'; src: string }
  /** Se reproduce con <iframe>: plataforma con reproductor embebible. */
  | { tipo: 'embed'; src: string; plataforma: 'youtube' | 'tiktok' | 'vimeo' }
  /** Hay URL pero no sabemos reproducirla: se ofrece como enlace. */
  | { tipo: 'enlace'; src: string };

/** 11 dígitos/letras del id de YouTube, en cualquiera de sus formas de URL. */
const YOUTUBE = [
  /youtube\.com\/watch\?[^#]*\bv=([\w-]{6,})/i,
  /youtu\.be\/([\w-]{6,})/i,
  /youtube\.com\/shorts\/([\w-]{6,})/i,
  /youtube\.com\/embed\/([\w-]{6,})/i,
];
const TIKTOK_VIDEO = /tiktok\.com\/[^/]+\/video\/(\d{6,})/i;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d{6,})/i;
const ARCHIVO = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

/**
 * Interpreta la URL que pegó el negocio.
 *
 * Devuelve `null` si no hay nada que mostrar: así la ficha puede decidir no
 * pintar la sección en vez de dejar un hueco.
 */
export function resolverVideo(url?: string | null): VideoProducto | null {
  const raw = String(url ?? '').trim();
  if (!raw) return null;
  // Sin protocolo no hay iframe que valga: "tiktok.com/..." pegado a mano es
  // lo más común, así que se asume https en vez de descartarlo.
  const limpio = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  if (ARCHIVO.test(limpio)) return { tipo: 'archivo', src: limpio };

  for (const re of YOUTUBE) {
    const m = re.exec(limpio);
    if (m) {
      return {
        tipo: 'embed',
        plataforma: 'youtube',
        src: `https://www.youtube.com/embed/${m[1]}`,
      };
    }
  }

  const tk = TIKTOK_VIDEO.exec(limpio);
  if (tk) {
    return {
      tipo: 'embed',
      plataforma: 'tiktok',
      src: `https://www.tiktok.com/embed/v2/${tk[1]}`,
    };
  }

  const vm = VIMEO.exec(limpio);
  if (vm) {
    return {
      tipo: 'embed',
      plataforma: 'vimeo',
      src: `https://player.vimeo.com/video/${vm[1]}`,
    };
  }

  // Instagram y Facebook no dan un embed fiable sin SDK ni token, y un enlace
  // honesto es mejor que un iframe que a veces carga en blanco.
  return { tipo: 'enlace', src: limpio };
}

/**
 * Proporción del reproductor. TikTok es vertical (9:16) y el resto apaisado;
 * acertar acá evita las franjas negras que hacen que el video se vea barato.
 */
export function proporcionVideo(v: VideoProducto): string {
  if (v.tipo === 'embed' && v.plataforma === 'tiktok') return '9 / 16';
  return '16 / 9';
}
