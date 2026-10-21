import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CompassService } from './compass-service';

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (compass.needsPermission()) {
      <button (click)="compass.start()">Enable compass</button>
    }

    @if (compass.error(); as err) { <p class="err">{{ err }}</p> }

    <div class="banner" [class.on]="compass.aligned()">
      {{ compass.aligned() ? "You're facing Cairo Tower" : 'Turn toward the tower' }}
    </div>

    <div class="dial" [class.aligned]="compass.aligned()">
      <div class="needle" [style.transform]="'rotate(' + rotation() + 'deg)'">
        <div class="tip"></div>
      </div>
      <span class="label">Cairo Tower</span>
    </div>

    @if (compass.distance(); as d) {
      <p class="dist">{{ d / 1000 | number: '1.2-2' }} km</p>
    }
  `,
  styles: [`
    .dial { position: relative; width: 260px; height: 260px; margin: 24px auto;
            border: 3px solid #444; border-radius: 50%; transition: border-color .2s, box-shadow .2s; }
    .dial.aligned { border-color: #16a34a; box-shadow: 0 0 24px #16a34a88; }
    .needle { position: absolute; inset: 0; transition: transform 0.15s linear; }
    .tip { position: absolute; left: 50%; top: 8px; width: 0; height: 0;
           margin-left: -12px; border-left: 12px solid transparent;
           border-right: 12px solid transparent; border-bottom: 110px solid #e60000;
           transition: border-bottom-color .2s; }
    .aligned .tip { border-bottom-color: #16a34a; }
    .label { position: absolute; bottom: -28px; width: 100%; text-align: center; }
    .banner { text-align: center; padding: 10px; border-radius: 8px; background: #eee; font-weight: 600; }
    .banner.on { background: #16a34a; color: #fff; }
    .dist { text-align: center; }
    .err { color: #b91c1c; }
  `]
})
export class CompassComponent implements OnInit {
  compass = inject(CompassService);
  rotation = signal(0);

  constructor() {
    effect(() => {
      const b = this.compass.bearing();
      const h = this.compass.heading();
      if (b == null || h == null) return;
      const target = (b - h + 360) % 360;
      const current = this.rotation();
      const delta = ((target - (current % 360) + 540) % 360) - 180;
      this.rotation.set(current + delta);
    });
  }

  ngOnInit() { this.compass.init(); }
}
