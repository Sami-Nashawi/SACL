// Map backgrounds. To use Google, MapTiler or another provider, change only this list.
// Check each provider's terms and any API key rules before using the app across the company.
export type MapLayer = { name: string; url: string; maxNativeZoom: number; attribution: string };

export const MAP_LAYERS: MapLayer[] = [
  { name: "Satellite", maxNativeZoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
  { name: "Street", maxNativeZoom: 19, attribution: "© OpenStreetMap contributors",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" },
];
