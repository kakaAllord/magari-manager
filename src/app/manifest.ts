import type { MetadataRoute } from "next";
import { COMPANY, COMPANY_SHORT } from "@/lib/company";

// Lets drivers add the app to their phone's home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY,
    short_name: COMPANY_SHORT,
    description: "Maombi ya pesa za magari na ripoti za matumizi",
    lang: "sw",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f5",
    theme_color: "#0f7b6c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
