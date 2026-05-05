import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from "./locales";

function negotiate(accept: string | null): Locale {
  if (!accept) return DEFAULT_LOCALE;
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if ((LOCALES as readonly string[]).includes(tag)) return tag as Locale;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieValue)
    ? cookieValue
    : negotiate((await headers()).get("accept-language"));

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
