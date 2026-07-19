# 📸 Photo Gallery

A responsive photo gallery built with **Vite + TypeScript**, powered by the [Pixabay API](https://pixabay.com/api/docs/). Features infinite scrolling, a masonry grid layout, image search, and a lightbox viewer.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Masonry%20Grid-1572B6?style=flat-square&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🔍 **Image search** — search any keyword via Pixabay API
- 🧱 **Masonry grid layout** — CSS `columns`-based responsive grid
- ♾️ **Infinite scrolling** — loads more images automatically using `IntersectionObserver`
- 🖼️ **Lightbox viewer** — click any image to view it full-size with tags and author
- ⚡ **Lazy loading** — native `loading="lazy"` on all images
- 🎨 **Animated UI** — fade-in animations, hover overlays, loading pulse

---

## 🗂️ Project Structure

```
photo-gallery/
├── src/
│   ├── main.ts        # App entry point, search logic, infinite scroll
│   ├── api.ts         # Pixabay API calls and TypeScript interfaces
│   ├── gallery.ts     # DOM rendering, lightbox logic
│   └── style.css      # All styles (masonry grid, lightbox, animations)
├── index.html         # App shell with header, gallery container, sentinel
├── .env               # Your Pixabay API key (not committed)
└── .env.example       # Template for .env
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Arquid/photo-gallery-ts.git
cd photo-gallery
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

Then open `.env` and set your key:

```
VITE_PIXABAY_KEY=your_pixabay_api_key
```

`.env` is gitignored, so your key stays out of version control. Vite only exposes environment variables prefixed with `VITE_` to client code.

### 5. Start the development server

```bash
npm run dev
```

Open your browser at **http://localhost:5173**

### 6. Run the tests

```bash
npm test
```

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

**Free tier limits:** 100 requests/minute, 5 000 results per query.

---

## 🧩 Key Implementation Details

### Infinite Scrolling

An `IntersectionObserver` watches a hidden sentinel element at the bottom of the page. When it enters the viewport, the next page of images is fetched and appended to the grid.

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !isLoading) {
      loadImages(true); // append = true
    }
  },
  { rootMargin: "300px" }
);
observer.observe(sentinel);
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

### TypeScript Interfaces

```typescript
export interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
  likes: number;
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
