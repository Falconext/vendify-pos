/**
 * El negocio pega la URL tal como la copió del navegador o del botón compartir
 * de la app. Acá se fija qué sabemos reproducir y qué no, porque un iframe que
 * carga en blanco en la ficha de un producto es peor que no mostrar nada.
 */
import { resolverVideo, proporcionVideo } from '../video';

describe('Video del producto · qué sabemos reproducir', () => {
  it('reconoce el enlace de TikTok que pega el negocio', () => {
    // El caso real: TIENDA MINERA pegó esto en la descripción del crisol.
    const v = resolverVideo(
      'https://www.tiktok.com/@aprende.negocio.oro/video/7694320615390723380?is_from_webapp=1',
    );
    expect(v).toEqual({
      tipo: 'embed',
      plataforma: 'tiktok',
      src: 'https://www.tiktok.com/embed/v2/7694320615390723380',
    });
  });

  it('acepta YouTube en sus formas habituales', () => {
    const esperado = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ',
    ]) {
      expect(resolverVideo(url)).toMatchObject({ tipo: 'embed', src: esperado });
    }
  });

  it('un mp4 propio se reproduce sin iframe', () => {
    expect(resolverVideo('https://s3.amazonaws.com/tienda/crisol.mp4')).toEqual({
      tipo: 'archivo',
      src: 'https://s3.amazonaws.com/tienda/crisol.mp4',
    });
  });

  it('asume https cuando lo pegaron sin protocolo', () => {
    const v = resolverVideo('tiktok.com/@negocio/video/7694320615390723380');
    expect(v).toMatchObject({ tipo: 'embed', plataforma: 'tiktok' });
  });

  it('Instagram y Facebook caen a enlace en vez de a un iframe en blanco', () => {
    expect(resolverVideo('https://www.instagram.com/reel/Cxyz123/')).toMatchObject({
      tipo: 'enlace',
    });
    expect(resolverVideo('https://www.facebook.com/negocio/videos/123456/')).toMatchObject({
      tipo: 'enlace',
    });
  });

  it('sin URL no hay sección: la ficha no debe quedar con un hueco', () => {
    expect(resolverVideo('')).toBeNull();
    expect(resolverVideo(null)).toBeNull();
    expect(resolverVideo(undefined)).toBeNull();
    expect(resolverVideo('   ')).toBeNull();
  });

  it('el perfil de TikTok sin video no se embebe como si fuera uno', () => {
    // Solo el enlace a un video concreto tiene reproductor; el perfil, no.
    expect(resolverVideo('https://www.tiktok.com/@aprende.negocio.oro')).toMatchObject({
      tipo: 'enlace',
    });
  });
});

describe('Video del producto · proporción', () => {
  it('TikTok es vertical', () => {
    expect(proporcionVideo(resolverVideo('https://www.tiktok.com/@n/video/123456789')!)).toBe('9 / 16');
  });

  it('el resto es apaisado', () => {
    expect(proporcionVideo(resolverVideo('https://youtu.be/dQw4w9WgXcQ')!)).toBe('16 / 9');
    expect(proporcionVideo(resolverVideo('https://cdn.tienda.com/a.mp4')!)).toBe('16 / 9');
  });
});
