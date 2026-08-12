import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { AuthBackdrop } from "../auth-backdrop";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-app px-4">
      <AuthBackdrop />
      <div className="relative w-full max-w-[388px] rounded-[6px] border border-border bg-card px-[34px] py-9 shadow-[0_8px_28px_rgba(26,26,26,.07)]">
        <h1 className="font-sans text-[24px] font-semibold text-ink">Set a new password</h1>
        <div className="mt-1.5 font-sans text-[15px] leading-[1.5] text-ink-muted">
          {user.mustChangePassword
            ? "Your account needs a new password before you can continue."
            : "Choose a new password for your account."}
        </div>
        <div className="mt-6.5">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
