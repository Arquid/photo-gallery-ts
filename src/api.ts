const API_KEY = import.meta.env.VITE_PIXABAY_KEY;
const BASE_URL = 'https://pixabay.com/api';

export interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
  views: number;
  likes: number;
  webformatWidth: number;
  webformatHeight: number;
}

export interface PixabayResponse {
  totalHits: number;
  hits: PixabayImage[];
}

export class ApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`Api error ${status}`);
    this.status = status;
  }
}

export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) {
      return 'The Pixabay API rejected the request. Check that VITE_PIXABAY_KEY in .env is a valid API key and restart the dev server.';
    }
    if (err.status === 429) {
      return 'Too many requests. Wait a minute and try again.';
    }
  }
  return 'Failed to load images. Please try again.';
}

export async function fetchImages (
  query: string,
  page: number,
  perPage: number = 20
): Promise<PixabayResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    q: query || 'nature',
    page: String(page),
    per_page: String(perPage),
    image_type: 'photo',
    safesearch: 'true'
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}