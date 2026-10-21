import { Component, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CompassService } from './compass-service';

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <button (click)="compass.start()">Start compass</button>

    @if (compass.error(); as err) { <p class="err">{{ err }}</p> }

    <div class="dial">
      <div class="needle" [style.transform]="'rotate(' + rotation() + 'deg)'">
        <div class="tip"></div>
      </div>
      <span class="label">Cairo Tower</span>
    </div>

    @if (compass.distance(); as d) {
      <p>{{ d / 1000 | number: '1.2-2' }} km</p>
    }
  `,
  styles: [`
    .dial { position: relative; width: 260px; height: 260px; margin: 24px auto;
            border: 3px solid #444; border-radius: 50%; }
    .needle { position: absolute; inset: 0; transition: transform 0.15s linear; }
    .tip { position: absolute; left: 50%; top: 8px; width: 0; height: 0;
           margin-left: -12px; border-left: 12px solid transparent;
           border-right: 12px solid transparent; border-bottom: 110px solid #e60000; }
    .label { position: absolute; bottom: -28px; width: 100%; text-align: center; }
  `]
})
export class CompassComponent {
  compass = inject(CompassService);
  rotation = signal(0);

  constructor() {
    // Unwrap the angle so the needle never spins 360° when crossing 0/360
    effect(() => {
      const b = this.compass.bearing();
      const h = this.compass.heading();
      if (b == null || h == null) return;
      const target = (b - h + 360) % 360;
      const current = this.rotation();
      const delta = ((target - (current % 360) + 540) % 360) - 180;
      this.rotation.set(current + delta);
    }, { allowSignalWrites: true });
  }
}
