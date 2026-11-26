import { createApp } from './app';
import { describeError, fetchImages } from './api';
import { closeLightbox, renderImages } from './gallery';

createApp(
  {
    searchInput: document.getElementById('search-input') as HTMLInputElement,
    searchBtn: document.getElementById('search-btn') as HTMLButtonElement,
    loader: document.getElementById('loader') as HTMLDivElement,
    sentinel: document.getElementById('sentinel') as HTMLDivElement,
    errorMessage: document.getElementById('error-message') as HTMLDivElement,
    errorText: document.getElementById('error-text') as HTMLParagraphElement,
    statusMessage: document.getElementById('status-message') as HTMLParagraphElement,
    retryBtn: document.getElementById('retry-btn') as HTMLButtonElement,
    backToTop: document.getElementById('back-to-top') as HTMLButtonElement,
  },
  { fetchImages, renderImages, closeLightbox, describeError }
);
