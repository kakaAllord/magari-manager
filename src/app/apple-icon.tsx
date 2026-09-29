import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon for iPhones: the same car mark as icon.svg, drawn edge to edge.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f7b6c",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 64 64">
          <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 42h-3V32l5-12h32l5 12v10h-3" />
            <path d="M11 32h42" />
            <path d="M26 42h12" />
          </g>
          <circle cx="20" cy="42" r="5" fill="#ffffff" />
          <circle cx="44" cy="42" r="5" fill="#ffffff" />
          <circle cx="20" cy="42" r="2" fill="#0f7b6c" />
          <circle cx="44" cy="42" r="2" fill="#0f7b6c" />
        </svg>
      </div>
    ),
    size,
  );
}
