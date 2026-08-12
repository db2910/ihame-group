/**
 * Decorative background for the light half of the auth screens (the sign-in
 * card side, and the standalone change-password screen). Purely visual: flat
 * `bg-app` left the panel reading as an empty grey field next to the dark
 * photo panel, so this layers a fine grid, two brand-tinted glows and a
 * vignette under the card. No content, no hit area.
 */
export function AuthBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Fine engineering grid, faded out towards the edges so it reads as
          texture rather than as a table. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(26,26,26,.045) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(26,26,26,.045) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(115% 85% at 50% 40%, #000 25%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(115% 85% at 50% 40%, #000 25%, transparent 78%)",
        }}
      />

      {/* Brand + accent glows, kept low enough that the white card still reads
          as the brightest thing on the panel. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(620px 420px at 82% 8%, rgba(40,117,180,.13), transparent 68%)," +
            "radial-gradient(560px 400px at 6% 92%, rgba(122,182,72,.13), transparent 70%)," +
            "radial-gradient(900px 620px at 50% 50%, rgba(255,255,255,.75), transparent 72%)",
        }}
      />
    </div>
  );
}
