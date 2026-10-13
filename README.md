# 📸 Photo Gallery

A responsive photo gallery built with **Vite + TypeScript**, powered by the [Pixabay API](https://pixabay.com/api/docs/). Features infinite scrolling, a masonry grid layout, image search, and a lightbox viewer.

![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Masonry%20Grid-1572B6?style=flat-square&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🔍 **Image search** — search any keyword via Pixabay API
- 🔗 **Shareable searches** — the search term lives in the URL (`?q=forest`), so links can be shared and the browser's back/forward buttons move between searches
- 🧱 **Masonry grid layout** — CSS `columns`-based responsive grid
- ♾️ **Infinite scrolling** — loads more images automatically using `IntersectionObserver`
- 🖼️ **Lightbox viewer** — click any image to view it full-size with tags and author
- ⌨️ **Keyboard navigation** — Tab through the gallery, Enter/Space to open, arrow keys or on-screen buttons to move between images, Escape to close
- ⚡ **Preloading** — the previous and next images load in the background as you browse the lightbox, so navigation feels instant
- 🔝 **Back to top** — a floating button appears after scrolling and smoothly scrolls back up
- ⚠️ **Error feedback** — a visible message if a search or image load fails
- ♿ **Accessible** — ARIA roles/labels on gallery items and the lightbox dialog, with focus management
- 🎨 **Animated UI** — fade-in animations, hover overlays, loading pulse

---

## 🗂️ Project Structure

```
photo-gallery-ts/
├── src/
│   ├── main.ts            # App entry point, search + URL state, infinite scroll
│   ├── api.ts             # Pixabay API calls and TypeScript interfaces
│   ├── gallery.ts         # DOM rendering, lightbox logic
│   ├── api.test.ts        # Unit tests for the API layer
│   ├── gallery.test.ts    # Unit tests for rendering and the lightbox
│   └── style.css          # All styles (masonry grid, lightbox, animations)
├── public/                # Static assets
├── index.html             # App shell with header, gallery container, sentinel
├── vitest.config.ts       # Test runner configuration (jsdom)
├── tsconfig.json          # TypeScript configuration
├── .env                   # Your Pixabay API key (not committed)
└── .env.example           # Template for .env
```

---

## 🚀 Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) 20.19+ or 22.12+ (required by Vite 8) and npm.

### 1. Clone the repository

```bash
git clone https://github.com/Arquid/photo-gallery-ts.git
cd photo-gallery-ts
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get a Pixabay API key

1. Create a free account at [pixabay.com](https://pixabay.com)
2. Go to [pixabay.com/api/docs/](https://pixabay.com/api/docs/) — your key is shown at the top
3. Copy your API key

### 4. Add your API key

Copy the example env file and add your key:

```bash
cp .env.example .env
```

(In Windows `cmd`, use `copy .env.example .env`.)

Then open `.env` and set your key:

```
VITE_PIXABAY_KEY=your_pixabay_api_key
```

`.env` is gitignored, so your key stays out of version control. Vite only exposes environment variables prefixed with `VITE_` to client code, and it reads `.env` when the dev server starts, so restart `npm run dev` after changing it.

> **Note:** this is a client-side app, so the key is inlined into the JavaScript bundle and is visible to anyone who opens the site (also in the browser's network tab). Use a key you can rotate, and put a small server-side proxy in front of the API before deploying publicly.

### 5. Start the development server

```bash
npm run dev
```

Open your browser at **http://localhost:5173**

If the page stays empty and shows "Failed to load images. Please try again.", the API key is most likely missing or invalid — check `.env` and restart the dev server.

### 6. Run the tests

```bash
npm test
```

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check with `tsc`, then create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the unit tests once with Vitest |

---

## 🌐 API Reference

This project uses the [Pixabay REST API](https://pixabay.com/api/docs/).

**Endpoint:** `https://pixabay.com/api/`

**Key parameters used:**

| Parameter | Value | Description |
|---|---|---|
| `key` | your API key | Authentication |
| `q` | search query | Keyword to search |
| `page` | integer | Page number for pagination |
| `per_page` | `20` | Results per page (3–200) |
| `image_type` | `photo` | Only real photos |
| `safesearch` | `true` | Family-safe results only |

**Limits:** 100 requests per minute (the API reports this in the `X-RateLimit-Limit` header). Each query exposes at most 500 results (`totalHits`), so infinite scrolling ends after 500 images.

---

## 🧩 Key Implementation Details

### Infinite Scrolling

An `IntersectionObserver` watches a hidden sentinel element at the bottom of the page. When it enters the viewport, the next page of images is fetched and appended to the grid.

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    const entry = entries[0];
    if (entry.isIntersecting && !isLoading) {
      const loaded = (currentPage - 1) * PER_PAGE;
      if (loaded < totalHits || currentPage === 1) {
        loadImages(true); // append = true
      }
    }
  },
  { rootMargin: '300px' }
);
observer.observe(sentinel);
```

Loading stops once every result reported by the API (`totalHits`) has been fetched.

### URL State

The current search term is stored in the `q` query parameter. On load, `?q=...` is read and the search box is filled in (without it, the default search `landscape` is used). Each new search adds a history entry with `history.pushState`, repeating the same search does not, and a `popstate` listener re-runs the search when the user navigates back or forward. Only the search term is stored, not the page number, because infinite scrolling loads pages incrementally.

```typescript
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

window.addEventListener('popstate', () => {
  searchInput.value = readQueryParam();
  runSearch(readQueryParam() || DEFAULT_QUERY);
});
```

### Masonry Grid

The grid uses native CSS `columns` — no JavaScript layout library needed.

```css
.gallery-grid {
  columns: 4 280px;
  column-gap: 10px;
}
.gallery-item {
  break-inside: avoid;
}
```

### Lightbox Navigation & Preloading

The lightbox tracks every image loaded so far (`currentImages`) and the index of the open one. Arrow keys and the on-screen prev/next buttons move through the same list, and the buttons are disabled at the first/last image (touch swiping is not implemented). Each time the lightbox opens or moves to a new image, the neighboring images are preloaded in the background:

```typescript
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
```

### TypeScript Interfaces

```typescript
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
```

---

## 📦 Dependencies

This project uses **zero runtime dependencies** — only Vite as a dev tool.

| Package | Role |
|---|---|
| `vite` | Dev server & bundler |
| `typescript` | Type checking |
| `vitest` | Test runner |
| `jsdom` | DOM environment for tests |

---

## 📄 License

MIT © 2025 — free to use, modify, and distribute.
