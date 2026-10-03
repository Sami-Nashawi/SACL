# Cable Locator

Guides you to a cable from AutoCAD data. Steps 1-4 of the MVP: DXF import, UTM to lat/lon with Google Maps check links, guidance engine with simulator, live GPS with smoothing.

## Run
```
npm install
npm run dev      # https://localhost:3000 (HTTPS is needed later for phone GPS and compass)
```

## Two modes
- **Find** (far from the cable): arrow and distance, using walking direction or the compass, on a satellite or street map.
- **Follow** (within 10 m, back to Find beyond 15 m): the cable is a line and you are a dot. It says how far to move left or right using the cable's own direction, with no compass. It flips left/right by itself if GPS shows you walking the other way. Use the View setting to force one mode.

## On the phone
The layout is one column on a phone (cable picker, arrow and answer, plan, numbers) and two columns on a wide screen. Controls are 48 px tall, the screen stays awake while Live GPS is on, and light/dark follows the phone. Open the site over HTTPS in Safari and use Share > Add to Home Screen to run it full screen.

## Prepare the DXF
Model space only. One polyline per cable, each on its own layer (layer name becomes the cable name). Real Easting/Northing coordinates in metres, saved as ASCII DXF (AutoCAD 2018). Use PASTEORIG when copying cables into a clean drawing.

## Files
- `app/page.tsx` owns all state and connects the pieces
- `components/Controls.tsx` settings bar
- `components/MapView.tsx` the cable and you on a real map (Leaflet); tap the map to move in the simulator
- `components/LaneView.tsx` Follow mode: cable as a line, you as a dot with the GPS uncertainty band
- `lib/map.ts` map tile sources (change here to use Google, MapTiler or Mapbox)
- `components/Readout.tsx` the answer panel and map check links
- `lib/engine.ts` pure guidance logic (nearest point, left/right, chainage, bend look-ahead)
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
