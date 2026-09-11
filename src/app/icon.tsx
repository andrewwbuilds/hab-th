import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
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
          gap: 2,
          background: "#5e6ad2",
          borderRadius: 7,
        }}
      >
        <div style={{ width: 4, height: 8, borderRadius: 2, background: "#08090a" }} />
        <div style={{ width: 4, height: 18, borderRadius: 2, background: "#08090a" }} />
        <div style={{ width: 4, height: 12, borderRadius: 2, background: "#08090a" }} />
      </div>
    ),
    { ...size }
  );
}
