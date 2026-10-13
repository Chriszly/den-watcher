import { DOCUMENT, DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * What the browser keeps under key in its localStorage, or null. Where site data is blocked (a
 * private window, a browser setting) even reading localStorage throws; then nothing is kept.
 */
export function readStored(view: Window | null, key: string): string | null {
  try {
    return view?.localStorage.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Keeps value under key for the next visit; without storage the choice lasts for this visit. */
export function store(view: Window | null, key: string, value: string): void {
  try {
    view?.localStorage.setItem(key, value);
  } catch {
    // Without storage (a private window, blocked site data) the choice lasts for this visit.
  }
}

/**
 * Hands a file to the browser, which saves it under name as for any download. The file's URL is
 * let go a minute later, as some browsers read the file only after the click has returned.
 */
export function saveFile(document: Document, file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Whether the media query matches, following its changes until the component or service that
 * calls it is destroyed; fallback where the browser cannot tell. Called where inject() works.
 */
export function mediaMatches(query: string, fallback: boolean): Signal<boolean> {
  const list = inject(DOCUMENT).defaultView?.matchMedia?.(query);
  const matches = signal(list?.matches ?? fallback);
  if (list) {
    const update = (event: MediaQueryListEvent) => matches.set(event.matches);
    list.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => list.removeEventListener('change', update));
  }
  return matches.asReadonly();
}

/**
 * Calls changed with the element's width whenever it changes, first once it is laid out with a
 * width, until the component or directive that calls it is destroyed. Called where inject() works.
 */
export function observeWidth(element: Element, changed: (width: number) => void): void {
  let width = 0;
  const observer = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width !== width) {
      width = entry.contentRect.width;
      changed(width);
    }
  });
  observer.observe(element);
  inject(DestroyRef).onDestroy(() => observer.disconnect());
}
