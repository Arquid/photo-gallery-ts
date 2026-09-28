import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PixabayImage } from './api';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="gallery"></div>
    <div id="lightbox" class="hidden">
      <button id="lightbox-close"></button>
      <button id="lightbox-prev"></button>
      <img id="lightbox-img" />
      <button id="lightbox-next"></button>
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

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('navigates to the next and previous image with arrow keys', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([
      makeImage({ id: 1, tags: 'first', largeImageURL: 'https://example.com/1.jpg' }),
      makeImage({ id: 2, tags: 'second', largeImageURL: 'https://example.com/2.jpg' }),
      makeImage({ id: 3, tags: 'third', largeImageURL: 'https://example.com/3.jpg' }),
    ]);

    (document.querySelectorAll('.gallery-item')[0] as HTMLElement).click();
    const lightboxImg = document.getElementById('lightbox-img')!;
    const caption = document.getElementById('lightbox-caption')!;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/2.jpg');
    expect(caption.textContent).toContain('second');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/3.jpg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/2.jpg');
  });

  it('does not navigate past the first or last image with arrow keys', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([
      makeImage({ id: 1, largeImageURL: 'https://example.com/1.jpg' }),
      makeImage({ id: 2, largeImageURL: 'https://example.com/2.jpg' }),
    ]);

    const items = document.querySelectorAll('.gallery-item');
    const lightboxImg = document.getElementById('lightbox-img')!;

    (items[0] as HTMLElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/1.jpg');

    (items[1] as HTMLElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/2.jpg');
  });

  it('ignores arrow keys while the lightbox is closed', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([makeImage({ largeImageURL: 'https://example.com/1.jpg' })]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    const lightboxImg = document.getElementById('lightbox-img')!;
    expect(lightboxImg.getAttribute('src')).toBeNull();
  });

  it('navigates with the prev/next buttons and disables them at the boundaries', async () => {
    const { renderImages } = await import('./gallery');
    renderImages([
      makeImage({ id: 1, largeImageURL: 'https://example.com/1.jpg' }),
      makeImage({ id: 2, largeImageURL: 'https://example.com/2.jpg' }),
    ]);

    (document.querySelectorAll('.gallery-item')[0] as HTMLElement).click();

    const prevBtn = document.getElementById('lightbox-prev') as HTMLButtonElement;
    const nextBtn = document.getElementById('lightbox-next') as HTMLButtonElement;
    const lightboxImg = document.getElementById('lightbox-img')!;

    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    nextBtn.click();
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/2.jpg');
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);

    prevBtn.click();
    expect(lightboxImg.getAttribute('src')).toBe('https://example.com/1.jpg');
    expect(prevBtn.disabled).toBe(true);
  });

  it('preloads only the next image when opening the first image', async () => {
    const preloadedSrcs: string[] = [];
    class MockImage {
      set src(value: string) {
        preloadedSrcs.push(value);
      }
    }
    vi.stubGlobal('Image', MockImage);

    const { renderImages } = await import('./gallery');
    renderImages([
      makeImage({ id: 1, largeImageURL: 'https://example.com/1.jpg' }),
      makeImage({ id: 2, largeImageURL: 'https://example.com/2.jpg' }),
    ]);

    (document.querySelectorAll('.gallery-item')[0] as HTMLElement).click();

    expect(preloadedSrcs).toEqual(['https://example.com/2.jpg']);
  });

  it('preloads both neighbors when navigating to a middle image', async () => {
    const preloadedSrcs: string[] = [];
    class MockImage {
      set src(value: string) {
        preloadedSrcs.push(value);
      }
    }
    vi.stubGlobal('Image', MockImage);

    const { renderImages } = await import('./gallery');
    renderImages([
      makeImage({ id: 1, largeImageURL: 'https://example.com/1.jpg' }),
      makeImage({ id: 2, largeImageURL: 'https://example.com/2.jpg' }),
      makeImage({ id: 3, largeImageURL: 'https://example.com/3.jpg' }),
    ]);

    (document.querySelectorAll('.gallery-item')[1] as HTMLElement).click();

    expect(preloadedSrcs).toEqual(['https://example.com/1.jpg', 'https://example.com/3.jpg']);
  });
});
