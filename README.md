# Compass

Compass is a browser-based Angular app that uses the device's location and orientation sensors to guide the user toward Cairo Tower. It calculates the direction and distance locally in the browser; there is no application backend or external mapping service.

## Requirements

- Node.js and npm compatible with the Angular CLI and dependencies in `package.json`
- A modern browser that supports the Geolocation API and device orientation events
- Location permission, and motion/orientation permission on platforms that request it
- A secure browser context for device APIs: use `localhost` for local development and HTTPS when deployed

## Run locally

Install dependencies, then start the Angular development server:

```bash
npm install
npm start
```

Open the URL printed by the CLI (normally `http://localhost:4200/`). On iOS, press **Enable compass** when prompted so the browser can request motion permission in response to a user gesture. Allow location access when the browser asks.

Available npm scripts:

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Angular development server (`ng serve`). |
| `npm run build` | Create the production build in `dist/compass/browser`. |
| `npm run watch` | Rebuild continuously using the development configuration. |
| `npm test` | Run the configured Angular unit tests. |

The deployment configuration in `netlify.toml` builds with `npm run build` and publishes `dist/compass/browser`.

## How the app works

The root app renders `CompassComponent`. When it initializes, the component calls `CompassService.init()`. The service then either asks the user to enable motion access (on platforms exposing `DeviceOrientationEvent.requestPermission`) or starts sensor and location tracking immediately.

The compass dial points to Cairo Tower, the banner changes when the device is facing the target, and the displayed distance is in kilometers. The component rotates the dial relative to the current heading and uses a shortest-angle transition to avoid spinning the needle the long way around when the angle crosses north.

## `CompassService` reference

Implementation: [`src/app/compass/compass-service.ts`](src/app/compass/compass-service.ts)

The service is provided at the root injector and uses Angular signals and computed signals for reactive state. Its target is the fixed `CAIRO_TOWER` coordinate:

```ts
{ lat: 30.0459, lng: 31.2243 }
```

### Public state

| Member | Type | Meaning |
| --- | --- | --- |
| `position` | `Signal<{ lat: number; lng: number } \| null>` | Most recently received device coordinates; `null` until a location update arrives. |
| `heading` | `Signal<number \| null>` | Smoothed device heading in degrees, normalized around north; `null` until a usable orientation event arrives. |
| `error` | `Signal<string \| null>` | Latest permission, startup, or geolocation error message exposed by the service. |
| `bearing` | `ComputedSignal<number \| null>` | Initial bearing from the latest position to Cairo Tower, in degrees clockwise from north; `null` until position is available. |
| `distance` | `ComputedSignal<number \| null>` | Straight-line distance from the latest position to Cairo Tower, in meters; `null` until position is available. |
| `offset` | `ComputedSignal<number \| null>` | Signed shortest angle from the current heading to the target bearing. Zero means straight ahead; negative means left; positive means right. It is `null` until both heading and bearing are available. |
| `aligned` | `Signal<boolean>` | Whether the target is considered aligned with the device heading. |
| `needsPermission` | `Signal<boolean>` | Whether the UI should ask the user to explicitly enable the compass. |

Signals can be read in templates or code by calling them, for example `compass.heading()` or `compass.distance()`.

### Public methods

- **`init()`** — Call when the compass view loads. If the browser exposes the iOS-style permission request, this sets `needsPermission` to `true`; otherwise it calls `start()` automatically.
- **`start()`** — Starts orientation and location tracking. On iOS, call it from a user action (such as a button click), because sensor permission requests require a user gesture. Calls after startup are ignored by the service's `started` guard.

### Direction and distance calculations

- **`bearingTo(lat1, lng1, lat2, lng2)`** computes the initial great-circle bearing using spherical trigonometry and normalizes the result to `[0, 360)` degrees.
- **`distanceMeters(lat1, lng1, lat2, lng2)`** uses the Haversine formula with a mean Earth radius of `6,371,000` meters. The returned distance is a surface-distance estimate, not a road route or altitude-aware measurement.
- **`offset`** wraps the target-bearing minus device-heading difference to the signed shortest angle in `[-180, 180)`.

### Sensor and location processing

`start()` requests orientation permission when the platform provides `DeviceOrientationEvent.requestPermission()`. It listens for `deviceorientationabsolute` when that event property is present on `window`, and otherwise listens for `deviceorientation`.

For each orientation event, the service prefers `webkitCompassHeading` (used by iOS browsers). Otherwise it converts `alpha` to a north-referenced heading as `(360 - alpha) % 360`. Events without either usable value do not update the heading. A circular low-pass filter moves the previous heading 20% toward each new reading, taking the shorter direction around the 0°/360° boundary to reduce jitter.

The service also calls `navigator.geolocation.watchPosition()` with high accuracy enabled and a maximum cached-position age of one second. Successful updates replace `position`; geolocation errors set `error` to the browser-provided message.

### Alignment feedback

Alignment uses hysteresis to avoid flickering near the target direction:

- The service sets `aligned` to `true` when the absolute offset is at most **5°**.
- Once aligned, it stays aligned until the absolute offset is greater than **10°**.
- On the transition into alignment, it requests a **200 ms** vibration when the browser provides the Vibration API.

### Current limitations

- The target is currently hard-coded to Cairo Tower; there is no target-selection UI.
- Direction depends on the device's orientation hardware and browser implementation. Some desktop devices or browsers may not emit a usable heading.
- Location and compass readings can be unavailable or inaccurate indoors, with denied permissions, or when the browser/device lacks the relevant API.
- `start()` marks the service as started before the permission request finishes. If that permission is denied, another call to `start()` in the same page session is ignored; reload the page to retry.
- The service does not currently expose a stop method or unregister its orientation listener / geolocation watch. Tracking continues for the lifetime of the page.
- The alignment vibration is optional and may be unavailable or suppressed by browser settings.

## Project layout

```text
src/
  app/
    app.ts                    Root component
    app.html                  Renders the compass screen
    app.routes.ts             Router configuration
    compass/
      compass.ts              Compass UI and dial rotation
      compass-service.ts      Sensor state and compass calculations
```

## Tests and build

Run unit tests with:

```bash
npm test
```

Create the production bundle with:

```bash
npm run build
```

The Angular build configuration treats an initial bundle above 500 kB as a warning and above 1 MB as an error. Component/service behavior involving actual sensors should also be checked on physical devices, since ordinary desktop test environments do not provide representative motion and location hardware.
