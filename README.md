# Cable Locator

Guides you to a cable from AutoCAD data. Steps 1-4 of the MVP: DXF import, UTM to lat/lon with Google Maps check links, guidance engine with simulator, live GPS with smoothing.

## Run
```
npm install
npm run dev      # https://localhost:3000 (HTTPS is needed later for phone GPS and compass)
```

## Backend: Neon + Prisma, with user accounts
Cables and users live in a Neon Postgres database. People pick a cable by name; it is saved on their phone so it still opens with no signal.

Pages: `/` pick a layout (search, or "Nearest to me"), `/locate/<layout>` guidance, `/admin` add, rename and delete layouts and lines, `/admin/users` accounts and roles, `/account` change password, `/login`.

Sign-in uses real accounts: the company file number and a password. Roles: Administrator (manage cables and users) and Engineer (find cables). Passwords are stored as salted scrypt hashes, 5 wrong attempts lock an account for 15 minutes, and disabling an account takes effect immediately.

Setup:
1. Create a Neon project and copy the pooled and direct connection strings.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL` and `SESSION_SECRET`.
3. `npm install` (this also runs `prisma generate`), then `npm run db:push` to create or update the tables (if it asks about a unique constraint, accept it).
4. `npm run dev` and open the site. The first time, the sign-in page asks you to create the first administrator.
5. Add your engineers under Manage, then Users. They get a temporary password and choose their own at first sign-in.
6. On Vercel, add the same three values as environment variables.

## Layouts and lines
A layout is one drawing with many separate lines (ETC, IRR, PW and so on). Upload the DXF under Manage, name the layout, then name and colour each kind of line and rename single lines. Everything is drawn on the map, each line in its own colour with its name.

On site the app always guides you to the **nearest visible line** and shows its name. The target changes only when another line is clearly closer (3 m), so it does not flicker between two lines side by side. Tap a line on the map, or use "Other lines nearby", to lock onto one. Tap the colour chips to hide a kind of line.

## Two modes
- **Find** (far from the line): arrow and distance, using walking direction or the compass, on a satellite or street map.
- **Follow** (within 10 m, back to Find beyond 15 m): the line is a vertical bar and you are a dot. It says how far to move left or right using the line's own direction, with no compass, and flips left/right by itself if GPS shows you walking the other way.

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

## Tests
- `npm test` runs fast checks: left/right and distance maths, awkward lines, DXF reading (including `tests/fixtures/ETISALAT_cables.dxf`), colours, walking-or-standing detection with simulated GPS noise, and the whole locate screen driven by simulated GPS (nearest-line choice, 3 m rule, lock, hide kinds, Find/Follow at 10/15 m, direction flip).
- `npm run test:e2e` builds the app and runs about 170 checks over HTTP against an in-memory database (no Neon needed): sign-in, lockout, roles, disabled accounts, forged cookies, every API and page.
- These do not talk to a real Neon database. After deploying, create the first admin, add a layout from a DXF, and open it on a phone.
