import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone/iPad: the Quicklywash washing-machine mark. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e7f3a" }}>
        <svg width="132" height="132" viewBox="0 0 64 64">
          <rect x="15" y="12" width="30" height="40" rx="6" fill="none" stroke="#fff" strokeWidth="3.5" />
          <path d="M15 21h30" stroke="#fff" strokeWidth="3" />
          <circle cx="21" cy="16.6" r="1.6" fill="#fff" />
          <circle cx="30" cy="36" r="9" fill="none" stroke="#fff" strokeWidth="3.5" />
          <path d="M25.5 37.5c2-2.5 4.5 2.5 9 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 8l1.9 4.6L56.5 14.5l-4.6 1.9L50 21l-1.9-4.6-4.6-1.9 4.6-1.9z" fill="#ffd166" />
        </svg>
      </div>
    ),
    size,
  );
}
