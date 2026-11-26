import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../index.html?raw';
import { ApiError, describeError } from './api';
import type { PixabayImage, PixabayResponse } from './api';
import { PER_PAGE, createApp } from './app';
import type { AppDeps } from './app';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeHit(tag: string): PixabayImage {
  return {
    id: 1,
    webformatURL: 'https://example.com/small.jpg',
    largeImageURL: 'https://example.com/large.jpg',
    tags: tag,
    user: 'photographer',
    views: 1,
    likes: 1,
    webformatWidth: 640,
    webformatHeight: 480,
  };
}

function makeResponse(prefix: string, totalHits = 100): PixabayResponse {
  return { totalHits, hits: [makeHit(`${prefix}-0`), makeHit(`${prefix}-1`)] };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const $ = (id: string) => document.getElementById(id)!;

let observerCallback: IntersectionObserverCallback;
let reducedMotion = false;

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe(): void {}
  disconnect(): void {}
}

function intersect(isIntersecting = true): void {
  observerCallback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
}

function search(query: string): void {
  ($('search-input') as HTMLInputElement).value = query;
  $('search-btn').click();
}

function setScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
  window.dispatchEvent(new Event('scroll'));
}

describe('createApp', () => {
  const fetchImages = vi.fn<AppDeps['fetchImages']>();
  const renderImages = vi.fn<AppDeps['renderImages']>();
  const closeLightbox = vi.fn<AppDeps['closeLightbox']>();
  let app: { destroy: () => void } | undefined;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let scrollTo: ReturnType<typeof vi.spyOn>;

  function boot(): void {
    app = createApp(
      {
        searchInput: $('search-input') as HTMLInputElement,
        searchBtn: $('search-btn') as HTMLButtonElement,
        loader: $('loader'),
        sentinel: $('sentinel'),
        errorMessage: $('error-message'),
        errorText: $('error-text'),
        statusMessage: $('status-message'),
        retryBtn: $('retry-btn') as HTMLButtonElement,
        backToTop: $('back-to-top') as HTMLButtonElement,
      },
      { fetchImages, renderImages, closeLightbox, describeError }
    );
  }

  async function bootLoaded(totalHits = 100): Promise<void> {
    fetchImages.mockResolvedValueOnce(makeResponse('initial', totalHits));
    boot();
    await flush();
  }

  const renderedTags = () => renderImages.mock.calls.map((call) => [call[0][0].tags, call[1]]);
  const isHidden = (id: string) => $(id).classList.contains('hidden');

  beforeEach(() => {
    document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
    history.replaceState(null, '', '/');
    reducedMotion = false;
    fetchImages.mockReset();
    renderImages.mockReset();
    closeLightbox.mockReset();
    fetchImages.mockResolvedValue(makeResponse('default'));
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reducedMotion, media: query }));
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    app?.destroy();
    app = undefined;
    setScrollY(0);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('initial load', () => {
    it('loads the default query when the URL has no q parameter', async () => {
      boot();
      await flush();

      expect(fetchImages).toHaveBeenCalledWith('landscape', 1, PER_PAGE);
      expect(($('search-input') as HTMLInputElement).value).toBe('');
    });

    it('loads the query from ?q= and fills in the search box', async () => {
      history.replaceState(null, '', '/?q=forest');
      boot();
      await flush();

      expect(fetchImages).toHaveBeenCalledWith('forest', 1, PER_PAGE);
      expect(($('search-input') as HTMLInputElement).value).toBe('forest');
    });

    it('shows the loader while loading and renders the first page afterwards', async () => {
      const pending = deferred<PixabayResponse>();
      fetchImages.mockReturnValueOnce(pending.promise);
      boot();

      expect(isHidden('loader')).toBe(false);

      pending.resolve(makeResponse('first'));
      await flush();

      expect(isHidden('loader')).toBe(true);
      expect(renderedTags()).toEqual([['first-0', false]]);
    });
  });

  describe('searching', () => {
    it('searches on button click, updates the URL and closes the lightbox', async () => {
      await bootLoaded();
      fetchImages.mockResolvedValueOnce(makeResponse('cat'));

      search('cat');
      await flush();

      expect(window.location.search).toBe('?q=cat');
      expect(closeLightbox).toHaveBeenCalledTimes(1);
      expect(fetchImages).toHaveBeenLastCalledWith('cat', 1, PER_PAGE);
      expect(renderedTags().at(-1)).toEqual(['cat-0', false]);
    });

    it('searches when Enter is pressed in the search box', async () => {
      await bootLoaded();

      ($('search-input') as HTMLInputElement).value = 'dog';
      $('search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('dog', 1, PER_PAGE);
    });

    it('trims the search term', async () => {
      await bootLoaded();

      search('  cat  ');
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('cat', 1, PER_PAGE);
      expect(window.location.search).toBe('?q=cat');
    });

    it('ignores empty searches', async () => {
      await bootLoaded();

      search('   ');
      await flush();

      expect(fetchImages).toHaveBeenCalledTimes(1);
      expect(closeLightbox).not.toHaveBeenCalled();
    });

    it('does not add a second history entry for the same query', async () => {
      await bootLoaded();
      const before = history.length;

      search('cat');
      search('cat');
      await flush();

      expect(history.length).toBe(before + 1);
    });

    it('re-runs the search from the URL on popstate and closes the lightbox', async () => {
      await bootLoaded();

      history.replaceState(null, '', '/?q=dog');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('dog', 1, PER_PAGE);
      expect(($('search-input') as HTMLInputElement).value).toBe('dog');
      expect(closeLightbox).toHaveBeenCalledTimes(1);
    });

    it('falls back to the default query and an empty box on popstate without q', async () => {
      history.replaceState(null, '', '/?q=forest');
      await bootLoaded();

      history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('landscape', 1, PER_PAGE);
      expect(($('search-input') as HTMLInputElement).value).toBe('');
    });
  });

  describe('overlapping searches', () => {
    it('shows only the latest search when responses arrive out of order', async () => {
      await bootLoaded();
      renderImages.mockClear();
      const cat = deferred<PixabayResponse>();
      const dog = deferred<PixabayResponse>();
      fetchImages.mockReturnValueOnce(cat.promise).mockReturnValueOnce(dog.promise);

      search('cat');
      search('dog');
      dog.resolve(makeResponse('dog'));
      await flush();
      cat.resolve(makeResponse('cat'));
      await flush();

      expect(renderedTags()).toEqual([['dog-0', false]]);
    });

    it('keeps the loader on until the latest search has finished', async () => {
      await bootLoaded();
      const cat = deferred<PixabayResponse>();
      const dog = deferred<PixabayResponse>();
      fetchImages.mockReturnValueOnce(cat.promise).mockReturnValueOnce(dog.promise);

      search('cat');
      search('dog');
      cat.resolve(makeResponse('cat'));
      await flush();
      expect(isHidden('loader')).toBe(false);

      dog.resolve(makeResponse('dog'));
      await flush();
      expect(isHidden('loader')).toBe(true);
    });

    it('does not let a slow next-page request join the results of a newer search', async () => {
      await bootLoaded();
      const slowPage2 = deferred<PixabayResponse>();
      fetchImages.mockReturnValueOnce(slowPage2.promise);
      intersect();
      expect(fetchImages).toHaveBeenLastCalledWith('landscape', 2, PER_PAGE);

      renderImages.mockClear();
      fetchImages.mockResolvedValueOnce(makeResponse('dog'));
      search('dog');
      await flush();
      slowPage2.resolve(makeResponse('landscape-p2'));
      await flush();

      expect(renderedTags()).toEqual([['dog-0', false]]);

      intersect();
      expect(fetchImages).toHaveBeenLastCalledWith('dog', 2, PER_PAGE);
    });

    it('ignores an error from an outdated search', async () => {
      await bootLoaded();
      const cat = deferred<PixabayResponse>();
      const dog = deferred<PixabayResponse>();
      fetchImages.mockReturnValueOnce(cat.promise).mockReturnValueOnce(dog.promise);

      search('cat');
      search('dog');
      dog.resolve(makeResponse('dog'));
      await flush();
      cat.reject(new Error('boom'));
      await flush();

      expect(isHidden('error-message')).toBe(true);
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe('infinite scroll', () => {
    it('loads the next page when the sentinel comes into view', async () => {
      await bootLoaded();
      fetchImages.mockResolvedValueOnce(makeResponse('page2'));

      intersect();
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('landscape', 2, PER_PAGE);
      expect(renderedTags().at(-1)).toEqual(['page2-0', true]);
    });

    it('does nothing when the sentinel is not intersecting', async () => {
      await bootLoaded();

      intersect(false);

      expect(fetchImages).toHaveBeenCalledTimes(1);
    });

    it('does not start another load while one is running', () => {
      fetchImages.mockReturnValueOnce(deferred<PixabayResponse>().promise);
      boot();

      intersect();

      expect(fetchImages).toHaveBeenCalledTimes(1);
    });

    it('stops loading once every result has been fetched', async () => {
      await bootLoaded(2);

      intersect();

      expect(fetchImages).toHaveBeenCalledTimes(1);
    });
  });

  describe('result messages', () => {
    it('says so, naming the query, when a search has no results', async () => {
      history.replaceState(null, '', '/?q=zzzz');
      fetchImages.mockResolvedValueOnce({ totalHits: 0, hits: [] });
      boot();
      await flush();

      expect(isHidden('status-message')).toBe(false);
      expect($('status-message').textContent).toBe('No results for “zzzz”.');
    });

    it('shows the query as plain text, never as HTML', async () => {
      history.replaceState(null, '', '/?q=' + encodeURIComponent('<b>bold</b>'));
      fetchImages.mockResolvedValueOnce({ totalHits: 0, hits: [] });
      boot();
      await flush();

      expect($('status-message').textContent).toContain('<b>bold</b>');
      expect($('status-message').querySelector('b')).toBeNull();
    });

    it('stays hidden while more results are available', async () => {
      await bootLoaded(100);

      expect(isHidden('status-message')).toBe(true);
    });

    it('announces the end of the results after the last page has loaded', async () => {
      await bootLoaded(30);
      expect(isHidden('status-message')).toBe(true);
      fetchImages.mockResolvedValueOnce(makeResponse('page2', 30));

      intersect();
      await flush();

      expect(isHidden('status-message')).toBe(false);
      expect($('status-message').textContent).toBe('You have reached the end of the results.');
    });

    it('announces the end right away when the first page holds every result', async () => {
      await bootLoaded(5);

      expect($('status-message').textContent).toBe('You have reached the end of the results.');
    });

    it('treats exactly one full page of results as the end, but one more as not the end', async () => {
      await bootLoaded(PER_PAGE);
      expect(isHidden('status-message')).toBe(false);

      app?.destroy();
      document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
      await bootLoaded(PER_PAGE + 1);
      expect(isHidden('status-message')).toBe(true);
    });

    it('hides the message again when a new search starts', async () => {
      await bootLoaded(5);
      expect(isHidden('status-message')).toBe(false);
      fetchImages.mockReturnValueOnce(deferred<PixabayResponse>().promise);

      search('cat');

      expect(isHidden('status-message')).toBe(true);
    });
  });

  describe('errors', () => {
    it('explains a rejected API key', async () => {
      fetchImages.mockRejectedValueOnce(new ApiError(400));
      boot();
      await flush();

      expect(isHidden('error-message')).toBe(false);
      expect($('error-text').textContent).toContain('VITE_PIXABAY_KEY');
      expect(isHidden('loader')).toBe(true);
      expect(consoleError).toHaveBeenCalled();
    });

    it('shows a generic message for network errors', async () => {
      fetchImages.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      boot();
      await flush();

      expect($('error-text').textContent).toBe('Failed to load images. Please try again.');
    });

    it('retries a failed first page by replacing the gallery', async () => {
      fetchImages.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      boot();
      await flush();
      fetchImages.mockResolvedValueOnce(makeResponse('retry'));

      $('retry-btn').click();
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('landscape', 1, PER_PAGE);
      expect(renderedTags()).toEqual([['retry-0', false]]);
      expect(isHidden('error-message')).toBe(true);
    });

    it('retries a failed next page by appending it', async () => {
      await bootLoaded();
      fetchImages.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      intersect();
      await flush();
      expect(isHidden('error-message')).toBe(false);
      fetchImages.mockResolvedValueOnce(makeResponse('page2'));

      $('retry-btn').click();
      await flush();

      expect(fetchImages).toHaveBeenLastCalledWith('landscape', 2, PER_PAGE);
      expect(renderedTags().at(-1)).toEqual(['page2-0', true]);
      expect(isHidden('error-message')).toBe(true);
    });

    it('does not retry on its own while the sentinel stays in view', async () => {
      fetchImages.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      boot();
      await flush();

      intersect();
      intersect();

      expect(fetchImages).toHaveBeenCalledTimes(1);
    });

    it('clears the error and resumes infinite scroll after a new search', async () => {
      fetchImages.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      boot();
      await flush();
      fetchImages.mockResolvedValueOnce(makeResponse('cat'));

      search('cat');
      await flush();
      expect(isHidden('error-message')).toBe(true);

      intersect();
      expect(fetchImages).toHaveBeenLastCalledWith('cat', 2, PER_PAGE);
    });
  });

  describe('back to top button', () => {
    it('appears after scrolling past 600 px and hides again at the top', async () => {
      await bootLoaded();
      expect(isHidden('back-to-top')).toBe(true);

      setScrollY(700);
      expect(isHidden('back-to-top')).toBe(false);

      setScrollY(100);
      expect(isHidden('back-to-top')).toBe(true);
    });

    it('scrolls smoothly to the top', async () => {
      await bootLoaded();

      $('back-to-top').click();

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('scrolls instantly when the user prefers reduced motion', async () => {
      reducedMotion = true;
      await bootLoaded();

      $('back-to-top').click();

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    });
  });

  it('stops reacting to window events after destroy()', async () => {
    await bootLoaded();
    app?.destroy();

    history.replaceState(null, '', '/?q=dog');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setScrollY(700);

    expect(fetchImages).toHaveBeenCalledTimes(1);
    expect(isHidden('back-to-top')).toBe(true);
  });
});
