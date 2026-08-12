"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/(auth)/actions";
import { Spinner } from "@/components/ui/spinner";

// Signing out destroys the session, writes an auth event and redirects — a
// round trip long enough that a plain button looked broken: you pressed it
// and nothing happened until the page changed. useFormStatus reports the
// parent form's in-flight state, so this has to be a child of the <form>
// rather than the form itself.
function SubmitButton({
  children,
  className,
  title,
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      aria-busy={pending}
      className={`cursor-pointer text-left disabled:cursor-default ${className ?? ""}`}
    >
      {pending ? (
        <>
          <Spinner className="h-[18px] w-[18px] flex-none" />
          {/* Only the sidebar variant has room for a label; the icon-only
              variant in the staff top bar passes none and just spins. */}
          {pendingLabel && <span>{pendingLabel}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function SignOutButton({
  children,
  className,
  title,
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  pendingLabel?: string;
}) {
  return (
    <form action={signOutAction}>
      <SubmitButton className={className} title={title} pendingLabel={pendingLabel}>
        {children}
      </SubmitButton>
    </form>
  );
}
