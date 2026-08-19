import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "IHAME LOGISTICS LTD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Background sampled directly (sharp, corner pixels, all four matched
// exactly) from the approved brand banner — same value as globals.css's
// --color-nav, kept as a literal here since this file runs in the OG image
// route's isolated rendering environment, not the app's normal CSS.
const BRAND_NAV = "#1b506a";

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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: BRAND_NAV,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={markSrc} width={480} height={214} alt="" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 48,
              maxWidth: 480,
            }}
          >
            <div style={{ fontSize: 46, fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
              IHAME LOGISTICS LTD
            </div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.8)", marginTop: 28 }}>
          Your Trust, Our Mission
        </div>
      </div>
    ),
    { ...size },
  );
}
