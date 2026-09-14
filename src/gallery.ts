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

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const tagsSpan = document.createElement('span');
    tagsSpan.className = 'overlay-tags';
    tagsSpan.textContent = img.tags.split(',').slice(0, 3).join(' · ');

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
  const img = currentImages[index];
  lightboxImg.src = img.largeImageURL;
  lightboxCaption.textContent = `${img.tags} - by ${img.user}`;
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
  updateNavButtons();
  preloadNeighbors(index);
}

function closeLightbox(): void {
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
  document.body.style.overflow = '';
  lastFocusedElement?.focus();
}

function showImageAt(index: number): void {
  if (index < 0 || index >= currentImages.length) return;
  currentIndex = index;
  const img = currentImages[index];
  lightboxImg.src = img.largeImageURL;
  lightboxCaption.textContent = `${img.tags} - by ${img.user}`;
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