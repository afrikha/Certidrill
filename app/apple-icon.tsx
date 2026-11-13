import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon (iOS): the same mark as app/icon.svg, opaque and without rounded corners (iOS rounds them). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1d4ed8" }}>
        <svg width="132" height="132" viewBox="0 0 64 64">
          <path d="M41 21.5a14 14 0 1 0 0 21" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
          <path d="M30 32.5l5 5 10-11" fill="none" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
