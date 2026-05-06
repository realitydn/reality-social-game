import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createGuest, getCurrentUser, updateProfile } from "@/lib/session";
import { LOCALES, LOCALE_LABELS, isLocale, type Locale } from "@/i18n/locales";
import AvatarUpload from "@/components/AvatarUpload";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Wordmark from "@/components/Wordmark";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string }>;
}) {
  const params = await searchParams;
  let user = await getCurrentUser();

  // Bootstrap a guest user if they came from the "Play as guest" path.
  if (!user && params.guest === "1") {
    user = await createGuest("Guest", "en");
  }

  if (!user) redirect("/");

  const t = await getTranslations("profile");

  async function save(formData: FormData) {
    "use server";
    const current = await getCurrentUser();
    if (!current) redirect("/");
    const name = String(formData.get("name") ?? "").trim().slice(0, 60);
    const localeRaw = formData.get("locale");
    const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
    const newsletter = formData.get("newsletter") === "on";
    await updateProfile(current.id, {
      name: name || undefined,
      locale,
      newsletter_opt_in: newsletter,
    });
    redirect("/");
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <LocaleSwitcher />
      </header>
      <section className="flex-1 flex flex-col items-center px-6">
        <div className="w-full max-w-md">
          <h1
            className="font-display font-bold text-3xl uppercase mb-8"
            style={{ letterSpacing: "0.05em" }}
          >
            {t("heading")}
          </h1>

          {/* Avatar lives outside the main form — uploads happen separately so the
              user gets immediate feedback without losing form state. */}
          <div className="mb-6">
            <label className="font-display font-semibold text-xs uppercase block mb-2" style={{ letterSpacing: "0.05em" }}>
              {t("avatar")}
            </label>
            <AvatarUpload
              initialUrl={user.image ?? null}
              labels={{
                chooseFile: t("avatarChoose"),
                uploading: t("avatarUploading"),
                error: t("avatarError"),
                helper: t("avatarHelper"),
              }}
            />
          </div>

          <form action={save} className="flex flex-col gap-6">

            <div>
              <label
                htmlFor="name"
                className="font-display font-semibold text-xs uppercase block mb-2"
              >
                {t("displayName")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={user.name ?? ""}
                placeholder={t("displayNamePlaceholder")}
                maxLength={60}
                required
                className="w-full border-2 border-ink bg-cream px-3 py-2 font-body focus:outline-none focus:bg-yellow"
              />
            </div>

            <div>
              <label
                htmlFor="locale"
                className="font-display font-semibold text-xs uppercase block mb-2"
              >
                {t("locale")}
              </label>
              <select
                id="locale"
                name="locale"
                defaultValue={user.locale}
                className="w-full border-2 border-ink bg-cream px-3 py-2 font-body focus:outline-none"
              >
                {LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {LOCALE_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 font-body cursor-pointer">
              <input
                type="checkbox"
                name="newsletter"
                defaultChecked={user.newsletter_opt_in}
                className="w-5 h-5 accent-ink"
              />
              {t("newsletter")}
            </label>

            <button
              type="submit"
              className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
              style={{
                letterSpacing: "0.05em",
                boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
              }}
            >
              {t("save")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
