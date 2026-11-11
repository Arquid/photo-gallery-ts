import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import gallerySource from './gallery.ts?raw';
import mainSource from './main.ts?raw';

const doc = new DOMParser().parseFromString(html, 'text/html');

describe('index.html', () => {
  it('gives the search input an accessible name', () => {
    const input = doc.getElementById('search-input');
    expect(input?.getAttribute('aria-label')).toBeTruthy();
  });

  it('announces errors with role="alert" on the message text', () => {
    const errorText = doc.getElementById('error-text');
    expect(errorText?.getAttribute('role')).toBe('alert');
    expect(doc.getElementById('error-message')?.contains(errorText)).toBe(true);
  });

  it('announces loading through a status region with visually hidden text', () => {
    const loader = doc.getElementById('loader');
    expect(loader?.getAttribute('role')).toBe('status');

    const children = Array.from(loader?.children ?? []);
    const last = children[children.length - 1];
    expect(children.slice(0, 3).every((child) => child.tagName === 'SPAN')).toBe(true);
    expect(last.classList.contains('visually-hidden')).toBe(true);
    expect(last.textContent).toContain('Loading');
  });

  it('marks the lightbox as a named modal dialog with labelled buttons', () => {
    const lightbox = doc.getElementById('lightbox');
    expect(lightbox?.getAttribute('role')).toBe('dialog');
    expect(lightbox?.getAttribute('aria-modal')).toBe('true');
    expect(lightbox?.getAttribute('aria-label')).toBeTruthy();

    for (const id of ['lightbox-close', 'lightbox-prev', 'lightbox-next']) {
      expect(doc.getElementById(id)?.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('contains every element the code looks up by id', () => {
    const source = mainSource + gallerySource;
    const ids = Array.from(source.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g), (m) => m[1]);
    const missing = ids.filter((id) => !doc.getElementById(id));

    expect(ids.length).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });
});
