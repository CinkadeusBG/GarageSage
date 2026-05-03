import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'gs_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.#initialValue());

  constructor() {
    this.#apply(this.isDark());
  }

  toggle() {
    this.isDark.update(v => !v);
    this.#apply(this.isDark());
    localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
  }

  #initialValue(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  #apply(dark: boolean) {
    document.documentElement.classList.toggle('dark-mode', dark);
  }
}
