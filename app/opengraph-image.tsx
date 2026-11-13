import { ImageResponse } from "next/og";
import { SHARE_IMAGE } from "@/lib/share-image";

export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = "image/png";

/**
 * The preview card shown when a page is shared (LinkedIn, WhatsApp, X…). Built
 * once at build time, so it states no figure read from the database; it is in
 * both languages since one image serves every page.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#1d4ed8" />
            <path d="M41 21.5a14 14 0 1 0 0 21" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
            <path d="M30 32.5l5 5 10-11" fill="none" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>
            Certi<span style={{ color: "#93c5fd" }}>drill</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>Practice exams that feel like the real thing</div>
          <div style={{ fontSize: 40, color: "#bfdbfe" }}>Des examens blancs au plus près de l&apos;examen réel</div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#cbd5e1" }}>Timed mock exams · Explained corrections · Progress tracking</div>
      </div>
    ),
    size,
  );
}
