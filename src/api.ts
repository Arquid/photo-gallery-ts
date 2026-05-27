const API_KEY = 'YOUR_PIXABAY_API_KEY' // ← Replace this
const BASE_URL = 'https://pixabay.com/api';

export interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
  views: number;
  likes: number;
  webformatWidht: number;
  webformatHeight: number;
}

export interface PixabayResponse {
  totalHits: number;
  hits: PixabayImage[];
}

export async function fetchImages (
  query: string,
  page: Number,
  perPage: number = 20
): Promise<PixabayResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    q: query || 'nature',
    page: String(page),
    per_image: String(perPage),
    image_type: 'photo',
    safeSearch: 'true'
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Api error ${res.status}`)
  return res.json();
}