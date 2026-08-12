import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth/dal";
import { AuthBackdrop } from "../auth-backdrop";
import { LoginForm } from "./login-form";

// Phase 0 decision: no real depot/yard photograph yet, so the panel runs on a
// placeholder artwork. Swapping in a real photo later is a one-line change —
// point this at the new file (a .jpg works the same way).
const PANEL_IMAGE = "/assets/login-backdrop.svg";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : roleHome(user.role));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-dark md:flex-row">
      {/* Photo panel — spec §6.1. Content-height on phones (logo + headline)
          with the card starting directly underneath; a fixed 600px column on
          desktop. Everything visual sits in the absolute layer below so the
          panel can never be shorter than its own text. */}
      <div className="relative flex min-h-[252px] flex-none flex-col justify-between md:min-h-0 md:w-[600px] md:p-11">
        <div className="absolute inset-0 overflow-hidden">
          {/* Phones only get a 252px-tall slice, so anchor the crop to the
              bottom of the artwork (the yard) rather than its empty sky. */}
          <div
            className="absolute inset-0 bg-dark bg-cover bg-[position:50%_72%] md:bg-center"
            style={{ backgroundImage: `url('${PANEL_IMAGE}')` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(26,26,26,.68) 0%, rgba(26,26,26,.3) 42%, rgba(26,26,26,.84) 100%)",
            }}
          />
        </div>

        <div className="relative px-6.5 pt-13 md:p-0">
          <Image
            src="/assets/ihame-logo.png"
            alt="IHAME Logistics & Supply"
            width={230}
            height={74}
            priority
            className="h-auto w-[204px] md:w-[230px]"
          />
        </div>

        <div className="relative px-6.5 pt-6 pb-7 md:p-0">
          <div className="max-w-[430px] font-sans text-[28px] leading-[1.16] font-semibold tracking-[-0.02em] text-white md:text-[44px] md:leading-[1.14]">
            Freight and shop,
            <br />
            one ledger.
          </div>
          <div className="mt-3.5 hidden max-w-[390px] font-sans text-base leading-[1.6] text-white/62 md:block">
            China → Kigali · Goma · Bukavu. Orders, payments, stock and sales in a single record.
          </div>
          <div className="mt-6.5 hidden items-center gap-2.5 md:flex">
            <div className="h-0.5 w-[34px] bg-accent" />
            <span className="font-mono text-[12px] tracking-[0.14em] text-white/55">
              YOUR TRUST, OUR MISSION
            </span>
          </div>
        </div>
      </div>

      {/* Sign-in card */}
      <div className="relative flex flex-1 items-start justify-center bg-app md:items-center">
        <AuthBackdrop />
        {/* Accent hairline on the seam with the dark panel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-accent/35 to-transparent md:block"
        />
        <div className="relative w-full rounded-t-[18px] bg-card px-6.5 pt-7 pb-8 md:w-[388px] md:rounded-[6px] md:border md:border-border md:px-[34px] md:py-9 md:shadow-[0_8px_28px_rgba(26,26,26,.07)]">
          <h1 className="font-sans text-xl font-semibold text-ink md:text-[24px]">Sign in</h1>
          <div className="mt-1.5 font-sans text-[15px] leading-[1.5] text-ink-muted">
            Use your work email address.
          </div>
          <div className="mt-5.5">
            <LoginForm />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-6 hidden text-center font-mono text-[11.5px] tracking-[0.14em] text-ink-faint/70 md:block">
          IHAME LOGISTICS &amp; SUPPLY LTD · KIGALI, RWANDA
        </div>
      </div>
    </div>
  );
}
