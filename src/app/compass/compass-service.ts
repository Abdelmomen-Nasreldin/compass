

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CompassState {
  targetBearing: number | null;
  heading: number | null;
  rotation: number | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class CompassService implements OnDestroy {
  // Approximate Cairo Tower coordinates.
  private readonly target = {
    latitude: 30.0459,
    longitude: 31.2243,
  };

  private watchId: number | null = null;
  private listening = false;

  private readonly stateSubject = new BehaviorSubject<CompassState>({
    targetBearing: null,
    heading: null,
    rotation: null,
    error: null,
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(private zone: NgZone) {}

  async start(): Promise<void> {
    if (this.listening) return;

    if (!('geolocation' in navigator)) {
      this.update({ error: 'Geolocation is not supported.' });
      return;
    }

    try {
      await this.requestOrientationPermission();
      this.listening = true;

      window.addEventListener(
        'deviceorientationabsolute',
        this.handleOrientation as EventListener
      );

      // Fallback for browsers that do not emit the absolute event.
      window.addEventListener(
        'deviceorientation',
        this.handleOrientation as EventListener
      );

      this.watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const targetBearing = this.calculateBearing(
            coords.latitude,
            coords.longitude,
            this.target.latitude,
            this.target.longitude
          );

          this.zone.run(() => {
            this.update({ targetBearing });
            this.recalculateRotation();
          });
        },
        () => {
          this.update({
            error: 'Unable to access your location. Check permissions.',
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15000,
        }
      );
    } catch {
      this.update({
        error: 'Compass access was denied or is unavailable.',
      });
    }
  }

  private async requestOrientationPermission(): Promise<void> {
    const OrientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof OrientationEvent.requestPermission === 'function') {
      const permission = await OrientationEvent.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Orientation permission denied');
      }
    }
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    // This is a provisional heading calculation, not a universal
    // compass-heading implementation for all device orientations.
    if (event.alpha == null) return;

    const heading = ((360 - event.alpha) % 360 + 360) % 360;

    this.zone.run(() => {
      this.update({ heading });
      this.recalculateRotation();
    });
  };

  private calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const toDegrees = (radians: number) => (radians * 180) / Math.PI;

    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaLambda = toRadians(lon2 - lon1);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  private recalculateRotation(): void {
    const { targetBearing, heading } = this.stateSubject.value;

    if (targetBearing == null || heading == null) return;

    const rotation = ((targetBearing - heading) % 360 + 360) % 360;
    this.update({ rotation });
  }

  private update(patch: Partial<CompassState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch,
    });
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    window.removeEventListener(
      'deviceorientationabsolute',
      this.handleOrientation as EventListener
    );
    window.removeEventListener(
      'deviceorientation',
      this.handleOrientation as EventListener
    );

    this.listening = false;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
