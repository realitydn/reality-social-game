import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, isLocale } from "@/i18n/locales";

export default async function LocaleSwitcher() {
  const current = await getLocale();

  async function setLocale(formData: FormData) {
    "use server";
    const value = formData.get("locale");
    if (!isLocale(value)) return;
    (await cookies()).set(LOCALE_COOKIE, value, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    revalidatePath("/", "layout");
  }

  return (
    <form action={setLocale} className="flex gap-1 font-display font-semibold text-xs">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          className={`px-2 py-1 uppercase transition ${
            current === code ? "bg-ink text-cream" : "text-ink/60 hover:text-ink"
          }`}
          style={{ letterSpacing: "0.05em" }}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </form>
  );
}
