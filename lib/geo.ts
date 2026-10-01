import proj4 from "proj4";

const utm = (zone: number) => `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;

export function toLatLon(zone: number, e: number, n: number) {
  const [lon, lat] = proj4(utm(zone), "WGS84", [e, n]);
  return { lat, lon };
}
export const mapsLink = (lat: number, lon: number) =>
  `https://www.google.com/maps?q=${lat.toFixed(7)},${lon.toFixed(7)}`;
