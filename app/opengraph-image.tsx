import { ImageResponse } from "next/og";
import { SHARE_IMAGE } from "@/lib/share-image";
import { activeCatalog } from "@/lib/catalog";

export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = "image/png";
// The vendors on offer are read when serving: none at build time (no database).
export const dynamic = "force-dynamic";

/**
 * The preview card shown when a page is shared (LinkedIn, WhatsApp, X…). It
 * states no figure, only the vendors whose certifications are on offer (named,
 * never a logo); it is in both languages since one image serves every page.
 */
export default async function OpengraphImage() {
  const { vendors } = await activeCatalog();
  const tagline = ["Timed mock exams", "Explained corrections", "Progress tracking"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 64 64" aria-hidden="true">
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
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: "#cbd5e1" }}>
          <span>{tagline.join(" · ")}</span>
          {vendors.length > 0 && <span style={{ color: "#93c5fd" }}>{vendors.map((v) => v.name).join(" · ")}</span>}
        </div>
      </div>
    ),
    size,
  );
}
