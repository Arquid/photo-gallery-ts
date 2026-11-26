import type { PixabayImage, PixabayResponse } from './api';

export interface AppElements {
  searchInput: HTMLInputElement;
  searchBtn: HTMLButtonElement;
  loader: HTMLElement;
  sentinel: HTMLElement;
  errorMessage: HTMLElement;
  errorText: HTMLElement;
  retryBtn: HTMLButtonElement;
  backToTop: HTMLButtonElement;
}

export interface AppDeps {
  fetchImages: (query: string, page: number, perPage: number) => Promise<PixabayResponse>;
  renderImages: (images: PixabayImage[], append: boolean) => void;
  closeLightbox: () => void;
  describeError: (err: unknown) => string;
}

export const DEFAULT_QUERY = 'landscape';
export const PER_PAGE = 20;

export function createApp(el: AppElements, deps: AppDeps): { destroy: () => void } {
  function readQueryParam(): string {
    return new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
  }

  const initialQuery = readQueryParam();
  let currentQuery = initialQuery || DEFAULT_QUERY;
  el.searchInput.value = initialQuery;

  let currentPage = 1;
  let totalHits = 0;
  let isLoading = false;
  let generation = 0;
  let hasError = false;

  const listeners = new AbortController();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  async function loadImages(append = false): Promise<void> {
    if (append && isLoading) return;
    const mine = append ? generation : ++generation;
    isLoading = true;
    el.loader.classList.remove('hidden');
    el.errorMessage.classList.add('hidden');
    hasError = false;

    try {
      const data = await deps.fetchImages(currentQuery, currentPage, PER_PAGE);
      if (mine !== generation) return;
      totalHits = data.totalHits;
      deps.renderImages(data.hits, append);
      currentPage++;
    } catch (err) {
      if (mine !== generation) return;
      console.error('Failed to fetch images:', err);
      el.errorText.textContent = deps.describeError(err);
      el.errorMessage.classList.remove('hidden');
      hasError = true;
    } finally {
      if (mine === generation) {
        isLoading = false;
        el.loader.classList.add('hidden');
      }
    }
  }

  function runSearch(query: string): void {
    deps.closeLightbox();
    currentQuery = query;
    currentPage = 1;
    totalHits = 0;
    loadImages(false);
  }

  function search(): void {
    const query = el.searchInput.value.trim();
    if (!query) return;
    if (query !== readQueryParam()) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      history.pushState(null, '', url);
    }
    runSearch(query);
  }

  el.searchBtn.addEventListener('click', search);
  el.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search();
  });
  el.retryBtn.addEventListener('click', () => loadImages(currentPage > 1));
  el.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
  });

  window.addEventListener(
    'popstate',
    () => {
      el.searchInput.value = readQueryParam();
      runSearch(readQueryParam() || DEFAULT_QUERY);
    },
    { signal: listeners.signal }
  );

  window.addEventListener(
    'scroll',
    () => {
      el.backToTop.classList.toggle('hidden', window.scrollY <= 600);
    },
    { signal: listeners.signal }
  );

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !isLoading && !hasError) {
        const loaded = (currentPage - 1) * PER_PAGE;
        if (loaded < totalHits || currentPage === 1) {
          loadImages(true);
        }
      }
    },
    { rootMargin: '300px' }
  );
  observer.observe(el.sentinel);

  loadImages(false);

  return {
    destroy() {
      listeners.abort();
      observer.disconnect();
    },
  };
}
