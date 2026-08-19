import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "IHAME Logistics & Supply";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Without this, sharing a link falls back to whatever the platform's own
// unfurler decides to show — in practice, this app's favicon, which was
// never replaced from Next.js's default (see src/app/favicon.ico) and reads
// as "the Vercel logo" to anyone not familiar with the difference. This is
// the actual, direct fix: og:image is what WhatsApp/iMessage/Slack/X etc.
// read first when building a link preview card.
export default async function Image() {
  const markData = await readFile(join(process.cwd(), "public/assets/ihame-mark.png"));
  const markSrc = `data:image/png;base64,${markData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#2875b4",
        }}
      >
        <img src={markSrc} width={520} height={232} alt="" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 56,
            maxWidth: 480,
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 700, color: "#ffffff", lineHeight: 1.15 }}>
            IHAME Logistics &amp; Supply
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.75)", marginTop: 16 }}>
            Freight forwarding &amp; hardware shop management
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
