import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PixabayImage } from './api';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="gallery"></div>
    <div id="lightbox" class="hidden">
      <button id="lightbox-close"></button>
      <img id="lightbox-img" />
      <p id="lightbox-caption"></p>
    </div>
  `;
}

function makeImage(overrides: Partial<PixabayImage> = {}): PixabayImage {
  return {
    id: 1,
    webformatURL: 'https://example.com/small.jpg',
    largeImageURL: 'https://example.com/large.jpg',
    tags: 'forest,trees,green',
    user: 'photographer',
    views: 100,
    likes: 42,
    webformatWidth: 640,
    webformatHeight: 480,
    ...overrides,
  };
}

describe('renderImages', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
  });

  it('renders one gallery item per image with correct content', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage(), makeImage({ id: 2 })]);

    const items = document.querySelectorAll('.gallery-item');
    expect(items).toHaveLength(2);

    const firstImg = items[0].querySelector('img');
    expect(firstImg?.getAttribute('src')).toBe('https://example.com/small.jpg');
    expect(firstImg?.alt).toBe('forest,trees,green');

    const tagsSpan = items[0].querySelector('.overlay-tags');
    expect(tagsSpan?.textContent).toBe('forest · trees · green');

    const metaSpan = items[0].querySelector('.overlay-meta');
    expect(metaSpan?.textContent).toBe('♥ 42');
  });

  it('clears previous content when append is false', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage()]);
    renderImages([makeImage({ id: 2 }), makeImage({ id: 3 })], false);

    expect(document.querySelectorAll('.gallery-item')).toHaveLength(2);
  });

  it('keeps previous content when append is true', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage()]);
    renderImages([makeImage({ id: 2 })], true);

    expect(document.querySelectorAll('.gallery-item')).toHaveLength(2);
  });

  it('does not interpret HTML in tags (XSS guard)', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage({ tags: '<img src=x onerror=alert(1)>,safe' })]);

    const tagsSpan = document.querySelector('.overlay-tags');
    expect(tagsSpan?.querySelector('img')).toBeNull();
    expect(tagsSpan?.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('opens the lightbox with image details on click', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage({ tags: 'sunset,beach', user: 'jane' })]);

    const item = document.querySelector('.gallery-item') as HTMLElement;
    item.click();

    const lightbox = document.getElementById('lightbox')!;
    const lightboxImg = document.getElementById('lightbox-img')!;
    const caption = document.getElementById('lightbox-caption')!;

    expect(lightbox.classList.contains('hidden')).toBe(false);
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/large.jpg');
    expect(caption.textContent).toBe('sunset,beach - by jane');
  });

  it('closes the lightbox when the close button is clicked', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage()]);

    (document.querySelector('.gallery-item') as HTMLElement).click();
    (document.getElementById('lightbox-close') as HTMLElement).click();

    const lightbox = document.getElementById('lightbox')!;
    const lightboxImg = document.getElementById('lightbox-img')!;

    expect(lightbox.classList.contains('hidden')).toBe(true);
    expect(lightboxImg.getAttribute('src')).toBe('');
  });

  it('closes the lightbox on Escape key', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage()]);

    (document.querySelector('.gallery-item') as HTMLElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const lightbox = document.getElementById('lightbox')!;
    expect(lightbox.classList.contains('hidden')).toBe(true);
  });
});
