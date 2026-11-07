import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f4ee",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            border: "9px solid #6d28d9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 9, height: 9, borderRadius: 5, background: "#6d28d9" }} />
        </div>
      </div>
    ),
    size,
  );
}
