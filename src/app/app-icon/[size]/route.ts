import { appIcon } from "@/lib/app-icon";

// The PNG icons the manifest lists: Chrome and Edge only offer to install an app that has a 192px
// and a 512px icon. "512-maskable" is edge to edge for Android to cut into its own shape.
const icons: Record<string, [number, boolean]> = {
  "192": [192, true],
  "512": [512, true],
  "512-maskable": [512, false],
};

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(icons).map((size) => ({ size }));

export async function GET(_: Request, { params }: RouteContext<"/app-icon/[size]">) {
  const [size, rounded] = icons[(await params).size];
  return appIcon(size, rounded);
}
