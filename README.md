# Cable Locator

Guides you to a cable from AutoCAD data. Steps 1-4 of the MVP: DXF import, UTM to lat/lon with Google Maps check links, guidance engine with simulator, live GPS with smoothing.

## Run
```
npm install
npm run dev      # https://localhost:3000 (HTTPS is needed later for phone GPS and compass)
```

## On the phone
The layout is one column on a phone (cable picker, arrow and answer, plan, numbers) and two columns on a wide screen. Controls are 48 px tall, the screen stays awake while Live GPS is on, and light/dark follows the phone. Open the site over HTTPS in Safari and use Share > Add to Home Screen to run it full screen.

## Prepare the DXF
Model space only. One polyline per cable, each on its own layer (layer name becomes the cable name). Real Easting/Northing coordinates in metres, saved as ASCII DXF (AutoCAD 2018). Use PASTEORIG when copying cables into a clean drawing.

## Files
- `app/page.tsx` owns all state and connects the pieces
- `components/Controls.tsx` settings bar
- `components/PlanCanvas.tsx` the drawing and the drag-to-simulate input
- `components/Readout.tsx` the answer panel and map check links
- `lib/engine.ts` pure guidance logic (nearest point, left/right, chainage, bend look-ahead)
- `lib/view.ts` grid metres <-> canvas pixels
- `lib/dxf.ts` DXF parsing
- `lib/geo.ts` UTM zone <-> WGS84 and Google Maps links
- `components/CompassArrow.tsx` arrow to the cable, relative to the way you face
- `lib/compass.ts` phone compass hook (iPhone permission, smoothing)
- `lib/facing.ts` picks walking direction or compass
- `lib/angle.ts` degree helpers
- `lib/gps.ts` live GPS hook: accuracy-weighted smoothing, walking direction from movement
- `lib/wakelock.ts` keeps the screen on during Live GPS
- `app/manifest.ts`, `app/icon.svg` Add to Home Screen support
- `lib/demo.ts` demo cable
