import { getTranslations } from "next-intl/server";
import { REALITY_LINKS } from "@/lib/reality-links";

// Small, quiet prompt asking happy guests to leave a Google review. Links out
// to our Google listing (see REALITY_LINKS.googleReview). Server component —
// no interactivity beyond the link.
export default async function GoogleReviewPrompt() {
  const t = await getTranslations("review");
  return (
    <div className="px-6 pb-2">
      <a
        href={REALITY_LINKS.googleReview}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto max-w-md flex items-center justify-center gap-2 border-2 border-ink px-4 py-3 transition hover:bg-yellow"
      >
        <span aria-hidden className="text-amber text-lg leading-none">
          ★
        </span>
        <span className="font-body text-sm text-ink/80">{t("lead")}</span>
        <span
          className="font-display font-semibold text-xs uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("cta")} →
        </span>
      </a>
    </div>
  );
}
