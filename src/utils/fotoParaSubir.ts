/**
 * Prepara una foto tomada con el celular antes de subirla.
 *
 * Tres problemas que esto resuelve y que de otro modo pierden la evidencia
 * justo cuando hace falta:
 *
 *  1. El iPhone entrega HEIC, que el servidor no acepta y los navegadores de
 *     escritorio no muestran. Al pasarla por canvas sale JPEG.
 *  2. Una foto de 12 MP pesa varios MB y el repartidor sube con datos
 *     móviles: reducirla al lado máximo la deja en cientos de KB.
 *  3. La orientación: el navegador ya aplica el EXIF al decodificar, así que
 *     la foto no queda girada.
 */

/** Lado máximo. Suficiente para leer una dirección o reconocer un paquete. */
export const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

/**
 * Cuánto hay que reducir. Nunca agranda una foto pequeña: estirarla no suma
 * detalle y sí peso.
 */
export function medidasReducidas(
  ancho: number,
  alto: number,
  maximo = LADO_MAXIMO,
): { ancho: number; alto: number } {
  const lado = Math.max(ancho, alto);
  if (!lado || lado <= maximo) {
    return { ancho: Math.max(1, Math.round(ancho)), alto: Math.max(1, Math.round(alto)) };
  }
  const factor = maximo / lado;
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  };
}

/**
 * Convierte y reduce. Si el navegador no puede decodificar la imagen se
 * devuelve el archivo original: que la subida la rechace el servidor con un
 * mensaje claro es mejor que tragarse el error acá y perder la foto.
 */
export async function prepararFoto(
  archivo: File,
  maximo = LADO_MAXIMO,
): Promise<File> {
  try {
    const bitmap = await leerImagen(archivo);
    const { ancho, alto } = medidasReducidas(bitmap.width, bitmap.height, maximo);

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return archivo;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      lienzo.toBlob(resolve, 'image/jpeg', CALIDAD),
    );
    if (!blob) return archivo;

    return new File([blob], nombreJpeg(archivo.name), {
      type: 'image/jpeg',
      lastModified: archivo.lastModified,
    });
  } catch {
    return archivo;
  }
}

/** El nombre con extensión .jpg, para que no quede un "foto.heic" que es JPEG. */
export function nombreJpeg(nombre: string): string {
  const base = (nombre || 'foto').replace(/\.[^.]+$/, '');
  return `${base || 'foto'}.jpg`;
}

async function leerImagen(
  archivo: File,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(archivo);
  }
  // Safari viejo: por <img> con object URL.
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('no se pudo leer la imagen'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
