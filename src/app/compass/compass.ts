// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-compass',
//   imports: [],
//   templateUrl: './compass.html',
//   styleUrl: './compass.scss',
// })

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CompassService, CompassState } from './compass-service';

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="compass">
      <h2>Find Cairo Tower</h2>

      <div
        class="compass-dial"
        role="img"
        aria-label="Direction indicator toward Cairo Tower"
      >
        <span class="north">N</span>

        <div
          class="arrow"
          [style.transform]="'rotate(' + (state.rotation ?? 0) + 'deg)'"
        >
          ▲
        </div>

        <div class="center-dot"></div>
      </div>

      <p *ngIf="state.rotation !== null">
        Turn toward the arrow to reach Cairo Tower.
      </p>

      <p *ngIf="state.rotation === null">
        Waiting for GPS and compass sensors…
      </p>

      <p *ngIf="state.error" class="error">
        {{ state.error }}
      </p>

      <p *ngIf="state.targetBearing !== null">
        Target bearing: {{ state.targetBearing | number:'1.0-0' }}°
      </p>

      <button type="button" (click)="start()">
        Start compass
      </button>

      <button type="button" (click)="stop()">
        Stop compass
      </button>
    </main>
  `,
  styles: [`
    .compass {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px;
      font-family: sans-serif;
    }

    .compass-dial {
      position: relative;
      display: grid;
      place-items: center;
      width: 240px;
      height: 240px;
      border: 2px solid #d5d5d5;
      border-radius: 50%;
    }

    .north {
      position: absolute;
      top: 12px;
      font-weight: 700;
    }

    .arrow {
      color: #e60000;
      font-size: 72px;
      transform-origin: center;
      transition: transform 100ms linear;
    }

    .center-dot {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #222;
      border-radius: 50%;
    }

    .error {
      color: #c00;
    }
  `],
})
export class CompassComponent implements OnInit, OnDestroy {
  state: CompassState = {
    targetBearing: null,
    heading: null,
    rotation: null,
    error: null,
  };

  private subscription?: Subscription;

  constructor(private compass: CompassService) {}

  ngOnInit(): void {
    this.subscription = this.compass.state$.subscribe(
      state => (this.state = state)
    );
  }

  start(): void {
    void this.compass.start();
  }

  stop(): void {
    this.compass.stop();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.compass.stop();
  }
}
