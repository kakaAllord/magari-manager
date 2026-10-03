import { appIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon for iPhones: the same car mark as icon.svg, drawn edge to edge.
export default function AppleIcon() {
  return appIcon(size.width);
}
