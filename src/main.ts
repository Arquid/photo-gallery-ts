import { fetchImages } from './api';
import { renderImages } from './gallery';

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const sentinel = document.getElementById('sentinel') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const backToTop = document.getElementById('back-to-top') as HTMLButtonElement;

const DEFAULT_QUERY = 'landscape';

function readQueryParam(): string {
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
}

const initialQuery = readQueryParam();
let currentQuery = initialQuery || DEFAULT_QUERY;
searchInput.value = initialQuery;

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

function runSearch(query: string): void {
  currentQuery = query;
  currentPage = 1;
  totalHits = 0;
  loadImages(false);
}

function search(): void {
  const query = searchInput.value.trim();
  if (!query) return;
  if (query !== readQueryParam()) {
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    history.pushState(null, '', url);
  }
  runSearch(query);
}

searchBtn.addEventListener('click', search);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') search();
});
window.addEventListener('popstate', () => {
  searchInput.value = readQueryParam();
  runSearch(readQueryParam() || DEFAULT_QUERY);
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

window.addEventListener('scroll', () => {
  if (window.scrollY > 600) {
    backToTop.classList.remove('hidden');
  } else {
    backToTop.classList.add('hidden');
  }
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

loadImages(false);