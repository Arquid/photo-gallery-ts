import { type PixabayImage } from './api';

const gallery = document.getElementById('gallery') as HTMLDivElement;
const lightbox = document.getElementById('lightbox') as HTMLDivElement;
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxCaption = document.getElementById(
  'lightbox-caption'
) as HTMLParagraphElement;
const closeBtn = document.getElementById('lightbox-close') as HTMLButtonElement;
let lastFocusedElement: HTMLElement | null = null;

export function renderImages(images: PixabayImage[], append = false): void {
  if (!append) gallery.innerHTML = '';

  images.forEach((img, i) => {
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
    item.addEventListener('click', () => openLightBox(img));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightBox(img);
      }
    });
    gallery.appendChild(item);
  })
}

function openLightBox(img: PixabayImage): void {
  lastFocusedElement = document.activeElement as HTMLElement;
  lightboxImg.src = img.largeImageURL;
  lightboxCaption.textContent = `${img.tags} - by ${img.user}`;
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}

function closeLightbox(): void {
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
  document.body.style.overflow = '';
  lastFocusedElement?.focus();
}

closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});