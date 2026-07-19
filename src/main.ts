import { fetchImages } from './api';
import { renderImages } from './gallery';

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const sentinel = document.getElementById('sentinel') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;

let currentQuery = 'landscape';
let currentPage = 1;
let totalHits = 0;
let isLoading = false;
const PER_PAGE = 20;

async function loadImages(append = false): Promise<void> {
  if (isLoading) return;
  isLoading = true;
  loader.classList.remove('hidden');
  errorMessage.classList.add('hidden');

  try {
    const data = await fetchImages(currentQuery, currentPage, PER_PAGE);
    totalHits = data.totalHits;
    renderImages(data.hits, append);
    currentPage++;
  } catch (err) {
    console.error('Failed to fetch images:', err);
    errorMessage.textContent = 'Failed to load images. Please try again.';
    errorMessage.classList.remove('hidden');
  } finally {
    isLoading = false;
    loader.classList.add('hidden');
  }
}

function search(): void {
  const query = searchInput.value.trim();
  if (!query) return;
  currentQuery = query;
  currentPage = 1;
  totalHits = 0;
  loadImages(false);
}

searchBtn.addEventListener('click', search);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') search();
});

const observer = new IntersectionObserver(
  (entries) => {
    const entry = entries[0];
    if (entry.isIntersecting && !isLoading) {
      const loaded = (currentPage - 1) * PER_PAGE;
      if (loaded < totalHits || currentPage === 1) {
        loadImages(true);
      }
    }
  },
  { rootMargin: '300px'}
);

observer.observe(sentinel);

loadImages(false);