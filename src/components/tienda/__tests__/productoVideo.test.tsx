/**
 * El video del producto en la ficha de la tienda.
 *
 * TikTok limita por IP cuántas veces se le puede pedir el mismo video. Al
 * cargarlo en cada visita, el cupo se gastaba con gente que ni iba a verlo y la
 * ficha terminaba mostrando una caja negra de TikTok —"overload-protect
 * triggered" o un 429 de su balanceador— en medio de la página del producto.
 *
 * La regla ahora: no se le pide nada a TikTok hasta que el cliente pulsa play.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import ProductoVideo from '../ProductoVideo';

const TIKTOK = 'https://www.tiktok.com/@ecooro/video/7650171597617319188';

describe('Video del producto · no se carga hasta que lo piden', () => {
  it('al entrar a la ficha no hay ningún reproductor de TikTok', () => {
    const { container } = render(<ProductoVideo url={TIKTOK} />);
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('muestra una portada propia con el botón de play', () => {
    render(<ProductoVideo url={TIKTOK} />);
    expect(screen.getByRole('button', { name: /reproducir el video en tiktok/i })).toBeTruthy();
  });

  it('recién al pulsar play se carga el reproductor', () => {
    const { container } = render(<ProductoVideo url={TIKTOK} />);
    fireEvent.click(screen.getByRole('button', { name: /reproducir/i }));
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toContain('tiktok.com/embed/v2/7650171597617319188');
  });
});

describe('Video del producto · si TikTok no responde', () => {
  it('siempre hay un enlace al video original', () => {
    render(<ProductoVideo url={TIKTOK} />);
    const enlace = screen.getByRole('link', { name: /ver el video en tiktok/i }) as HTMLAnchorElement;
    expect(enlace.href).toContain('tiktok.com/@ecooro/video/7650171597617319188');
  });
});

describe('Video del producto · lo de siempre', () => {
  it('un video subido por el negocio se reproduce directo, sin pedir permiso a nadie', () => {
    const { container } = render(<ProductoVideo url="https://s3.amazonaws.com/t/crisol.mp4" />);
    expect(container.querySelector('video')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /reproducir/i })).toBeNull();
  });

  it('sin enlace no se pinta nada', () => {
    const { container } = render(<ProductoVideo url="" />);
    expect(container.innerHTML).toBe('');
  });
});
