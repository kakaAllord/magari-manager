import { ImageResponse } from "next/og";

// The car mark from icon.svg as a PNG, for the home screen and installed app. `rounded` gives the
// tile its own corners; without them it is drawn edge to edge for systems that cut their own shape.
export function appIcon(size: number, rounded = false) {
  const mark = Math.round(size * 0.73);
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
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 64 64">
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
    { width: size, height: size },
  );
}
