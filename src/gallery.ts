import { type PixabayImage } from './api';

const gallery = document.getElementById('gallery') as HTMLDivElement;
const lightbox = document.getElementById('lightbox') as HTMLDivElement;
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxCaption = document.getElementById(
  'lightbox-caption'
) as HTMLParagraphElement;
const closeBtn = document.getElementById('lightbox-close') as HTMLButtonElement;
const prevBtn = document.getElementById('lightbox-prev') as HTMLButtonElement;
const nextBtn = document.getElementById('lightbox-next') as HTMLButtonElement;
let lastFocusedElement: HTMLElement | null = null;
let currentImages: PixabayImage[] = [];
let currentIndex = -1;
const background = document.querySelectorAll('.site-header, main');

function setBackgroundInert(inert: boolean): void {
  background.forEach((el) => el.toggleAttribute('inert', inert));
}

function formatTags(tags: string, count: number, separator: string): string {
  return tags.split(',').slice(0, count).map((tag) => tag.trim()).join(separator);
}

export function renderImages(images: PixabayImage[], append = false): void {
  if (!append) {
    gallery.innerHTML = '';
    currentImages = [];
  }
  const startIndex = currentImages.length;
  currentImages = currentImages.concat(images);

  images.forEach((img, i) => {
    const index = startIndex + i;
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.animationDelay = `${(i % 20) * 40}ms`;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View image: ${img.tags}`);

    const image = document.createElement('img');
    image.src = img.webformatURL;
    image.alt = img.tags;
    image.loading = 'lazy';
    image.width = img.webformatWidth;
    image.height = img.webformatHeight;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const tagsSpan = document.createElement('span');
    tagsSpan.className = 'overlay-tags';
    tagsSpan.textContent = formatTags(img.tags, 3, ' · ');

    const metaSpan = document.createElement('span');
    metaSpan.className = 'overlay-meta';
    metaSpan.textContent = `♥ ${img.likes.toLocaleString()}`;

    overlay.appendChild(tagsSpan);
    overlay.appendChild(metaSpan);

    item.appendChild(image);
    item.appendChild(overlay);
    item.addEventListener('click', () => openLightBox(index));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightBox(index);
      }
    });
    gallery.appendChild(item);
  })
}

function openLightBox(index: number): void {
  lastFocusedElement = document.activeElement as HTMLElement;
  currentIndex = index;
  setLightboxContent(currentImages[index]);
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setBackgroundInert(true);
  closeBtn.focus();
  updateNavButtons();
  preloadNeighbors(index);
}

export function closeLightbox(): void {
  if (lightbox.classList.contains('hidden')) return;
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
  document.body.style.overflow = '';
  setBackgroundInert(false);
  lastFocusedElement?.focus();
}

function setLightboxContent(img: PixabayImage): void {
  lightboxImg.src = img.largeImageURL;
  lightboxImg.alt = img.tags;
  lightboxCaption.textContent = `${formatTags(img.tags, 5, ', ')} - by ${img.user}`;
}

function showImageAt(index: number): void {
  if (index < 0 || index >= currentImages.length) return;
  currentIndex = index;
  setLightboxContent(currentImages[index]);
  updateNavButtons();
  preloadNeighbors(index);
}

function updateNavButtons(): void {
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= currentImages.length - 1;
}

function preloadImage(index: number): void {
  const img = currentImages[index];
  if (!img) return;
  const preload = new Image();
  preload.src = img.largeImageURL;
}

function preloadNeighbors(index: number): void {
  preloadImage(index - 1);
  preloadImage(index + 1);
}

closeBtn.addEventListener('click', closeLightbox);
prevBtn.addEventListener('click', () => showImageAt(currentIndex - 1));
nextBtn.addEventListener('click', () => showImageAt(currentIndex + 1));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (lightbox.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') showImageAt(currentIndex + 1);
  if (e.key === 'ArrowLeft') showImageAt(currentIndex - 1);
});

let swipeStart: { x: number; y: number } | null = null;

lightbox.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !e.isPrimary) return;
  swipeStart = { x: e.clientX, y: e.clientY };
});

lightbox.addEventListener('pointerup', (e) => {
  if (!swipeStart) return;
  const dx = e.clientX - swipeStart.x;
  const dy = e.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
  showImageAt(currentIndex + (dx < 0 ? 1 : -1));
});

lightbox.addEventListener('pointercancel', () => {
  swipeStart = null;
});