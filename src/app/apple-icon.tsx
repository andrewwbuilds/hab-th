import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          gap: 11,
          background: "#5e6ad2",
          borderRadius: 40,
        }}
      >
        <div style={{ width: 22, height: 45, borderRadius: 11, background: "#08090a" }} />
        <div style={{ width: 22, height: 101, borderRadius: 11, background: "#08090a" }} />
        <div style={{ width: 22, height: 68, borderRadius: 11, background: "#08090a" }} />
      </div>
    ),
    { ...size }
  );
}
