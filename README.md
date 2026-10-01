# Cable Locator

Guides you to a cable from AutoCAD data. Steps 1-3 of the MVP: DXF import, UTM to lat/lon with Google Maps check links, guidance engine with simulator.

## Run
```
npm install
npm run dev      # https://localhost:3000 (HTTPS is needed later for phone GPS and compass)
```

## Prepare the DXF
Model space only. One polyline per cable, each on its own layer (layer name becomes the cable name). Real Easting/Northing coordinates in metres, saved as ASCII DXF (AutoCAD 2018). Use PASTEORIG when copying cables into a clean drawing.

## Files
- `lib/engine.ts` pure guidance logic (approach/follow, left/right, chainage, bend look-ahead)
- `lib/dxf.ts` DXF parsing
- `lib/geo.ts` UTM zone to WGS84 and Google Maps links
- `app/page.tsx` UI with the drag-to-simulate canvas
