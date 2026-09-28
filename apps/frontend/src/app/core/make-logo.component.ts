import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const LOGO_MAP: Record<string, string> = {
  ford:      'ford',
  dodge:     'dodge',
  ram:       'dodge',
  honda:     'honda',
  toyota:    'toyota',
  chevrolet: 'chevrolet',
  chevy:     'chevrolet',
  scag:      'scag',
  yamaha:    'yamaha',
};

export function manufacturerLogo(make: string | null | undefined): string | null {
  if (!make) return null;
  const slug = LOGO_MAP[make.toLowerCase().trim()];
  return slug ? `/logos/${slug}-logo.png` : null;
}

@Component({
  selector: 'app-make-logo',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[class.sm]': 'size === "sm"',
    '[class.lg]': 'size === "lg"',
  },
  template: `
    <img *ngIf="src as url" [src]="url" [alt]="make + ' logo'"
      [class.mark-lg]="scale === 'chevy'" [class.mark-ford]="scale === 'ford'" />
    <span *ngIf="!src">{{ letter }}</span>
  `,
  styles: [`
    :host {
      width: 56px; height: 56px; border-radius: 12px;
      background:
        radial-gradient(circle at 30% 18%, oklch(0.42 0.03 75 / 0.55), transparent 58%),
        linear-gradient(165deg, oklch(0.30 0.012 260), oklch(0.18 0.008 260));
      border: 1px solid oklch(0.82 0.14 75 / 0.35);
      box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 8px 18px oklch(0 0 0 / 0.35);
      display: inline-grid; place-items: center;
      flex-shrink: 0; overflow: hidden;
    }
    :host(.sm) { width: 28px; height: 28px; border-radius: 6px; }
    :host(.lg) { width: 84px; height: 84px; border-radius: 16px; }
    img { width: 78%; height: 78%; object-fit: contain; display: block; }
    img.mark-lg { width: 94%; height: 94%; }
    img.mark-ford { width: 122%; height: 122%; }
    span { font-weight: 800; color: var(--fg); font-size: 1.15rem; line-height: 1; }
    :host(.sm) span { font-size: 0.75rem; }
    :host(.lg) span { font-size: 1.6rem; }
  `],
})
export class MakeLogoComponent {
  @Input() make = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get src(): string | null {
    return manufacturerLogo(this.make);
  }

  get scale(): 'ford' | 'chevy' | null {
    const slug = LOGO_MAP[(this.make || '').toLowerCase().trim()];
    if (slug === 'ford') return 'ford';
    if (slug === 'chevrolet') return 'chevy';
    return null;
  }

  get letter(): string {
    return (this.make || '?').charAt(0).toUpperCase();
  }
}
