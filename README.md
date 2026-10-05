# Cable Locator

Guides you to a cable from AutoCAD data. Steps 1-4 of the MVP: DXF import, UTM to lat/lon with Google Maps check links, guidance engine with simulator, live GPS with smoothing.

## Run
```
npm install
npm run dev      # https://localhost:3000 (HTTPS is needed later for phone GPS and compass)
```

## Backend: Neon + Prisma, with user accounts
Cables and users live in a Neon Postgres database. People pick a cable by name; it is saved on their phone so it still opens with no signal.

Pages: `/` pick a cable (search, or "Nearest to me"), `/locate/<id>` guidance, `/admin` add, rename and delete cables, `/admin/users` accounts and roles, `/account` change password, `/login`.

Sign-in uses real accounts (email and password). Roles: Administrator (manage cables and users) and Engineer (find cables). Passwords are stored as salted scrypt hashes, 5 wrong attempts lock an account for 15 minutes, and disabling an account takes effect immediately.

Setup:
1. Create a Neon project and copy the pooled and direct connection strings.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL` and `SESSION_SECRET`.
3. `npm install` (this also runs `prisma generate`), then `npm run db:push` to create the tables.
4. `npm run dev` and open the site. The first time, the sign-in page asks you to create the first administrator.
5. Add your engineers under Manage, then Users. They get a temporary password and choose their own at first sign-in.
6. On Vercel, add the same three values as environment variables.

## Two modes
- **Find** (far from the cable): arrow and distance, using walking direction or the compass, on a satellite or street map.
- **Follow** (within 10 m, back to Find beyond 15 m): the cable is a line and you are a dot. It says how far to move left or right using the cable's own direction, with no compass. It flips left/right by itself if GPS shows you walking the other way. The switch is automatic, with no buttons. Test mode (no GPS, tap the map to move) is in the settings panel.

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
