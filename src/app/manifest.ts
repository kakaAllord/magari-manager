import type { MetadataRoute } from "next";
import { COMPANY, COMPANY_SHORT } from "@/lib/company";

// Lets staff install the app on a phone or computer and open it full screen, like any other app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY,
    short_name: COMPANY_SHORT,
    description: "Maombi ya pesa za magari na ripoti za matumizi",
    lang: "sw",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f5",
    theme_color: "#0f7b6c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
