import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, describeError, fetchImages } from './api';

function mockFetchOnce(response: { ok: boolean; status?: number; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.body ?? {}),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchImages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the correct query parameters', async () => {
    const fetchMock = mockFetchOnce({ ok: true, body: { totalHits: 0, hits: [] } });

    await fetchImages('mountains', 2, 30);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get('q')).toBe('mountains');
    expect(requestedUrl.searchParams.get('page')).toBe('2');
    expect(requestedUrl.searchParams.get('per_page')).toBe('30');
    expect(requestedUrl.searchParams.get('image_type')).toBe('photo');
    expect(requestedUrl.searchParams.get('safesearch')).toBe('true');
  });

  it('falls back to "nature" when the query is empty', async () => {
    const fetchMock = mockFetchOnce({ ok: true, body: { totalHits: 0, hits: [] } });

    await fetchImages('', 1, 20);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get('q')).toBe('nature');
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ ok: false, status: 400 });

    await expect(fetchImages('landscape', 1, 20)).rejects.toThrow('Api error 400');
  });

  it('returns the parsed JSON on success', async () => {
    const body = { totalHits: 5, hits: [{ id: 1 }] };
    mockFetchOnce({ ok: true, body });

    const result = await fetchImages('forest', 1, 20);

    expect(result).toEqual(body);
  });

  it('throws an ApiError that carries the HTTP status', async () => {
    mockFetchOnce({ ok: false, status: 429 });

    const error = await fetchImages('landscape', 1, 20).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect((error as ApiError).message).toBe('Api error 429');
  });
});

describe('describeError', () => {
  it('points to the API key for a 400 response', () => {
    expect(describeError(new ApiError(400))).toContain('VITE_PIXABAY_KEY');
  });

  it('mentions the rate limit for a 429 response', () => {
    expect(describeError(new ApiError(429))).toContain('Too many requests');
  });

  it('falls back to a generic message for other statuses', () => {
    expect(describeError(new ApiError(500))).toBe('Failed to load images. Please try again.');
  });

  it('falls back to a generic message for network errors', () => {
    expect(describeError(new TypeError('Failed to fetch'))).toBe(
      'Failed to load images. Please try again.'
    );
  });
});
