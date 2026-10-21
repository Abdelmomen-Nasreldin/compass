// import { Injectable, signal, computed } from '@angular/core';
import { Injectable, signal, computed, effect, untracked } from '@angular/core';

export const CAIRO_TOWER = { lat: 30.0459, lng: 31.2243 };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function bearingTo(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRad(lat1), φ2 = toRad(lat2), Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dφ = toRad(lat2 - lat1), dλ = toRad(lng2 - lng1);
  const a = Math.sin(dφ / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable({ providedIn: 'root' })
export class CompassService {
  readonly position = signal<{ lat: number; lng: number } | null>(null);
  readonly heading = signal<number | null>(null); // degrees clockwise from true/magnetic north
  readonly error = signal<string | null>(null);

  readonly bearing = computed(() => {
    const p = this.position();
    return p ? bearingTo(p.lat, p.lng, CAIRO_TOWER.lat, CAIRO_TOWER.lng) : null;
  });

  readonly distance = computed(() => {
    const p = this.position();
    return p ? distanceMeters(p.lat, p.lng, CAIRO_TOWER.lat, CAIRO_TOWER.lng) : null;
  });

  private smoothed: number | null = null;

  /** Must be called from a user gesture (iOS requires it for sensor permission). */
  async start() {
     if (this.started) return;
  this.started = true;
  this.needsPermission.set(false);
    try {
      const DOE = (window as any).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res !== 'granted') throw new Error('Motion permission denied');
      }

      // Android: absolute event gives heading relative to north. iOS: webkitCompassHeading.
      const evt = 'ondeviceorientationabsolute' in window
        ? 'deviceorientationabsolute'
        : 'deviceorientation';
      window.addEventListener(evt as any, this.onOrientation, true);

      navigator.geolocation.watchPosition(
        p => this.position.set({ lat: p.coords.latitude, lng: p.coords.longitude }),
        e => this.error.set(e.message),
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    } catch (e: any) {
      this.error.set(e.message ?? 'Failed to start compass');
    }
  }

  private onOrientation = (e: any) => {
    let h: number | null = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iOS
    else if (e.alpha != null) h = (360 - e.alpha) % 360;                         // Android
    if (h == null) return;
    this.heading.set(this.smooth(h));
  };

  // Circular low-pass filter to remove jitter
  private smooth(h: number): number {
    if (this.smoothed == null) return (this.smoothed = h);
    const delta = ((h - this.smoothed + 540) % 360) - 180;
    this.smoothed = (this.smoothed + delta * 0.2 + 360) % 360;
    return this.smoothed;
  }


  // inside the class:
readonly aligned = signal(false);
readonly needsPermission = signal(false);
private started = false;

/** Signed angle to the target: 0 = straight ahead, negative = left, positive = right */
readonly offset = computed(() => {
  const b = this.bearing(), h = this.heading();
  if (b == null || h == null) return null;
  return ((b - h + 540) % 360) - 180;
});

constructor() {
  // Hysteresis: lock at ±5°, release at ±10° so it doesn't flicker at the edge
  effect(() => {
    const o = this.offset();
    if (o == null) return;
    const abs = Math.abs(o);
    const was = untracked(this.aligned);
    if (!was && abs <= 5) {
      this.aligned.set(true);
      navigator.vibrate?.(200);
    } else if (was && abs > 10) {
      this.aligned.set(false);
    }
  });
}

/** Call on load. Starts immediately unless the platform needs a user tap. */
init() {
  const DOE = (window as any).DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    this.needsPermission.set(true); // iOS: show the button
  } else {
    this.start();
  }
}
}
