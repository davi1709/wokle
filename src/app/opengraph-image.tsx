import { ImageResponse } from "next/og";

export const alt = "WOKLE — Learn what’s happening in the world";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview card shown when the link is shared on social networks / chats. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f4ee",
          color: "#17131f",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 210, fontWeight: 900, letterSpacing: -6 }}>
          <span>W</span>
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 66,
              border: "26px solid #6d28d9",
              margin: "0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 17, background: "#6d28d9" }} />
          </div>
          <span>KLE</span>
        </div>
        <div style={{ fontSize: 46, marginTop: 24 }}>Learn what’s happening in the world.</div>
        <div style={{ fontSize: 30, marginTop: 16, color: "#6a6477" }}>
          Three challenges. One new perspective every day.
        </div>
      </div>
    ),
    size,
  );
}
