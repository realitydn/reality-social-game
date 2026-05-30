"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { startGuestSession } from "@/app/guest-action";

export default function SignInButtons() {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-3 w-full max-w-xs">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/profile" })}
        className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
        style={{
          letterSpacing: "0.05em",
          boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
        }}
      >
        {t("google")}
      </button>
      <form action={startGuestSession} className="w-full">
        <button
          type="submit"
          className="w-full border-2 border-ink text-ink font-display font-bold uppercase px-6 py-3 text-center transition hover:bg-ink hover:text-cream"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("guest")}
        </button>
      </form>
    </div>
  );
}
