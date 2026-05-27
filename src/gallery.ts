import { type PixabayImage } from './api';

const gallery = document.getElementById('gallery') as HTMLDivElement;
const lightbox = document.getElementById('lightbox') as HTMLDivElement;
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxCaption = document.getElementById(
  'lightbox-caption'
) as HTMLParagraphElement;
const closeBtn = document.getElementById('lightbox-close') as HTMLButtonElement;

export function renderImages(images: PixabayImage[], append = false): void {
  if (!append) gallery.innerHTML = '';

  images.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.animationDelay = `${(i % 20) * 40}ms`;

    const image = document.createElement('img');
    image.src = img.webformatURL;
    image.alt = img.tags;
    image.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <span class="overlay-tags">${img.tags.split(",").slice(0, 3).join(" · ")}</span>
      <span class="overlay-meta">♥ ${img.likes.toLocaleString()}</span>    
    `;

    item.appendChild(image);
    item.appendChild(overlay);
    item.addEventListener('click', () => openLightBox(img));
    gallery.appendChild(item);
  })
}

function openLightBox(img: PixabayImage): void {
  lightboxImg.src = img.largeImageURL;
  lightboxCaption.textContent = `${img.tags} - by ${img.user}`;
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(): void {
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});