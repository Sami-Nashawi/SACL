import type { MetadataRoute } from "next";

// Lets you "Add to Home Screen" so the app opens full screen, without Safari's address bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cable Locator",
    short_name: "Cables",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f2ee",
    theme_color: "#d9480f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
